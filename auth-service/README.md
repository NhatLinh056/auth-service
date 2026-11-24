# Auth Service

Dịch vụ định danh trung tâm (Centralized Identity Provider): NestJS, Prisma 7, PostgreSQL và Developer Console React.

- **Developer Console:** http://localhost:3000
- **Swagger API Docs:** http://localhost:3000/api
- **Health Check:** http://localhost:3000/health

## Khởi chạy Nhanh

Yêu cầu: PostgreSQL đang chạy và đã tạo database (mặc định: `CREATE DATABASE auth_service_db;`).

```powershell
# Cài phụ thuộc và cấu hình môi trường
npm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }

# Sinh Prisma Client và áp dụng migration
npx prisma generate --config prisma7.config.ts
npx prisma migrate deploy --config prisma7.config.ts

# Chạy API và Developer Console
npm run start:dev
```

## Nguyên tắc Kiến trúc & Bảo mật Cốt lõi

- **Mô hình Danh tính Độc lập:** `User` là thực thể định danh trung tâm toàn hệ sinh thái; `AppUser` là thành viên riêng trong từng ứng dụng khách. Quyền của Chủ ứng dụng (`isAppOwner`) và Chủ doanh nghiệp (`isTenantOwner`) tách rời tuyệt đối.
- **Multi-tenant Độc lập:** Mỗi User thuộc tối đa 1 Tenant (`User.tenantId` nullable); người chưa có tenant vẫn sử dụng ứng dụng bình thường. Tenant Owner có toàn quyền duyệt/loại thành viên và chuyển giao sở hữu.
- **Chống Chiếm đoạt Tài khoản (Anti-Takeover):** Tuyệt đối không tự gộp tài khoản khi đăng nhập OAuth trùng email (`ACCOUNT_LINK_REQUIRED`). Bắt buộc xác nhận mật khẩu hoặc phiên đăng nhập cũ để liên kết an toàn.
- **Service Handshake:** Kiểm soát giao tiếp Microservice qua header `X-App-Id` và `X-App-Token` 256-bit.

## Bảng Tra cứu API Chính

### 1. Xác thực & Tài khoản Nền tảng (Platform Auth & Account)

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Đăng ký tài khoản nền tảng mới |
| `POST` | `/auth/login` | Public | Đăng nhập tài khoản nền tảng, trả JWT |
| `GET` | `/auth/account` | Bearer (User) | Lấy thông tin tài khoản hiện hành |
| `POST` | `/auth/account/password` | Bearer (User) | Đổi mật khẩu hoặc tạo mật khẩu cho tài khoản OAuth |

### 2. Tích hợp Ứng dụng & Luồng OAuth (Client Apps & OAuth Flows)

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| `GET` | `/auth/verify-service` | `X-App-Id`, `X-App-Token` | Xác thực danh tính Microservice |
| `GET` | `/auth/providers` | `X-App-Id`, `X-App-Token` | Danh sách provider OAuth đang bật của ứng dụng |
| `POST` | `/auth/flows` | `X-App-Id`, `X-App-Token` | Khởi tạo phiên Centralized Login Flow |
| `GET` | `/auth/flows/:id` | Public | Thông tin hiển thị của Login Flow |
| `POST` | `/auth/flows/:id/password` | Public | Đăng nhập email/mật khẩu trong luồng tập trung |
| `POST` | `/auth/flows/:id/session` | Bearer (User) | Tiếp tục bằng phiên Auth Service sẵn có |
| `POST` | `/auth/flows/:id/oauth/:provider/begin` | Public | Bắt đầu OAuth trong luồng tập trung |
| `POST` | `/auth/flows/:id/oauth/complete` | Public | Hoàn tất OAuth và liên kết danh tính an toàn |
| `GET` | `/auth/oauth/:provider` | Public | Bắt đầu luồng Direct OAuth (PKCE, state) |
| `GET` | `/auth/oauth/:provider/callback` | OAuth Provider | Callback điều hướng từ Google / Facebook |
| `POST` | `/auth/oauth/exchange` | `X-App-Id`, `X-App-Token` | Đổi mã đăng nhập dùng 1 lần lấy App JWT |
| `GET` | `/users/verify-app-user` | `X-App-Id`, `X-App-Token` + Bearer | Xác thực JWT ứng dụng và trả context quyền |

