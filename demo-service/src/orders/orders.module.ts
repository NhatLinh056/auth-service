import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller.js';
import { AuthClientModule } from '../auth-client/auth-client.module.js';

@Module({
  imports: [AuthClientModule],
  controllers: [OrdersController],
})
export class OrdersModule {}
