import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

// Định nghĩa shape của JWT payload sau khi decode
// Tương ứng với những gì AuthService.login() đã ký vào token
export interface JwtPayload {
  sub: string;   // user.id
  email: string;
  role: string;
  iat?: number;  // issued at (tự động thêm bởi JwtService)
  exp?: number;  // expiration (tự động thêm bởi JwtService)
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
      secretOrKey: process.env['JWT_SECRET'] || 'super-secret-jwt-key-for-project-3',
    });
  }

  // validate() được gọi tự động sau khi Passport verify token thành công.
  // Giá trị trả về sẽ được gán vào request.user
  validate(payload: JwtPayload): JwtPayload {
    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
