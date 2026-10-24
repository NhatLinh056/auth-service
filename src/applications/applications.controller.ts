import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Auth } from '../common/decorators/auth.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../common/strategies/jwt.strategy.js';
import { ApplicationsService } from './applications.service.js';
import { CreateApplicationDto } from './dto/create-application.dto.js';
import { UpdateApplicationDto } from './dto/update-application.dto.js';

@ApiTags('applications')
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  @Auth()
  @ApiOperation({ summary: 'Tạo ứng dụng / microservice mới (sinh AppID và AppToken)' })
  @ApiResponse({
    status: 201,
    description: 'Tạo ứng dụng thành công, trả về thông tin ứng dụng kèm AppID và AppToken',
  })
  @ApiResponse({ status: 400, description: 'Dữ liệu đầu vào không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực (Thiếu hoặc sai JWT token)' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng được chỉ định (khi ADMIN chỉ định userId)' })
  create(
    @Body() createApplicationDto: CreateApplicationDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.applicationsService.create(createApplicationDto, currentUser);
  }

  @Get()
  @Auth()
  @ApiOperation({ summary: 'Lấy danh sách ứng dụng (User xem của mình, ADMIN xem tất cả)' })
  @ApiResponse({ status: 200, description: 'Trả về danh sách ứng dụng' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực (Thiếu hoặc sai JWT token)' })
  findAll(@CurrentUser() currentUser: JwtPayload) {
    return this.applicationsService.findAll(currentUser);
  }

  @Get(':id')
  @Auth()
  @ApiOperation({ summary: 'Lấy thông tin chi tiết một ứng dụng theo ID' })
  @ApiParam({ name: 'id', description: 'UUID của ứng dụng' })
  @ApiResponse({ status: 200, description: 'Lấy thông tin ứng dụng thành công' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực (Thiếu hoặc sai JWT token)' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập ứng dụng của người khác' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy ứng dụng với ID này' })
  findById(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.applicationsService.findById(id, currentUser);
  }

  @Patch(':id')
  @Put(':id')
  @Auth()
  @ApiOperation({ summary: 'Cập nhật thông tin ứng dụng (chủ sở hữu hoặc ADMIN)' })
  @ApiParam({ name: 'id', description: 'UUID của ứng dụng' })
  @ApiResponse({ status: 200, description: 'Cập nhật ứng dụng thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu đầu vào không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực (Thiếu hoặc sai JWT token)' })
  @ApiResponse({ status: 403, description: 'Không có quyền cập nhật ứng dụng của người khác' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy ứng dụng với ID này' })
  update(
    @Param('id') id: string,
    @Body() updateApplicationDto: UpdateApplicationDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.applicationsService.update(id, updateApplicationDto, currentUser);
  }

  @Delete(':id')
  @Auth()
  @ApiOperation({ summary: 'Xóa ứng dụng theo ID (chủ sở hữu hoặc ADMIN)' })
  @ApiParam({ name: 'id', description: 'UUID của ứng dụng' })
  @ApiResponse({ status: 200, description: 'Xóa ứng dụng thành công' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực (Thiếu hoặc sai JWT token)' })
  @ApiResponse({ status: 403, description: 'Không có quyền xóa ứng dụng của người khác' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy ứng dụng với ID này' })
  delete(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.applicationsService.delete(id, currentUser);
  }

  @Post(':id/regenerate-token')
  @HttpCode(HttpStatus.OK)
  @Auth()
  @ApiOperation({ summary: 'Cấp lại AppToken cho ứng dụng (chủ sở hữu hoặc ADMIN)' })
  @ApiParam({ name: 'id', description: 'UUID của ứng dụng' })
  @ApiResponse({ status: 200, description: 'Cấp lại AppToken thành công' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực (Thiếu hoặc sai JWT token)' })
  @ApiResponse({ status: 403, description: 'Không có quyền cấp lại token cho ứng dụng của người khác' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy ứng dụng với ID này' })
  regenerateToken(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.applicationsService.regenerateAppToken(id, currentUser);
  }
}
