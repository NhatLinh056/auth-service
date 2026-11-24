# Demo Service

Ứng dụng khách mẫu độc lập (Canonical Independent NestJS Sample) tích hợp xác thực ủy quyền với Auth Service (Project 1) bằng bộ SDK chính thức `auth-service-client/nest`.

Dịch vụ tuân thủ nghiêm ngặt Hiến pháp kiến trúc v2.0: **hoàn toàn không lưu database người dùng riêng**, không lưu mật khẩu, không có logic nghiệp vụ thương mại giả lập (0 mock commerce), và không lặp lại mã HTTP/axios thủ công.

- **Portal:** http://localhost:3001
- **Handshake Status:** http://localhost:3001/status
- **API Bảo vệ minh họa:** `GET /auth/protected` (Bảo vệ bằng `AuthGuard` từ SDK, chấp nhận Bearer JWT hoặc session cookie)

---

## 1. Kiến trúc Tích hợp NestJS Mẫu

Ứng dụng tiêu thụ trực tiếp adapter NestJS chính thức từ SDK (`auth-service-client/nest`):
- **Đăng ký Module:** `AuthModule.forRootAsync({ ... })` nạp cấu hình `appId`, `appToken`, `authServiceUrl`, và origin tin cậy `publicAppUrl`.
- **Bảo vệ API:** Sử dụng `@UseGuards(AuthGuard)` và decorator `@CurrentUser()`. Hỗ trợ cả Bearer token (miễn nhiễm CSRF) lẫn cookie phiên (tự động kiểm tra Origin / Fetch Metadata trên các thao tác đột biến).
- **Handshake Microservice:** Gọi trực tiếp `authClient.verifyService()` để xác thực trạng thái kết nối server-to-server (`GET /status`).
- **Direct OAuth Broker & Logout Tự động:** Các route direct login (`/auth/login/google`, `/auth/login/facebook`), callback (`/auth/callback`), và đăng xuất an toàn (`POST /auth/logout`) được tự động cung cấp bởi adapter SDK.

---

## 2. Bảng Tra cứu API

| Phương thức | Endpoint | Xác thực | Nguồn cung cấp | Chức năng |
|---|---|---|---|---|
| `GET` | `/status` | Public | `DemoController` | Handshake kiểm tra kết nối với Auth Service qua `authClient.verifyService()` |
| `GET` | `/auth/providers` | Public | `DemoController` | Lấy danh sách provider OAuth đang bật qua `authClient.getProviders()` |
| `GET` | `/auth/login/google` | Public | SDK `AuthCallbackController` | Direct OAuth Broker: chuyển hướng thẳng tới Google |
| `GET` | `/auth/login/facebook` | Public | SDK `AuthCallbackController` | Direct OAuth Broker: chuyển hướng thẳng tới Facebook |
| `GET` | `/auth/callback` | Public | SDK `AuthCallbackController` | Callback trao đổi mã authorization code và cấp cookie `app_session` |
| `POST` | `/auth/logout` | Public (Chống CSRF) | SDK `AuthCallbackController` | Đăng xuất an toàn: kiểm tra Origin, xóa cookie phiên `app_session` và `auth_tx` |
| `POST` | `/auth/start` | Public | `DemoController` | Khởi tạo phiên đăng nhập OAuth cho giao diện web portal |
| `POST` | `/auth/exchange` | Public | `DemoController` | Đổi mã code lấy token cho giao diện web portal |
| `GET` | `/auth/protected` | `AuthGuard` | `DemoController` | API bảo vệ minh họa xác thực token trực tuyến qua Auth Service (Fail-closed) |
| `GET` | `/auth/me` | `AuthGuard` | `DemoController` | Lấy thông tin tài khoản người dùng hiện hành qua decorator `@CurrentUser()` |

---

## 3. Khởi chạy Ứng dụng

```powershell
# Cài phụ thuộc và tạo file .env
npm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }

# Điền APP_ID và APP_TOKEN từ Developer Console vào .env, sau đó chạy:
npm run start:dev
```
