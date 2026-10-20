import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
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
}
