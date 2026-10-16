import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

// @Module() → khai báo đây là một Module
// Module là nơi "đăng ký" Controller và Service để NestJS biết chúng thuộc về nhau
@Module({
  controllers: [HealthController], // Controller nào thuộc module này?
  providers: [HealthService],      // Service nào thuộc module này? (providers = service)
})
export class HealthModule {}
