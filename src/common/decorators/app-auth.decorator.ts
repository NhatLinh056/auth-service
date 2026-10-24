import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiResponse } from '@nestjs/swagger';
import { AppAuthGuard } from '../guards/app-auth.guard.js';

/**
 * Decorator @AppAuth() bảo vệ endpoint bằng cơ chế xác thực Service-to-Service:
 * - Yêu cầu caller gửi kèm Header 'X-App-Id' và 'X-App-Token'.
 * - Kiểm tra tính hợp lệ và trạng thái ACTIVE của Application trong PostgreSQL qua AppAuthGuard.
 * - Tự động tích hợp tài liệu OpenAPI/Swagger headers.
 */
export function AppAuth() {
  return applyDecorators(
    UseGuards(AppAuthGuard),
    ApiHeader({
      name: 'X-App-Id',
      description: 'Mã định danh ứng dụng / Microservice (AppID)',
      required: true,
      example: 'app_1234567890abcdef12345678',
    }),
    ApiHeader({
      name: 'X-App-Token',
      description: 'Khóa bí mật của ứng dụng / Microservice (AppToken)',
      required: true,
      example: 'apt_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    }),
    ApiResponse({
      status: 401,
      description: 'Thiếu hoặc sai thông tin xác thực ứng dụng (AppID / AppToken)',
    }),
    ApiResponse({
      status: 403,
      description: 'Ứng dụng đã bị vô hiệu hóa hoặc ngừng hoạt động (INACTIVE)',
    }),
  );
}
