import {
  Controller,
  Get,
  UseGuards,
  Inject,
} from '@nestjs/common';
import type { AuthClient, AppUserProfile } from 'auth-service-client';
import { AuthGuard, CurrentUser, AUTH_CLIENT } from 'auth-service-client/nest';
import { appConfig } from '../config/app.config.js';

@Controller()
export class DemoController {
  constructor(@Inject(AUTH_CLIENT) private readonly authClient: AuthClient) {}

  /**
   * Public Handshake Status Endpoint
   * Verifies inter-service connectivity with Auth Service using AppID & AppToken via SDK verifyService()
   */
  @Get('status')
  async getStatus() {
    const handshake = await this.authClient.verifyService();
    const providers = await this.authClient.getProviders();

    return {
      service: 'demo-service',
      port: 3001,
      status: 'ONLINE',
      handshakeStatus: 'SUCCESS',
      appId: handshake.application?.appId,
      handshake: {
        authService: 'CONNECTED',
        applicationStatus: handshake.application?.status || 'ACTIVE',
        appId: handshake.application?.appId,
        appName: handshake.application?.name || 'Demo Service',
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
    return this.authClient.getProviders();
  }

  /**
   * Protected Illustrative Endpoint (Project 2)
   * Verifies application-scoped user token via AuthGuard and returns safe verification context.
   */
  @Get('auth/protected')
  @UseGuards(AuthGuard)
  getProtectedResource(@CurrentUser() user: AppUserProfile) {
    return {
      message: 'Token xác thực thành công qua Auth Service',
      authenticated: true,
      service: 'demo-service',
      appId: user?.appId || appConfig.appId,
      user: {
        id: user?.id || user?.userId,
        email: user?.email,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('auth/me')
  @UseGuards(AuthGuard)
  getMe(@CurrentUser() user: AppUserProfile): { user: AppUserProfile } {
    return { user };
  }
}
