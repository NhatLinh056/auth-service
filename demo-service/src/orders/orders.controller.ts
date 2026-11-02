import {
  Controller,
  BadRequestException,
  Get,
  Post,
  Param,
  Body,
  Query,
  Res,
  Header,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrdersService, type Order } from './orders.service.js';
import { AuthClientService, type AuthUserProfile } from '../auth-client/auth-client.service.js';
import { UserAuthGuard } from '../auth-client/guards/user-auth.guard.js';
import { CurrentUser } from '../auth-client/decorators/current-user.decorator.js';
import type { Response } from 'express';
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
        appName: handshake.application?.name || (handshake as any).appName,
        owner: {
          userId: handshake.application?.userId || handshake.application?.user?.id,
          email: handshake.application?.user?.email,
          name: handshake.application?.user?.name,
          roleInProject1: handshake.application?.user?.role || 'USER',
          roleInProject2: 'ADMIN (Chủ sở hữu ứng dụng)',
        },
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

  @Get('auth/start/:provider')
  async startOAuth(
    @Param('provider') provider: string,
    @Query('code_challenge') challenge: string,
    @Res() res: Response,
  ) {
    if (!['google', 'facebook'].includes(provider) ||
        !/^[A-Za-z0-9_-]{43}$/.test(challenge || '')) {
      return res.redirect('/?error=oauth_not_ready');
    }
    const redirectUri = `${appConfig.publicUrl}/`;
    try {
      await this.authClientService.checkOAuthProvider(provider, redirectUri);
    } catch {
      return res.redirect('/?error=oauth_not_ready');
    }
    const query = new URLSearchParams({
      code_challenge: challenge,
      redirect_uri: redirectUri,
      app_id: appConfig.appId,
    });
    return res.redirect(`${appConfig.authServiceUrl}/auth/oauth/${provider}?${query}`);
  }

  /**
   * Protected Profile Endpoint in Project 2 Context
   * Returns user profile with resolved application-level role (ADMIN if App Owner, USER if customer)
   */
  @Header('Cache-Control', 'no-store')
  @Post('auth/exchange')
  @HttpCode(HttpStatus.OK)
  exchange(@Body() body: { code?: string; verifier?: string }) {
    if (typeof body?.code !== 'string' || body.code.length > 128 ||
        typeof body.verifier !== 'string' || !/^[A-Za-z0-9._~-]{43,128}$/.test(body.verifier)) {
      throw new BadRequestException('Invalid login exchange');
    }
    return this.authClientService.exchangeOAuthCode(body.code, body.verifier);
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
