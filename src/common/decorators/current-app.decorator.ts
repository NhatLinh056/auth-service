import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Factory function trích xuất thông tin ứng dụng từ request.application
 */
export function getCurrentAppByContext(
  data: string | undefined,
  ctx: ExecutionContext,
) {
  const request = ctx.switchToHttp().getRequest();
  const application = request.application;

  if (!application) {
    return null;
  }

  return data ? application[data] : application;
}

/**
 * Decorator @CurrentApp(prop?) dùng để trích xuất thông tin application từ request.application
 * sau khi đã qua AppAuthGuard.
 *
 * Ví dụ sử dụng:
 *   - @CurrentApp() app: Application          -> Lấy toàn bộ thông tin ứng dụng
 *   - @CurrentApp('id') appId: string         -> Lấy UUID của ứng dụng
 *   - @CurrentApp('name') appName: string     -> Lấy tên ứng dụng
 */
export const CurrentApp = createParamDecorator(getCurrentAppByContext);
