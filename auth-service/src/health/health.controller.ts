import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service.js';

// @ApiTags: nhóm các endpoint này lại dưới nhãn "health" trong Swagger UI
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @ApiOperation({ summary: 'Kiểm tra trạng thái server' })
  @Get()
  async getHealth(): Promise<object> {
    return this.healthService.getStatus();
  }
}
