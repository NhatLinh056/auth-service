# HỆ THỐNG XÁC THỰC VÀ PHÂN QUYỀN CHO KIẾN TRÚC MICROSERVICES
(Identity & Access Management Platform)

## 1. Giới thiệu tổng quan

Dự án cung cấp giải pháp Quản lý Định danh và Quyền truy cập tập trung (Identity & Access Management - IAM) cho các hệ thống phân tán (Microservices), lấy cảm hứng từ mô hình Firebase Authentication. Hệ thống được tổ chức thành hai phân hệ độc lập:

**1. auth-service (Cổng 3000) — Project 1:**
Dịch vụ IAM trung tâm chịu trách nhiệm quản lý tài khoản người dùng nền tảng (Platform Users - Lập trình viên/Admin), băm mật khẩu bằng bcrypt, cấp phát JWT có trường `type` để phân biệt nguồn gốc token, phân quyền dựa trên vai trò (RBAC: ADMIN / USER), quản lý ứng dụng thành viên (Application Management qua AppID / AppToken), lưu trữ người dùng cuối theo từng ứng dụng (AppUser / AppOAuthIdentity) và cung cấp Developer Console.

**2. demo-service (Cổng 3001) — Project 2:**
Dịch vụ khách độc lập (Client Microservice) đóng vai trò ứng dụng kiểm chứng (Proof of Concept - PoC). Dịch vụ cung cấp giao diện Cổng Khách Hàng (Customer Portal) cho phép đăng nhập qua Google hoặc Facebook, kiểm tra kết nối với Auth Service qua bắt tay dịch vụ (Service Handshake), ủy quyền thẩm định JWT người dùng qua `GET /users/me`, và cung cấp REST API mẫu `/orders` được bảo vệ bởi UserAuthGuard với phân quyền RBAC đa tầng. Cache thông tin ứng dụng với TTL 5 phút để cân bằng hiệu năng và tính nhất quán.

---

## 2. Sơ đồ kiến trúc tổng thể

```
   [Người dùng / Trình duyệt]
            |
    1. Đăng nhập & Nhận JWT (type: platform | app_user)
            v
+-------------------------------+     2. Gọi API kèm Bearer JWT     +-------------------------------+
|         auth-service          | <-------------------------------- |         demo-service          |
|         (Port: 3000)          |       3. Handshake & Verify       |         (Port: 3001)          |
| - Bảng users (Platform Users) |          Headers gửi kèm:         | - Cổng Khách Hàng (Web Portal)|
| - Bảng app_users (AppUsers)   |          - X-App-Id               | - UserAuthGuard ủy quyền JWT  |
| - Cấp phát JWT (type field)   |          - X-App-Token            | - TTL Cache 5 phút            |
| - Quản lý AppID / AppToken    |                                   | - REST API mẫu (/orders)      |
| - Sign-in Methods đa dự án    |                                   | - Không lưu DB User riêng     |
| - Developer Console WebApp    |                                   +-------------------------------+
+---------------+---------------+
                |
      +-------------------+
      |    PostgreSQL     |
      |  auth_service_db  |
      | - users           |
      | - app_users       |
      | - applications    |
      | - app_oauth_...   |
      +-------------------+
```

---

## 3. Kiến trúc phân quyền đa tầng (Multi-Tenant RBAC)

Hệ thống phân tách quyền hạn tuyệt đối giữa tầng **Nền tảng (Platform)** và tầng **Ứng dụng thành viên (Client Microservice)**:

> **Nguyên tắc cốt lõi:**
> - **Admin của Project 1 (Platform Admin)** chỉ có quyền quản trị hạ tầng nền tảng (xem toàn bộ ứng dụng, quản lý tài khoản lập trình viên). Platform Admin **KHÔNG** phải là Admin của Project 2 và không có quyền can thiệp vào nghiệp vụ của Project 2. Nếu đăng nhập vào Project 2, họ chỉ có quyền `USER` bình thường.
> - **Lập trình viên (App Owner)** là tài khoản `USER` tại Project 1, nhưng là **ADMIN tại Project 2** (ứng dụng do chính họ tạo ra và sở hữu).

