import { getJwtSecret } from '../../auth/jwt-secret.js';
import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service.js';

// Định nghĩa shape của JWT payload sau khi decode
// Tương ứng với những gì AuthService.login() / OAuthService đã ký vào token
export interface JwtPayload {
  sub: string;        // user.id (Platform User) hoặc app_user.id (AppUser)
  email: string;
  role: string;
  /** Phân biệt nguồn gốc token: 'platform' = tài khoản Developer/Admin, 'app_user' = khách hàng OAuth */
  type: 'platform' | 'app_user';
  appId?: string;     // Chỉ có khi type='app_user' — ứng dụng mà AppUser thuộc về
  provider?: string;  // Nhà cung cấp OAuth ('GOOGLE', 'FACEBOOK', etc.) để thu hồi theo phạm vi provider
  iat?: number;       // issued at (tự động thêm bởi JwtService)
  iatMs?: number;     // issued at in milliseconds (chính xác cao phục vụ kiểm tra thu hồi R-02)
  userId?: string;    // Common identity; sub remains the membership ID for compatibility.
  exp?: number;       // expiration (tự động thêm bởi JwtService)
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      // Cách lấy token: đọc từ header "Authorization: Bearer <token>"
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      // Không cho phép token đã hết hạn
      ignoreExpiration: false,

      // Secret key phải khớp với key đã dùng để ký token trong AuthService.login()
      secretOrKey: getJwtSecret(),
    });
  }

  // validate() được gọi tự động sau khi Passport verify token thành công.
  // Giá trị trả về sẽ được gán vào request.user
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (typeof payload.sub !== 'string' || !payload.sub || !['platform', 'app_user'].includes(payload.type) ||
        (payload.type === 'app_user' && (typeof payload.appId !== 'string' || !payload.appId))) {
      throw new UnauthorizedException('Invalid token identity scope');
    }

    // The signed token identifies the account; current database state determines its rights.
    if (payload.type === 'platform') {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, role: true },
      });
      if (!user) throw new UnauthorizedException('Account no longer exists');
      return { sub: user.id, email: user.email, role: user.role, type: 'platform' };
    }

    const user = await this.prisma.appUser.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        user: { select: { id: true, email: true } },
        application: {
          select: {
            appId: true,
            status: true,
            updatedAt: true,
            oauthProviders: {
              select: {
                provider: true,
                isEnabled: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    });
    if (!user?.user || user.application.appId !== payload.appId) {
      throw new UnauthorizedException('Account no longer exists in this application');
    }
    if (user.application.status !== 'ACTIVE') throw new ForbiddenException('Application is inactive');

    // --- R-02 Session Revocation Verification ---
    // 1. Application-scope revocation (AppToken regeneration or status change to INACTIVE and back)
    if (user.application.updatedAt) {
      const appUpdatedAt = user.application.updatedAt.getTime();
      const tokenIssuedAt = payload.iatMs ?? (payload.iat ? payload.iat * 1000 : null);
      if (tokenIssuedAt !== null && tokenIssuedAt < appUpdatedAt) {
        throw new UnauthorizedException('Session has been revoked due to application credential or status change');
      }
    }

    // 2. Provider-scope revocation (when Google or Facebook is disabled or re-enabled)
    const tokenProvider = (payload.provider || '').toUpperCase();
    if (tokenProvider === 'GOOGLE' || tokenProvider === 'FACEBOOK') {
      const providerConfig = user.application.oauthProviders?.find(
        (p) => p.provider === tokenProvider,
      );
      if (!providerConfig || !providerConfig.isEnabled) {
        throw new UnauthorizedException(
          `Session has been revoked because ${tokenProvider} login is disabled for this application`,
        );
      }
      if (providerConfig.updatedAt) {
        const providerUpdatedAt = providerConfig.updatedAt.getTime();
        const tokenIssuedAt = payload.iatMs ?? (payload.iat ? payload.iat * 1000 : null);
        if (tokenIssuedAt !== null && tokenIssuedAt < providerUpdatedAt) {
          throw new UnauthorizedException(
            `Session has been revoked due to recent ${tokenProvider} configuration update`,
          );
        }
      }
    }

    return {
      sub: user.id,
      email: user.user.email,
      role: 'USER',
      type: 'app_user',
      appId: user.application.appId,
      userId: user.user.id,
      ...(payload.provider ? { provider: payload.provider } : {}),
    };
  }
}
