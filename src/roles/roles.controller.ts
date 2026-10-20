import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../generated/prisma/enums.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Endpoint dành riêng cho ADMIN (Kiểm tra quyền quản trị viên)' })
  @ApiResponse({ status: 200, description: 'Xác thực quyền ADMIN thành công, trả về thống kê hệ thống' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập / Token không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập (yêu cầu vai trò ADMIN)' })
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Endpoint dành cho người dùng có vai trò USER (và ADMIN)' })
  @ApiResponse({ status: 200, description: 'Xác thực thành công, trả về không gian người dùng' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập / Token không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin vai trò của một người dùng theo ID' })
  @ApiParam({ name: 'id', description: 'UUID của người dùng' })
  @ApiResponse({ status: 200, description: 'Lấy thông tin vai trò thành công' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập / Token không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng với ID này' })
  getUserRole(@Param('id') id: string) {
    return this.rolesService.getUserRole(id);
  }

  @Post('assign')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Gán hoặc thay đổi vai trò của người dùng (Chỉ ADMIN)' })
  @ApiResponse({ status: 200, description: 'Gán vai trò thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ (role sai hoặc userId không phải UUID)' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập / Token không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập (yêu cầu vai trò ADMIN)' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng với ID này' })
  assignRole(@Body() assignRoleDto: AssignRoleDto) {
    return this.rolesService.assignRole(assignRoleDto);
  }
}
