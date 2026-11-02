import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Prisma, Role, TenantJoinRequestStatus } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { isTransactionConflict } from '../prisma/transaction-errors.js';
import { setTimeout as retryDelay } from 'node:timers/promises';
import { CreateTenantDto, JoinTenantDto, RejectJoinRequestDto, TransferTenantDto, UpdateTenantDto } from './tenant.dto.js';

const summary = {
  owner: { select: { id: true, email: true, name: true } },
  _count: { select: { users: true } },
} satisfies Prisma.TenantInclude;

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  private async actor(db: Prisma.TransactionClient, id: string) {
    const user = await db.user.findUnique({ where: { id } });
    if (!user) throw new UnauthorizedException('Tài khoản không còn tồn tại');
    return user;
  }

  private async transaction<T>(action: (db: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.prisma.$transaction(action, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error) {
        if (isTransactionConflict(error)) {
          if (attempt < 3) { await retryDelay(25 * (attempt + 1) + Math.random() * 25); continue; }
          throw new ConflictException('Thông tin doanh nghiệp vừa thay đổi. Vui lòng tải lại.');
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2034' && attempt < 2) continue;
          if (['P2002', 'P2034'].includes(error.code)) throw new ConflictException('Thông tin doanh nghiệp vừa thay đổi. Vui lòng tải lại.');
        }
        throw error;
      }
    }
  }

  async create(actorId: string, dto: CreateTenantDto) {
    return this.transaction(async db => {
      const actor = await this.actor(db, actorId);
      if (actor.tenantId) throw new ConflictException('Bạn đã thuộc một doanh nghiệp');
      const tenant = await db.tenant.create({ data: { name: dto.name, description: dto.description, ownerUserId: actor.id } });
      await db.user.update({ where: { id: actor.id }, data: { tenantId: tenant.id } });
      await db.tenantJoinRequest.updateMany({
        where: { userId: actor.id, status: TenantJoinRequestStatus.PENDING },
        data: { status: TenantJoinRequestStatus.CANCELLED },
      });
      await db.tenantAuditLog.create({ data: {
        tenantId: tenant.id, tenantName: tenant.name, actorUserId: actor.id, action: 'CREATED', toOwnerId: actor.id,
      } });
      return tenant;
    });
  }

  async me(actorId: string) {
    const actor = await this.actor(this.prisma, actorId);
    const tenant = actor.tenantId ? await this.detail(actor.id, actor.tenantId) : null;
    const pendingRequest = !actor.tenantId ? await this.myJoinRequest(actor.id) : null;
    return {
      tenant,
      isSystemAdmin: actor.role === Role.ADMIN,
      canCreate: !actor.tenantId,
      pendingRequest,
      joinRequest: pendingRequest,
      userId: actor.id,
    };
  }

  async applyJoin(actorId: string, dto: JoinTenantDto) {
    return this.transaction(async db => {
      const actor = await this.actor(db, actorId);
      if (actor.tenantId) throw new ConflictException('Bạn đã thuộc một doanh nghiệp');

      const targetTenant = await db.tenant.findUnique({ where: { id: dto.tenantId } });
      if (!targetTenant) throw new NotFoundException('Không tìm thấy doanh nghiệp với Tenant ID này');

      const existingPending = await db.tenantJoinRequest.findFirst({
        where: { userId: actor.id, status: TenantJoinRequestStatus.PENDING },
      });
      if (existingPending) {
        if (existingPending.tenantId === dto.tenantId) {
          throw new ConflictException('Yêu cầu gia nhập của bạn đang chờ phê duyệt');
        }
        throw new ConflictException('Bạn đang có một yêu cầu gia nhập khác chờ phê duyệt. Vui lòng hủy yêu cầu cũ trước.');
      }

      const existing = await db.tenantJoinRequest.findUnique({
        where: { userId_tenantId: { userId: actor.id, tenantId: dto.tenantId } },
      });
      if (existing) {
        return db.tenantJoinRequest.update({
          where: { id: existing.id },
          data: { status: TenantJoinRequestStatus.PENDING },
        });
      }
      return db.tenantJoinRequest.create({
        data: { userId: actor.id, tenantId: dto.tenantId, status: TenantJoinRequestStatus.PENDING },
      });
    });
  }

  async myJoinRequest(actorId: string) {
    const include = {
      tenant: {
        select: {
          id: true,
          name: true,
          description: true,
          owner: { select: { id: true, name: true, email: true } },
        },
      },
    };

    const pending = await this.prisma.tenantJoinRequest.findFirst({
      where: { userId: actorId, status: TenantJoinRequestStatus.PENDING },
      include,
    });
    if (pending) return pending;

    return this.prisma.tenantJoinRequest.findFirst({
      where: { userId: actorId, status: TenantJoinRequestStatus.REJECTED },
      orderBy: { updatedAt: 'desc' },
      include,
    });
  }

  async cancelJoinRequest(actorId: string, requestId: string) {
    return this.transaction(async db => {
      const request = await db.tenantJoinRequest.findUnique({ where: { id: requestId } });
      if (!request) throw new NotFoundException('Không tìm thấy yêu cầu gia nhập');
      if (request.userId !== actorId) throw new ForbiddenException('Bạn không có quyền thao tác trên yêu cầu này');
      if (request.status !== TenantJoinRequestStatus.PENDING && request.status !== TenantJoinRequestStatus.REJECTED) {
        throw new ConflictException('Chỉ có thể hủy hoặc đóng yêu cầu đang ở trạng thái PENDING hoặc REJECTED');
      }
      return db.tenantJoinRequest.update({
        where: { id: requestId },
        data: { status: TenantJoinRequestStatus.CANCELLED },
      });
    });
  }

  async list(actorId: string) {
    const actor = await this.actor(this.prisma, actorId);
    return this.prisma.tenant.findMany({
      where: actor.role === Role.ADMIN ? undefined : { id: actor.tenantId || '__none__' },
      include: summary, orderBy: { createdAt: 'desc' },
    });
  }

  async detail(actorId: string, tenantId: string) {
    return this.transaction(async db => {
      const actor = await this.actor(db, actorId);
      const tenant = await db.tenant.findUnique({ where: { id: tenantId }, include: summary });
      if (!tenant) throw new NotFoundException('Không tìm thấy doanh nghiệp');
      if (actor.role !== Role.ADMIN && actor.tenantId !== tenant.id) throw new ForbiddenException('Không được truy cập doanh nghiệp khác');
      const canManage = actor.role === Role.ADMIN || tenant.ownerUserId === actor.id;
      const members = canManage ? await db.user.findMany({
        where: { tenantId }, select: { id: true, email: true, name: true }, orderBy: { email: 'asc' },
      }) : [];
      return { ...tenant, canManage, isOwner: tenant.ownerUserId === actor.id, members };
    });
  }

  async listJoinRequests(actorId: string, tenantId: string) {
    const actor = await this.actor(this.prisma, actorId);
    await this.managed(this.prisma, actor, tenantId);
    return this.prisma.tenantJoinRequest.findMany({
      where: { tenantId },
      include: {
        user: { select: { id: true, email: true, name: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveJoinRequest(actorId: string, requestId: string) {
    const outcome = await this.transaction(async db => {
      const request = await db.tenantJoinRequest.findUnique({
        where: { id: requestId },
        include: { tenant: true },
      });
      if (!request) throw new NotFoundException('Không tìm thấy yêu cầu gia nhập');
      if (request.status !== TenantJoinRequestStatus.PENDING) {
        throw new ConflictException('Yêu cầu không còn ở trạng thái chờ duyệt');
      }

      const actor = await this.actor(db, actorId);
      if (actor.id !== request.tenant.ownerUserId) {
        throw new ForbiddenException('Chỉ chủ doanh nghiệp mới có quyền phê duyệt yêu cầu gia nhập');
      }

      const targetUser = await db.user.findUnique({ where: { id: request.userId } });
      if (!targetUser) throw new NotFoundException('Người dùng không còn tồn tại');
      if (targetUser.tenantId) {
        await db.tenantJoinRequest.updateMany({
          where: { id: requestId, status: TenantJoinRequestStatus.PENDING },
          data: { status: TenantJoinRequestStatus.CANCELLED },
        });
        return { kind: 'ALREADY_MEMBER' as const };
      }

      await db.user.update({
        where: { id: targetUser.id },
        data: { tenantId: request.tenantId },
      });

      const approved = await db.tenantJoinRequest.update({
        where: { id: requestId },
        data: { status: TenantJoinRequestStatus.APPROVED },
      });

      await db.tenantJoinRequest.updateMany({
        where: { userId: targetUser.id, status: TenantJoinRequestStatus.PENDING },
        data: { status: TenantJoinRequestStatus.CANCELLED },
      });

      await db.tenantAuditLog.create({
        data: {
          tenantId: request.tenantId,
          tenantName: request.tenant.name,
          actorUserId: actor.id,
          action: 'MEMBER_JOIN_APPROVED',
          reason: `Duyệt gia nhập cho ${targetUser.email}`,
        },
      });

      return { kind: 'APPROVED' as const, approved };
    });

    if (outcome.kind === 'ALREADY_MEMBER') {
      throw new ConflictException('Người dùng đã thuộc một doanh nghiệp khác');
    }

    return outcome.approved;
  }

  async rejectJoinRequest(actorId: string, requestId: string, dto?: RejectJoinRequestDto) {
    return this.transaction(async db => {
      const request = await db.tenantJoinRequest.findUnique({
        where: { id: requestId },
        include: { tenant: true },
      });
      if (!request) throw new NotFoundException('Không tìm thấy yêu cầu gia nhập');
      if (request.status !== TenantJoinRequestStatus.PENDING) {
        throw new ConflictException('Yêu cầu không còn ở trạng thái chờ duyệt');
      }

      const actor = await this.actor(db, actorId);
      if (actor.id !== request.tenant.ownerUserId) {
        throw new ForbiddenException('Chỉ chủ doanh nghiệp mới có quyền từ chối yêu cầu gia nhập');
      }

      const rejected = await db.tenantJoinRequest.update({
        where: { id: requestId },
        data: { status: TenantJoinRequestStatus.REJECTED },
      });

      await db.tenantAuditLog.create({
        data: {
          tenantId: request.tenantId,
          tenantName: request.tenant.name,
          actorUserId: actor.id,
          action: 'MEMBER_JOIN_REJECTED',
          reason: dto?.reason?.trim() || 'Từ chối yêu cầu gia nhập',
        },
      });

      return rejected;
    });
  }

  async removeMember(actorId: string, tenantId: string, targetUserId: string) {
    return this.transaction(async db => {
      const actor = await this.actor(db, actorId);
      const tenant = await this.managed(db, actor, tenantId);

      if (targetUserId === tenant.ownerUserId) {
        throw new ConflictException('Không thể loại chủ doanh nghiệp. Cần chuyển quyền sở hữu trước.');
      }

      const targetUser = await db.user.findUnique({ where: { id: targetUserId } });
      if (!targetUser || targetUser.tenantId !== tenantId) {
        throw new NotFoundException('Thành viên không thuộc doanh nghiệp này');
      }

      await db.user.update({
        where: { id: targetUserId },
        data: { tenantId: null },
      });

      await db.tenantAuditLog.create({
        data: {
          tenantId,
          tenantName: tenant.name,
          actorUserId: actor.id,
          action: 'MEMBER_REMOVED',
          reason: `Loại thành viên ${targetUser.email}`,
        },
      });

      return { message: 'Đã loại thành viên khỏi doanh nghiệp.' };
    });
  }

  async leave(actorId: string) {
    return this.transaction(async db => {
      const actor = await this.actor(db, actorId);
      if (!actor.tenantId) {
        throw new ConflictException('Bạn chưa thuộc doanh nghiệp nào');
      }

      const tenant = await db.tenant.findUnique({ where: { id: actor.tenantId } });
      if (!tenant) throw new NotFoundException('Không tìm thấy doanh nghiệp');

      if (tenant.ownerUserId === actor.id) {
        throw new ConflictException('Chủ doanh nghiệp không thể rời doanh nghiệp. Cần chuyển quyền sở hữu cho thành viên khác trước.');
      }

      await db.user.update({
        where: { id: actor.id },
        data: { tenantId: null },
      });

      await db.tenantAuditLog.create({
        data: {
          tenantId: tenant.id,
          tenantName: tenant.name,
          actorUserId: actor.id,
          action: 'MEMBER_LEFT',
          reason: `Thành viên ${actor.email} đã tự rời doanh nghiệp`,
        },
      });

      return { message: 'Bạn đã rời doanh nghiệp thành công.' };
    });
  }

  async update(actorId: string, tenantId: string, dto: UpdateTenantDto) {
    if (dto.name === undefined && dto.description === undefined) throw new BadRequestException('Không có thông tin cần cập nhật');
    return this.transaction(async db => {
      const actor = await this.actor(db, actorId);
      const tenant = await this.managed(db, actor, tenantId);
      const updated = await db.tenant.update({ where: { id: tenantId }, data: dto });
      await db.tenantAuditLog.create({ data: {
        tenantId, tenantName: tenant.name, actorUserId: actor.id, action: 'UPDATED',
      } });
      return updated;
    });
  }

  async transfer(actorId: string, tenantId: string, dto: TransferTenantDto) {
    return this.transaction(async db => {
      const actor = await this.actor(db, actorId);
      const tenant = await this.managed(db, actor, tenantId);
      const intervention = actor.role === Role.ADMIN && actor.id !== tenant.ownerUserId;
      if (intervention && !dto.reason?.trim()) throw new BadRequestException('Super Admin cần ghi lý do chuyển quyền sở hữu');
      if (dto.userId === tenant.ownerUserId) throw new ConflictException('Người này đã là chủ doanh nghiệp');
      const target = await db.user.findUnique({ where: { id: dto.userId } });
      if (!target) throw new NotFoundException('Không tìm thấy người nhận quyền');
      if (target.tenantId !== tenantId) {
        if (!intervention || target.tenantId) throw new ConflictException('Người nhận phải là thành viên của doanh nghiệp này');
        await db.user.update({ where: { id: target.id }, data: { tenantId } });
      }
      const updated = await db.tenant.update({ where: { id: tenantId }, data: { ownerUserId: target.id } });
      await db.tenantJoinRequest.updateMany({
        where: { userId: target.id, status: TenantJoinRequestStatus.PENDING },
        data: { status: TenantJoinRequestStatus.CANCELLED },
      });
      await db.tenantAuditLog.create({ data: {
        tenantId, tenantName: tenant.name, actorUserId: actor.id,
        action: intervention ? 'ADMIN_OWNERSHIP_TRANSFERRED' : 'OWNERSHIP_TRANSFERRED',
        fromOwnerId: tenant.ownerUserId, toOwnerId: target.id, reason: dto.reason?.trim() || null,
      } });
      return updated;
    });
  }

  async delete(actorId: string, tenantId: string) {
    return this.transaction(async db => {
      const actor = await this.actor(db, actorId);
      const tenant = await this.managed(db, actor, tenantId);
      const members = await db.user.count({ where: { tenantId, id: { not: tenant.ownerUserId } } });
      if (members) throw new ConflictException('Doanh nghiệp còn thành viên. Cần xử lý thành viên trước khi xóa.');
      await db.user.updateMany({ where: { tenantId }, data: { tenantId: null } });
      await db.tenantAuditLog.create({ data: {
        tenantId, tenantName: tenant.name, actorUserId: actor.id, action: 'DELETED', fromOwnerId: tenant.ownerUserId,
      } });
      await db.tenant.delete({ where: { id: tenantId } });
      return { message: 'Đã xóa doanh nghiệp. Tài khoản người dùng được giữ nguyên.' };
    });
  }

  async audit(actorId: string, tenantId?: string) {
    const actor = await this.actor(this.prisma, actorId);
    if (actor.role !== Role.ADMIN) {
      if (!tenantId) throw new ForbiddenException('Chỉ Super Admin được xem toàn bộ nhật ký');
      await this.managed(this.prisma, actor, tenantId);
    }
    return this.prisma.tenantAuditLog.findMany({ where: tenantId ? { tenantId } : undefined, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  private async managed(db: Prisma.TransactionClient, actor: { id: string; role: Role }, id: string) {
    const tenant = await db.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Không tìm thấy doanh nghiệp');
    if (actor.role !== Role.ADMIN && actor.id !== tenant.ownerUserId) throw new ForbiddenException('Chỉ chủ doanh nghiệp được thực hiện thao tác này');
    return tenant;
  }
}
