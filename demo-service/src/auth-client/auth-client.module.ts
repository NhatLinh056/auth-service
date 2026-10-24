import { Module } from '@nestjs/common';
import { AuthClientService } from './auth-client.service.js';
import { UserAuthGuard } from './guards/user-auth.guard.js';

@Module({
  providers: [AuthClientService, UserAuthGuard],
  exports: [AuthClientService, UserAuthGuard],
})
export class AuthClientModule {}
