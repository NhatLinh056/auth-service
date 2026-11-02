import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { User } from '../generated/prisma/client.js';
import { OAuthProvidersService } from '../oauth-providers/oauth-providers.service.js';
import { UsersService } from '../users/users.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { SetPasswordDto } from './dto/set-password.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly oauthProvidersService: OAuthProvidersService,
  ) {}

  /**
   * Lấy danh sách các OAuth Provider đang khả dụng (công khai cho client/frontend)
   */
  async getPublicProviders(appId?: string) {
    return this.oauthProvidersService.getPublicProviders(appId);
  }

  async register(registerDto: RegisterDto): Promise<Omit<User, 'passwordHash'>> {
    const email = registerDto.email.trim().toLowerCase();
    // 1. Kiểm tra xem email đã tồn tại hay chưa
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email đã được đăng ký trong hệ thống');
    }

    // 2. Hash mật khẩu bằng bcrypt với 10 salt rounds
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(registerDto.password, saltRounds);

    // 3. Lưu thông tin người dùng vào database
    const newUser = await this.usersService.create({
      email,
      passwordHash,
      name: registerDto.name,
    });

    // 4. Loại bỏ passwordHash trước khi trả về cho client
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...safeUser } = newUser;
    return safeUser;
  }

  async login(loginDto: LoginDto): Promise<{
    accessToken: string;
    user: Omit<User, 'passwordHash'>;
  }> {
    // 1. Tìm người dùng theo email
    const user = await this.usersService.findByEmail(loginDto.email.trim().toLowerCase());
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    // 2. So khớp mật khẩu với passwordHash trong DB
    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'Tài khoản này được đăng ký thông qua mạng xã hội (OAuth), vui lòng sử dụng phương thức đăng nhập OAuth tương ứng.',
      );
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    // 3. Tạo payload và ký JWT token
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'platform' as const,
    };
    const accessToken = await this.jwtService.signAsync(payload);

    // 4. Loại bỏ passwordHash và trả về token cùng thông tin user
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...safeUser } = user;
    return {
      accessToken,
      user: safeUser,
    };
  }

  logout(): { message: string } {
    // JWT là stateless — server không lưu session, không thể thu hồi token trực tiếp.
    // Cơ chế logout chuẩn cho stateless JWT: server xác nhận thành công,
    // client có trách nhiệm xóa token khỏi bộ nhớ/localStorage.
    return { message: 'Đăng xuất thành công. Vui lòng xóa token khỏi client.' };
  }

  async setPassword(userId: string, dto: SetPasswordDto) {
    const user = await this.usersService.findById(userId, 'platform');
    if (!user) throw new UnauthorizedException('Account no longer exists');
    if (user.passwordHash) {
      if (!dto.currentPassword || !await bcrypt.compare(dto.currentPassword, user.passwordHash)) {
        throw new UnauthorizedException('Mật khẩu hiện tại không chính xác');
      }
    } else if (!user.emailVerifiedAt) {
      throw new UnauthorizedException('Cần xác minh tài khoản OAuth trước khi đặt mật khẩu');
    }
    await this.usersService.update(user.id, { passwordHash: await bcrypt.hash(dto.password, 10) });
    return { message: 'Đã cập nhật mật khẩu cho tài khoản chung' };
  }
}
