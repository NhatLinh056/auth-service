import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { AppStatus, Role } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { JwtPayload } from '../common/strategies/jwt.strategy.js';
import { CreateApplicationDto } from './dto/create-application.dto.js';
import { UpdateApplicationDto } from './dto/update-application.dto.js';

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sinh mã AppID ngẫu nhiên (ví dụ: app_a1b2c3d4e5f6g7h8)
   */
  generateAppId(): string {
    return `app_${randomBytes(8).toString('hex')}`;
  }

  /**
   * Sinh mã AppToken bảo mật (chuỗi 64 ký tự hex ngẫu nhiên)
   */
  generateAppToken(): string {
    return `apt_${randomBytes(32).toString('hex')}`;
  }

  /**
   * Tạo ứng dụng mới:
   * - Nếu là ADMIN và có chỉ định userId, kiểm tra tính tồn tại của user đó và gán sở hữu.
   * - Ngược lại, ứng dụng luôn thuộc về tài khoản người dùng hiện tại (currentUser.sub).
   * - Tự động sinh appId và appToken.
   */
  async create(createAppDto: CreateApplicationDto, currentUser: JwtPayload) {
    let targetUserId = currentUser.sub;

    if (createAppDto.userId && currentUser.role === Role.ADMIN) {
      const targetUser = await this.prisma.user.findUnique({
        where: { id: createAppDto.userId },
      });

      if (!targetUser) {
        throw new NotFoundException('Không tìm thấy người dùng được chỉ định');
      }

      targetUserId = createAppDto.userId;
    }

    const appId = this.generateAppId();
    const appToken = this.generateAppToken();

    return this.prisma.application.create({
      data: {
        name: createAppDto.name,
        appId,
        appToken,
        status: AppStatus.ACTIVE,
        userId: targetUserId,
      },
    });
  }

  /**
   * Lấy danh sách ứng dụng:
   * - Nếu là ADMIN: Lấy tất cả các ứng dụng trong hệ thống.
   * - Nếu là USER thường: Chỉ lấy các ứng dụng do chính mình sở hữu (userId = currentUser.sub).
   */
  async findAll(currentUser: JwtPayload) {
    const where = currentUser.role === Role.ADMIN ? {} : { userId: currentUser.sub };

    return this.prisma.application.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Lấy chi tiết ứng dụng theo ID:
   * - Ném 404 NotFoundException nếu không tìm thấy ứng dụng.
   * - Nếu là USER thường: chỉ được xem ứng dụng của chính mình, ngược lại ném 403 ForbiddenException.
   * - Nếu là ADMIN: được xem chi tiết bất kỳ ứng dụng nào.
   */
  async findById(id: string, currentUser: JwtPayload) {
    const application = await this.prisma.application.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException('Không tìm thấy ứng dụng với ID này');
    }

    if (currentUser.role !== Role.ADMIN && application.userId !== currentUser.sub) {
      throw new ForbiddenException('Bạn không có quyền truy cập ứng dụng của người khác');
    }

    return application;
  }

  /**
   * Cập nhật thông tin ứng dụng:
   * - Ném 404 NotFoundException nếu không tìm thấy ứng dụng.
   * - Nếu là USER thường: chỉ được cập nhật ứng dụng của chính mình, ngược lại ném 403 ForbiddenException.
   * - Nếu là ADMIN: được cập nhật bất kỳ ứng dụng nào.
   */
  async update(
    id: string,
    updateAppDto: UpdateApplicationDto,
    currentUser: JwtPayload,
  ) {
    const existingApp = await this.prisma.application.findUnique({
      where: { id },
    });

    if (!existingApp) {
      throw new NotFoundException('Không tìm thấy ứng dụng với ID này');
    }

    if (currentUser.role !== Role.ADMIN && existingApp.userId !== currentUser.sub) {
      throw new ForbiddenException('Bạn không có quyền cập nhật ứng dụng của người khác');
    }

    return this.prisma.application.update({
      where: { id },
      data: {
        ...(updateAppDto.name !== undefined && { name: updateAppDto.name }),
        ...(updateAppDto.status !== undefined && { status: updateAppDto.status }),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }
}
