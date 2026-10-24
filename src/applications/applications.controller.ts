import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Auth } from '../common/decorators/auth.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../common/strategies/jwt.strategy.js';
import { ApplicationsService } from './applications.service.js';
import { CreateApplicationDto } from './dto/create-application.dto.js';

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
}
