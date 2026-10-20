import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { Role } from '../../generated/prisma/enums.js';
import { RolesGuard } from './roles.guard.js';

describe('RolesGuard', () => {
  const mockReflector = {
    getAllAndOverride: vi.fn(),
  };

  const createMockContext = (user?: any): ExecutionContext => {
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  it('nên cho phép truy cập nếu endpoint không yêu cầu role (không có metadata)', () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);
    const guard = new RolesGuard(mockReflector as unknown as Reflector);
    const context = createMockContext();

    expect(guard.canActivate(context)).toBe(true);
  });

  it('nên cho phép truy cập nếu requiredRoles là mảng rỗng', () => {
    mockReflector.getAllAndOverride.mockReturnValue([]);
    const guard = new RolesGuard(mockReflector as unknown as Reflector);
    const context = createMockContext();

    expect(guard.canActivate(context)).toBe(true);
  });

  it('nên ném lỗi ForbiddenException nếu không có user trong request', () => {
    mockReflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    const guard = new RolesGuard(mockReflector as unknown as Reflector);
    const context = createMockContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('nên ném lỗi ForbiddenException nếu user không có trường role', () => {
    mockReflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    const guard = new RolesGuard(mockReflector as unknown as Reflector);
    const context = createMockContext({ id: '123', email: 'test@example.com' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('nên ném lỗi ForbiddenException nếu role của user không khớp với requiredRoles', () => {
    mockReflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    const guard = new RolesGuard(mockReflector as unknown as Reflector);
    const context = createMockContext({ id: '123', email: 'user@example.com', role: Role.USER });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('nên cho phép truy cập nếu user có role ADMIN khớp với yêu cầu', () => {
    mockReflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    const guard = new RolesGuard(mockReflector as unknown as Reflector);
    const context = createMockContext({ id: '123', email: 'admin@example.com', role: Role.ADMIN });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('nên cho phép truy cập nếu requiredRoles cho phép nhiều role và user khớp 1 trong số đó', () => {
    mockReflector.getAllAndOverride.mockReturnValue([Role.ADMIN, Role.USER]);
    const guard = new RolesGuard(mockReflector as unknown as Reflector);
    const context = createMockContext({ id: '123', email: 'user@example.com', role: Role.USER });

    expect(guard.canActivate(context)).toBe(true);
  });
});
