import { SetMetadata } from '@nestjs/common';
import { Role } from '../../generated/prisma/enums.js';

export const ROLES_KEY = 'roles';

/**
 * Decorator @Roles() dùng để khai báo các vai trò (Role) được phép truy cập endpoint.
 * Ví dụ: @Roles(Role.ADMIN) hoặc @Roles(Role.ADMIN, Role.USER)
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
