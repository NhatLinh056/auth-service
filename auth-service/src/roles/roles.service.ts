import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { JwtPayload } from '../common/strategies/jwt.strategy.js';
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
   * Gán hoặc thay đổi vai trò của người dùng với quy tắc an toàn:
   * 1. Không tự hạ quyền của chính mình
   * 2. Không hạ quyền Admin cuối cùng của hệ thống
   * 3. Cơ chế transaction + PostgreSQL advisory lock chống Race Condition khi có nhiều yêu cầu hạ quyền đồng thời
   */
  async assignRole(assignRoleDto: AssignRoleDto, currentUser?: JwtPayload) {
    const { userId, role } = assignRoleDto;

    // 1. Kiểm tra an toàn: Không cho phép tự hạ quyền của chính mình
    if (currentUser && currentUser.sub === userId && role !== Role.ADMIN) {
      throw new BadRequestException('Không thể tự hạ quyền Quản trị viên (ADMIN) của chính mình.');
    }

    const executeInTx = async (tx: any) => {
      // 2. Kiểm tra người dùng có tồn tại trong hệ thống hay không
      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException(`Không tìm thấy người dùng với ID: ${userId}`);
      }

      // 3. Kiểm tra an toàn: Không cho phép hạ quyền Quản trị viên cuối cùng của hệ thống
      if (user.role === Role.ADMIN && role !== Role.ADMIN) {
        // Thực hiện khóa an toàn chống Race Condition khi có 2 yêu cầu hạ quyền đồng thời
        // Sử dụng PostgreSQL advisory lock trong transaction (0x524F4C45 - 'ROLE' trong ASCII)
        if (typeof tx.$executeRaw === 'function') {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(1380994117)`;
        }

        const adminCount = await tx.user.count({
          where: { role: Role.ADMIN },
        });

        if (adminCount <= 1) {
          throw new BadRequestException('Không thể hạ quyền Quản trị viên (ADMIN) cuối cùng của hệ thống.');
        }
      }

      // 4. Cập nhật vai trò mới cho người dùng
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { role },
      });

      // 5. Loại bỏ passwordHash để đảm bảo an toàn thông tin
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash: _, ...sanitizedUser } = updatedUser;

      return {
        message: `Đã gán vai trò ${role} cho người dùng thành công`,
        user: sanitizedUser,
      };
    };

    if (typeof this.prisma.$transaction === 'function') {
      return this.prisma.$transaction(executeInTx);
    }
    return executeInTx(this.prisma);
  }
}