### 3. Quản lý Ứng dụng Khách (Developer Console)

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| `GET` | `/applications` | Bearer (User / Admin) | Danh sách ứng dụng |
| `POST` | `/applications` | Bearer (User) | Tạo ứng dụng khách mới |
| `GET` | `/applications/:id` | Bearer (Owner / Admin) | Chi tiết cấu hình ứng dụng |
| `PATCH` | `/applications/:id` | Bearer (Owner / Admin) | Cập nhật tên, danh sách Allowed Redirect URIs |
| `DELETE` | `/applications/:id` | Bearer (Owner / Admin) | Xóa ứng dụng |
| `POST` | `/applications/:id/regenerate-token` | Bearer (Owner / Admin) | Cấp lại AppToken bảo mật |
| `GET` | `/applications/:id/users` | Bearer (Owner / Admin) | Danh sách người dùng của ứng dụng |
| `GET` | `/applications/:id/auth-methods` | Bearer (Owner / Admin) | Danh sách cấu hình phương thức OAuth |
| `PATCH` | `/applications/:id/auth-methods/:provider` | Bearer (Owner / Admin) | Cập nhật Client ID, Client Secret, Callback URL |
| `POST` | `/applications/:id/auth-methods/:provider/toggle` | Bearer (Owner / Admin) | Bật / tắt phương thức OAuth |

### 4. Quản lý Doanh nghiệp (Multi-tenant & Memberships)

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| `GET` | `/tenants` | Bearer (User) | Danh sách doanh nghiệp công khai |
| `POST` | `/tenants` | Bearer (User) | Tạo doanh nghiệp mới (trở thành Tenant Owner) |
| `GET` | `/tenants/me` | Bearer (User) | Doanh nghiệp của tôi và trạng thái yêu cầu |
| `GET` | `/tenants/:id` | Bearer (User) | Xem chi tiết doanh nghiệp |
| `PATCH` | `/tenants/:id` | Bearer (Tenant Owner) | Cập nhật tên hoặc mô tả doanh nghiệp |
| `DELETE` | `/tenants/:id` | Bearer (Tenant Owner) | Xóa doanh nghiệp (khi không còn thành viên khác) |
| `POST` | `/tenants/:id/transfer` | Bearer (Tenant Owner) | Chuyển quyền chủ doanh nghiệp cho thành viên |
| `DELETE` | `/tenants/:id/members/:userId` | Bearer (Tenant Owner) | Xóa thành viên khỏi doanh nghiệp |
| `POST` | `/tenants/join` | Bearer (User) | Gửi yêu cầu xin gia nhập doanh nghiệp |
| `GET` | `/tenants/join-request/my` | Bearer (User) | Xem yêu cầu gia nhập của bản thân |
| `POST` | `/tenants/join-request/:id/cancel` | Bearer (User) | Hủy yêu cầu gia nhập đang chờ |
| `GET` | `/tenants/:id/join-requests` | Bearer (Tenant Owner) | Danh sách yêu cầu xin gia nhập |
| `POST` | `/tenants/join-requests/:id/approve` | Bearer (Tenant Owner) | Phê duyệt thành viên mới |
| `POST` | `/tenants/join-requests/:id/reject` | Bearer (Tenant Owner) | Từ chối yêu cầu gia nhập |
| `POST` | `/tenants/leave` | Bearer (Member) | Rời khỏi doanh nghiệp |
| `GET` | `/tenants/:id/audit` | Bearer (Tenant Owner) | Xem nhật ký audit của doanh nghiệp |

### 5. Quản trị Nền tảng (Platform Super Admin)

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| `GET` | `/users` | Bearer (Super Admin) | Danh sách người dùng toàn hệ thống |
| `GET` | `/users/:id` | Bearer (Super Admin) | Chi tiết thông tin người dùng |
| `PATCH` | `/users/:id` | Bearer (Super Admin) | Cập nhật vai trò / thông tin người dùng |
| `DELETE` | `/users/:id` | Bearer (Super Admin) | Xóa người dùng (không xóa tài khoản còn là chủ) |
| `GET` | `/tenants/audit` | Bearer (Super Admin) | Xem toàn bộ nhật ký audit doanh nghiệp |
| `POST` | `/tenants/:id/admin-transfer` | Bearer (Super Admin) | Can thiệp chuyển chủ tenant (kèm lý do) |

## Lưu ý Triển khai

- **Build Frontend Console:** Mã nguồn React nằm tại `frontend/`. Sau khi sửa code React, chạy `npm --prefix frontend run build` và đồng bộ `frontend/dist/*` sang `public/`.
- **In-Memory State:** Yêu cầu đăng nhập, PKCE state và mã tạm lưu trong bộ nhớ tiến trình (TTL 60s - 300s, tối đa 5 lần thử).

---

## Hướng dẫn Tích hợp REST cho Backend Ngoài (Framework Agnostic)

Dành cho bất kỳ backend nào (NestJS, FastAPI, Spring Boot, Go, Express, NextJS, Python, Java, v.v.) muốn sử dụng Auth Service để đăng nhập và bảo vệ API mà không dùng SDK Node.js.

