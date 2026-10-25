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
    const adminEmail = 'admin@example.com';
    const existing = await this.prisma.user.findUnique({
      where: { email: adminEmail },
    });

    const passwordHash = await bcrypt.hash('Admin123!', 10);

    if (!existing) {
      await this.prisma.user.create({
        data: {
          email: adminEmail,
          passwordHash,
          name: 'Administrator',
          role: Role.ADMIN,
        },
      });
      this.logger.log('Đã tạo tài khoản quản trị mặc định: admin@example.com / Admin123!');
    } else {
      await this.prisma.user.update({
        where: { email: adminEmail },
        data: {
          passwordHash,
          role: Role.ADMIN,
          name: existing.name || 'Administrator',
        },
      });
      this.logger.log('Đã đồng bộ tài khoản quản trị: admin@example.com / Admin123!');
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

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
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
