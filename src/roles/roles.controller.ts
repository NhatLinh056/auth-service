import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Request,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../generated/prisma/enums.js';
import { Auth } from '../common/decorators/auth.decorator.js';
import { JwtPayload } from '../common/strategies/jwt.strategy.js';
import { AssignRoleDto } from './dto/assign-role.dto.js';
import { RolesService } from './roles.service.js';

interface RequestWithUser extends Request {
  user: JwtPayload;
}

@ApiTags('roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách các vai trò (roles) trong hệ thống' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách các vai trò được hỗ trợ trong hệ thống',
  })
  getRoles() {
    return this.rolesService.getRoles();
  }

  @Get('admin')
  @Auth(Role.ADMIN)
  @ApiOperation({ summary: 'Endpoint dành riêng cho ADMIN (Kiểm tra quyền quản trị viên)' })
  @ApiResponse({ status: 200, description: 'Xác thực quyền ADMIN thành công, trả về thống kê hệ thống' })
  async getAdminDashboard(@Request() req: RequestWithUser) {
    const dashboard = await this.rolesService.getAdminDashboard();
    return {
      ...dashboard,
      currentUser: {
        id: req.user.sub,
        email: req.user.email,
        role: req.user.role,
      },
    };
  }

  @Get('user')
  @Auth(Role.USER, Role.ADMIN)
  @ApiOperation({ summary: 'Endpoint dành cho người dùng có vai trò USER (và ADMIN)' })
  @ApiResponse({ status: 200, description: 'Xác thực thành công, trả về không gian người dùng' })
  getUserSpace(@Request() req: RequestWithUser) {
    const spaceInfo = this.rolesService.getUserSpaceInfo(req.user.sub);
    return {
      ...spaceInfo,
      currentUser: {
        id: req.user.sub,
        email: req.user.email,
        role: req.user.role,
      },
    };
  }

  @Get('users/:id')
  @Auth()
  @ApiOperation({ summary: 'Lấy thông tin vai trò của một người dùng theo ID' })
  @ApiParam({ name: 'id', description: 'UUID của người dùng' })
  @ApiResponse({ status: 200, description: 'Lấy thông tin vai trò thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng với ID này' })
  getUserRole(@Param('id') id: string) {
    return this.rolesService.getUserRole(id);
  }

  @Post('assign')
  @HttpCode(HttpStatus.OK)
  @Auth(Role.ADMIN)
  @ApiOperation({ summary: 'Gán hoặc thay đổi vai trò của người dùng (Chỉ ADMIN)' })
  @ApiResponse({ status: 200, description: 'Gán vai trò thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ (role sai hoặc userId không phải UUID)' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng với ID này' })
  assignRole(@Body() assignRoleDto: AssignRoleDto) {
    return this.rolesService.assignRole(assignRoleDto);
  }
}
