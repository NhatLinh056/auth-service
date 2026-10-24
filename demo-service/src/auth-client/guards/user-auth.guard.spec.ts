import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { UserAuthGuard } from './user-auth.guard.js';
import { AuthClientService } from '../auth-client.service.js';

describe('UserAuthGuard', () => {
  let guard: UserAuthGuard;
  let authClientService: AuthClientService;

  beforeEach(() => {
    authClientService = {
      verifyUserToken: vi.fn(),
    } as any;
    guard = new UserAuthGuard(authClientService);
  });

  function createMockContext(headers: Record<string, string>): ExecutionContext {
    const request = { headers, user: null };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  it('should throw UnauthorizedException if Authorization header is missing', async () => {
    const context = createMockContext({});
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if Authorization header does not start with Bearer', async () => {
    const context = createMockContext({ authorization: 'Basic 12345' });
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should delegate token verification to AuthClientService and attach req.user', async () => {
    const context = createMockContext({ authorization: 'Bearer user.jwt.test' });
    const mockUser = { id: 'usr-123', email: 'alice@example.com', role: 'USER' };

    vi.spyOn(authClientService, 'verifyUserToken').mockResolvedValueOnce(mockUser as any);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(authClientService.verifyUserToken).toHaveBeenCalledWith('user.jwt.test');
    expect(context.switchToHttp().getRequest().user).toEqual(mockUser);
  });
});
