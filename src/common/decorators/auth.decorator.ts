import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Role } from '../../generated/prisma/enums.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { RolesGuard } from '../guards/roles.guard.js';
import { Roles } from './roles.decorator.js';

/**
 * Decorator @Auth(...roles) kết hợp chuẩn hóa giữa Authentication và Authorization:
 *
 * 1. Khi gọi @Auth():
 *    - Chỉ yêu cầu XÁC THỰC (Authentication): Kiểm tra JWT token hợp lệ qua JwtAuthGuard.
 *    - Nếu thiếu token hoặc sai token -> 401 Unauthorized.
 *
 * 2. Khi gọi @Auth(Role.ADMIN, ...):
 *    - Yêu cầu cả XÁC THỰC (Authentication) VÀ PHÂN QUYỀN (Authorization):
 *      Chạy JwtAuthGuard trước (xác minh danh tính), sau đó chạy RolesGuard (so khớp vai trò).
 *    - Nếu chưa đăng nhập -> 401 Unauthorized.
 *    - Nếu đã đăng nhập nhưng không đủ quyền -> 403 Forbidden.
 */
export function Auth(...roles: Role[]) {
  if (roles.length > 0) {
    return applyDecorators(
      Roles(...roles),
      UseGuards(JwtAuthGuard, RolesGuard),
      ApiBearerAuth(),
      ApiResponse({
        status: 401,
        description: 'Chưa xác thực danh tính / Token không hợp lệ',
      }),
      ApiResponse({
        status: 403,
        description: 'Không có quyền truy cập tài nguyên này (yêu cầu vai trò phù hợp)',
      }),
    );
  }

  return applyDecorators(
    UseGuards(JwtAuthGuard),
    ApiBearerAuth(),
    ApiResponse({
      status: 401,
      description: 'Chưa xác thực danh tính / Token không hợp lệ',
    }),
  );
}
