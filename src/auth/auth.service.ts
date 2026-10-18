import { ConflictException, Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { User } from '../generated/prisma/client.js';
import { UsersService } from '../users/users.service.js';
import { RegisterDto } from './dto/register.dto.js';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

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
}
