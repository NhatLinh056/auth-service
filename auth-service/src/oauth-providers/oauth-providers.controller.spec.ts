import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OAuthProviderType, Role } from '../generated/prisma/enums.js';
import type { JwtPayload } from '../common/strategies/jwt.strategy.js';
import { OAuthProvidersController } from './oauth-providers.controller.js';
import {
  OAuthProvidersService,
  SanitizedOAuthProvider,
} from './oauth-providers.service.js';

describe('OAuthProvidersController', () => {
  let controller: OAuthProvidersController;
  let mockService: {
    findAllByApplication: ReturnType<typeof vi.fn>;
    findByProvider: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    toggle: ReturnType<typeof vi.fn>;
  };

  const mockUser: JwtPayload = {
    sub: 'user-uuid-1',
    email: 'user@example.com',
    role: Role.USER,
  };

  const sampleSanitized: SanitizedOAuthProvider = {
    id: 'prov-1',
    applicationId: 'app-uuid-1',
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
      findAllByApplication: vi.fn(),
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
    it('nên gọi service.findAllByApplication và trả về danh sách sanitized', async () => {
      mockService.findAllByApplication.mockResolvedValue([sampleSanitized]);

      const result = await controller.findAll('app-uuid-1', mockUser);
      expect(result).toEqual([sampleSanitized]);
      expect(mockService.findAllByApplication).toHaveBeenCalledWith('app-uuid-1', mockUser);
    });
  });

  describe('findByProvider', () => {
    it('nên gọi service.findByProvider với đúng tham số', async () => {
      mockService.findByProvider.mockResolvedValue(sampleSanitized);

      const result = await controller.findByProvider('app-uuid-1', 'google', mockUser);
      expect(result).toEqual(sampleSanitized);
      expect(mockService.findByProvider).toHaveBeenCalledWith('app-uuid-1', 'google', mockUser);
    });
  });

  describe('update', () => {
    it('nên gọi service.update với đúng body DTO', async () => {
      const dto = { clientId: 'updated-id', isEnabled: true };
      mockService.update.mockResolvedValue({ ...sampleSanitized, ...dto });

      const result = await controller.update('app-uuid-1', 'google', dto, mockUser);
      expect(result.clientId).toBe('updated-id');
      expect(mockService.update).toHaveBeenCalledWith('app-uuid-1', 'google', dto, mockUser);
    });
  });

  describe('toggle', () => {
    it('nên gọi service.toggle để đổi trạng thái', async () => {
      mockService.toggle.mockResolvedValue({ ...sampleSanitized, isEnabled: false });

      const result = await controller.toggle('app-uuid-1', 'google', mockUser);
      expect(result.isEnabled).toBe(false);
      expect(mockService.toggle).toHaveBeenCalledWith('app-uuid-1', 'google', mockUser);
    });
  });
});
