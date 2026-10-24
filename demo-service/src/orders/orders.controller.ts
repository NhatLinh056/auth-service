import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrdersService, type Order } from './orders.service.js';
import { AuthClientService, type AuthUserProfile } from '../auth-client/auth-client.service.js';
import { UserAuthGuard } from '../auth-client/guards/user-auth.guard.js';
import { CurrentUser } from '../auth-client/decorators/current-user.decorator.js';

@Controller()
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly authClientService: AuthClientService,
  ) {}

  /**
   * Public Handshake Status Endpoint
   * Verifies inter-service connectivity with Auth Service using AppID & AppToken
   */
  @Get('status')
  async getStatus() {
    const handshake = await this.authClientService.verifyService();

    return {
      service: 'demo-service',
      port: 3001,
      status: 'ONLINE',
      handshake: {
        authService: 'CONNECTED',
        applicationStatus: handshake.status,
        appId: handshake.application.appId,
        appName: handshake.application.name,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Protected Business Endpoint
   * Delegates User JWT authentication to Auth Service via UserAuthGuard
   */
  @Get('orders')
  @UseGuards(UserAuthGuard)
  getOrders(@CurrentUser() user: AuthUserProfile): { user: AuthUserProfile; orders: Order[] } {
    const orders = this.ordersService.findAll(user);
    return {
      user,
      orders,
    };
  }

  /**
   * Protected Order Creation Endpoint
   */
  @Post('orders')
  @UseGuards(UserAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  createOrder(
    @Body() body: { item: string; quantity: number; price: number },
    @CurrentUser() user: AuthUserProfile,
  ): { message: string; order: Order } {
    const order = this.ordersService.create(body, user);
    return {
      message: 'Order created successfully with delegated user identity',
      order,
    };
  }

  /**
   * Protected Order Detail Endpoint
   */
  @Get('orders/:id')
  @UseGuards(UserAuthGuard)
  getOrderById(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserProfile,
  ): Order {
    return this.ordersService.findById(id, user);
  }
}
