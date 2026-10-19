import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { JwtPayload } from '../common/strategies/jwt.strategy.js';
import { UsersService } from './users.service.js';

// request.user được Passport inject sau khi JwtStrategy.validate() chạy thành công
interface RequestWithUser extends Request {
  user: JwtPayload;
}

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /users/me — Lấy profile của chính mình dựa trên JWT token
  @Get('me')
  @UseGuards(JwtAuthGuard)                     // Bắt buộc Bearer token hợp lệ
  @ApiBearerAuth()                              // Hiển thị nút "Authorize" trên Swagger UI
  @ApiOperation({ summary: 'Xem thông tin profile của người dùng đang đăng nhập' })
  @ApiResponse({ status: 200, description: 'Trả về thông tin profile cá nhân' })
  @ApiResponse({ status: 401, description: 'Token không hợp lệ hoặc hết hạn' })
  async getMe(@Request() req: RequestWithUser) {
    // req.user.sub là user.id đã được ký vào JWT payload lúc login
    const user = await this.usersService.findById(req.user.sub);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    // Loại bỏ passwordHash trước khi trả về
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  // GET /users/:id — Lấy thông tin user theo ID (bảo vệ bằng JWT Guard)
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xem thông tin người dùng theo ID' })
  @ApiResponse({ status: 200, description: 'Trả về thông tin người dùng' })
  @ApiResponse({ status: 401, description: 'Token không hợp lệ hoặc hết hạn' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng với ID này' })
  async getUserById(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID: ${id}`);
    }

    // Loại bỏ passwordHash trước khi trả về
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }
}
