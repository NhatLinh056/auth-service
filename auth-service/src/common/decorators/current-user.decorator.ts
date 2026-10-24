import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../strategies/jwt.strategy.js';

/**
 * Factory function trích xuất thông tin người dùng từ request.user
 */
export function getCurrentUserByContext(
  data: keyof JwtPayload | undefined,
  ctx: ExecutionContext,
) {
  const request = ctx.switchToHttp().getRequest();
  const user = request.user;

  if (!user) {
    return null;
  }

  return data ? user[data] : user;
}

/**
 * Decorator @CurrentUser(prop?) dùng để trích xuất thông tin người dùng từ request.user
 * sau khi đã qua JwtAuthGuard:
 *
 * Ví dụ sử dụng:
 *   - @CurrentUser() user: JwtPayload       -> Lấy toàn bộ payload ({ sub, email, role })
 *   - @CurrentUser('sub') userId: string    -> Lấy UUID của người dùng
 *   - @CurrentUser('role') role: string     -> Lấy vai trò của người dùng
 *   - @CurrentUser('email') email: string   -> Lấy email của người dùng
 */
export const CurrentUser = createParamDecorator(getCurrentUserByContext);
