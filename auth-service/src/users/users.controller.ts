import {
  Body,
  ForbiddenException,
  UseGuards,
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
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { AppAuthGuard } from '../common/guards/app-auth.guard.js';

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
    const user = await this.usersService.findById(req.user.sub, req.user.type);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  // GET /users — Lấy danh sách tất cả người dùng (dành riêng cho ADMIN)
  @Get('verify-app-user')
  @UseGuards(JwtAuthGuard, AppAuthGuard)
  async verifyAppUser(@Request() req: RequestWithUser & { application: any }) {
    const app = req.application;
    const identity = req.user;
    if (identity.type === 'app_user' && identity.appId !== app.appId) {
      throw new ForbiddenException('Token belongs to another application');
    }
    const user = await this.usersService.findById(identity.sub, identity.type);
    if (!user) throw new NotFoundException('User not found');
    if (identity.type === 'app_user' && user.appId !== app.appId) {
      throw new ForbiddenException('User belongs to another application');
    }
    const email = (user.email || '').trim().toLowerCase();
    void email;
    // Password registration does not verify email ownership.
    const isOwner = identity.type === 'platform'
      ? user.id === app.userId
      : user.userId === app.userId;
    const { passwordHash, ...profile } = user;
    void passwordHash;
    // AppUser role is scoped; do NOT auto-grant ADMIN from App Owner or adminEmails
    const appRole = 'USER';
    return {
      ...profile,
      role: appRole,
      appRole,
      appId: app.appId,
      isAppOwner: isOwner,
      tenantId: profile.tenantId || null,
      tenantName: profile.tenantName || null,
      isTenantOwner: Boolean(profile.isTenantOwner),
    };
  }

  @Get()
  @Auth(Role.ADMIN)
  @ApiOperation({ summary: 'Lấy danh sách tất cả người dùng (chỉ dành cho ADMIN)' })
  @ApiResponse({ status: 200, description: 'Trả về mảng thông tin tất cả người dùng (không có passwordHash)' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập (chỉ dành cho ADMIN)' })
  async getAll() {
    const users = await this.usersService.findAll();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return users.map(({ passwordHash: _, ...safeUser }) => safeUser);
  }

  // GET /users/:id — Lấy thông tin user theo ID
  @Get(':id')
  @AuthOwnerOrAdmin()
  @ApiOperation({ summary: 'Xem thông tin người dùng theo ID (chính chủ hoặc Platform Admin)' })
  @ApiResponse({ status: 200, description: 'Trả về thông tin người dùng' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng với ID này' })
  async getUserById(@Param('id') id: string) {
    const user = await this.usersService.findById(id, 'platform');
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
    const existingUser = await this.usersService.findById(id, 'platform');
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
    const existingUser = await this.usersService.findById(id, 'platform');
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