| Nhóm người dùng | Bảng DB lưu trữ | JWT `type` | Vai trò tại Project 1 (BaaS) | Vai trò tại Project 2 (App Nghiệp vụ) |
| :--- | :--- | :--- | :--- | :--- |
| **Platform Admin** | `users` | `platform` | **ADMIN** (Quản lý toàn bộ nền tảng) | **USER** (Không có quyền admin tại app của người khác) |
| **App Developer** (Chủ ứng dụng) | `users` | `platform` | **USER** (Lập trình viên đăng ký app) | **ADMIN** (Chủ sở hữu ứng dụng - `isAppOwner`) |
| **Delegated Admin** | `app_users` | `app_user` | — (Không có tài khoản nền tảng) | **ADMIN** (Được chủ app ủy quyền qua `adminEmails`) |
| **End-User** (Khách hàng vãng lai) | `app_users` | `app_user` | — (Chỉ thuộc phạm vi app con) | **USER** (Chỉ xem và quản lý dữ liệu của chính mình) |

**Cấu trúc JWT payload phân biệt nguồn gốc:**
- Đăng nhập mật khẩu (Platform User / Developer): `{ sub, email, role, type: "platform", iat, exp }`
- Đăng nhập OAuth mạng xã hội (AppUser / Khách hàng): `{ sub, email, role, type: "app_user", appId, iat, exp }`

---

## 4. Tính năng cốt lõi

1. **Xác thực tập trung (Authentication):**
   Đăng ký và đăng nhập mật khẩu với bcrypt (10 salt rounds), cấp phát JWT có trường `type` phân biệt rõ ràng Platform User và AppUser.

2. **Phân quyền đa tầng (Multi-tenant RBAC):**
   Tách bạch Platform Users (lập trình viên) và AppUsers (khách hàng), cô lập dữ liệu theo từng ứng dụng. Hỗ trợ cấu hình `adminEmails` động theo từng ứng dụng.

3. **Bảo mật liên dịch vụ (Service-to-Service):**
   AppID và AppToken (CSPRNG 256-bit), hỗ trợ thu hồi và tái sinh token tức thì.

4. **Sign-in Methods đa dự án:**
   Mỗi ứng dụng cấu hình bật/tắt OAuth (Google, Facebook) độc lập.

5. **Cache TTL (demo-service):**
   Thông tin ứng dụng được cache với TTL 5 phút; tự động làm mới khi hết hạn hoặc khi gọi `invalidateCache()`.

6. **Cơ chế phòng thủ:**
   Chống IDOR bằng OwnerOrAdminGuard, chống Bcrypt DoS bằng `@MaxLength`, chống CSRF trong luồng OAuth bằng `state` có chữ ký JWT.

---

## 5. Công nghệ sử dụng

- Backend: NestJS 12, TypeScript 6, Node.js (ES Modules).
- Cơ sở dữ liệu: PostgreSQL 16+, Prisma ORM 7.
- Bảo mật & Mật mã: Passport.js, JWT, bcrypt, Node.js crypto (CSPRNG).
- Frontend Console & Client Portal: React 19, TypeScript, Vite 8, HTML5/CSS3.
- Kiểm thử tự động: Vitest (182 Unit + 27 Unit + 137 E2E = 346 tests — 100% Passed).

---

## 6. Hướng dẫn khởi chạy hệ thống

### Bước 1: Khởi động Central Auth Service (Cổng 3000)

```bash
cd auth-service
npm install
cp .env.example .env
# Đồng bộ lược đồ cơ sở dữ liệu PostgreSQL
npx prisma generate
npx prisma db push
# Chạy máy chủ ở chế độ phát triển
npm run start:dev
```

- Developer Console: http://localhost:3000 (hoặc http://localhost:3000/dashboard/)
- Tài khoản quản trị nền tảng mặc định: `admin@example.com` / `Admin123!`
- Tài liệu API Swagger: http://localhost:3000/api

### Bước 2: Khởi động Demo Service (Cổng 3001)

Mở một cửa sổ terminal mới:

```bash
cd demo-service
npm install
cp .env.example .env
# Khởi động dịch vụ khách
npm run start:dev
```

### Bước 3: Kiểm tra liên thông giữa hai dịch vụ

- Cổng Khách Hàng: http://localhost:3001 — đăng nhập thử nghiệm bằng Google hoặc Facebook.
- Trạng thái bắt tay dịch vụ: http://localhost:3001/status (kỳ vọng: `status: "ONLINE"`, `handshakeStatus: "SUCCESS"`).
- Kiểm tra phân quyền API: Sau khi đăng nhập tại http://localhost:3001, nhấn nút **"Gọi Thử API /orders"** để xem dữ liệu theo vai trò (USER / ADMIN).
