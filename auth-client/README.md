# Auth Service Client SDK (`auth-service-client`)

Bộ thư viện chính thức tích hợp xác thực và bảo vệ API bằng **Auth Service** cho các ứng dụng **NestJS** (`auth-service-client/nest`).

---

## 1. Cấu hình trên Developer Console

1. Truy cập Developer Console của Auth Service (`http://localhost:3000`).
2. Tạo Application mới và lấy thông tin:
   - `AppID`: Định danh ứng dụng (ví dụ: `app_1234567890abcdef12345678`).
   - `AppToken`: Khóa bí mật máy chủ backend (ví dụ: `apt_1234567890abcdef...`).
3. Khai báo **Allowed Redirect URIs**:
   - Thêm URL callback backend của ứng dụng vào allowlist, ví dụ: `http://localhost:3001/auth/callback`.
4. Bật Provider:
   - Kích hoạt Google hoặc Facebook trong Cài Đặt nhà cung cấp của ứng dụng.

---

## 2. Cài đặt SDK

Gói SDK được phân phối dưới dạng file tarball chuẩn (`.tgz`) phiên bản 1.1.0:

```bash
# Cài đặt trực tiếp từ endpoint Auth Service (kèm dotenv):
npm install dotenv http://localhost:3000/sdk/auth-service-client-1.1.0.tgz

# Hoặc tải file tarball về thư mục dự án và cài đặt (đường dẫn cục bộ):
npm install dotenv ./auth-service-client-1.1.0.tgz
```

---

## 3. Cấu hình Môi trường (`.env`)

Tạo file `.env` tại thư mục gốc backend (AppToken là khóa bí mật máy chủ, tuyệt đối không đưa ra frontend hay commit lên git):

```env
PORT=3001
AUTH_SERVICE_URL=http://localhost:3000
APP_ID=app_1234567890abcdef12345678
APP_TOKEN=apt_1234567890abcdef...
REDIRECT_URI=http://localhost:3001/auth/callback
NODE_ENV=development
```

---

## 4. Tích hợp NestJS (`auth-service-client/nest`)

### Bước 1: Đăng ký `AuthModule` trong `app.module.ts`

`AuthModule` tự động quản lý các route khởi tạo đăng nhập Google/Facebook, callback đổi mã lấy cookie phiên HttpOnly và đăng xuất an toàn chống Forced-Logout CSRF:

```typescript
import 'dotenv/config';
import { Module } from '@nestjs/common';
import { AuthModule } from 'auth-service-client/nest';
import { AppController } from './app.controller.js';

@Module({
  imports: [
    AuthModule.forRoot({
      authServiceUrl: process.env.AUTH_SERVICE_URL!,
      appId: process.env.APP_ID!,
      appToken: process.env.APP_TOKEN!,
      redirectUri: process.env.REDIRECT_URI!,
      publicAppUrl: new URL(process.env.REDIRECT_URI!).origin,
      successRedirect: '/profile', // Tự động chuyển hướng về đây sau khi đăng nhập thành công
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
```

### Bước 2: Bảo vệ API với `AuthGuard` và nhận profile qua `@CurrentUser()` trong Controller

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser, type AppUserProfile } from 'auth-service-client/nest';

@Controller()
export class AppController {
  // Tuyến /profile được bảo vệ bởi AuthGuard (chuyển hướng về đây sau khi đăng nhập thành công)
  @Get('profile')
  @UseGuards(AuthGuard)
  getProfile(@CurrentUser() user: AppUserProfile) {
    return {
      message: 'Đăng nhập thành công!',
      user,
    };
  }

  // Tuyến API nội bộ được bảo vệ bởi AuthGuard (tự động xác minh trực tuyến fail-closed)
  @Get('api/protected')
  @UseGuards(AuthGuard)
  getProtectedResource(@CurrentUser() user: AppUserProfile) {
    return {
      message: 'Xác thực thành công!',
      user,
    };
  }
}
```

---

## 5. Bảng Tra cứu 4 Tuyến đường do SDK Tự động Cung cấp (`/auth/*`)

Khi đăng ký `AuthModule`, SDK tự động cung cấp `AuthCallbackController` quản lý 4 tuyến xác thực sau:

| Method | Endpoint | Mô tả & Chức năng |
|---|---|---|
| `GET` | `/auth/login/google` | Khởi tạo đăng nhập Google (trình duyệt truy cập để chuyển hướng sang Google Broker) |
| `GET` | `/auth/login/facebook` | Khởi tạo đăng nhập Facebook (trình duyệt truy cập để chuyển hướng sang Facebook Broker) |
| `GET` | `/auth/callback` | Callback nhận code và state, tự động đổi token và chuyển hướng tới `successRedirect` |
| `POST` | `/auth/logout` | Đăng xuất phiên người dùng (tự động kiểm tra Origin / Fetch Metadata chống Forced-Logout CSRF và xóa cookies) |

> **Lưu ý:** Các tuyến như `/profile` hay `/api/protected` là do lập trình viên tự khai báo trong controller của ứng dụng và gắn `@UseGuards(AuthGuard)`. SDK chỉ tự động cung cấp 4 tuyến `/auth/*` trên.

---

## 6. Bảo Mật & Fail-Closed

1. **PKCE S256 & State Chống Replay**: SDK tự sinh mã kiểm tra PKCE SHA-256 và `state` chống CSRF. Phiên transaction được ký HMAC-SHA256 lưu trong cookie HttpOnly của trình duyệt và xóa ngay khi đổi code.
2. **Authorization Code TTL 60s**: Mã đổi một lần duy nhất theo chuẩn bảo mật backend-to-backend.
3. **Chính Sách CSRF**: Bearer header miễn nhiễm CSRF; đối với session cookie, các unsafe methods (`POST`, `PUT`, `PATCH`, `DELETE`) bắt buộc kiểm tra Origin / Fetch Metadata (`Sec-Fetch-Site: same-origin` hoặc khớp app origin tin cậy).
4. **Xác Minh Trực Tuyến Fail-Closed**: `AuthGuard` tự động xác thực token với Auth Service qua `GET /users/verify-app-user`. Khi Auth Service không phản hồi hoặc token không hợp lệ/sai app/bị thu hồi, Guard từ chối truy cập ngay lập tức.
