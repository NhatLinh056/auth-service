import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AppStatus } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';

/**
 * AppAuthGuard xác thực các yêu cầu liên thông từ Microservice / Ứng dụng con:
 * 1. Đọc headers 'x-app-id' (hoặc 'X-App-Id') và 'x-app-token' (hoặc 'X-App-Token').
 * 2. Nếu thiếu một trong hai header -> ném 401 UnauthorizedException.
 * 3. Tìm kiếm Application trong database PostgreSQL qua appId.
 * 4. Nếu không tìm thấy hoặc appToken không khớp -> ném 401 UnauthorizedException.
 * 5. Nếu application.status !== AppStatus.ACTIVE -> ném 403 ForbiddenException.
 * 6. Gán application vào request.application và cho phép request đi tiếp.
 */
@Injectable()
export class AppAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const headers = request.headers;

    const appId = (headers['x-app-id'] ?? headers['X-App-Id']) as string | undefined;
    const appToken = (headers['x-app-token'] ?? headers['X-App-Token']) as string | undefined;

    if (!appId || !appToken) {
      throw new UnauthorizedException(
        'Thiếu thông tin xác thực ứng dụng: Yêu cầu Header X-App-Id và X-App-Token',
      );
    }

    const application = await this.prisma.application.findUnique({
      where: { appId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
    });

    if (!application || application.appToken !== appToken) {
      throw new UnauthorizedException(
        'Xác thực ứng dụng thất bại: AppID hoặc AppToken không chính xác',
      );
    }

    if (application.status !== AppStatus.ACTIVE) {
      throw new ForbiddenException(
        'Ứng dụng đã bị vô hiệu hóa hoặc ngừng hoạt động (INACTIVE)',
      );
    }

    // Gán thông tin ứng dụng đã được xác thực vào request
    request.application = application;

    return true;
  }
}
