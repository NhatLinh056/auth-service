import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Request,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import bcrypt from 'bcrypt';
import { Role } from '../generated/prisma/enums.js';
import { Auth, AuthOwnerOrAdmin } from '../common/decorators/auth.decorator.js';
import { JwtPayload } from '../common/strategies/jwt.strategy.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
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
  @Auth()
  @ApiOperation({ summary: 'Xem thông tin profile của người dùng đang đăng nhập' })
  @ApiResponse({ status: 200, description: 'Trả về thông tin profile cá nhân' })
  async getMe(@Request() req: RequestWithUser) {
    const user = await this.usersService.findById(req.user.sub);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  // GET /users — Lấy danh sách tất cả người dùng (dành riêng cho ADMIN)
  @Get()
  @Auth(Role.ADMIN)
  @ApiOperation({ summary: 'Lấy danh sách tất cả người dùng (chỉ dành cho ADMIN)' })
  @ApiResponse({ status: 200, description: 'Trả về mảng thông tin tất cả người dùng (không có passwordHash)' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập (chỉ dành cho ADMIN)' })
  async getAll() {
    const users = await this.usersService.findAll();
    return users.map(({ passwordHash: _, ...safeUser }) => safeUser);
  }

  // GET /users/:id — Lấy thông tin user theo ID
  @Get(':id')
  @Auth()
  @ApiOperation({ summary: 'Xem thông tin người dùng theo ID' })
  @ApiResponse({ status: 200, description: 'Trả về thông tin người dùng' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng với ID này' })
  async getUserById(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID: ${id}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  // PATCH /users/:id — Cập nhật thông tin người dùng (chỉ chủ tài khoản hoặc ADMIN)
  @Patch(':id')
  @AuthOwnerOrAdmin()
  @ApiOperation({ summary: 'Cập nhật thông tin người dùng theo ID (chủ sở hữu hoặc ADMIN)' })
  @ApiResponse({ status: 200, description: 'Cập nhật thông tin người dùng thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Không có quyền thao tác trên tài khoản của người khác' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng với ID này' })
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const existingUser = await this.usersService.findById(id);
    if (!existingUser) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID: ${id}`);
    }

    const updateData: { name?: string; passwordHash?: string } = {};
    if (updateUserDto.name !== undefined) {
      updateData.name = updateUserDto.name;
    }
    if (updateUserDto.password) {
      const saltRounds = 10;
      updateData.passwordHash = await bcrypt.hash(updateUserDto.password, saltRounds);
    }

    const updatedUser = await this.usersService.update(id, updateData);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...safeUser } = updatedUser;
    return safeUser;
  }

  // DELETE /users/:id — Xóa tài khoản người dùng (chỉ chủ tài khoản hoặc ADMIN)
  @Delete(':id')
  @AuthOwnerOrAdmin()
  @ApiOperation({ summary: 'Xóa tài khoản người dùng theo ID (chủ sở hữu hoặc ADMIN)' })
  @ApiResponse({ status: 200, description: 'Xóa người dùng thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền thao tác trên tài khoản của người khác' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng với ID này' })
  async deleteUser(@Param('id') id: string) {
    const existingUser = await this.usersService.findById(id);
    if (!existingUser) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID: ${id}`);
    }

    const deletedUser = await this.usersService.delete(id);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...safeUser } = deletedUser;
    return {
      message: 'Xóa người dùng thành công',
      user: safeUser,
    };
  }
}
