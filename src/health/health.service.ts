import { Injectable } from '@nestjs/common';

// @Injectable() báo cho NestJS biết class này là một Service
// NestJS sẽ tự động tạo instance và inject vào nơi cần dùng
@Injectable()
export class HealthService {
  // Hàm này chứa logic thực sự
  // Controller sẽ gọi hàm này và lấy kết quả trả về cho client
  getStatus(): object {
    return {
      status: 'ok',
      message: 'Auth Service is running',
      timestamp: new Date().toISOString(),
    };
  }
}
