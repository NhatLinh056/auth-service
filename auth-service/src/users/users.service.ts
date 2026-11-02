import { ConflictException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
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
    if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEMO_SEED !== 'true') return;
    try {
      await this.ensureDefaultAdmin();
    } catch (err: any) {
      this.logger.warn(`Lỗi khi khởi tạo tài khoản Admin mặc định: ${err.message}`);
    }
  }

  async ensureDefaultAdmin(): Promise<void> {
    if (process.env.NODE_ENV === 'production') throw new Error('Demo admin creation is disabled in production');
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
          user: {
            include: {
              tenant: { select: { id: true, name: true, ownerUserId: true } },
              identities: { select: { provider: true, providerScope: true, email: true } },
            },
          },
          application: {
            select: {
              appId: true,
              name: true,
              oauthProviders: { select: { provider: true, clientId: true } },
            },
          },
        },
      });
      if (!appUser?.user) return null;
      return {
        id: appUser.id,
        userId: appUser.user.id,
        email: appUser.user.email,
        emailVerifiedAt: appUser.user.emailVerifiedAt,
        name: appUser.user.name,
        linkedAccounts: appUser.user.identities.filter((identity: any) =>
          identity.provider === 'GOOGLE' ? identity.providerScope === 'google' :
            appUser.application.oauthProviders.some((config: any) =>
              config.provider === identity.provider && config.clientId === identity.providerScope),
        ).map((identity: any) => ({ provider: identity.provider.toLowerCase(), email: identity.email })),
        role: appUser.role,
        avatarUrl: appUser.avatarUrl,
        appId: appUser.application?.appId,
        appName: appUser.application?.name,
        isAppUser: true,
        tenantId: appUser.user.tenantId || null,
        tenantName: appUser.user.tenant?.name || null,
        isTenantOwner: appUser.user.tenant ? appUser.user.tenant.ownerUserId === appUser.user.id : false,
        createdAt: appUser.createdAt,
        updatedAt: appUser.updatedAt,
      };
    }

    // type='platform' hoặc không có type (backwards-compat token cũ) → tìm trong users trước
    const user = await (this.prisma as any).user.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, name: true, ownerUserId: true } },
      },
    });
    if (user) {
      return {
        ...user,
        tenantId: user.tenantId || null,
        tenantName: user.tenant?.name || null,
        isTenantOwner: user.tenant ? user.tenant.ownerUserId === user.id : false,
      };
    }

    return null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const matches = await this.prisma.user.findMany({
      where: { email: { equals: email.trim().toLowerCase(), mode: 'insensitive' } },
      take: 2,
    });
    return matches.length === 1 ? matches[0] : null;
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<User> {
    try {
      return await this.prisma.user.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException('Cần chuyển quyền sở hữu doanh nghiệp trước khi xóa tài khoản');
      }
      throw error;
    }
  }
}
