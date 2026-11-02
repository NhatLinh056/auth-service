import { OAuthGrantsService } from './oauth-grants.service.js';
import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { OAuthService } from './oauth.service.js';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    getPublicProviders: vi.fn(),
  };

  const mockOAuthService = {
    getAuthorizationUrl: vi.fn(),
    handleCallback: vi.fn(),
    getErrorRedirectUri: vi.fn(),
    checkOAuthAvailability: vi.fn(),
    extractRedirectUriFromState: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockOAuthService.getErrorRedirectUri.mockResolvedValue(null);
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        OAuthGrantsService,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: OAuthService,
          useValue: mockOAuthService,
        },
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should call authService.register and return the result', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Nguyen Van A',
      };

      const expectedResult = {
        id: 'some-uuid',
        email: 'test@example.com',
        name: 'Nguyen Van A',
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAuthService.register.mockResolvedValue(expectedResult);

      const result = await controller.register(registerDto);

      expect(result).toEqual(expectedResult);
      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('login', () => {
    it('should call authService.login and return token and user', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const expectedResult = {
        accessToken: 'jwt_token_123',
        user: {
          id: 'user-id',
          email: 'test@example.com',
          name: 'Nguyen Van A',
          role: 'USER',
        },
      };

      mockAuthService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto);

      expect(result).toEqual(expectedResult);
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('logout', () => {
    it('should call authService.logout and return a success message', () => {
      const expectedResult = {
        message: 'Đăng xuất thành công. Vui lòng xóa token khỏi client.',
      };

      mockAuthService.logout.mockReturnValue(expectedResult);

      const result = controller.logout();

      expect(result).toEqual(expectedResult);
      expect(mockAuthService.logout).toHaveBeenCalledTimes(1);
    });
  });

  describe('getProviders', () => {
    it('nên gọi authService.getPublicProviders và trả về danh sách public providers', async () => {
      const mockProviders = [
        { provider: 'google', name: 'Google', enabled: true },
        { provider: 'facebook', name: 'Facebook', enabled: false },
      ];
      mockAuthService.getPublicProviders.mockResolvedValue(mockProviders);

      const result = await controller.getProviders();
      expect(result).toEqual(mockProviders);
      expect(mockAuthService.getPublicProviders).toHaveBeenCalledOnce();
    });
  });

  describe('OAuth browser boundary', () => {
    const response = () => ({ redirect: vi.fn(), cookie: vi.fn(), clearCookie: vi.fn(), setHeader: vi.fn() }) as any;
    it('binds OAuth state to an HttpOnly browser cookie', async () => {
      mockOAuthService.getAuthorizationUrl.mockResolvedValue('https://accounts.google.com/auth?state=s123');
      const res = response();
      await controller.initiateOAuth('google', 'http://localhost:3001/', res, 'app1', 'a'.repeat(43));
      expect(res.cookie).toHaveBeenCalledWith('oauth_state', 's123', expect.objectContaining({ httpOnly: true, sameSite: 'lax' }));
    });
    it('redirects with a one-time code and never a token or profile', async () => {
      mockOAuthService.handleCallback.mockResolvedValue({ accessToken: 'secret-jwt', user: { id: 'u1' }, redirectUri: 'http://localhost:3001/', appId: 'app1', codeChallenge: 'a'.repeat(43) });
      const res = response();
      await controller.handleOAuthCallback('google', { code: 'provider-code', state: 's123' }, res, { headers: { cookie: 'oauth_state=s123' } } as any);
      const url = new URL(res.redirect.mock.calls[0][0]);
      expect(url.searchParams.get('code')).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(url.searchParams.has('token')).toBe(false);
      expect(url.searchParams.has('email')).toBe(false);
    });
    it('rejects callbacks without a browser cookie', async () => {
      await expect(controller.handleOAuthCallback('google', { state: 's123' }, response(), { headers: {} } as any)).rejects.toThrow(UnauthorizedException);
      expect(mockOAuthService.handleCallback).not.toHaveBeenCalled();
    });
    it('rejects a mismatched browser state', async () => {
      await expect(controller.handleOAuthCallback('google', { state: 's123' }, response(), { headers: { cookie: 'oauth_state=other' } } as any)).rejects.toThrow(UnauthorizedException);
    });
    it('does not redirect to unverified state on provider failure', async () => {
      mockOAuthService.handleCallback.mockRejectedValue(new UnauthorizedException('Denied'));
      const res = response();
      await expect(controller.handleOAuthCallback('google', { state: 's123', error: 'denied' }, res, { headers: { cookie: 'oauth_state=s123' } } as any)).rejects.toThrow(UnauthorizedException);
      expect(res.redirect).not.toHaveBeenCalled();
    });
    it('returns to a verified portal URL when the provider cancels sign-in', async () => {
      mockOAuthService.handleCallback.mockRejectedValue(new UnauthorizedException('Denied'));
      mockOAuthService.getErrorRedirectUri.mockResolvedValue('http://localhost:3001/');
      const res = response();
      await controller.handleOAuthCallback('google', { state: 's123', error: 'access_denied' }, res,
        { headers: { cookie: 'oauth_state=s123' } } as any);
      const location = new URL(res.redirect.mock.calls[0][0]);
      expect(location.origin).toBe('http://localhost:3001');
      expect(location.searchParams.get('error')).toBe('oauth_cancelled');
    });
  });

  describe('verifyService', () => {
    it('nên trả về valid: true và thông tin ứng dụng khi được gọi với app', () => {
      const mockApp = {
        id: 'app-uuid-1',
        name: 'Order Service',
        appId: 'app_1234567890abcdef12345678',
        status: 'ACTIVE',
        adminEmails: [],
        userId: 'user-uuid-1',
        user: {
          id: 'user-uuid-1',
          email: 'user@example.com',
          name: 'User Name',
        },
      };

      const result = controller.verifyService(mockApp);

      expect(result).toEqual({
        valid: true,
        message: 'Xác thực dịch vụ thành công',
        application: mockApp,
      });
    });
  });
});
