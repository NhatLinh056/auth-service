import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { Prisma, User } from '../generated/prisma/client.js';
import { Role } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tự động khởi tạo hoặc đồng bộ tài khoản quản trị mẫu (admin@example.com / Admin123!)
   */
  async onModuleInit() {
    try {
      await this.ensureDefaultAdmin();
    } catch (err: any) {
      this.logger.warn(`Lỗi khi khởi tạo tài khoản Admin mặc định: ${err.message}`);
    }
  }

  async ensureDefaultAdmin(): Promise<void> {
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com';
    const existing = await this.prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!existing) {
      const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin123!';
      const passwordHash = await bcrypt.hash(defaultPassword, 10);
      await this.prisma.user.create({
        data: {
          email: adminEmail,
          passwordHash,
          name: 'Administrator',
          role: Role.ADMIN,
        },
      });
      this.logger.log(`Đã khởi tạo tài khoản quản trị mặc định: ${adminEmail}`);
    } else {
      this.logger.log(`Tài khoản quản trị đã sẵn sàng: ${adminEmail}`);
    }
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, type?: 'platform' | 'app_user'): Promise<any | null> {
    // Nếu JWT khai báo rõ type='app_user' → tìm thẳng trong app_users, không qua users
    if (type === 'app_user') {
      const appUser = await (this.prisma as any).appUser.findUnique({
        where: { id },
        include: {
          application: {
            select: {
              appId: true,
              name: true,
            },
          },
        },
      });
      if (!appUser) return null;
      return {
        id: appUser.id,
        email: appUser.email,
        name: appUser.name,
        role: appUser.role,
        avatarUrl: appUser.avatarUrl,
        appId: appUser.application?.appId,
        appName: appUser.application?.name,
        isAppUser: true,
        createdAt: appUser.createdAt,
        updatedAt: appUser.updatedAt,
      };
    }

    // type='platform' hoặc không có type (backwards-compat token cũ) → tìm trong users trước
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (user) return user;

    // Fallback: token cũ (không có type) có thể là AppUser → thử lookup
    if (type === undefined) {
      const appUser = await (this.prisma as any).appUser.findUnique({
        where: { id },
        include: {
          application: {
            select: {
              appId: true,
              name: true,
            },
          },
        },
      });

      if (appUser) {
        return {
          id: appUser.id,
          email: appUser.email,
          name: appUser.name,
          role: appUser.role,
          avatarUrl: appUser.avatarUrl,
          appId: appUser.application?.appId,
          appName: appUser.application?.name,
          isAppUser: true,
          createdAt: appUser.createdAt,
          updatedAt: appUser.updatedAt,
        };
      }
    }

    return null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<User> {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
