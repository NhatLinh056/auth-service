import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { Role } from '../../generated/prisma/enums.js';
import { OwnerOrAdminGuard } from './owner-or-admin.guard.js';

describe('OwnerOrAdminGuard', () => {
  const guard = new OwnerOrAdminGuard();

  const createMockContext = (user?: any, params?: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user, params }),
      }),
    } as unknown as ExecutionContext;
  };

  it('nên ném ForbiddenException nếu không có user trong request', () => {
    const context = createMockContext(undefined, { id: 'target-id' });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('nên cho phép truy cập nếu user có role ADMIN (dù id không khớp)', () => {
    const context = createMockContext(
      { sub: 'admin-id', role: Role.ADMIN },
      { id: 'user-id-to-modify' },
    );
    expect(guard.canActivate(context)).toBe(true);
  });

  it('nên cho phép truy cập nếu user là chủ sở hữu (sub === id)', () => {
    const context = createMockContext(
      { sub: 'my-own-id', role: Role.USER },
      { id: 'my-own-id' },
    );
    expect(guard.canActivate(context)).toBe(true);
  });

  it('nên ném ForbiddenException nếu user thường cố thao tác trên id của người khác', () => {
    const context = createMockContext(
      { sub: 'hacker-user-id', role: Role.USER },
      { id: 'victim-user-id' },
    );
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