> **Nếu ứng dụng của bạn viết bằng NestJS:** Bạn nên sử dụng gói SDK client chính thức (`auth-service-client` v1.1.0) qua **NestJS Adapter** (`auth-service-client/nest`) gồm `AuthModule`, `AuthGuard`, `@CurrentUser()` cùng controller tự động quản lý đăng nhập/callback/logout. SDK tự động quản lý PKCE/state, Direct OAuth Broker và xác thực token fail closed. Xem chi tiết tại [auth-client/README.md](../auth-client/README.md), [quickstart.md](../specs/004-integrate-app-sdk/quickstart.md) và giao diện Developer Console (`/console/quickstart`).

### 1. Nguyên tắc bảo mật bắt buộc
- **AppToken ở Backend:** `X-App-Id` và `X-App-Token` chỉ được lưu ở backend (biến môi trường), tuyệt đối không để lộ ra frontend hoặc URL.
- **Redirect URI Allowlist:** URL callback phải được khai báo chính xác trong Developer Console (`Allowed Redirect URIs`).
- **PKCE & State:** Mỗi lần đăng nhập sinh một `state` ngẫu nhiên (>= 32 ký tự) và cặp PKCE (verifier 43–128 ký tự base64url, `codeChallenge = base64url(sha256(verifier))`). Lưu trong session trình duyệt.
- **Mã Authorization Code 60s:** Code trả về ở callback có thời hạn 60 giây và chỉ dùng được một lần.
- **Fail Closed:** Khi Auth Service gặp sự cố hoặc timeout, API bảo vệ phải từ chối truy cập (401/403/502).

### 2. Quy trình 4 bước tích hợp REST (Direct OAuth Broker)

#### Bước 1: Khởi tạo luồng Direct OAuth Broker (`GET /auth/oauth/:provider`)
Ứng dụng khách hiển thị nút đăng nhập Google/Facebook. Khi người dùng bấm nút, backend tạo `verifier`, `codeChallenge` (S256), `state` ngẫu nhiên, lưu vào cookie phiên và điều hướng trình duyệt (302) tới broker của Auth Service:
```http
GET /auth/oauth/google?app_id=<APP_ID>&redirect_uri=<ENCODED_REDIRECT_URI>&code_challenge=<S256_CHALLENGE>&state=<RANDOM_STATE> HTTP/1.1
Host: localhost:3000
```
Auth Service đóng vai trò broker chuyển hướng người dùng thẳng sang trang đồng ý của Google hoặc Facebook (không qua trang đăng nhập tập trung).
*Lưu ý bảo mật*: Endpoint này là Public và chỉ nhận `app_id` (không nhận `AppToken`). `AppToken` được kiểm tra tại Bước 3 khi đổi code.

#### Bước 2: Điều hướng người dùng và nhận Callback
Sau khi người dùng đồng ý tại Provider, Auth Service chuyển hướng trình duyệt về callback của ứng dụng khách kèm mã authorization code (TTL 60s) và state:
`GET http://my-service.com/auth/callback?code=<code>&state=<state>`

#### Bước 3: Đổi Code lấy Token tại Callback (`POST /auth/oauth/exchange`)
Khi Auth Service chuyển hướng về `http://my-service.com/auth/callback?code=<code>&state=<state>`:
1. Backend kiểm tra `state` query param khớp với `state` trong session trình duyệt.
2. Xóa transaction khỏi session (chống dùng lại).
3. Gửi request đổi code:
```http
POST /auth/oauth/exchange HTTP/1.1
Host: localhost:3000
Content-Type: application/json
X-App-Id: <APP_ID>
X-App-Token: <APP_TOKEN>

{
  "code": "<code>",
  "verifier": "<PKCE_VERIFIER>"
}
```
Phản hồi 200:
```json
{
  "accessToken": "eyJhbGciOi...",
  "user": {
    "id": "app_user_id",
    "userId": "platform_user_id",
    "email": "user@example.com",
    "role": "USER",
    "provider": "GOOGLE"
  }
}
```

#### Bước 4: Bảo vệ API ứng dụng (`GET /users/verify-app-user`)
Khi client gọi API có header `Authorization: Bearer <token>`, backend xác thực trực tuyến:
```http
GET /users/verify-app-user HTTP/1.1
Host: localhost:3000
Authorization: Bearer <token>
X-App-Id: <APP_ID>
X-App-Token: <APP_TOKEN>
```
Phản hồi 200:
```json
{
  "id": "app_user_id",
  "userId": "platform_user_id",
  "email": "user@example.com",
  "role": "USER",
  "appRole": "USER",
  "appId": "<APP_ID>",
  "isAppOwner": false,
  "tenantId": null,
  "tenantName": null,
  "isTenantOwner": false
}
```
Nếu mã trả về là 401 hoặc 403, hoặc token `appId` khác `X-App-Id`, backend từ chối truy cập ngay lập tức.

Xem đặc tả chi tiết tại: [auth-integration.md](../specs/004-integrate-app-sdk/contracts/auth-integration.md).
