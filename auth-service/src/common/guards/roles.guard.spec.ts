import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '../../generated/prisma/enums.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { RolesGuard } from './roles.guard.js';

describe('RolesGuard', () => {
  const mockReflector = {
    getAllAndOverride: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockReflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return false;
      return undefined;
    });
  });

  const createMockContext = (user?: any): ExecutionContext => {
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  it('nên cho phép truy cập nếu endpoint được đánh dấu @Public()', () => {
    mockReflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return true;
      if (key === ROLES_KEY) return [Role.ADMIN];
      return undefined;
    });
    const guard = new RolesGuard(mockReflector as unknown as Reflector);
    const context = createMockContext(undefined);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('nên cho phép truy cập nếu endpoint không yêu cầu role (không có metadata)', () => {
    mockReflector.getAllAndOverride.mockImplementation(() => undefined);
    const guard = new RolesGuard(mockReflector as unknown as Reflector);
    const context = createMockContext();

    expect(guard.canActivate(context)).toBe(true);
  });

  it('nên cho phép truy cập nếu requiredRoles là mảng rỗng', () => {
    mockReflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === ROLES_KEY) return [];
      return false;
    });
    const guard = new RolesGuard(mockReflector as unknown as Reflector);
    const context = createMockContext();

    expect(guard.canActivate(context)).toBe(true);
  });

  it('nên ném lỗi ForbiddenException nếu không có user trong request', () => {
    mockReflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === ROLES_KEY) return [Role.ADMIN];
      return false;
    });
    const guard = new RolesGuard(mockReflector as unknown as Reflector);
    const context = createMockContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('nên ném lỗi ForbiddenException nếu user không có trường role', () => {
    mockReflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === ROLES_KEY) return [Role.ADMIN];
      return false;
    });
    const guard = new RolesGuard(mockReflector as unknown as Reflector);
    const context = createMockContext({ id: '123', email: 'test@example.com' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('nên ném lỗi ForbiddenException nếu role của user không khớp với requiredRoles', () => {
    mockReflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === ROLES_KEY) return [Role.ADMIN];
      return false;
    });
    const guard = new RolesGuard(mockReflector as unknown as Reflector);
    const context = createMockContext({ id: '123', email: 'user@example.com', role: Role.USER });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('nên cho phép truy cập nếu user có role ADMIN khớp với yêu cầu', () => {
    mockReflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === ROLES_KEY) return [Role.ADMIN];
      return false;
    });
    const guard = new RolesGuard(mockReflector as unknown as Reflector);
    const context = createMockContext({ id: '123', email: 'admin@example.com', role: Role.ADMIN });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('nên cho phép truy cập nếu requiredRoles cho phép nhiều role và user khớp 1 trong số đó', () => {
    mockReflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === ROLES_KEY) return [Role.ADMIN, Role.USER];
      return false;
    });
    const guard = new RolesGuard(mockReflector as unknown as Reflector);
    const context = createMockContext({ id: '123', email: 'user@example.com', role: Role.USER });

    expect(guard.canActivate(context)).toBe(true);
  });
});
