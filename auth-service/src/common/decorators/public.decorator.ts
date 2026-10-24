import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator @Public() dùng để đánh dấu một endpoint hoặc controller là công khai (Public API),
 * không yêu cầu xác thực JWT hay phân quyền.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
