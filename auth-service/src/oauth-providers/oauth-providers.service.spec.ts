import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OAuthProviderType } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { OAuthProvidersService } from './oauth-providers.service.js';

describe('OAuthProvidersService', () => {
  let service: OAuthProvidersService;
  let mockPrismaService: {
    oAuthProvider: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };

  const sampleGoogleProvider = {
    id: 'prov-1',
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

  describe('findAll', () => {
    it('nên trả về danh sách provider đã che giấu clientSecret và có cờ hasSecret', async () => {
      mockPrismaService.oAuthProvider.findMany.mockResolvedValue([
        sampleGoogleProvider,
        sampleFacebookProvider,
      ]);

      const result = await service.findAll();
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
      mockPrismaService.oAuthProvider.findUnique.mockResolvedValue(sampleGoogleProvider);

      const result = await service.findByProvider('google');
      expect(result.provider).toBe(OAuthProviderType.GOOGLE);
      expect(result.hasSecret).toBe(true);
      expect((result as any).clientSecret).toBeUndefined();
    });

    it('nên ném NotFoundException nếu provider không tồn tại trong DB', async () => {
      mockPrismaService.oAuthProvider.findUnique.mockResolvedValue(null);

      await expect(service.findByProvider('google')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getInternalConfig', () => {
    it('nên trả về dữ liệu nội bộ bao gồm clientSecret cho server-side flow', async () => {
      mockPrismaService.oAuthProvider.findUnique.mockResolvedValue(sampleGoogleProvider);

      const result = await service.getInternalConfig(OAuthProviderType.GOOGLE);
      expect(result.clientSecret).toBe('google-secret-xyz');
    });

    it('nên ném NotFoundException nếu provider chưa có cấu hình', async () => {
      mockPrismaService.oAuthProvider.findUnique.mockResolvedValue(null);

      await expect(service.getInternalConfig(OAuthProviderType.GOOGLE)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('nên cập nhật cấu hình và trả về dữ liệu an toàn', async () => {
      mockPrismaService.oAuthProvider.findUnique.mockResolvedValue(sampleGoogleProvider);
      mockPrismaService.oAuthProvider.update.mockResolvedValue({
        ...sampleGoogleProvider,
        clientId: 'new-google-id',
        clientSecret: 'new-google-secret',
        isEnabled: false,
      });

      const result = await service.update('google', {
        clientId: 'new-google-id',
        clientSecret: 'new-google-secret',
        isEnabled: false,
      });

      expect(result.clientId).toBe('new-google-id');
      expect(result.isEnabled).toBe(false);
      expect(result.hasSecret).toBe(true);
      expect((result as any).clientSecret).toBeUndefined();
    });

    it('nên ném NotFoundException nếu cập nhật provider không tồn tại', async () => {
      mockPrismaService.oAuthProvider.findUnique.mockResolvedValue(null);

      await expect(service.update('google', { isEnabled: true })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('toggle', () => {
    it('nên đổi trạng thái từ enabled sang disabled thành công', async () => {
      mockPrismaService.oAuthProvider.findUnique.mockResolvedValue(sampleGoogleProvider);
      mockPrismaService.oAuthProvider.update.mockResolvedValue({
        ...sampleGoogleProvider,
        isEnabled: false,
      });

      const result = await service.toggle('google');
      expect(result.isEnabled).toBe(false);
    });

    it('nên ném BadRequestException nếu bật provider mà thiếu clientId hoặc clientSecret', async () => {
      mockPrismaService.oAuthProvider.findUnique.mockResolvedValue(sampleFacebookProvider);

      await expect(service.toggle('facebook')).rejects.toThrow(BadRequestException);
    });
  });
});
