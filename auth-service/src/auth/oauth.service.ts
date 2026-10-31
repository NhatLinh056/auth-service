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

export interface OAuthStatePayload {
  provider: OAuthProviderType;
  nonce: string;
  redirectUri: string;
  appId?: string;
}

export interface OAuthCallbackResult {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: Role;
    avatarUrl?: string;
    provider?: OAuthProviderType;
  };
  redirectUri: string;
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
  extractRedirectUriFromState(state?: string): string {
    if (!state) return 'http://localhost:3001/';
    try {
      const decoded = this.jwtService.decode(state) as any;
      if (decoded && decoded.redirectUri && typeof decoded.redirectUri === 'string') {
        return decoded.redirectUri;
      }
    } catch {
      // Fallback mặc định về Client Portal nếu token không hợp lệ
    }
    return 'http://localhost:3001/';
  }

  /**
   * Tạo URL chuyển hướng đăng nhập OAuth 2.0 (Authorization Request)
   */
  async getAuthorizationUrl(
    providerInput: string,
    clientRedirectUri?: string,
    appId?: string,
  ): Promise<string> {
    const provider = this.oauthProvidersService.normalizeProvider(providerInput);

    // Xác định ứng dụng mục tiêu (theo appId hoặc fallback ứng dụng active đầu tiên)
    let targetAppId = appId;
    if (!targetAppId) {
      const firstActiveApp = await this.prisma.application.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'asc' },
      });
      if (firstActiveApp) {
        targetAppId = firstActiveApp.appId;
      }
    }

    if (!targetAppId) {
      throw new BadRequestException(
        'Không tìm thấy ứng dụng (Application/Project) nào đang hoạt động để xử lý OAuth.',
      );
    }

    // Đọc cấu hình OAuth riêng của Application đó
    const config = await this.oauthProvidersService.getInternalConfig(targetAppId, provider);

    // 1. Kiểm tra trạng thái kích hoạt của Provider
    if (!config.isEnabled) {
      throw new BadRequestException(
        `Phương thức đăng nhập qua ${config.name} hiện đang bị vô hiệu hóa. Vui lòng bật và cấu hình trong mục Sign-in methods của Application Console.`,
      );
    }

    if (!config.clientId || !config.clientSecret) {
      throw new BadRequestException(
        `Phương thức đăng nhập qua ${config.name} chưa được cấu hình Client ID hoặc Client Secret. Vui lòng cấu hình trong mục Sign-in methods của Application Console.`,
      );
    }

    // 2. Ký state chống CSRF bằng JwtService kèm appId (Hạn sử dụng 10 phút)
    const statePayload: OAuthStatePayload = {
      provider,
      nonce: crypto.randomUUID(),
      redirectUri: clientRedirectUri || 'http://localhost:3001/',
      appId: targetAppId,
    };

    const signedState = await this.jwtService.signAsync(statePayload, {
      expiresIn: '10m',
    });

    const callbackUrl =
      config.callbackUrl ||
      `http://localhost:3000/auth/oauth/${provider.toLowerCase()}/callback`;

    // 3. Xây dựng URL chuyển hướng OAuth 2.0 thực tế tới Google / Facebook
    if (provider === OAuthProviderType.GOOGLE) {
      const params = new URLSearchParams({
        client_id: config.clientId,
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
        client_id: config.clientId,
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

    // 3. Đọc cấu hình Provider của ứng dụng được chỉ định trong state
    let targetAppId = statePayload.appId;
    if (!targetAppId) {
      const firstActiveApp = await this.prisma.application.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'asc' },
      });
      targetAppId = firstActiveApp?.appId;
    }

    if (!targetAppId) {
      throw new BadRequestException('Không tìm thấy thông tin ứng dụng trong OAuth state.');
    }

    const config = await this.oauthProvidersService.getInternalConfig(targetAppId, provider);
    if (!config.isEnabled) {
      throw new ForbiddenException(
        `Phương thức đăng nhập qua ${config.name} đã bị vô hiệu hóa cho ứng dụng này.`,
      );
    }

    const callbackUrl =
      config.callbackUrl ||
      `http://localhost:3000/auth/oauth/${provider.toLowerCase()}/callback`;

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

    // 6. Xử lý User & OAuth Identity Mapping
    const user = await this.findOrCreateOAuthUser(provider, profile);

    // 7. Ký phát JWT Access Token
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: profile.avatarUrl,
        provider,
      },
      redirectUri: statePayload.redirectUri,
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
   * Kiểm tra xem email có nằm trong danh sách Whitelist ADMIN_EMAILS không
   */
  isAdminEmail(email?: string): boolean {
    if (!email) return false;
    const adminEmails = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
    return adminEmails.includes(email.trim().toLowerCase());
  }

  /**
   * Tìm kiếm hoặc tạo mới User và liên kết OAuthIdentity an toàn
   */
  async findOrCreateOAuthUser(
    provider: OAuthProviderType,
    profile: NormalizedOAuthProfile,
  ) {
    const { providerUserId, email, name } = profile;

    // 1. Kiểm tra xem Identity đã được liên kết trước đó chưa
    const existingIdentity = await this.prisma.oAuthIdentity.findUnique({
      where: {
        provider_providerUserId: {
          provider,
          providerUserId,
        },
      },
      include: { user: true },
    });

    if (existingIdentity?.user) {
      let user = existingIdentity.user;
      if (this.isAdminEmail(user.email) && user.role !== Role.ADMIN) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { role: Role.ADMIN },
        });
        this.logger.log(`Tự động nâng cấp quyền ADMIN cho email whitelist: ${user.email}`);
      }
      return user;
    }

    // 2. Identity chưa có -> Tìm User theo email trong DB
    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      if (this.isAdminEmail(email) && user.role !== Role.ADMIN) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { role: Role.ADMIN },
        });
        this.logger.log(`Tự động nâng cấp quyền ADMIN cho email whitelist: ${email}`);
      }

      // User đã có tài khoản (đăng ký bằng password hoặc provider khác)
      // Liên kết thêm identity mới này
      await this.prisma.oAuthIdentity.create({
        data: {
          userId: user.id,
          provider,
          providerUserId,
          email,
        },
      });
      this.logger.log(`Đã liên kết OAuth ${provider} với tài khoản hiện có: ${email}`);
      return user;
    }

    // 3. User hoàn toàn mới -> Tạo User mới (passwordHash = null) kèm Identity
    const initialRole = this.isAdminEmail(email) ? Role.ADMIN : Role.USER;
    user = await this.prisma.user.create({
      data: {
        email,
        name: name || undefined,
        passwordHash: null,
        role: initialRole,
        identities: {
          create: {
            provider,
            providerUserId,
            email,
          },
        },
      },
    });

    this.logger.log(`Đã tạo tài khoản người dùng mới từ OAuth ${provider} (Role: ${initialRole}): ${email}`);
    return user;
  }
}
