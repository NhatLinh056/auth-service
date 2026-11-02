import { getJwtSecret } from '../../auth/jwt-secret.js';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

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
  exp?: number;       // expiration (tự động thêm bởi JwtService)
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
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
  validate(payload: JwtPayload): JwtPayload {
    if (!payload.sub || !['platform', 'app_user'].includes(payload.type) || (payload.type === 'app_user' && !payload.appId)) {
      throw new UnauthorizedException('Invalid token identity scope');
    }
    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      type: payload.type,
      appId: payload.appId,
    };
  }
}
