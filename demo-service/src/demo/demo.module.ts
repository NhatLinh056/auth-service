import { Module } from '@nestjs/common';
import { DemoController } from './demo.controller.js';
import { AuthClientModule } from '../auth-client/auth-client.module.js';

@Module({
  imports: [AuthClientModule],
  controllers: [DemoController],
})
export class DemoModule {}
