import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { AuthClientModule } from '../auth-client/auth-client.module.js';

@Module({
  imports: [AuthClientModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
