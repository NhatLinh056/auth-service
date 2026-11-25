import { BaseExceptionFilter, HttpAdapterHost, NestFactory } from '@nestjs/core';
import { type ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import { AppModule } from './app.module.js';
import { appConfig } from './config/app.config.js';

// Handle HttpException instances thrown across file-linked SDK copies (distinct @nestjs/common realms)
class LinkedSdkExceptionFilter extends BaseExceptionFilter {
  override catch(exception: any, host: ArgumentsHost) {
    if (
      !(exception instanceof HttpException) &&
      typeof exception?.getStatus === 'function' &&
      typeof exception?.getResponse === 'function'
    ) {
      return host.switchToHttp().getResponse().status(exception.getStatus()).json(exception.getResponse());
    }
    super.catch(exception, host);
  }
}

async function bootstrap() {
  const logger = new Logger('DemoService');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new LinkedSdkExceptionFilter(httpAdapter));

  // Enable CORS
  app.enableCors();

  // Serve Frontend UI for Demo Service
  app.useStaticAssets(join(process.cwd(), 'public'));

  await app.listen(appConfig.port);

  logger.log(`=======================================================`);
  logger.log(` [PROJECT 2] Demo Service running on Port ${appConfig.port}`);
  logger.log(` Target Auth Service: ${appConfig.authServiceUrl}`);
  logger.log(` AppID: ${appConfig.appId || '(NOT SET)'}`);
  logger.log(` Handshake status: http://localhost:${appConfig.port}/status`);
  logger.log(` Protected illustrative resource: http://localhost:${appConfig.port}/auth/protected`);
  logger.log(`=======================================================`);
}

bootstrap();
