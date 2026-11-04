import {
  Controller,
  BadRequestException,
  Get,
  Post,
  Param,
  Body,
  Header,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrdersService, type Order } from './orders.service.js';
import { AuthClientService, type AuthUserProfile } from '../auth-client/auth-client.service.js';
import { UserAuthGuard } from '../auth-client/guards/user-auth.guard.js';
import { CurrentUser } from '../auth-client/decorators/current-user.decorator.js';
import { appConfig } from '../config/app.config.js';

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
    const providers = await this.authClientService.getAvailableProviders();

    return {
      service: 'demo-service',
      port: 3001,
      status: 'ONLINE',
      handshakeStatus: 'SUCCESS',
      appId: handshake.application?.appId || (handshake as any).appId,
      handshake: {
        authService: 'CONNECTED',
        applicationStatus: handshake.application?.status || (handshake as any).status || 'ACTIVE',
        appId: handshake.application?.appId || (handshake as any).appId,
        appName: handshake.application?.name || (handshake as any).appName || 'Demo Service',
      },
        

      availableOAuthProviders: providers,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Public Sign-in Methods Endpoint for Demo Service Clients
   * Queries Auth Service to discover enabled OAuth providers (Google / Facebook)
   */
  @Get('auth/providers')
  async getAuthProviders() {
    return this.authClientService.getAvailableProviders();
  }

  @Post('auth/start')
  @Header('Cache-Control', 'no-store')
  @HttpCode(HttpStatus.OK)
  async startLogin(@Body() body: { provider?: string; codeChallenge?: string; state?: string }) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(body?.codeChallenge || '') ||
        !/^[A-Za-z0-9_-]{32,128}$/.test(body?.state || '')) {
      throw new BadRequestException('Invalid login request');
    }
    const provider = body.provider ? String(body.provider).toLowerCase() : undefined;
    if (provider && !['google', 'facebook'].includes(provider)) {
      throw new BadRequestException('Unsupported OAuth provider');
    }
    if (provider) {
      const providers = await this.authClientService.getAvailableProviders();
      const match = (providers || []).find(p => (p.provider || '').toLowerCase() === provider);
      if (match && !match.enabled) {
        throw new BadRequestException(`Phương thức đăng nhập qua ${match.name || provider} hiện đang bị vô hiệu hóa.`);
      }
    }
    return this.authClientService.createLoginFlow(`${appConfig.publicUrl}/`, body.codeChallenge!, body.state!, provider);
  }

  /**
   * Protected Profile Endpoint in Project 2 Context
   * Returns user profile with resolved application-level role (ADMIN if App Owner, USER if customer)
   */
  @Header('Cache-Control', 'no-store')
  @Post('auth/exchange')
  @HttpCode(HttpStatus.OK)
  exchange(@Body() body: { code?: string; verifier?: string }) {
    if (typeof body?.code !== 'string' || !body.code || body.code.length > 128 ||
        typeof body.verifier !== 'string' || !/^[A-Za-z0-9._~-]{43,128}$/.test(body.verifier) ||
        Object.keys(body).some(key => !['code', 'verifier'].includes(key))) {
      throw new BadRequestException('Invalid login exchange');
    }
    return this.authClientService.exchangeOAuthCode(body.code, body.verifier);
  }

  /**
   * Protected Illustrative Endpoint (Project 2)
   * Verifies application-scoped user token via UserAuthGuard and returns safe verification context.
   * Works for all users (with or without tenant) without requiring or returning order business data.
   */
  @Get('auth/protected')
  @UseGuards(UserAuthGuard)
  getProtectedResource(@CurrentUser() user: AuthUserProfile) {
    return {
      message: 'Token xác thực thành công qua Auth Service',
      authenticated: true,
      service: 'demo-service',
      appId: user.appId || appConfig.appId,
      user: {
        id: user.id || user.userId,
        email: user.email,
        tenantId: user.tenantId ?? null,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('auth/me')
  @UseGuards(UserAuthGuard)
  getMe(@CurrentUser() user: AuthUserProfile): { user: AuthUserProfile } {
    return { user };
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
