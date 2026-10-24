import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    getPublicProviders: vi.fn(),
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

  describe('verifyService', () => {
    it('nên trả về valid: true và thông tin ứng dụng khi được gọi với app', () => {
      const mockApp = {
        id: 'app-uuid-1',
        name: 'Order Service',
        appId: 'app_1234567890abcdef12345678',
        status: 'ACTIVE',
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
