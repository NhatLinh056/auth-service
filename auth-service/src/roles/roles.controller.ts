import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../generated/prisma/enums.js';
import { Auth } from '../common/decorators/auth.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../common/strategies/jwt.strategy.js';
import { AssignRoleDto } from './dto/assign-role.dto.js';
import { RolesService } from './roles.service.js';

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

  @Post('assign')
  @HttpCode(HttpStatus.OK)
  @Auth(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Gán hoặc thay đổi vai trò của người dùng (Chỉ Platform ADMIN)' })
  @ApiResponse({ status: 200, description: 'Gán vai trò thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ hoặc vi phạm quy tắc an toàn (tự hạ quyền, hạ admin cuối)' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập (chỉ dành cho Platform ADMIN)' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng với ID này' })
  assignRole(
    @Body() assignRoleDto: AssignRoleDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.rolesService.assignRole(assignRoleDto, currentUser);
  }
}
