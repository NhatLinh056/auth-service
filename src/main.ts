import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // --- Cấu hình Swagger ---
  // DocumentBuilder: xây dựng metadata cho tài liệu API
  const config = new DocumentBuilder()
    .setTitle('Auth Service API')           // Tiêu đề hiển thị trên Swagger UI
    .setDescription('Authentication & Authorization Service') // Mô tả
    .setVersion('1.0')                      // Version của API
    .addBearerAuth()                        // Thêm nút "Authorize" để nhập JWT token (dùng ở TODO sau)
    .build();

  // SwaggerModule.createDocument: sinh ra file JSON mô tả toàn bộ API (OpenAPI spec)
  const document = SwaggerModule.createDocument(app, config);

  // SwaggerModule.setup: mount Swagger UI tại đường dẫn '/api'
  SwaggerModule.setup('api', app, document);
  // → Truy cập: http://localhost:3000/api
  // ---------------------

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
