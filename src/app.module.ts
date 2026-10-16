import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { HealthModule } from './health/health.module.js';

@Module({
  imports: [HealthModule], // Đăng ký HealthModule vào đây để NestJS nhận diện
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
