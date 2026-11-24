import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role, TenantJoinRequestStatus } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TenantsService } from './tenants.service.js';

describe('TenantsService (Unit)', () => {
  let service: TenantsService;
  let mockPrisma: any;

  const mockUser = {
    id: 'user-1',
    email: 'user1@example.com',
    name: 'User One',
    role: Role.USER,
    tenantId: null as string | null,
  };

  const mockTenant = {
    id: 'tenant-1',
    name: 'Acme Corp',
    description: 'Tech company',
    ownerUserId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    owner: { id: 'user-1', email: 'user1@example.com', name: 'User One' },
    _count: { users: 1 },
  };

  beforeEach(async () => {
    mockPrisma = {
      $transaction: vi.fn(async (cb) => cb(mockPrisma)),
      user: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        count: vi.fn(),
      },
      tenant: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      tenantAuditLog: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      tenantJoinRequest: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TenantsService>(TenantsService);
  });

  describe('create', () => {
    it('creates a tenant when user has no existing tenant and cancels pending join requests', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ ...mockUser, tenantId: null });
      mockPrisma.tenant.create.mockResolvedValueOnce(mockTenant);
      mockPrisma.user.update.mockResolvedValueOnce({ ...mockUser, tenantId: mockTenant.id });
      mockPrisma.tenantJoinRequest.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.tenantAuditLog.create.mockResolvedValueOnce({});

      const result = await service.create('user-1', { name: 'Acme Corp', description: 'Tech' });
      expect(result).toEqual(mockTenant);
      expect(mockPrisma.tenant.create).toHaveBeenCalledWith({
        data: { name: 'Acme Corp', description: 'Tech', ownerUserId: 'user-1' },
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { tenantId: mockTenant.id },
      });
      expect(mockPrisma.tenantJoinRequest.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', status: TenantJoinRequestStatus.PENDING },
        data: { status: TenantJoinRequestStatus.CANCELLED },
      });
      expect(mockPrisma.tenantAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: 'CREATED', toOwnerId: 'user-1' }),
      });
    });

    it('throws ConflictException if user already belongs to a tenant', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ ...mockUser, tenantId: 'existing-tenant' });

      await expect(service.create('user-1', { name: 'New Tenant' })).rejects.toThrow(ConflictException);
      expect(mockPrisma.tenant.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException if user has an active PENDING join request', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ ...mockUser, tenantId: null });
      mockPrisma.tenantJoinRequest.findFirst.mockResolvedValueOnce({
        id: 'req-pending-1',
        userId: 'user-1',
        status: TenantJoinRequestStatus.PENDING,
      });

      await expect(service.create('user-1', { name: 'Blocked Tenant' })).rejects.toThrow(
        'Bạn đang có một yêu cầu gia nhập chờ phê duyệt. Vui lòng hủy yêu cầu trước khi tạo doanh nghiệp mới.',
      );
      expect(mockPrisma.tenant.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException if user has a pending join request', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ ...mockUser, tenantId: null });
      mockPrisma.tenantJoinRequest.findFirst.mockResolvedValueOnce({ id: 'pending-1', status: TenantJoinRequestStatus.PENDING });

      await expect(service.create('user-1', { name: 'New Tenant' })).rejects.toThrow(ConflictException);
      expect(mockPrisma.tenant.create).not.toHaveBeenCalled();
    });
  });

  describe('detail', () => {
    it('returns detail with members for the tenant owner', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ ...mockUser, tenantId: mockTenant.id });
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);
      mockPrisma.user.findMany.mockResolvedValueOnce([
        { id: 'user-1', email: 'user1@example.com', name: 'User One' },
      ]);

      const result = await service.detail('user-1', mockTenant.id);
      expect(result.isOwner).toBe(true);
      expect(result.canManage).toBe(true);
      expect(result.members).toHaveLength(1);
    });

    it('returns empty members list for regular member of the tenant', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ ...mockUser, id: 'user-regular', tenantId: mockTenant.id });
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);

      const result = await service.detail('user-regular', mockTenant.id);
      expect(result.isOwner).toBe(false);
      expect(result.canManage).toBe(false);
      expect(result.members).toEqual([]);
      expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
    });

    it('rejects user attempting to access a different tenant', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ ...mockUser, tenantId: 'tenant-other' });
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);

      await expect(service.detail('user-1', mockTenant.id)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('allows owner to update name and description', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ ...mockUser, tenantId: mockTenant.id });
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);
      mockPrisma.tenant.update.mockResolvedValueOnce({ ...mockTenant, name: 'New Name' });
      mockPrisma.tenantAuditLog.create.mockResolvedValueOnce({});

      const result = await service.update('user-1', mockTenant.id, { name: 'New Name' });
      expect(result.name).toBe('New Name');
      expect(mockPrisma.tenantAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: 'UPDATED' }),
      });
    });

    it('throws BadRequestException if no fields provided to update', async () => {
      await expect(service.update('user-1', mockTenant.id, {})).rejects.toThrow(BadRequestException);
    });

    it('rejects regular members from updating tenant', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ ...mockUser, id: 'user-2', tenantId: mockTenant.id });
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);

      await expect(service.update('user-2', mockTenant.id, { name: 'Hacked' })).rejects.toThrow(ForbiddenException);
    });

    it('allows Super Admin who is not the tenant owner to update tenant', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'admin-1', role: Role.ADMIN });
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);
      mockPrisma.tenant.update.mockResolvedValueOnce({ ...mockTenant, name: 'Admin Renamed Corp' });
      mockPrisma.tenantAuditLog.create.mockResolvedValueOnce({});

      const result = await service.update('admin-1', mockTenant.id, { name: 'Admin Renamed Corp' });
      expect(result.name).toBe('Admin Renamed Corp');
      expect(mockPrisma.tenantAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'ADMIN_UPDATED',
          reason: 'Super Admin cập nhật thông tin doanh nghiệp',
        }),
      });
    });
  });

  describe('delete', () => {
    it('blocks deletion if tenant still has other members', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ ...mockUser, tenantId: mockTenant.id });
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);
      mockPrisma.user.count.mockResolvedValueOnce(2); // 2 members besides owner

      await expect(service.delete('user-1', mockTenant.id)).rejects.toThrow(ConflictException);
      expect(mockPrisma.tenant.delete).not.toHaveBeenCalled();
    });

    it('deletes tenant when only owner remains, unsets owner tenantId and logs audit', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ ...mockUser, tenantId: mockTenant.id });
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);
      mockPrisma.user.count.mockResolvedValueOnce(0); // 0 other members
      mockPrisma.user.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.tenantAuditLog.create.mockResolvedValueOnce({});
      mockPrisma.tenant.delete.mockResolvedValueOnce(mockTenant);

      const result = await service.delete('user-1', mockTenant.id);
      expect(result.message).toContain('Đã xóa doanh nghiệp');
      expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenant.id },
        data: { tenantId: null },
      });
      expect(mockPrisma.tenant.delete).toHaveBeenCalledWith({ where: { id: mockTenant.id } });
    });

    it('allows Super Admin who is not the tenant owner to delete tenant when reason is provided', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'admin-1', role: Role.ADMIN });
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);
      mockPrisma.user.count.mockResolvedValueOnce(0);
      mockPrisma.user.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.tenantAuditLog.create.mockResolvedValueOnce({});
      mockPrisma.tenant.delete.mockResolvedValueOnce(mockTenant);

      const result = await service.delete({ id: 'admin-1', type: 'platform' }, mockTenant.id, {
        reason: 'Admin xóa doanh nghiệp không còn hoạt động',
      });
      expect(result.message).toContain('Đã xóa doanh nghiệp');
      expect(mockPrisma.tenantAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'DELETED',
          fromOwnerId: mockTenant.ownerUserId,
          reason: 'Admin xóa doanh nghiệp không còn hoạt động',
        }),
      });
      expect(mockPrisma.tenant.delete).toHaveBeenCalledWith({ where: { id: mockTenant.id } });
    });

    it('blocks Super Admin from deleting tenant if reason is missing', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'admin-1', role: Role.ADMIN });
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);
      mockPrisma.user.count.mockResolvedValueOnce(0);

      await expect(service.delete({ id: 'admin-1', type: 'platform' }, mockTenant.id)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrisma.tenant.delete).not.toHaveBeenCalled();
    });

    it('blocks regular user who is not owner from deleting tenant', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'user-not-owner', role: Role.USER });
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);

      await expect(service.delete('user-not-owner', mockTenant.id)).rejects.toThrow(ForbiddenException);
    });

    it('blocks app_user token from deleting tenant', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'user-1', role: Role.ADMIN });

      await expect(service.delete({ id: 'user-1', type: 'app_user' }, mockTenant.id)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('blocks Super Admin if tenant still has other members and reason is missing', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'admin-1', role: Role.ADMIN });
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);
      mockPrisma.user.count.mockResolvedValueOnce(3);

      await expect(service.delete({ id: 'admin-1', type: 'platform' }, mockTenant.id)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrisma.tenant.delete).not.toHaveBeenCalled();
    });

    it('allows Super Admin to delete tenant even if members remain when reason is provided', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'admin-1', role: Role.ADMIN });
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);
      mockPrisma.user.count.mockResolvedValueOnce(3);
      mockPrisma.tenantJoinRequest.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.user.updateMany.mockResolvedValueOnce({ count: 4 });
      mockPrisma.tenantAuditLog.create.mockResolvedValueOnce({});
      mockPrisma.tenant.delete.mockResolvedValueOnce(mockTenant);

      const result = await service.delete({ id: 'admin-1', type: 'platform' }, mockTenant.id, {
        reason: 'Quyết định giải tán do vi phạm',
      });
      expect(result.message).toContain('Đã xóa doanh nghiệp');
      expect(mockPrisma.tenantAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'DELETED',
          reason: 'Quyết định giải tán do vi phạm',
        }),
      });
      expect(mockPrisma.tenant.delete).toHaveBeenCalledWith({ where: { id: mockTenant.id } });
    });

    it('preserves Users, Applications, and AppUsers when tenant is deleted (only sets User.tenantId = null)', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'admin-1', role: Role.ADMIN });
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);
      mockPrisma.user.count.mockResolvedValueOnce(2);
      mockPrisma.tenantJoinRequest.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.user.updateMany.mockResolvedValueOnce({ count: 3 });
      mockPrisma.tenantAuditLog.create.mockResolvedValueOnce({});
      mockPrisma.tenant.delete.mockResolvedValueOnce(mockTenant);

      await service.delete({ id: 'admin-1', type: 'platform' }, mockTenant.id, {
        reason: 'Thu hồi giấy phép kinh doanh',
      });

      // Detaches members
      expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenant.id },
        data: { tenantId: null },
      });
      // Cancels pending join requests
      expect(mockPrisma.tenantJoinRequest.updateMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenant.id, status: TenantJoinRequestStatus.PENDING },
        data: { status: TenantJoinRequestStatus.CANCELLED },
      });
      // Deletes only tenant record
      expect(mockPrisma.tenant.delete).toHaveBeenCalledWith({ where: { id: mockTenant.id } });
    });
  });

  describe('transfer', () => {
    it('transfers ownership to an existing tenant member', async () => {
      const nextOwner = { id: 'user-2', tenantId: mockTenant.id };
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ ...mockUser, tenantId: mockTenant.id }) // actor
        .mockResolvedValueOnce(nextOwner); // target
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);
      mockPrisma.tenant.update.mockResolvedValueOnce({ ...mockTenant, ownerUserId: 'user-2' });
      mockPrisma.tenantAuditLog.create.mockResolvedValueOnce({});

      const result = await service.transfer('user-1', mockTenant.id, { userId: 'user-2' });
      expect(result.ownerUserId).toBe('user-2');
      expect(mockPrisma.tenantJoinRequest.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-2', status: TenantJoinRequestStatus.PENDING },
        data: { status: TenantJoinRequestStatus.CANCELLED },
      });
      expect(mockPrisma.tenantAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'OWNERSHIP_TRANSFERRED',
          fromOwnerId: 'user-1',
          toOwnerId: 'user-2',
        }),
      });
    });

    it('blocks owner from transferring to someone from another tenant', async () => {
      const outsider = { id: 'user-3', tenantId: 'other-tenant' };
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ ...mockUser, tenantId: mockTenant.id })
        .mockResolvedValueOnce(outsider);
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);

      await expect(service.transfer('user-1', mockTenant.id, { userId: 'user-3' })).rejects.toThrow(ConflictException);
    });

    it('requires reason when Super Admin intervenes in ownership transfer', async () => {
      const adminActor = { id: 'admin-1', role: Role.ADMIN, tenantId: null };
      mockPrisma.user.findUnique.mockResolvedValueOnce(adminActor);
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);

      await expect(service.transfer('admin-1', mockTenant.id, { userId: 'user-2', reason: '' })).rejects.toThrow(BadRequestException);
    });

    it('allows Super Admin to transfer ownership to an existing member with required reason', async () => {
      const adminActor = { id: 'admin-1', role: Role.ADMIN, tenantId: null };
      const existingMember = { id: 'user-2', email: 'member@example.com', tenantId: mockTenant.id };
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(adminActor)
        .mockResolvedValueOnce(existingMember);
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);
      mockPrisma.tenant.update.mockResolvedValueOnce({ ...mockTenant, ownerUserId: 'user-2' });
      mockPrisma.tenantJoinRequest.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.tenantAuditLog.create.mockResolvedValueOnce({});

      const result = await service.transfer('admin-1', mockTenant.id, {
        userId: 'user-2',
        reason: 'Quyết định bổ nhiệm quản trị viên mới',
      });

      expect(result.ownerUserId).toBe('user-2');
      expect(mockPrisma.tenant.update).toHaveBeenCalledWith({
        where: { id: mockTenant.id },
        data: { ownerUserId: 'user-2' },
      });
      expect(mockPrisma.tenantAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'ADMIN_OWNERSHIP_TRANSFERRED',
          actorUserId: 'admin-1',
          fromOwnerId: 'user-1',
          toOwnerId: 'user-2',
          reason: 'Quyết định bổ nhiệm quản trị viên mới',
        }),
      });
    });

    it('blocks Super Admin from transferring to a user who is not a member of the tenant', async () => {
      const adminActor = { id: 'admin-1', role: Role.ADMIN, tenantId: null };
      const unassignedUser = { id: 'user-free', email: 'free@example.com', tenantId: null };
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(adminActor)
        .mockResolvedValueOnce(unassignedUser);
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);

      await expect(
        service.transfer('admin-1', mockTenant.id, {
          userId: 'user-free',
          reason: 'Bổ nhiệm',
        }),
      ).rejects.toThrow(ConflictException);
      expect(mockPrisma.tenant.update).not.toHaveBeenCalled();
    });

    it('blocks Super Admin from transferring to someone who already belongs to another tenant', async () => {
      const adminActor = { id: 'admin-1', role: Role.ADMIN, tenantId: null };
      const outsider = { id: 'user-other', tenantId: 'different-tenant' };
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(adminActor)
        .mockResolvedValueOnce(outsider);
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);

      await expect(
        service.transfer('admin-1', mockTenant.id, {
          userId: 'user-other',
          reason: 'Can thiệp bổ nhiệm',
        }),
      ).rejects.toThrow(ConflictException);
      expect(mockPrisma.tenant.update).not.toHaveBeenCalled();
    });

    it('rejects regular member from transferring tenant ownership', async () => {
      const regularMember = { id: 'user-regular', role: Role.USER, tenantId: mockTenant.id };
      mockPrisma.user.findUnique.mockResolvedValueOnce(regularMember);
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);

      await expect(
        service.transfer('user-regular', mockTenant.id, { userId: 'user-2' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('blocks app_user token from transfer intervention even if User.role is ADMIN', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'admin-1', role: Role.ADMIN });
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);

      await expect(
        service.transfer({ userId: 'admin-1', type: 'app_user' }, mockTenant.id, {
          userId: 'user-2',
          reason: 'Attempted intervention',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('applyJoin', () => {
    it('creates a new PENDING request when user has no tenant and no pending request', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ ...mockUser, tenantId: null });
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);
      mockPrisma.tenantJoinRequest.findFirst.mockResolvedValueOnce(null);
      mockPrisma.tenantJoinRequest.findUnique.mockResolvedValueOnce(null);
      const expectedRequest = {
        id: 'req-1',
        userId: 'user-1',
        tenantId: mockTenant.id,
        status: TenantJoinRequestStatus.PENDING,
      };
      mockPrisma.tenantJoinRequest.create.mockResolvedValueOnce(expectedRequest);

      const result = await service.applyJoin('user-1', { tenantId: mockTenant.id });
      expect(result).toEqual(expectedRequest);
      expect(mockPrisma.tenantJoinRequest.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', tenantId: mockTenant.id, status: TenantJoinRequestStatus.PENDING },
      });
    });

    it('reuses existing record by updating status to PENDING if user previously was REJECTED/CANCELLED', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ ...mockUser, tenantId: null });
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);
      mockPrisma.tenantJoinRequest.findFirst.mockResolvedValueOnce(null);
      mockPrisma.tenantJoinRequest.findUnique.mockResolvedValueOnce({
        id: 'req-old',
        userId: 'user-1',
        tenantId: mockTenant.id,
        status: TenantJoinRequestStatus.REJECTED,
      });
      mockPrisma.tenantJoinRequest.update.mockResolvedValueOnce({
        id: 'req-old',
        userId: 'user-1',
        tenantId: mockTenant.id,
        status: TenantJoinRequestStatus.PENDING,
      });

      const result = await service.applyJoin('user-1', { tenantId: mockTenant.id });
      expect(result.id).toBe('req-old');
      expect(result.status).toBe(TenantJoinRequestStatus.PENDING);
      expect(mockPrisma.tenantJoinRequest.update).toHaveBeenCalledWith({
        where: { id: 'req-old' },
        data: { status: TenantJoinRequestStatus.PENDING },
      });
    });

    it('throws ConflictException if user already belongs to a tenant', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ ...mockUser, tenantId: 'existing-tenant' });

      await expect(service.applyJoin('user-1', { tenantId: mockTenant.id })).rejects.toThrow(ConflictException);
      expect(mockPrisma.tenantJoinRequest.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException if target tenant does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ ...mockUser, tenantId: null });
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(null);

      await expect(service.applyJoin('user-1', { tenantId: 'non-existent' })).rejects.toThrow(NotFoundException);
      expect(mockPrisma.tenantJoinRequest.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException if user already has a PENDING request for this tenant', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ ...mockUser, tenantId: null });
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);
      mockPrisma.tenantJoinRequest.findFirst.mockResolvedValueOnce({
        id: 'req-pending-1',
        userId: 'user-1',
        tenantId: mockTenant.id,
        status: TenantJoinRequestStatus.PENDING,
      });

      await expect(service.applyJoin('user-1', { tenantId: mockTenant.id })).rejects.toThrow('Yêu cầu gia nhập của bạn đang chờ phê duyệt');
      expect(mockPrisma.tenantJoinRequest.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException if user already has a PENDING request for another tenant', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ ...mockUser, tenantId: null });
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);
      mockPrisma.tenantJoinRequest.findFirst.mockResolvedValueOnce({
        id: 'req-pending-other',
        userId: 'user-1',
        tenantId: 'other-tenant',
        status: TenantJoinRequestStatus.PENDING,
      });

      await expect(service.applyJoin('user-1', { tenantId: mockTenant.id })).rejects.toThrow('đang có một yêu cầu gia nhập khác');
      expect(mockPrisma.tenantJoinRequest.create).not.toHaveBeenCalled();
    });
  });

  describe('cancelJoinRequest', () => {
    it('cancels a PENDING request owned by actor', async () => {
      mockPrisma.tenantJoinRequest.findUnique.mockResolvedValueOnce({
        id: 'req-1',
        userId: 'user-1',
        status: TenantJoinRequestStatus.PENDING,
      });
      mockPrisma.tenantJoinRequest.update.mockResolvedValueOnce({
        id: 'req-1',
        userId: 'user-1',
        status: TenantJoinRequestStatus.CANCELLED,
      });

      const result = await service.cancelJoinRequest('user-1', 'req-1');
      expect(result.status).toBe(TenantJoinRequestStatus.CANCELLED);
      expect(mockPrisma.tenantJoinRequest.update).toHaveBeenCalledWith({
        where: { id: 'req-1' },
        data: { status: TenantJoinRequestStatus.CANCELLED },
      });
    });

    it('throws NotFoundException if request not found', async () => {
      mockPrisma.tenantJoinRequest.findUnique.mockResolvedValueOnce(null);

      await expect(service.cancelJoinRequest('user-1', 'non-existent')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if actor does not own the request', async () => {
      mockPrisma.tenantJoinRequest.findUnique.mockResolvedValueOnce({
        id: 'req-1',
        userId: 'user-2',
        status: TenantJoinRequestStatus.PENDING,
      });

      await expect(service.cancelJoinRequest('user-1', 'req-1')).rejects.toThrow(ForbiddenException);
    });

    it('allows dismissing/cancelling a REJECTED request', async () => {
      mockPrisma.tenantJoinRequest.findUnique.mockResolvedValueOnce({
        id: 'req-rej',
        userId: 'user-1',
        status: TenantJoinRequestStatus.REJECTED,
      });
      mockPrisma.tenantJoinRequest.update.mockResolvedValueOnce({
        id: 'req-rej',
        userId: 'user-1',
        status: TenantJoinRequestStatus.CANCELLED,
      });

      const result = await service.cancelJoinRequest('user-1', 'req-rej');
      expect(result.status).toBe(TenantJoinRequestStatus.CANCELLED);
    });

    it('throws ConflictException if request is neither PENDING nor REJECTED', async () => {
      mockPrisma.tenantJoinRequest.findUnique.mockResolvedValueOnce({
        id: 'req-1',
        userId: 'user-1',
        status: TenantJoinRequestStatus.APPROVED,
      });

      await expect(service.cancelJoinRequest('user-1', 'req-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('myJoinRequest & me', () => {
    it('returns PENDING request when user has active join request and canCreate is true', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ ...mockUser, tenantId: null });
      const pendingReq = {
        id: 'req-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        status: TenantJoinRequestStatus.PENDING,
        tenant: { id: 'tenant-1', name: 'Acme Corp', description: 'Tech', owner: { id: 'o1', name: 'Owner', email: 'o@corp.com' } },
      };
      mockPrisma.tenantJoinRequest.findFirst.mockResolvedValueOnce(pendingReq);

      const result = await service.me('user-1');
      expect(result.tenant).toBeNull();
      expect(result.canCreate).toBe(true);
      expect(result.pendingRequest).toEqual(pendingReq);
    });

    it('returns REJECTED request when user has no PENDING request', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ ...mockUser, tenantId: null });
      const rejectedReq = {
        id: 'req-rej-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        status: TenantJoinRequestStatus.REJECTED,
        tenant: { id: 'tenant-1', name: 'Acme Corp', description: 'Tech', owner: { id: 'o1', name: 'Owner', email: 'o@corp.com' } },
      };
      // First findFirst (PENDING) returns null, second findFirst (REJECTED) returns rejectedReq
      mockPrisma.tenantJoinRequest.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(rejectedReq);

      const result = await service.me('user-1');
      expect(result.tenant).toBeNull();
      expect(result.canCreate).toBe(true);
      expect(result.pendingRequest).toEqual(rejectedReq);
      expect(result.pendingRequest?.status).toBe(TenantJoinRequestStatus.REJECTED);
    });
  });

  describe('listJoinRequests', () => {
    it('allows owner to list join requests for their tenant', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ ...mockUser, tenantId: mockTenant.id });
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);
      const requests = [
        { id: 'req-1', userId: 'user-2', tenantId: mockTenant.id, status: TenantJoinRequestStatus.PENDING },
      ];
      mockPrisma.tenantJoinRequest.findMany.mockResolvedValueOnce(requests);

      const result = await service.listJoinRequests('user-1', mockTenant.id);
      expect(result).toEqual(requests);
    });

    it('rejects regular members from listing join requests', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ ...mockUser, id: 'user-2', tenantId: mockTenant.id });
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);

      await expect(service.listJoinRequests('user-2', mockTenant.id)).rejects.toThrow(ForbiddenException);
    });

    it('blocks Super Admin who is not the tenant owner from listing join requests', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'admin-1', role: Role.ADMIN });
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);

      await expect(service.listJoinRequests('admin-1', mockTenant.id)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('approveJoinRequest', () => {
    const mockJoinReq = {
      id: 'req-1',
      userId: 'user-2',
      tenantId: mockTenant.id,
      status: TenantJoinRequestStatus.PENDING,
      tenant: mockTenant,
    };

    it('owner approves a pending request: assigns tenantId, approves request, cancels other pendings, logs audit', async () => {
      mockPrisma.tenantJoinRequest.findUnique.mockResolvedValueOnce(mockJoinReq);
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ ...mockUser, tenantId: mockTenant.id }) // actor
        .mockResolvedValueOnce({ id: 'user-2', email: 'user2@example.com', tenantId: null }); // target
      mockPrisma.user.update.mockResolvedValueOnce({ id: 'user-2', tenantId: mockTenant.id });
      mockPrisma.tenantJoinRequest.update.mockResolvedValueOnce({ ...mockJoinReq, status: TenantJoinRequestStatus.APPROVED });
      mockPrisma.tenantJoinRequest.updateMany.mockResolvedValueOnce({ count: 0 });
      mockPrisma.tenantAuditLog.create.mockResolvedValueOnce({});

      const result = await service.approveJoinRequest('user-1', 'req-1');
      expect(result.status).toBe(TenantJoinRequestStatus.APPROVED);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-2' },
        data: { tenantId: mockTenant.id },
      });
      expect(mockPrisma.tenantJoinRequest.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-2', status: TenantJoinRequestStatus.PENDING },
        data: { status: TenantJoinRequestStatus.CANCELLED },
      });
      expect(mockPrisma.tenantAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: 'MEMBER_JOIN_APPROVED' }),
      });
    });

    it('throws ConflictException if request is not PENDING', async () => {
      mockPrisma.tenantJoinRequest.findUnique.mockResolvedValueOnce({
        ...mockJoinReq,
        status: TenantJoinRequestStatus.APPROVED,
      });

      await expect(service.approveJoinRequest('user-1', 'req-1')).rejects.toThrow(ConflictException);
    });

    it('throws ForbiddenException if actor is not the owner (even for Super Admin)', async () => {
      mockPrisma.tenantJoinRequest.findUnique.mockResolvedValueOnce(mockJoinReq);
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'admin-1', role: Role.ADMIN });

      await expect(service.approveJoinRequest('admin-1', 'req-1')).rejects.toThrow(ForbiddenException);
    });

    it('cancels request with status check inside transaction and throws ConflictException if target user already belongs to another tenant', async () => {
      mockPrisma.tenantJoinRequest.findUnique.mockResolvedValueOnce(mockJoinReq);
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ ...mockUser, tenantId: mockTenant.id }) // actor
        .mockResolvedValueOnce({ id: 'user-2', email: 'user2@example.com', tenantId: 'other-tenant' }); // target
      mockPrisma.tenantJoinRequest.updateMany.mockResolvedValueOnce({ count: 1 });

      await expect(service.approveJoinRequest('user-1', 'req-1')).rejects.toThrow('Người dùng đã thuộc một doanh nghiệp khác');
      expect(mockPrisma.tenantJoinRequest.updateMany).toHaveBeenCalledWith({
        where: { id: 'req-1', status: TenantJoinRequestStatus.PENDING },
        data: { status: TenantJoinRequestStatus.CANCELLED },
      });
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('rejectJoinRequest', () => {
    it('owner rejects a pending request and logs audit', async () => {
      const mockJoinReq = {
        id: 'req-1',
        userId: 'user-2',
        tenantId: mockTenant.id,
        status: TenantJoinRequestStatus.PENDING,
        tenant: mockTenant,
      };
      mockPrisma.tenantJoinRequest.findUnique.mockResolvedValueOnce(mockJoinReq);
      mockPrisma.user.findUnique.mockResolvedValueOnce({ ...mockUser, tenantId: mockTenant.id });
      mockPrisma.tenantJoinRequest.update.mockResolvedValueOnce({ ...mockJoinReq, status: TenantJoinRequestStatus.REJECTED });
      mockPrisma.tenantAuditLog.create.mockResolvedValueOnce({});

      const result = await service.rejectJoinRequest('user-1', 'req-1', { reason: 'Không phù hợp' });
      expect(result.status).toBe(TenantJoinRequestStatus.REJECTED);
      expect(mockPrisma.tenantAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: 'MEMBER_JOIN_REJECTED', reason: 'Không phù hợp' }),
      });
    });

    it('rejects system admin who is not the owner from rejecting requests', async () => {
      const mockJoinReq = {
        id: 'req-1',
        userId: 'user-2',
        tenantId: mockTenant.id,
        status: TenantJoinRequestStatus.PENDING,
        tenant: mockTenant,
      };
      mockPrisma.tenantJoinRequest.findUnique.mockResolvedValueOnce(mockJoinReq);
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'admin-1', role: Role.ADMIN });

      await expect(service.rejectJoinRequest('admin-1', 'req-1')).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException if request is not PENDING', async () => {
      mockPrisma.tenantJoinRequest.findUnique.mockResolvedValueOnce({
        id: 'req-1',
        status: TenantJoinRequestStatus.REJECTED,
      });

      await expect(service.rejectJoinRequest('user-1', 'req-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('removeMember', () => {
    it('owner removes a member from the tenant and unsets tenantId', async () => {
      const member = { id: 'user-2', email: 'user2@corp.com', tenantId: mockTenant.id };
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ ...mockUser, tenantId: mockTenant.id }) // actor
        .mockResolvedValueOnce(member); // target
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);
      mockPrisma.user.update.mockResolvedValueOnce({ ...member, tenantId: null });
      mockPrisma.tenantAuditLog.create.mockResolvedValueOnce({});

      const result = await service.removeMember('user-1', mockTenant.id, 'user-2');
      expect(result.message).toContain('Đã loại thành viên');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-2' },
        data: { tenantId: null },
      });
      expect(mockPrisma.tenantAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: 'MEMBER_REMOVED' }),
      });
    });

    it('blocks owner from removing themselves', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ ...mockUser, tenantId: mockTenant.id });
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);

      await expect(service.removeMember('user-1', mockTenant.id, 'user-1')).rejects.toThrow(
        'Không thể loại chủ doanh nghiệp. Cần chuyển quyền sở hữu trước.'
      );
    });

    it('throws NotFoundException if target member is not in the tenant', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ ...mockUser, tenantId: mockTenant.id })
        .mockResolvedValueOnce({ id: 'user-3', tenantId: 'other-tenant' });
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);

      await expect(service.removeMember('user-1', mockTenant.id, 'user-3')).rejects.toThrow(NotFoundException);
    });

    it('blocks Super Admin who is not the tenant owner from removing members', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'admin-1', role: Role.ADMIN });
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant); // owner is user-1

      await expect(service.removeMember('admin-1', mockTenant.id, 'user-2')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('leave', () => {
    it('allows a regular member to leave tenant', async () => {
      const member = { id: 'user-2', email: 'member@corp.com', tenantId: mockTenant.id };
      mockPrisma.user.findUnique.mockResolvedValueOnce(member);
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);
      mockPrisma.user.update.mockResolvedValueOnce({ ...member, tenantId: null });
      mockPrisma.tenantAuditLog.create.mockResolvedValueOnce({});

      const result = await service.leave('user-2');
      expect(result.message).toContain('Bạn đã rời doanh nghiệp thành công');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-2' },
        data: { tenantId: null },
      });
      expect(mockPrisma.tenantAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: 'MEMBER_LEFT' }),
      });
    });

    it('blocks tenant owner from leaving without transferring first', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ ...mockUser, tenantId: mockTenant.id });
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);

      await expect(service.leave('user-1')).rejects.toThrow(
        'Chủ doanh nghiệp không thể rời doanh nghiệp. Cần chuyển quyền sở hữu cho thành viên khác trước.'
      );
    });

    it('blocks user who does not belong to any tenant', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ ...mockUser, tenantId: null });

      await expect(service.leave('user-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('audit', () => {
    const mockLogs = [
      { id: 'log-1', tenantId: 'tenant-1', action: 'OWNERSHIP_TRANSFERRED', createdAt: new Date() },
      { id: 'log-2', tenantId: 'tenant-2', action: 'DELETED', createdAt: new Date() },
    ];

    it('allows Super Admin to view global audit logs across all tenants', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'admin-1', role: Role.ADMIN });
      mockPrisma.tenantAuditLog.findMany.mockResolvedValueOnce(mockLogs);

      const result = await service.audit('admin-1');
      expect(result).toEqual(mockLogs);
      expect(mockPrisma.tenantAuditLog.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
    });

    it('blocks regular user or owner from viewing global audit logs', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'user-1', role: Role.USER });

      await expect(service.audit('user-1')).rejects.toThrow(
        'Chỉ Super Admin được xem toàn bộ nhật ký',
      );
      expect(mockPrisma.tenantAuditLog.findMany).not.toHaveBeenCalled();
    });

    it('allows tenant owner to view audit logs for their own tenant', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'user-1', role: Role.USER, tenantId: mockTenant.id });
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);
      mockPrisma.tenantAuditLog.findMany.mockResolvedValueOnce([mockLogs[0]]);

      const result = await service.audit('user-1', mockTenant.id);
      expect(result).toEqual([mockLogs[0]]);
      expect(mockPrisma.tenantAuditLog.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenant.id },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
    });

    it('blocks regular member from viewing audit logs of the tenant', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'user-2', role: Role.USER, tenantId: mockTenant.id });
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);

      await expect(service.audit('user-2', mockTenant.id)).rejects.toThrow(ForbiddenException);
    });

    it('allows Super Admin to view audit logs for a specific tenant', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'admin-1', role: Role.ADMIN });
      mockPrisma.tenantAuditLog.findMany.mockResolvedValueOnce([mockLogs[0]]);

      await expect(service.audit('admin-1', mockTenant.id)).resolves.toEqual([mockLogs[0]]);
      expect(mockPrisma.tenantAuditLog.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenant.id },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
    });

    it('blocks app_user token from viewing global audit logs even if User.role is ADMIN', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'admin-1', role: Role.ADMIN });

      await expect(service.audit({ userId: 'admin-1', type: 'app_user' })).rejects.toThrow(
        'Chỉ Super Admin được xem toàn bộ nhật ký',
      );
      expect(mockPrisma.tenantAuditLog.findMany).not.toHaveBeenCalled();
    });
  });

  describe('Role boundary and IDOR matrix (App Owner vs Tenant Owner vs System Admin)', () => {
    const appOwnerUser = {
      id: 'app-owner-1',
      email: 'appowner@example.com',
      name: 'App Owner User',
      role: Role.USER,
      tenantId: null as string | null,
    };

    it('IDOR: App Owner cannot access detail of another tenant they do not belong to', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(appOwnerUser);
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);

      await expect(service.detail(appOwnerUser.id, mockTenant.id)).rejects.toThrow(
        new ForbiddenException('Không được truy cập doanh nghiệp khác'),
      );
    });

    it('Cross-boundary: App Owner cannot approve join request of a tenant they do not own', async () => {
      mockPrisma.tenantJoinRequest.findUnique.mockResolvedValueOnce({
        id: 'req-1',
        status: TenantJoinRequestStatus.PENDING,
        userId: 'applicant-1',
        tenantId: mockTenant.id,
        tenant: mockTenant,
      });
      mockPrisma.user.findUnique.mockResolvedValueOnce(appOwnerUser);

      await expect(service.approveJoinRequest(appOwnerUser.id, 'req-1')).rejects.toThrow(
        new ForbiddenException('Chỉ chủ doanh nghiệp mới có quyền phê duyệt yêu cầu gia nhập'),
      );
    });

    it('Cross-boundary: App Owner cannot remove members from a tenant they do not own', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(appOwnerUser);
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);

      await expect(service.removeMember(appOwnerUser.id, mockTenant.id, 'user-2')).rejects.toThrow(
        new ForbiddenException('Chỉ chủ doanh nghiệp được thực hiện thao tác này'),
      );
    });

    it('Cross-boundary: App Owner cannot update or delete a tenant they do not own', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(appOwnerUser);
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);

      await expect(service.update(appOwnerUser.id, mockTenant.id, { name: 'Hacked Name' })).rejects.toThrow(
        new ForbiddenException('Chỉ chủ doanh nghiệp hoặc Super Admin mới có quyền cập nhật thông tin doanh nghiệp'),
      );

      mockPrisma.user.findUnique.mockResolvedValueOnce(appOwnerUser);
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);

      await expect(service.delete(appOwnerUser.id, mockTenant.id)).rejects.toThrow(
        new ForbiddenException('Chỉ chủ doanh nghiệp hoặc Super Admin mới có quyền xóa doanh nghiệp này'),
      );
    });

    it('Tenant Owner has no platform admin rights: cannot view global audit without tenantId', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'owner-1',
        role: Role.USER,
        tenantId: mockTenant.id,
      });

      await expect(service.audit('owner-1')).rejects.toThrow(
        new ForbiddenException('Chỉ Super Admin được xem toàn bộ nhật ký'),
      );
    });

    it('Tenant Owner list query only filters by their own tenantId', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'owner-1',
        role: Role.USER,
        tenantId: mockTenant.id,
      });
      mockPrisma.tenant.findMany.mockResolvedValueOnce([mockTenant]);

      const result = await service.list('owner-1');
      expect(mockPrisma.tenant.findMany).toHaveBeenCalledWith({
        where: { id: mockTenant.id },
        include: expect.anything(),
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([mockTenant]);
    });

    it('System Admin can update tenant info, but cannot bypass Tenant Owner to remove members directly', async () => {
      const adminUser = { id: 'admin-1', role: Role.ADMIN, tenantId: null };

      // Update is allowed for Super Admin
      mockPrisma.user.findUnique.mockResolvedValueOnce(adminUser);
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);
      mockPrisma.tenant.update.mockResolvedValueOnce({ ...mockTenant, name: 'Admin Renamed' });
      mockPrisma.tenantAuditLog.create.mockResolvedValueOnce({});

      const updated = await service.update(adminUser.id, mockTenant.id, { name: 'Admin Renamed' });
      expect(updated.name).toBe('Admin Renamed');

      // Try remove member directly (only owner can remove)
      mockPrisma.user.findUnique.mockResolvedValueOnce(adminUser);
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);

      await expect(service.removeMember(adminUser.id, mockTenant.id, 'user-2')).rejects.toThrow(
        new ForbiddenException('Chỉ chủ doanh nghiệp được thực hiện thao tác này'),
      );
    });
  });

  describe('lookup', () => {
    it('returns basic tenant info when found', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ ...mockUser, tenantId: null });
      mockPrisma.tenant.findUnique.mockResolvedValueOnce({
        id: 'tenant-1',
        name: 'Acme Corp',
        description: 'Tech company',
        owner: { id: 'owner-1', email: 'owner@example.com', name: 'Owner' },
        _count: { users: 5 },
      });

      const result = await service.lookup('user-1', 'tenant-1');
      expect(result).toEqual({
        id: 'tenant-1',
        name: 'Acme Corp',
        description: 'Tech company',
        ownerEmail: 'o***r@example.com',
        ownerName: 'Owner',
        memberCount: 5,
      });
    });

    it('throws NotFoundException when tenant is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ ...mockUser, tenantId: null });
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(null);

      await expect(service.lookup('user-1', 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMembers', () => {
    it('allows a tenant member to view the member list', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ ...mockUser, tenantId: 'tenant-1' });
      mockPrisma.tenant.findUnique.mockResolvedValueOnce({ id: 'tenant-1', ownerUserId: 'owner-1' });
      mockPrisma.user.findMany.mockResolvedValueOnce([
        { id: 'owner-1', email: 'owner@example.com', name: 'Owner', createdAt: new Date() },
        { id: 'user-1', email: 'user1@example.com', name: 'User One', createdAt: new Date() },
      ]);

      const result = await service.getMembers('user-1', 'tenant-1');
      expect(result).toHaveLength(2);
      expect(result[0].isOwner).toBe(true);
      expect(result[1].isOwner).toBe(false);
    });

    it('rejects an outsider from viewing tenant members', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ ...mockUser, tenantId: 'other-tenant', role: Role.USER });
      mockPrisma.tenant.findUnique.mockResolvedValueOnce({ id: 'tenant-1', ownerUserId: 'owner-1' });

      await expect(service.getMembers('user-1', 'tenant-1')).rejects.toThrow(ForbiddenException);
    });
  });
});

