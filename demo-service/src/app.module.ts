import { Module } from '@nestjs/common';
import { AuthClientModule } from './auth-client/auth-client.module.js';
import { OrdersModule } from './orders/orders.module.js';

@Module({
  imports: [AuthClientModule, OrdersModule],
})
export class AppModule {}
