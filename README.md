# Hệ thống Xác thực Microservices

Kiến trúc định danh tập trung (Centralized Identity Provider) và ứng dụng khách (Client Service) xây dựng trên nền tảng NestJS, Prisma 7 và PostgreSQL.

## 1. Dịch vụ & Địa chỉ Truy cập

| Dịch vụ | Vai trò | Địa chỉ | Tài liệu |
|---|---|---|---|
| **Auth Service** | Identity Provider trung tâm, Developer Console, Multi-tenant | http://localhost:3000 | [Xem chi tiết](auth-service/README.md) |
| **Demo Service** | Client Microservice tích hợp OAuth & API bảo vệ | http://localhost:3001 | [Xem chi tiết](demo-service/README.md) |

- **Swagger API Docs (Auth Service):** http://localhost:3000/api
- **Handshake Status (Demo Service):** http://localhost:3001/status
- **API Bảo vệ minh họa:** `GET http://localhost:3001/auth/protected` (Yêu cầu Bearer JWT)

---

## 2. Tổng hợp API Hệ thống

| Phân hệ | Cổng | API tiêu biểu | Chi tiết |
|---|---|---|---|
| **Định danh & OAuth** | Port 3000 | `/auth/login`, `/auth/flows`, `/auth/oauth/exchange`, `/users/verify-app-user` | [Auth API](auth-service/README.md#1-xác-thực--tài-khoản-nền-tảng-platform-auth--account) |
| **Quản lý Ứng dụng** | Port 3000 | `/applications`, `/applications/:id/auth-methods` (Google / Facebook) | [App API](auth-service/README.md#3-quản-lý-cấu-hình-ứng-dụng-khách-developer-applications) |
| **Doanh nghiệp (Multi-tenant)** | Port 3000 | `/tenants`, `/tenants/:id/transfer`, `/tenants/join`, `/tenants/audit` | [Tenant API](auth-service/README.md#4-quản-lý-doanh-nghiệp--thành-viên-multi-tenant--memberships) |
| **Quản trị Nền tảng** | Port 3000 | `/users`, `/tenants/:id/admin-transfer`, `/tenants/audit` | [Admin API](auth-service/README.md#5-quản-trị-hệ-thống-system-admin-platform-control) |
| **Ứng dụng Khách Demo** | Port 3001 | `/status`, `/auth/providers`, `/auth/start`, `/auth/exchange`, `/auth/protected` | [Demo API](demo-service/README.md#bảng-tra-cứu-api) |

---

## 3. Phân quyền Độc lập 4 Cấp

Hệ thống phân tách quyền theo nguyên tắc độc lập hoàn toàn, không chồng chéo:
- **Super Admin (`Role.ADMIN`):** Quản trị toàn platform, xem audit toàn hệ thống, can thiệp chuyển chủ tenant kèm lý do. Token ứng dụng bị chặn hoàn toàn khỏi cấp này.
- **Application Owner (`isAppOwner`):** Quản lý cấu hình ứng dụng khách, AppID/AppToken và phương thức OAuth trong Developer Console.
- **Tenant Owner (`isTenantOwner`):** Quản lý nội bộ doanh nghiệp, duyệt/loại thành viên và chuyển giao quyền chủ sở hữu.
- **End-User (`Role.USER`):** Khách hàng của ứng dụng hoặc thành viên doanh nghiệp. Người dùng chưa có doanh nghiệp (`tenantId: null`) vẫn sử dụng ứng dụng bình thường.

---

## 4. Nguyên tắc Bảo mật Cốt lõi

1. **OAuth 2.0 + PKCE (S256) & State:** Tuyệt đối không truyền JWT qua URL. Sử dụng mã code dùng 1 lần (TTL 60s) trao đổi an toàn qua backend.
2. **Chống Chiếm đoạt Tài khoản (Anti-Account Takeover):** Không tự động gộp tài khoản khi trùng email. Yêu cầu xác nhận mật khẩu hoặc phiên đăng nhập cũ (`ACCOUNT_LINK_REQUIRED`).
3. **Service-to-Service Trust:** Mọi giao tiếp giữa Demo Service và Auth Service đều được bảo vệ bằng header `X-App-Id` và `X-App-Token` 256-bit.
4. **App-scoped Token:** JWT cấp cho ứng dụng khách bị cô lập chặt chẽ theo `appId`, chống tấn công IDOR và dùng token chéo ứng dụng.

---

## 5. Triển khai & Khởi chạy trên Máy khác

Yêu cầu hệ thống: Đã cài Node.js (v18+) và PostgreSQL (đã tạo sẵn database, mặc định: `auth_service_db`).

```sql
-- Chạy lệnh tạo database trong PostgreSQL nếu chưa có:
CREATE DATABASE auth_service_db;
```

### Bước 1: Khởi chạy Auth Service (Port 3000)
```powershell
cd auth-service
npm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }

# Sinh client và áp dụng migration database
npx prisma generate --config prisma7.config.ts
npx prisma migrate deploy --config prisma7.config.ts

npm run start:dev
```

### Bước 2: Khởi chạy Demo Service (Port 3001)
Mở Terminal thứ 2:
```powershell
cd demo-service
npm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }

npm run start:dev
```

> **Kết nối Microservice:** Mở Developer Console (`http://localhost:3000`), tạo ứng dụng mới (điền URL quay về: `http://localhost:3001/`). Copy `AppID` và `AppToken` dán vào `demo-service/.env` để thiết lập quan hệ tin cậy.
