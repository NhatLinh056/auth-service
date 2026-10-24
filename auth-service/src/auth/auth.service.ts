import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { User } from '../generated/prisma/client.js';
import { UsersService } from '../users/users.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<Omit<User, 'passwordHash'>> {
    // 1. Kiểm tra xem email đã tồn tại hay chưa
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email đã được đăng ký trong hệ thống');
    }

    // 2. Hash mật khẩu bằng bcrypt với 10 salt rounds
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(registerDto.password, saltRounds);

    // 3. Lưu thông tin người dùng vào database
    const newUser = await this.usersService.create({
      email: registerDto.email,
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
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    // 2. So khớp mật khẩu với passwordHash trong DB
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    // 3. Tạo payload và ký JWT token
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
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
}
