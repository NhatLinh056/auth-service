import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AssignRoleDto } from './dto/assign-role.dto.js';

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
   * Kiểm tra xem vai trò có phải là USER hay không
   */
  isUser(role: string): boolean {
    return role === Role.USER;
  }

  /**
   * Lấy thông tin không gian người dùng cơ bản (USER)
   */
  getUserSpaceInfo(userId: string) {
    return {
      message: 'Chào mừng người dùng đến không gian cá nhân',
      userId,
      permissions: [
        'READ_PROFILE',
        'UPDATE_PROFILE',
        'VIEW_PUBLIC_DATA',
      ],
    };
  }

  /**
   * Tra cứu vai trò và thông tin phân quyền của một người dùng theo ID
   */
  async getUserRole(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID: ${userId}`);
    }

    const roleInfo = this.rolesList.find((r) => r.role === user.role);

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      roleName: roleInfo?.name || user.role,
      description: roleInfo?.description || '',
    };
  }

  /**
   * Gán hoặc thay đổi vai trò của người dùng
   */
  async assignRole(assignRoleDto: AssignRoleDto) {
    const { userId, role } = assignRoleDto;

    // 1. Kiểm tra người dùng có tồn tại trong hệ thống hay không
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID: ${userId}`);
    }

    // 2. Cập nhật vai trò mới cho người dùng
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    // 3. Loại bỏ passwordHash để đảm bảo an toàn thông tin
    const { passwordHash: _, ...sanitizedUser } = updatedUser;

    return {
      message: `Đã gán vai trò ${role} cho người dùng thành công`,
      user: sanitizedUser,
    };
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
