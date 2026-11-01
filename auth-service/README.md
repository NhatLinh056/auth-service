# Auth Service — Nền Tảng Quản Lý Định Danh & Xác Thực Tập Trung (Project 1)

Dịch vụ IAM (Identity & Access Management) trung tâm cung cấp giải pháp xác thực, phân quyền và quản lý ứng dụng thành viên trong kiến trúc Microservices.

---

## 1. Tính năng cốt lõi

1. **Quản lý tài khoản và định danh:**
   - Đăng ký, đăng nhập tài khoản người dùng nền tảng (Platform Users) bằng email và mật khẩu.
   - Băm mật khẩu bảo mật bằng bcrypt (10 salt rounds).
   - Cấp phát JWT Access Token không lưu trạng thái với trường `type` phân biệt rõ nguồn gốc:
     - `type: "platform"` — Platform User (Developer/Admin đăng nhập bằng mật khẩu).
     - `type: "app_user"` — AppUser (khách hàng đăng nhập qua OAuth).
   - Xác thực đa phương thức thông qua OAuth 2.0 (Google, Facebook).

2. **Phân quyền truy cập đa tầng (Multi-tenant RBAC):**
   - Tách biệt rõ ràng 2 tầng người dùng, mỗi tầng lưu ở bảng riêng:
     - Bảng `users`: Platform Users (lập trình viên vai trò `USER`, quản trị viên nền tảng vai trò `ADMIN`).
     - Bảng `app_users`: AppUsers (khách hàng của từng ứng dụng — cô lập theo `applicationId`).
   - **Phạm vi quyền của Platform Admin**: Tài khoản `ADMIN` tại bảng `users` chỉ có thẩm quyền quản trị hạ tầng nền tảng (quản lý lập trình viên, xem tất cả applications, cấu hình hệ thống). Platform Admin **KHÔNG** phải là Admin của Project 2 hay các ứng dụng con.
   - `GET /users/me` tự động định tuyến sang đúng bảng dựa trên trường `type` trong JWT.
   - Cấu hình `adminEmails` động theo từng ứng dụng: Chủ sở hữu (App Owner) và các email trong danh sách `adminEmails` được cấp quyền ADMIN tại ứng dụng của họ. Không cần cấu hình tĩnh trong biến môi trường.
   - Bảo vệ endpoint bằng Custom Decorator (`@Auth()`, `@AppAuth()`) và RolesGuard.
   - Cơ chế phòng thủ IDOR với OwnerOrAdminGuard.

3. **Quản lý ứng dụng thành viên (Application Management):**
   - Cấp phát cặp khóa định danh AppID và AppToken (CSPRNG 256-bit).
   - Quản lý danh sách AppUser của từng ứng dụng qua `GET /applications/:id/users` (tương tự Firebase Console).
   - Hỗ trợ cập nhật `adminEmails` qua `PATCH /applications/:id`.
   - Thu hồi (Revoke) và tái sinh (Regenerate) AppToken tức thì.
   - Xác thực danh tính liên dịch vụ (Service Handshake) qua header `X-App-Id` và `X-App-Token`.

4. **Cấu hình đăng nhập đa dự án (Multi-Tenancy Sign-in Methods):**
   - Cho phép từng ứng dụng thành viên bật hoặc tắt các phương thức đăng nhập OAuth (Google, Facebook) độc lập.

5. **Developer Console:**
   - Giao diện quản trị Single Page Application (React 19 + TypeScript + Vite) phục vụ trực tiếp tại cổng 3000.

---

## 2. Dữ liệu mẫu khởi tạo (Seed Data)

Hệ thống cung cấp sẵn script nạp dữ liệu mẫu giúp chạy demo ngay lập tức:

| Mục | Dữ liệu mẫu | Ghi chú |
| :--- | :--- | :--- |
| **Platform Admin** | `admin@example.com` / `Admin123!` | Quản trị viên nền tảng (Role: ADMIN) |
| **App Developer** | `developer@example.com` / `Password123!` | Lập trình viên sở hữu ứng dụng mẫu (Role: USER) |
| **Ứng dụng mẫu** | `Demo Order Service`<br>AppID: `app_22c57454b00eb44a55c66bf4`<br>AppToken: `apt_926a40eb5a7b8a7341ef0347f4d2fa640b69663ffff2a034197e65e5f030fa51` | Khớp 100% với cấu hình Client Microservice |

> **Cơ chế phân quyền OAuth (Admin vs Khách Hàng):**
> - Mặc định, mọi tài khoản Google/Facebook đăng nhập vào Client App đều nhận vai trò `USER`.
> - Để cấp quyền `ADMIN` cho một tài khoản OAuth cụ thể, người quản trị có thể cấu hình biến `SEED_ADMIN_EMAILS=your_email@gmail.com` trong file `.env` trước khi seed, hoặc cập nhật trường `adminEmails` của ứng dụng qua Developer Console / API `PATCH /applications/:id`.

---

## 3. Cấu trúc JWT

| Trường | Loại | Mô tả |
| :--- | :--- | :--- |
| `sub` | string | ID người dùng (trong bảng `users` hoặc `app_users` tùy `type`) |
| `email` | string | Địa chỉ email |
| `role` | `ADMIN` / `USER` | Vai trò của người dùng |
| `type` | `platform` / `app_user` | Phân biệt nguồn gốc token |
| `appId` | string? | Chỉ có khi `type = "app_user"` — ứng dụng mà AppUser thuộc về |

---

## 4. Hướng dẫn khởi chạy

### Bước 1: Cấu hình biến môi trường
Tạo file `.env` từ `.env.example`:
```env
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/auth_service_db
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
```

### Bước 2: Tạo bảng và nạp dữ liệu mẫu
```bash
# Cài đặt dependencies
npm install

# Đồng bộ schema Prisma với PostgreSQL
npx prisma db push

# Nạp dữ liệu mẫu tự động
npm run seed

# Chạy máy chủ ở chế độ phát triển
npm run start:dev

# Chạy kiểm thử tự động
npm test
npm run test:e2e
```

### Bước 3: Truy cập hệ thống
- Developer Console: http://localhost:3000 (hoặc http://localhost:3000/dashboard/)
- Tài khoản quản trị mặc định: `admin@example.com` / `Admin123!`
- Tài liệu API Swagger: http://localhost:3000/api
- Kiểm tra sức khỏe hệ thống: http://localhost:3000/health
