import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppStatus, Role } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AppAuthGuard } from './app-auth.guard.js';

describe('AppAuthGuard', () => {
  let guard: AppAuthGuard;
  let mockPrismaService: {
    application: {
      findUnique: ReturnType<typeof vi.fn>;
    };
  };

  const mockApp = {
    id: 'app-uuid-1',
    name: 'Order Microservice',
    appId: 'app_1234567890abcdef12345678',
    appToken: 'apt_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    status: AppStatus.ACTIVE,
    userId: 'user-uuid-1',
    user: {
      id: 'user-uuid-1',
      email: 'owner@example.com',
      name: 'Owner Name',
      role: Role.USER,
    },
  };

  const createMockContext = (headers: Record<string, string | undefined>) => {
    const request: any = { headers };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    mockPrismaService = {
      application: {
        findUnique: vi.fn(),
      },
    };

    guard = new AppAuthGuard(mockPrismaService as unknown as PrismaService);
  });

  it('nên cho phép request khi cung cấp đúng X-App-Id và X-App-Token và gán request.application', async () => {
    mockPrismaService.application.findUnique.mockResolvedValue(mockApp);

    const context = createMockContext({
      'x-app-id': mockApp.appId,
      'x-app-token': mockApp.appToken,
    });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    const req = context.switchToHttp().getRequest();
    expect(req.application).toEqual(mockApp);
    expect(mockPrismaService.application.findUnique).toHaveBeenCalledWith({
      where: { appId: mockApp.appId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
    });
  });

  it('nên ném 401 Unauthorized khi thiếu header x-app-id', async () => {
    const context = createMockContext({
      'x-app-token': mockApp.appToken,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    expect(mockPrismaService.application.findUnique).not.toHaveBeenCalled();
  });

  it('nên ném 401 Unauthorized khi thiếu header x-app-token', async () => {
    const context = createMockContext({
      'x-app-id': mockApp.appId,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    expect(mockPrismaService.application.findUnique).not.toHaveBeenCalled();
  });

  it('nên ném 401 Unauthorized khi thiếu cả hai headers', async () => {
    const context = createMockContext({});

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    expect(mockPrismaService.application.findUnique).not.toHaveBeenCalled();
  });

  it('nên ném 401 Unauthorized khi không tìm thấy appId trong cơ sở dữ liệu', async () => {
    mockPrismaService.application.findUnique.mockResolvedValue(null);

    const context = createMockContext({
      'x-app-id': 'non-existent-app',
      'x-app-token': 'any-token',
    });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('nên ném 401 Unauthorized khi appToken không trùng khớp với database', async () => {
    mockPrismaService.application.findUnique.mockResolvedValue(mockApp);

    const context = createMockContext({
      'x-app-id': mockApp.appId,
      'x-app-token': 'wrong-token',
    });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('nên ném 403 Forbidden khi ứng dụng ở trạng thái INACTIVE', async () => {
    const inactiveApp = { ...mockApp, status: AppStatus.INACTIVE };
    mockPrismaService.application.findUnique.mockResolvedValue(inactiveApp);

    const context = createMockContext({
      'x-app-id': inactiveApp.appId,
      'x-app-token': inactiveApp.appToken,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });
});
