import { type DynamicModule, Module, type Provider } from '@nestjs/common';
import { AuthClient, type AuthClientOptions, type CookieOptions } from '../client.js';
import { AUTH_CLIENT, AUTH_MODULE_OPTIONS } from './constants.js';
import { AuthGuard } from './auth.guard.js';
import { AuthCallbackController } from './auth-callback.controller.js';

export interface NestAuthModuleOptions extends AuthClientOptions {
  redirectUri?: string;
  successRedirect?: string;
  failureRedirect?: string;
  sessionCookieName?: string;
  transactionCookieName?: string;
  cookieOptions?: CookieOptions;
  publicAppUrl?: string;
  trustedOrigins?: string[];
  isGlobal?: boolean;
}

export interface NestAuthModuleAsyncOptions {
  imports?: any[];
  useFactory: (...args: any[]) => Promise<NestAuthModuleOptions> | NestAuthModuleOptions;
  inject?: any[];
  isGlobal?: boolean;
}

@Module({})
export class AuthModule {
  static forRoot(options: NestAuthModuleOptions): DynamicModule {
    const optionsProvider: Provider = {
      provide: AUTH_MODULE_OPTIONS,
      useValue: options,
    };

    const clientProvider: Provider = {
      provide: AUTH_CLIENT,
      useFactory: () => new AuthClient(options),
    };

    return {
      module: AuthModule,
      global: options.isGlobal ?? false,
      providers: [optionsProvider, clientProvider, AuthGuard],
      controllers: [AuthCallbackController],
      exports: [AUTH_CLIENT, AUTH_MODULE_OPTIONS, AuthGuard],
    };
  }

  static forRootAsync(asyncOptions: NestAuthModuleAsyncOptions): DynamicModule {
    const optionsProvider: Provider = {
      provide: AUTH_MODULE_OPTIONS,
      useFactory: asyncOptions.useFactory,
      inject: asyncOptions.inject || [],
    };

    const clientProvider: Provider = {
      provide: AUTH_CLIENT,
      useFactory: (opts: NestAuthModuleOptions) => new AuthClient(opts),
      inject: [AUTH_MODULE_OPTIONS],
    };

    return {
      module: AuthModule,
      global: asyncOptions.isGlobal ?? false,
      imports: asyncOptions.imports || [],
      providers: [optionsProvider, clientProvider, AuthGuard],
      controllers: [AuthCallbackController],
      exports: [AUTH_CLIENT, AUTH_MODULE_OPTIONS, AuthGuard],
    };
  }
}
