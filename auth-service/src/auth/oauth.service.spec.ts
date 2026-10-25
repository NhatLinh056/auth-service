import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OAuthProviderType, Role } from '../generated/prisma/enums.js';
import { OAuthProvidersService } from '../oauth-providers/oauth-providers.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { OAuthService } from './oauth.service.js';

describe('OAuthService', () => {
  let service: OAuthService;
  let mockPrisma: any;
  let mockOAuthProvidersService: any;
  let mockJwtService: any;

  const sampleGoogleConfig = {
    id: 'prov-1',
    provider: OAuthProviderType.GOOGLE,
    name: 'Google',
    isEnabled: true,
    clientId: 'google-client-id-123',
    clientSecret: 'google-client-secret-xyz',
    callbackUrl: 'http://localhost:3000/auth/oauth/google/callback',
  };

  const sampleFacebookConfig = {
    id: 'prov-2',
    provider: OAuthProviderType.FACEBOOK,
    name: 'Facebook',
    isEnabled: true,
    clientId: 'facebook-app-id-456',
    clientSecret: 'facebook-app-secret-abc',
    callbackUrl: 'http://localhost:3000/auth/oauth/facebook/callback',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma = {
      application: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'app-uuid-1',
          name: 'Demo App',
          appId: 'app_123',
          status: 'ACTIVE',
        }),
        findUnique: vi.fn().mockResolvedValue({
          id: 'app-uuid-1',
          name: 'Demo App',
          appId: 'app_123',
          status: 'ACTIVE',
        }),
      },
      oAuthIdentity: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
    };

    mockOAuthProvidersService = {
      normalizeProvider: vi.fn().mockImplementation((input: string) => {
        const u = input.toUpperCase();
        if (u === 'GOOGLE') return OAuthProviderType.GOOGLE;
        if (u === 'FACEBOOK') return OAuthProviderType.FACEBOOK;
        throw new BadRequestException('Unsupported');
      }),
      getInternalConfig: vi.fn(),
    };

    mockJwtService = {
      signAsync: vi.fn().mockResolvedValue('signed_state_or_jwt_token'),
      verifyAsync: vi.fn(),
    };

    service = new OAuthService(
      mockPrisma as unknown as PrismaService,
      mockOAuthProvidersService as unknown as OAuthProvidersService,
      mockJwtService as unknown as JwtService,
    );
  });

  it('nên được khởi tạo thành công', () => {
    expect(service).toBeDefined();
  });

  describe('getAuthorizationUrl', () => {
    it('nên ném BadRequestException nếu provider bị vô hiệu hóa (disabled)', async () => {
      mockOAuthProvidersService.getInternalConfig.mockResolvedValueOnce({
        ...sampleGoogleConfig,
        isEnabled: false,
      });

      await expect(service.getAuthorizationUrl('google')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('nên ném BadRequestException nếu provider chưa cấu hình clientId hoặc clientSecret', async () => {
      mockOAuthProvidersService.getInternalConfig.mockResolvedValueOnce({
        ...sampleGoogleConfig,
        clientId: null,
      });

      await expect(service.getAuthorizationUrl('google')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('nên sinh authorization URL hợp lệ cho Google kèm state đã ký', async () => {
      mockOAuthProvidersService.getInternalConfig.mockResolvedValueOnce(sampleGoogleConfig);

      const url = await service.getAuthorizationUrl('google', 'http://localhost:3001/auth/callback');

      expect(url).toContain('accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain('client_id=google-client-id-123');
      expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Foauth%2Fgoogle%2Fcallback');
      expect(url).toContain('state=signed_state_or_jwt_token');
      expect(mockJwtService.signAsync).toHaveBeenCalled();
    });

    it('nên sinh authorization URL hợp lệ cho Facebook kèm state đã ký', async () => {
      mockOAuthProvidersService.getInternalConfig.mockResolvedValueOnce(sampleFacebookConfig);

      const url = await service.getAuthorizationUrl('facebook', 'http://localhost:3001/auth/callback');

      expect(url).toContain('facebook.com/v19.0/dialog/oauth');
      expect(url).toContain('client_id=facebook-app-id-456');
      expect(url).toContain('state=signed_state_or_jwt_token');
    });
  });

  describe('handleCallback', () => {
    it('nên ném UnauthorizedException nếu Provider trả về tham số error', async () => {
      await expect(
        service.handleCallback('google', {
          error: 'access_denied',
          error_description: 'User denied consent',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('nên ném BadRequestException nếu thiếu code hoặc state', async () => {
      await expect(service.handleCallback('google', {})).rejects.toThrow(BadRequestException);
      await expect(service.handleCallback('google', { code: 'code123' })).rejects.toThrow(BadRequestException);
    });

    it('nên ném UnauthorizedException nếu state không hợp lệ hoặc đã hết hạn', async () => {
      mockJwtService.verifyAsync.mockRejectedValueOnce(new Error('jwt expired'));

      await expect(
        service.handleCallback('google', { code: 'code123', state: 'bad_state' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('nên ném ForbiddenException nếu provider bị vô hiệu hóa khi callback gọi về', async () => {
      mockJwtService.verifyAsync.mockResolvedValueOnce({
        provider: OAuthProviderType.GOOGLE,
        nonce: 'n1',
        redirectUri: 'http://localhost:3001/auth/callback',
      });
      mockOAuthProvidersService.getInternalConfig.mockResolvedValueOnce({
        ...sampleGoogleConfig,
        isEnabled: false,
      });

      await expect(
        service.handleCallback('google', { code: 'code123', state: 'valid_state' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('nên ném UnauthorizedException nếu email từ Provider chưa được xác thực', async () => {
      mockJwtService.verifyAsync.mockResolvedValueOnce({
        provider: OAuthProviderType.GOOGLE,
        nonce: 'n1',
        redirectUri: 'http://localhost:3001/auth/callback',
      });
      mockOAuthProvidersService.getInternalConfig.mockResolvedValueOnce(sampleGoogleConfig);

      // Mock exchangeCodeForProfile
      vi.spyOn(service, 'exchangeCodeForProfile').mockResolvedValueOnce({
        providerUserId: 'sub-123',
        email: 'unverified@test.com',
        name: 'Unverified User',
        isEmailVerified: false,
      });

      await expect(
        service.handleCallback('google', { code: 'code123', state: 'valid_state' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('nên tạo User mới và liên kết Identity nếu user chưa từng tồn tại', async () => {
      mockJwtService.verifyAsync.mockResolvedValueOnce({
        provider: OAuthProviderType.GOOGLE,
        nonce: 'n1',
        redirectUri: 'http://localhost:3001/auth/callback',
      });
      mockOAuthProvidersService.getInternalConfig.mockResolvedValueOnce(sampleGoogleConfig);

      vi.spyOn(service, 'exchangeCodeForProfile').mockResolvedValueOnce({
        providerUserId: 'sub-new-user',
        email: 'newuser@google.com',
        name: 'New Google User',
        isEmailVerified: true,
      });

      mockPrisma.oAuthIdentity.findUnique.mockResolvedValueOnce(null);
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      const createdUser = {
        id: 'new-user-uuid',
        email: 'newuser@google.com',
        name: 'New Google User',
        role: Role.USER,
      };
      mockPrisma.user.create.mockResolvedValueOnce(createdUser);

      const result = await service.handleCallback('google', {
        code: 'code123',
        state: 'valid_state',
      });

      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(result.user.email).toBe('newuser@google.com');
      expect(result.accessToken).toBe('signed_state_or_jwt_token');
      expect(result.redirectUri).toBe('http://localhost:3001/auth/callback');
    });

    it('nên liên kết Identity vào User hiện có nếu email đã tồn tại trong DB', async () => {
      mockJwtService.verifyAsync.mockResolvedValueOnce({
        provider: OAuthProviderType.GOOGLE,
        nonce: 'n1',
        redirectUri: 'http://localhost:3001/auth/callback',
      });
      mockOAuthProvidersService.getInternalConfig.mockResolvedValueOnce(sampleGoogleConfig);

      vi.spyOn(service, 'exchangeCodeForProfile').mockResolvedValueOnce({
        providerUserId: 'sub-existing-user',
        email: 'existing@example.com',
        name: 'Existing User',
        isEmailVerified: true,
      });

      mockPrisma.oAuthIdentity.findUnique.mockResolvedValueOnce(null);
      const existingUser = {
        id: 'existing-uuid',
        email: 'existing@example.com',
        name: 'Existing User',
        role: Role.USER,
      };
      mockPrisma.user.findUnique.mockResolvedValueOnce(existingUser);
      mockPrisma.oAuthIdentity.create.mockResolvedValueOnce({});

      const result = await service.handleCallback('google', {
        code: 'code123',
        state: 'valid_state',
      });

      expect(mockPrisma.oAuthIdentity.create).toHaveBeenCalledWith({
        data: {
          userId: 'existing-uuid',
          provider: OAuthProviderType.GOOGLE,
          providerUserId: 'sub-existing-user',
          email: 'existing@example.com',
        },
      });
      expect(result.user.id).toBe('existing-uuid');
    });
  });
});
