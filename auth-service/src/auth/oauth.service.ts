import crypto from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import { OAuthProviderType, Role } from '../generated/prisma/enums.js';
import { OAuthProvidersService } from '../oauth-providers/oauth-providers.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { getAuthPublicUrl, getOAuthCallbackUrl } from './oauth-public-url.js';
import { hasOAuthCredentials, validateOAuthRedirectUri } from './oauth-config-policy.js';

export interface OAuthStatePayload {
  flowId?: string;
  provider: OAuthProviderType;
  nonce: string;
  redirectUri: string;
  appId?: string;
  codeChallenge: string;
  clientState?: string;
}

export interface OAuthCallbackResult {
  flowId?: string;
  provider: OAuthProviderType;
  providerScope: string;
  profile: NormalizedOAuthProfile;
  applicationId: string;
  redirectUri: string;
  appId: string;
  codeChallenge: string;
  clientState?: string;
}

export interface NormalizedOAuthProfile {
  providerUserId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  isEmailVerified: boolean;
}

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly oauthProvidersService: OAuthProvidersService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Trích xuất an toàn redirectUri của client từ OAuth state token
   */
  private readonly pendingStates = new Map<string, number>();

  validateRedirect(uri: string, application: { allowedRedirectUris?: string[] }): string {
    validateOAuthRedirectUri(uri);
    if (!application.allowedRedirectUris?.includes(uri)) {
      throw new BadRequestException('Redirect URI is not registered for this application');
    }
    return uri;
  }

  async checkOAuthAvailability(providerInput: string, appId: string, redirectUri: string) {
    const provider = this.oauthProvidersService.normalizeProvider(providerInput);
    const config = await this.oauthProvidersService.getInternalConfig(appId, provider);
    this.validateRedirect(redirectUri, config.application);
    if (!config.isEnabled || !hasOAuthCredentials(config)) {
      throw new BadRequestException('OAuth provider is not configured for this application');
    }
  }

  async getErrorRedirectUri(state: string, providerInput: string): Promise<string | null> {
    try {
      const payload = await this.jwtService.verifyAsync<OAuthStatePayload>(state);
      const provider = this.oauthProvidersService.normalizeProvider(providerInput);
      if (payload.provider !== provider || !payload.appId || !payload.nonce) return null;
      const app = await this.prisma.application.findUnique({ where: { appId: payload.appId } });
      if (!app || app.status !== 'ACTIVE') return null;
      this.pendingStates.delete(payload.nonce);
      this.validateRedirect(payload.redirectUri, app);
      return payload.flowId ? `${getAuthPublicUrl()}/?signin=${encodeURIComponent(payload.flowId)}` : payload.redirectUri;
    } catch {
      return null;
    }
  }

  /**
   * Tạo URL chuyển hướng đăng nhập OAuth 2.0 (Authorization Request)
   */
  async getAuthorizationUrl(
    providerInput: string,
    clientRedirectUri?: string,
    appId?: string,
    codeChallenge?: string,
    flowId?: string,
    clientState?: string,
  ): Promise<string> {
    const provider = this.oauthProvidersService.normalizeProvider(providerInput);

    if (!appId || !codeChallenge || !/^[A-Za-z0-9_-]{43}$/.test(codeChallenge)) {
      throw new BadRequestException('Application ID and S256 code challenge are required');
    }
    const targetAppId = appId;
    await this.checkOAuthAvailability(providerInput, targetAppId, clientRedirectUri || '');
    const config = await this.oauthProvidersService.getInternalConfig(targetAppId, provider);
    const redirectUri = clientRedirectUri!;

    // 2. Ký state chống CSRF bằng JwtService kèm appId (Hạn sử dụng 10 phút)
    const statePayload: OAuthStatePayload = {
      provider,
      nonce: crypto.randomUUID(),
      redirectUri,
      codeChallenge,
      appId: targetAppId,
      ...(flowId ? { flowId } : {}),
      ...(clientState ? { clientState } : {}),
    };

    const signedState = await this.jwtService.signAsync(statePayload, {
      expiresIn: '10m',
    });

    for (const [nonce, expiry] of this.pendingStates) {
      if (expiry <= Date.now()) this.pendingStates.delete(nonce);
    }
    if (this.pendingStates.size >= 10000) throw new BadRequestException('Login capacity exceeded');
    this.pendingStates.set(statePayload.nonce, Date.now() + 600000);

    const callbackUrl = getOAuthCallbackUrl(provider);

    // 3. Xây dựng URL chuyển hướng OAuth 2.0 thực tế tới Google / Facebook
    if (provider === OAuthProviderType.GOOGLE) {
      const params = new URLSearchParams({
        client_id: config.clientId!,
        redirect_uri: callbackUrl,
        response_type: 'code',
        scope: 'openid email profile',
        state: signedState,
        access_type: 'offline',
        prompt: 'select_account',
      });
      return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }

    if (provider === OAuthProviderType.FACEBOOK) {
      const params = new URLSearchParams({
        client_id: config.clientId!,
        redirect_uri: callbackUrl,
        response_type: 'code',
        scope: 'email,public_profile',
        state: signedState,
      });
      return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
    }

    throw new BadRequestException(`Provider không được hỗ trợ: ${provider}`);
  }

  /**
   * Xử lý Authorization Code Callback và cấp phát JWT
   */
  async handleCallback(
    providerInput: string,
    query: {
      code?: string;
      state?: string;
      error?: string;
      error_description?: string;
    },
  ): Promise<OAuthCallbackResult> {
    const provider = this.oauthProvidersService.normalizeProvider(providerInput);

    // 1. Kiểm tra lỗi trả về từ Provider
    if (query.error) {
      throw new UnauthorizedException(
        `Nhà cung cấp OAuth từ chối xác thực: ${query.error_description || query.error}`,
      );
    }

    if (!query.code) {
      throw new BadRequestException(
        'Thiếu mã xác thực (authorization code) từ nhà cung cấp OAuth.',
      );
    }

    if (!query.state) {
      throw new BadRequestException('Thiếu tham số bảo mật state trong callback OAuth.');
    }

    // 2. Xác minh chữ ký và thời hạn của state token (Chống CSRF)
    let statePayload: OAuthStatePayload;
    try {
      statePayload = await this.jwtService.verifyAsync<OAuthStatePayload>(query.state);
    } catch {
      throw new UnauthorizedException('Tham số bảo mật state không hợp lệ hoặc đã hết hạn.');
    }

    if (statePayload.provider !== provider) {
      throw new UnauthorizedException(
        'Nhà cung cấp OAuth trong state không khớp với endpoint callback hiện tại.',
      );
    }

    const expiry = this.pendingStates.get(statePayload.nonce);
    this.pendingStates.delete(statePayload.nonce);
    if (!expiry || expiry <= Date.now()) throw new UnauthorizedException('OAuth state was consumed or expired');
    const targetAppId = statePayload.appId;
    if (!targetAppId) throw new UnauthorizedException('Missing application scope');
    const application = await this.prisma.application.findUnique({
      where: { appId: targetAppId },
      include: { user: { select: { id: true, email: true, name: true, role: true } } },
    });
    if (!application || application.status !== 'ACTIVE') throw new ForbiddenException('Application is inactive');
    this.validateRedirect(statePayload.redirectUri, application);

    const config = await this.oauthProvidersService.getInternalConfig(targetAppId, provider);
    if (!config.isEnabled || !hasOAuthCredentials(config)) {
      throw new ForbiddenException(
        `Phương thức đăng nhập qua ${config.name} đã bị vô hiệu hóa cho ứng dụng này.`,
      );
    }

    const callbackUrl = getOAuthCallbackUrl(provider);

    // 4. Trao đổi Code lấy Profile người dùng từ Provider (Server-to-Server)
    const profile = await this.exchangeCodeForProfile(
      provider,
      query.code,
      config.clientId!,
      config.clientSecret!,
      callbackUrl,
    );

    // 5. Kiểm tra tính xác thực của email
    if (!profile.isEmailVerified) {
      throw new UnauthorizedException(
        `Email "${profile.email}" từ ${config.name} chưa được xác thực. Không thể liên kết tài khoản.`,
      );
    }

    // Identity creation/linking is completed only after the browser proves PKCE possession.
    return {
      provider,
      providerScope: provider === OAuthProviderType.GOOGLE ? 'google' : config.clientId!,
      profile,
      applicationId: application.id,
      ...(statePayload.flowId ? { flowId: statePayload.flowId } : {}),
      redirectUri: statePayload.redirectUri,
      appId: targetAppId,
      codeChallenge: statePayload.codeChallenge,
      ...(statePayload.clientState ? { clientState: statePayload.clientState } : {}),
    };
  }

  /**
   * Trao đổi Authorization Code lấy Profile qua HTTPS API chính thức
   */
  async exchangeCodeForProfile(
    provider: OAuthProviderType,
    code: string,
    clientId: string,
    clientSecret: string,
    callbackUrl: string,
  ): Promise<NormalizedOAuthProfile> {
    if (provider === OAuthProviderType.GOOGLE) {
      try {
        // Đổi authorization code lấy token
        const tokenRes = await axios.post(
          'https://oauth2.googleapis.com/token',
          new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            grant_type: 'authorization_code',
            redirect_uri: callbackUrl,
          }).toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            timeout: 10000,
          },
        );

        const accessToken = tokenRes.data.access_token;

        // Lấy thông tin userinfo
        const userinfoRes = await axios.get(
          'https://www.googleapis.com/oauth2/v3/userinfo',
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            timeout: 10000,
          },
        );

        const data = userinfoRes.data;
        if (!data.email) {
          throw new UnauthorizedException('Tài khoản Google không trả về địa chỉ email.');
        }

        return {
          providerUserId: data.sub,
          email: data.email.toLowerCase().trim(),
          name: data.name || '',
          avatarUrl: data.picture,
          isEmailVerified: Boolean(data.email_verified),
        };
      } catch (err: any) {
        if (err instanceof UnauthorizedException) throw err;
        const msg = err.response?.data?.error_description || err.message;
        this.logger.error(`Google OAuth exchange failed: ${msg}`);
        throw new UnauthorizedException(`Xác thực tài khoản Google thất bại: ${msg}`);
      }
    }

    if (provider === OAuthProviderType.FACEBOOK) {
      try {
        // Đổi authorization code lấy access token
        const tokenRes = await axios.get(
          'https://graph.facebook.com/v19.0/oauth/access_token',
          {
            params: {
              client_id: clientId,
              client_secret: clientSecret,
              redirect_uri: callbackUrl,
              code,
            },
            timeout: 10000,
          },
        );

        const accessToken = tokenRes.data.access_token;

        // Lấy thông tin profile
        const profileRes = await axios.get('https://graph.facebook.com/me', {
          params: {
            fields: 'id,name,email,picture.type(large)',
            access_token: accessToken,
          },
          timeout: 10000,
        });

        const data = profileRes.data;
        if (!data.email) {
          throw new UnauthorizedException(
            'Tài khoản Facebook chưa cấp quyền email hoặc không có email liên kết.',
          );
        }

        return {
          providerUserId: data.id,
          email: data.email.toLowerCase().trim(),
          name: data.name || '',
          avatarUrl: data.picture?.data?.url,
          isEmailVerified: true, // Facebook chỉ trả về email khi đã xác thực
        };
      } catch (err: any) {
        if (err instanceof UnauthorizedException) throw err;
        const msg = err.response?.data?.error?.message || err.message;
        this.logger.error(`Facebook OAuth exchange failed: ${msg}`);
        throw new UnauthorizedException(`Xác thực tài khoản Facebook thất bại: ${msg}`);
      }
    }

    throw new BadRequestException(`Provider không được hỗ trợ: ${provider}`);
  }

  /**
   * Kiểm tra xem email có phải là Admin của Ứng dụng này không
   * - Hoặc là Chủ sở hữu tạo ra Ứng dụng (application.user.email)
   * - Hoặc nằm trong danh sách adminEmails riêng của Ứng dụng đó
   */
  isApplicationAdmin(email?: string, application?: any): boolean {
    if (!email || !application) return false;
    const normalized = email.trim().toLowerCase();

    // 1. Chủ sở hữu Ứng dụng (App Owner)
    if (application.user?.email && application.user.email.trim().toLowerCase() === normalized) {
      return true;
    }

    // 2. Danh sách adminEmails cấu hình riêng cho Ứng dụng
    const adminEmails: string[] = application.adminEmails || [];
    return adminEmails.some((e: string) => e.trim().toLowerCase() === normalized);
  }

}
