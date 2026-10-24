import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { appConfig } from './config/app.config.js';

async function bootstrap() {
  const logger = new Logger('DemoService');
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors();

  await app.listen(appConfig.port);

  logger.log(`=======================================================`);
  logger.log(`🚀 [PROJECT 2] Demo Service running on Port ${appConfig.port}`);
  logger.log(`🔗 Target Auth Service: ${appConfig.authServiceUrl}`);
  logger.log(`🔑 AppID: ${appConfig.appId || '(NOT SET)'}`);
  logger.log(`📡 Handshake status: http://localhost:${appConfig.port}/status`);
  logger.log(`📦 Protected business orders: http://localhost:${appConfig.port}/orders`);
  logger.log(`=======================================================`);
}

bootstrap();
