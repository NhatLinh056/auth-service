# Demo Service

Ứng dụng khách (Client Microservice) tích hợp xác thực ủy quyền với Auth Service (Project 1). Dịch vụ không lưu database người dùng riêng hay mật khẩu.

- **Portal:** http://localhost:3001
- **Handshake Status:** http://localhost:3001/status
- **API Bảo vệ minh họa:** `GET /auth/protected` (Yêu cầu Bearer JWT)

## Bảng Tra cứu API

| Phương thức | Endpoint | Xác thực | Chức năng |
|---|---|---|---|
| `GET` | `/status` | Public | Handshake xác thực kết nối Microservice với Auth Service (`X-App-Id`, `X-App-Token`) |
| `GET` | `/auth/providers` | Public | Lấy danh sách phương thức OAuth đang bật từ Auth Service |
| `POST` | `/auth/start` | Public | Khởi tạo phiên đăng nhập OAuth kèm PKCE challenge và state |
| `POST` | `/auth/exchange` | Public | Đổi mã dùng một lần (code + verifier) lấy JWT phiên ứng dụng |
| `GET` | `/auth/protected` | Bearer (App User) | API bảo vệ minh họa xác thực token qua `UserAuthGuard` |

## Đặc tả Kỹ thuật Cốt lõi

- **Delegated Authentication (Xác thực ủy quyền):** Mọi thao tác kiểm tra chữ ký token và định danh người dùng đều được ủy thác cho Auth Service qua `auth-client` module.
- **Bảo mật OAuth 2.0:** Sử dụng PKCE S256 và browser-bound state chống tấn công CSRF và chặn bắt mã ủy quyền; tuyệt đối không truyền JWT qua URL.
- **Service-to-Service Trust:** Giao tiếp nội bộ được bảo vệ bởi cặp khóa `AppID` và `AppToken` (256-bit entropy).

## Khởi chạy

```powershell
# Cài phụ thuộc và tạo file .env
npm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }

# Điền APP_ID và APP_TOKEN từ Developer Console vào .env, sau đó chạy:
npm run start:dev
```
