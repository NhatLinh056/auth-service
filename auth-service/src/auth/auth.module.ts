import { getJwtSecret } from './jwt-secret.js';
import { OAuthGrantsService } from './oauth-grants.service.js';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../common/strategies/jwt.strategy.js';
import { OAuthProvidersModule } from '../oauth-providers/oauth-providers.module.js';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { OAuthService } from './oauth.service.js';
import { SharedIdentityService } from './shared-identity.service.js';
import { AccountController } from './account.controller.js';
import { AccountOAuthService } from './account-oauth.service.js';
import { LoginFlowService } from './login-flow.service.js';
import { LoginFlowController } from './login-flow.controller.js';

@Module({
  imports: [
    UsersModule,
    OAuthProvidersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: () => {
        return {
          secret: getJwtSecret(),
          signOptions: {
            expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any,
          },
        };
      },
    }),
  ],
  controllers: [AuthController, AccountController, LoginFlowController],
  providers: [LoginFlowService, AccountOAuthService, SharedIdentityService, OAuthGrantsService, AuthService, OAuthService, JwtStrategy],
  exports: [AuthService, OAuthService, JwtModule, PassportModule, JwtStrategy],
})
export class AuthModule {}

