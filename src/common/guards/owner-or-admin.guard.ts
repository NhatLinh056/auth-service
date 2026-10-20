import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '../../generated/prisma/enums.js';

/**
 * OwnerOrAdminGuard kiểm tra quyền sở hữu tài nguyên hoặc vai trò Quản trị viên:
 * 1. Nếu người dùng có vai trò ADMIN -> Cho phép thực hiện (ADMIN có toàn quyền).
 * 2. Nếu người dùng thao tác trên tài nguyên của chính mình (user.sub === params.id) -> Cho phép thực hiện.
 * 3. Nếu người dùng thường cố tình thao tác trên tài nguyên của người khác -> Ném 403 Forbidden.
 */
@Injectable()
export class OwnerOrAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const targetId = request.params?.id;

    if (!user) {
      throw new ForbiddenException('Bạn chưa được xác thực danh tính');
    }

    // 1. Quản trị viên (ADMIN) có toàn quyền truy cập và thao tác
    if (user.role === Role.ADMIN) {
      return true;
    }

    // 2. Chủ sở hữu tài nguyên (Resource Owner) được phép thao tác trên tài nguyên của chính mình
    if (targetId && user.sub === targetId) {
      return true;
    }

    // 3. Người dùng thường khác không có quyền can thiệp vào tài khoản người khác
    throw new ForbiddenException('Bạn không có quyền thao tác trên tài khoản của người khác');
  }
}
