import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller.js';
import { TenantsService } from './tenants.service.js';

@Module({ controllers: [TenantsController], providers: [TenantsService] })
export class TenantsModule {}
