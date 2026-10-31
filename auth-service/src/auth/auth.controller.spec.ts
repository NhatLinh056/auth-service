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
    extractRedirectUriFromState: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
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

  describe('initiateOAuth', () => {
    it('nên gọi oauthService.getAuthorizationUrl và redirect', async () => {
      mockOAuthService.getAuthorizationUrl.mockResolvedValue('https://accounts.google.com/o/oauth2/auth');
      const mockRes = {
        redirect: vi.fn(),
      } as any;

      await controller.initiateOAuth('google', 'http://localhost:3001/auth/callback', mockRes);

      expect(mockOAuthService.getAuthorizationUrl).toHaveBeenCalledWith(
        'google',
        'http://localhost:3001/auth/callback',
      );
      expect(mockRes.redirect).toHaveBeenCalledWith('https://accounts.google.com/o/oauth2/auth');
    });
  });

  describe('handleOAuthCallback', () => {
    it('nên redirect về redirectUri của client kèm token và thông tin người dùng', async () => {
      mockOAuthService.handleCallback.mockResolvedValue({
        accessToken: 'mock_jwt_token',
        user: { id: 'u1', email: 'test@gmail.com', name: 'Test Google', role: 'USER' },
        redirectUri: 'http://localhost:3001/auth/callback',
      });

      const mockRes = {
        redirect: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      await controller.handleOAuthCallback('google', { code: 'c123', state: 's123' }, mockRes);

      expect(mockRes.redirect).toHaveBeenCalled();
      const redirectedUrl = mockRes.redirect.mock.calls[0][0];
      expect(redirectedUrl).toContain('token=mock_jwt_token');
      expect(redirectedUrl).toContain('email=test%40gmail.com');
    });

    it('nên trả về JSON nếu format=json được truyền', async () => {
      const mockResult = {
        accessToken: 'mock_jwt_token',
        user: { id: 'u1', email: 'test@gmail.com', name: 'Test Google', role: 'USER' },
        redirectUri: 'http://localhost:3001/auth/callback',
      };
      mockOAuthService.handleCallback.mockResolvedValue(mockResult);

      const mockRes = {
        redirect: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      await controller.handleOAuthCallback(
        'google',
        { code: 'c123', state: 's123', format: 'json' },
        mockRes,
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        accessToken: mockResult.accessToken,
        user: mockResult.user,
        redirectUri: mockResult.redirectUri,
      });
    });

    it('nên redirect về client kèm query error khi OAuth bị từ chối hoặc người dùng hủy', async () => {
      mockOAuthService.handleCallback.mockRejectedValue(
        new UnauthorizedException('Nhà cung cấp OAuth từ chối xác thực: Permissions error'),
      );
      mockOAuthService.extractRedirectUriFromState.mockReturnValue('http://localhost:3001/');

      const mockRes = {
        redirect: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      await controller.handleOAuthCallback(
        'facebook',
        { error: 'access_denied', error_description: 'Permissions error', state: 's123' },
        mockRes,
      );

      expect(mockRes.redirect).toHaveBeenCalled();
      const redirectUrl = mockRes.redirect.mock.calls[0][0];
      expect(redirectUrl).toContain('http://localhost:3001/');
      expect(redirectUrl).toContain('error=');
    });

    it('nên ném lỗi nếu format=json được truyền và xảy ra lỗi OAuth', async () => {
      mockOAuthService.handleCallback.mockRejectedValue(
        new UnauthorizedException('OAuth failed'),
      );

      const mockRes = {
        redirect: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      await expect(
        controller.handleOAuthCallback('google', { error: 'access_denied', format: 'json' }, mockRes),
      ).rejects.toThrow(UnauthorizedException);
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
