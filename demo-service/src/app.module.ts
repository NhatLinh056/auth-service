import { Module } from '@nestjs/common';
import { AuthClientModule } from './auth-client/auth-client.module.js';
import { DemoModule } from './demo/demo.module.js';

@Module({
  imports: [AuthClientModule, DemoModule],
})
export class AppModule {}
