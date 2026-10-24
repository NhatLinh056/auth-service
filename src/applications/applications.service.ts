import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { AppStatus, Role } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { JwtPayload } from '../common/strategies/jwt.strategy.js';
import { CreateApplicationDto } from './dto/create-application.dto.js';

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
}
