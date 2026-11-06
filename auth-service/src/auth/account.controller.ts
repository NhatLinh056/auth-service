import { Controller, Get, Header, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Auth } from '../common/decorators/auth.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../common/strategies/jwt.strategy.js';
import { PrismaService } from '../prisma/prisma.service.js';

@ApiTags('account')
@ApiBearerAuth()
@Controller('auth/account')
export class AccountController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Auth()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Lấy thông tin tài khoản cá nhân' })
  @ApiResponse({
    status: 200,
    description: 'Trả về thông tin profile và trạng thái mật khẩu',
  })
  @ApiResponse({ status: 401, description: 'Chưa xác thực (Thiếu hoặc sai Bearer token)' })
  async profile(@CurrentUser() user: JwtPayload) {
    const found = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { id: true, email: true, name: true, passwordHash: true },
    });
    if (!found) throw new NotFoundException('Account no longer exists');
    return {
      id: found.id,
      email: found.email,
      name: found.name,
      hasPassword: Boolean(found.passwordHash),
    };
  }
}
