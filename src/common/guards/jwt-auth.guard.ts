import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// JwtAuthGuard kế thừa AuthGuard('jwt') của @nestjs/passport.
// Khi đặt @UseGuards(JwtAuthGuard) trên một endpoint:
//   1. Passport tự động gọi JwtStrategy.validate()
//   2. Nếu token hợp lệ → request.user chứa payload → endpoint chạy bình thường
//   3. Nếu token thiếu hoặc sai → tự động ném 401 Unauthorized
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
