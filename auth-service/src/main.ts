import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'node:path';
import { AppModule } from './app.module.js';
import { getAuthPublicUrl } from './auth/oauth-public-url.js';

async function bootstrap() {
  getAuthPublicUrl();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // --- Kích hoạt CORS ---
  const corsOrigin = process.env.CORS_ORIGIN;
  app.enableCors({
    origin: corsOrigin ? corsOrigin.split(',').map((o) => o.trim()) : true,
    credentials: true,
  });

  // --- Cấu hình Validation toàn cục ---
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // --- Cấu hình Phục vụ Static WebApp Dashboard ---
  app.useStaticAssets(join(process.cwd(), 'public'), {
    prefix: '/dashboard/',
  });
  app.useStaticAssets(join(process.cwd(), 'public'));

  // --- Cấu hình Swagger ---
  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
    const config = new DocumentBuilder()
      .setTitle('Auth Service API')
      .setDescription('Authentication & Authorization Service')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
