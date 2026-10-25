import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OAuthProviderType, Role } from '../generated/prisma/enums.js';
import type { JwtPayload } from '../common/strategies/jwt.strategy.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { OAuthProvidersService } from './oauth-providers.service.js';

describe('OAuthProvidersService', () => {
  let service: OAuthProvidersService;
  let mockPrismaService: {
    application: {
      findUnique: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    oAuthProvider: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };

  const mockApp = {
    id: 'app-uuid-1',
    name: 'Order Service',
    appId: 'app_1234567890abcdef12345678',
    status: 'ACTIVE',
    userId: 'user-uuid-1',
  };

  const mockOwnerUser: JwtPayload = {
    sub: 'user-uuid-1',
    email: 'owner@example.com',
    role: Role.USER,
  };

  const mockOtherUser: JwtPayload = {
    sub: 'other-user-uuid',
    email: 'other@example.com',
    role: Role.USER,
  };

  const mockAdminUser: JwtPayload = {
    sub: 'admin-uuid',
    email: 'admin@example.com',
    role: Role.ADMIN,
  };

  const sampleGoogleProvider = {
    id: 'prov-1',
    applicationId: 'app-uuid-1',
    provider: OAuthProviderType.GOOGLE,
    name: 'Google',
    isEnabled: true,
    clientId: 'google-client-id-123',
    clientSecret: 'google-secret-xyz',
    callbackUrl: 'http://localhost:3000/auth/oauth/google/callback',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const sampleFacebookProvider = {
    id: 'prov-2',
    applicationId: 'app-uuid-1',
    provider: OAuthProviderType.FACEBOOK,
    name: 'Facebook',
    isEnabled: false,
    clientId: null,
    clientSecret: null,
    callbackUrl: 'http://localhost:3000/auth/oauth/facebook/callback',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrismaService = {
      application: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      oAuthProvider: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    };
    service = new OAuthProvidersService(mockPrismaService as unknown as PrismaService);
  });

  it('nên được khởi tạo thành công', () => {
    expect(service).toBeDefined();
  });

  describe('normalizeProvider', () => {
    it('nên chuẩn hóa đúng chuỗi google và facebook hoa/thường', () => {
      expect(service.normalizeProvider('google')).toBe(OAuthProviderType.GOOGLE);
      expect(service.normalizeProvider('GOOGLE')).toBe(OAuthProviderType.GOOGLE);
      expect(service.normalizeProvider('facebook')).toBe(OAuthProviderType.FACEBOOK);
      expect(service.normalizeProvider('FACEBOOK')).toBe(OAuthProviderType.FACEBOOK);
    });

    it('nên ném BadRequestException nếu truyền provider không hỗ trợ', () => {
      expect(() => service.normalizeProvider('github')).toThrow(BadRequestException);
      expect(() => service.normalizeProvider('microsoft')).toThrow(BadRequestException);
    });
  });

  describe('verifyApplicationAccess', () => {
    it('nên ném NotFoundException nếu Application không tồn tại', async () => {
      mockPrismaService.application.findUnique.mockResolvedValue(null);
      await expect(service.verifyApplicationAccess('invalid-id', mockOwnerUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('nên cho phép chủ sở hữu truy cập Application', async () => {
      mockPrismaService.application.findUnique.mockResolvedValue(mockApp);
      const res = await service.verifyApplicationAccess('app-uuid-1', mockOwnerUser);
      expect(res).toEqual(mockApp);
    });

    it('nên cho phép ADMIN truy cập bất kỳ Application nào', async () => {
      mockPrismaService.application.findUnique.mockResolvedValue(mockApp);
      const res = await service.verifyApplicationAccess('app-uuid-1', mockAdminUser);
      expect(res).toEqual(mockApp);
    });

    it('nên ném ForbiddenException nếu User khác cố truy cập Application', async () => {
      mockPrismaService.application.findUnique.mockResolvedValue(mockApp);
      await expect(service.verifyApplicationAccess('app-uuid-1', mockOtherUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findAllByApplication', () => {
    it('nên trả về danh sách provider đã che giấu clientSecret và có cờ hasSecret', async () => {
      mockPrismaService.application.findUnique.mockResolvedValue(mockApp);
      mockPrismaService.oAuthProvider.findMany.mockResolvedValue([
        sampleGoogleProvider,
        sampleFacebookProvider,
      ]);

      const result = await service.findAllByApplication('app-uuid-1', mockOwnerUser);
      expect(result).toHaveLength(2);

      const google = result.find((p) => p.provider === OAuthProviderType.GOOGLE);
      expect(google).toBeDefined();
      expect(google?.clientId).toBe('google-client-id-123');
      expect(google?.hasSecret).toBe(true);
      expect((google as any).clientSecret).toBeUndefined();

      const facebook = result.find((p) => p.provider === OAuthProviderType.FACEBOOK);
      expect(facebook).toBeDefined();
      expect(facebook?.clientId).toBeNull();
      expect(facebook?.hasSecret).toBe(false);
      expect((facebook as any).clientSecret).toBeUndefined();
    });
  });

  describe('findByProvider', () => {
    it('nên tìm thấy provider và loại bỏ clientSecret', async () => {
      mockPrismaService.application.findUnique.mockResolvedValue(mockApp);
      mockPrismaService.oAuthProvider.findUnique.mockResolvedValue(sampleGoogleProvider);

      const result = await service.findByProvider('app-uuid-1', 'google', mockOwnerUser);
      expect(result.provider).toBe(OAuthProviderType.GOOGLE);
      expect(result.hasSecret).toBe(true);
      expect((result as any).clientSecret).toBeUndefined();
    });

    it('nên ném NotFoundException nếu provider không tồn tại trong DB', async () => {
      mockPrismaService.application.findUnique.mockResolvedValue(mockApp);
      mockPrismaService.oAuthProvider.findUnique.mockResolvedValue(null);

      await expect(
        service.findByProvider('app-uuid-1', 'google', mockOwnerUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getInternalConfig', () => {
    it('nên trả về dữ liệu nội bộ bao gồm clientSecret cho server-side flow', async () => {
      mockPrismaService.application.findFirst.mockResolvedValue(mockApp);
      mockPrismaService.oAuthProvider.findUnique.mockResolvedValue(sampleGoogleProvider);

      const result = await service.getInternalConfig('app_1234567890abcdef12345678', OAuthProviderType.GOOGLE);
      expect(result.clientSecret).toBe('google-secret-xyz');
    });

    it('nên ném NotFoundException nếu provider chưa có cấu hình', async () => {
      mockPrismaService.application.findFirst.mockResolvedValue(mockApp);
      mockPrismaService.oAuthProvider.findUnique.mockResolvedValue(null);

      await expect(
        service.getInternalConfig('app_1234567890abcdef12345678', OAuthProviderType.GOOGLE),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('nên cập nhật cấu hình và trả về dữ liệu an toàn', async () => {
      mockPrismaService.application.findUnique.mockResolvedValue(mockApp);
      mockPrismaService.oAuthProvider.findUnique.mockResolvedValue(sampleGoogleProvider);
      mockPrismaService.oAuthProvider.update.mockResolvedValue({
        ...sampleGoogleProvider,
        clientId: 'new-google-id',
        clientSecret: 'new-google-secret',
        isEnabled: false,
      });

      const result = await service.update(
        'app-uuid-1',
        'google',
        {
          clientId: 'new-google-id',
          clientSecret: 'new-google-secret',
          isEnabled: false,
        },
        mockOwnerUser,
      );

      expect(result.clientId).toBe('new-google-id');
      expect(result.isEnabled).toBe(false);
      expect(result.hasSecret).toBe(true);
      expect((result as any).clientSecret).toBeUndefined();
    });

    it('nên ném NotFoundException nếu cập nhật provider không tồn tại', async () => {
      mockPrismaService.application.findUnique.mockResolvedValue(mockApp);
      mockPrismaService.oAuthProvider.findUnique.mockResolvedValue(null);

      await expect(
        service.update('app-uuid-1', 'google', { isEnabled: true }, mockOwnerUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('toggle', () => {
    it('nên đổi trạng thái từ enabled sang disabled thành công', async () => {
      mockPrismaService.application.findUnique.mockResolvedValue(mockApp);
      mockPrismaService.oAuthProvider.findUnique.mockResolvedValue(sampleGoogleProvider);
      mockPrismaService.oAuthProvider.update.mockResolvedValue({
        ...sampleGoogleProvider,
        isEnabled: false,
      });

      const result = await service.toggle('app-uuid-1', 'google', mockOwnerUser);
      expect(result.isEnabled).toBe(false);
    });

    it('nên ném BadRequestException nếu bật provider mà thiếu clientId hoặc clientSecret', async () => {
      mockPrismaService.application.findUnique.mockResolvedValue(mockApp);
      mockPrismaService.oAuthProvider.findUnique.mockResolvedValue(sampleFacebookProvider);

      await expect(
        service.toggle('app-uuid-1', 'facebook', mockOwnerUser),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
