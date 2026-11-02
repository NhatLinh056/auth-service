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
  iat?: number;       // issued at (tự động thêm bởi JwtService)
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
        id: true, email: true, role: true,
        user: { select: { id: true, email: true } },
        application: { select: { appId: true, status: true } },
      },
    });
    if (!user?.user || user.application.appId !== payload.appId) {
      throw new UnauthorizedException('Account no longer exists in this application');
    }
    if (user.application.status !== 'ACTIVE') throw new ForbiddenException('Application is inactive');
    return {
      sub: user.id,
      email: user.user.email,
      role: 'USER',
      type: 'app_user',
      appId: user.application.appId,
      userId: user.user.id,
    };
  }
}
