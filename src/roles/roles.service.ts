import { Injectable } from '@nestjs/common';
import { Role } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface RoleInfo {
  role: Role;
  name: string;
  description: string;
}

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Danh sách các vai trò (roles) được hỗ trợ trong hệ thống
   */
  private readonly rolesList: RoleInfo[] = [
    {
      role: Role.ADMIN,
      name: 'Administrator',
      description: 'Quản trị viên hệ thống có toàn quyền quản trị và truy cập tài nguyên',
    },
    {
      role: Role.USER,
      name: 'User',
      description: 'Người dùng tiêu chuẩn với quyền hạn thao tác tài nguyên cá nhân',
    },
  ];

  /**
   * Lấy danh sách tất cả các role trong hệ thống
   */
  getRoles(): RoleInfo[] {
    return this.rolesList;
  }

  /**
   * Kiểm tra một chuỗi có phải là Role hợp lệ hay không
   */
  isValidRole(role: string): role is Role {
    return Object.values(Role).includes(role as Role);
  }

  /**
   * Kiểm tra xem vai trò có phải là ADMIN hay không
   */
  isAdmin(role: string): boolean {
    return role === Role.ADMIN;
  }

  /**
   * Lấy thông tin thống kê người dùng dành riêng cho ADMIN
   */
  async getAdminDashboard() {
    const totalUsers = await this.prisma.user.count();
    const adminCount = await this.prisma.user.count({
      where: { role: Role.ADMIN },
    });
    const userCount = await this.prisma.user.count({
      where: { role: Role.USER },
    });

    return {
      message: 'Chào mừng Quản trị viên đến bảng điều khiển hệ thống',
      stats: {
        totalUsers,
        adminCount,
        userCount,
      },
    };
  }
}
