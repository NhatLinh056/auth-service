import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service.js';

// @ApiTags: nhóm các endpoint này lại dưới nhãn "health" trong Swagger UI
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  // @ApiOperation: mô tả endpoint này làm gì — hiển thị trên Swagger UI
  @ApiOperation({ summary: 'Kiểm tra trạng thái server' })
  @Get()
  getHealth(): object {
    return this.healthService.getStatus();
  }
}
