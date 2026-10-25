import { Module } from '@nestjs/common';
import { ApplicationsController } from './applications.controller.js';
import { ApplicationsService } from './applications.service.js';

import { OAuthProvidersModule } from '../oauth-providers/oauth-providers.module.js';

@Module({
  imports: [OAuthProvidersModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
