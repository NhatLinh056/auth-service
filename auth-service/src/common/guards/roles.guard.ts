import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../generated/prisma/enums.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

/**
 * RolesGuard kiểm tra vai trò người dùng (user.role) có nằm trong danh sách
 * vai trò được yêu cầu bởi decorator @Roles() hay không.
 *
 * 1. Nếu route được đánh dấu @Public() -> Cho phép truy cập ngay.
 * 2. Nếu route không yêu cầu @Roles() cụ thể -> Cho phép truy cập.
 * 3. Nếu route có @Roles(...) -> Kiểm tra user.role khớp một trong các roles yêu cầu.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Kiểm tra nếu endpoint được đánh dấu công khai
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // 2. Đọc metadata danh sách vai trò yêu cầu từ decorator @Roles()
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Nếu endpoint không yêu cầu vai trò cụ thể nào, cho phép truy cập
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    // Nếu không có thông tin user hoặc user chưa có role
    if (!user || !user.role) {
      throw new ForbiddenException('Bạn không có quyền truy cập tài nguyên này');
    }

    const hasRole = requiredRoles.includes(user.role as Role);
    if (!hasRole) {
      throw new ForbiddenException('Bạn không có quyền truy cập tài nguyên này');
    }

    return true;
  }
}
