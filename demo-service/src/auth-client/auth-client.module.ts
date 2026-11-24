import { Module } from '@nestjs/common';
import { AuthModule, AuthGuard, CurrentUser, AUTH_CLIENT } from 'auth-service-client/nest';
import { appConfig } from '../config/app.config.js';

@Module({
  imports: [
    AuthModule.forRootAsync({
      isGlobal: true,
      useFactory: () => ({
        authServiceUrl: appConfig.authServiceUrl,
        appId: appConfig.appId,
        appToken: appConfig.appToken,
        redirectUri: `${appConfig.publicUrl}/auth/callback`,
        publicAppUrl: appConfig.publicUrl,
        successRedirect: '/',
        failureRedirect: '/?error=',
        cookieOptions: {
          secure: process.env.NODE_ENV === 'production',
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
        },
      }),
    }),
  ],
  exports: [AuthModule],
})
export class AuthClientModule {}
