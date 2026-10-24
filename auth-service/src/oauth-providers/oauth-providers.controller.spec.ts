import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OAuthProviderType } from '../generated/prisma/enums.js';
import { OAuthProvidersController } from './oauth-providers.controller.js';
import {
  OAuthProvidersService,
  SanitizedOAuthProvider,
} from './oauth-providers.service.js';

describe('OAuthProvidersController', () => {
  let controller: OAuthProvidersController;
  let mockService: {
    findAll: ReturnType<typeof vi.fn>;
    findByProvider: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    toggle: ReturnType<typeof vi.fn>;
  };

  const sampleSanitized: SanitizedOAuthProvider = {
    id: 'prov-1',
    provider: OAuthProviderType.GOOGLE,
    name: 'Google',
    isEnabled: true,
    clientId: 'google-client-id',
    callbackUrl: 'http://localhost:3000/auth/oauth/google/callback',
    hasSecret: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockService = {
      findAll: vi.fn(),
      findByProvider: vi.fn(),
      update: vi.fn(),
      toggle: vi.fn(),
    };
    controller = new OAuthProvidersController(
      mockService as unknown as OAuthProvidersService,
    );
  });

  it('nên được khởi tạo thành công', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('nên gọi service.findAll và trả về danh sách sanitized', async () => {
      mockService.findAll.mockResolvedValue([sampleSanitized]);

      const result = await controller.findAll();
      expect(result).toEqual([sampleSanitized]);
      expect(mockService.findAll).toHaveBeenCalledOnce();
    });
  });

  describe('findByProvider', () => {
    it('nên gọi service.findByProvider với đúng tham số', async () => {
      mockService.findByProvider.mockResolvedValue(sampleSanitized);

      const result = await controller.findByProvider('google');
      expect(result).toEqual(sampleSanitized);
      expect(mockService.findByProvider).toHaveBeenCalledWith('google');
    });
  });

  describe('update', () => {
    it('nên gọi service.update với đúng body DTO', async () => {
      const dto = { clientId: 'updated-id', isEnabled: true };
      mockService.update.mockResolvedValue({ ...sampleSanitized, ...dto });

      const result = await controller.update('google', dto);
      expect(result.clientId).toBe('updated-id');
      expect(mockService.update).toHaveBeenCalledWith('google', dto);
    });
  });

  describe('toggle', () => {
    it('nên gọi service.toggle để đổi trạng thái', async () => {
      mockService.toggle.mockResolvedValue({ ...sampleSanitized, isEnabled: false });

      const result = await controller.toggle('google');
      expect(result.isEnabled).toBe(false);
      expect(mockService.toggle).toHaveBeenCalledWith('google');
    });
  });
});
