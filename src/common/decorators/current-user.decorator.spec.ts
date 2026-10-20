import { ExecutionContext } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { Role } from '../../generated/prisma/enums.js';
import { getCurrentUserByContext } from './current-user.decorator.js';

describe('CurrentUser Decorator', () => {
  const createMockContext = (user?: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  it('nên trả về null nếu không có user trong request', () => {
    const context = createMockContext(undefined);
    const result = getCurrentUserByContext(undefined, context);
    expect(result).toBeNull();
  });

  it('nên trả về toàn bộ user payload khi không truyền thuộc tính cụ thể', () => {
    const mockUser = {
      sub: 'user-uuid-123',
      email: 'test@example.com',
      role: Role.USER,
    };
    const context = createMockContext(mockUser);
    const result = getCurrentUserByContext(undefined, context);
    expect(result).toEqual(mockUser);
  });

  it('nên trích xuất đúng trường "sub" khi truyền data là "sub"', () => {
    const mockUser = {
      sub: 'user-uuid-123',
      email: 'test@example.com',
      role: Role.USER,
    };
    const context = createMockContext(mockUser);
    const result = getCurrentUserByContext('sub', context);
    expect(result).toBe('user-uuid-123');
  });

  it('nên trích xuất đúng trường "role" khi truyền data là "role"', () => {
    const mockUser = {
      sub: 'admin-uuid-456',
      email: 'admin@example.com',
      role: Role.ADMIN,
    };
    const context = createMockContext(mockUser);
    const result = getCurrentUserByContext('role', context);
    expect(result).toBe(Role.ADMIN);
  });

  it('nên trích xuất đúng trường "email" khi truyền data là "email"', () => {
    const mockUser = {
      sub: 'user-uuid-789',
      email: 'user789@example.com',
      role: Role.USER,
    };
    const context = createMockContext(mockUser);
    const result = getCurrentUserByContext('email', context);
    expect(result).toBe('user789@example.com');
  });
});
