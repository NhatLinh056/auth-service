import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { OAuthProvidersController } from './oauth-providers.controller.js';
import { OAuthProvidersService } from './oauth-providers.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [OAuthProvidersController],
  providers: [OAuthProvidersService],
  exports: [OAuthProvidersService],
})
export class OAuthProvidersModule {}
