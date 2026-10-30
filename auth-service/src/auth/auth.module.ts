import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../common/strategies/jwt.strategy.js';
import { OAuthProvidersModule } from '../oauth-providers/oauth-providers.module.js';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { OAuthService } from './oauth.service.js';

@Module({
  imports: [
    UsersModule,
    OAuthProvidersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (process.env.NODE_ENV === 'production' && (!secret || secret === 'super-secret-jwt-key-for-project-3')) {
          throw new Error('FATAL: JWT_SECRET must be configured with a secure private key in production!');
        }
        return {
          secret: secret || 'super-secret-jwt-key-for-project-3',
          signOptions: {
            expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, OAuthService, JwtStrategy],
  exports: [AuthService, OAuthService, JwtModule, PassportModule, JwtStrategy],
})
export class AuthModule {}

