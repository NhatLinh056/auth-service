import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { AuthClientModule } from '../auth-client/auth-client.module.js';
import { TenantsController } from './tenants.controller.js';

@Module({
  imports: [AuthClientModule],
  controllers: [OrdersController, TenantsController],
  providers: [OrdersService],
})
export class OrdersModule {}
