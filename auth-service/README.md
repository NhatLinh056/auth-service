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

## 2. Cấu trúc JWT

| Trường | Loại | Mô tả |
| :--- | :--- | :--- |
| `sub` | string | ID người dùng (trong bảng `users` hoặc `app_users` tùy `type`) |
| `email` | string | Địa chỉ email |
| `role` | `ADMIN` / `USER` | Vai trò của người dùng |
| `type` | `platform` / `app_user` | Phân biệt nguồn gốc token |
| `appId` | string? | Chỉ có khi `type = "app_user"` — ứng dụng mà AppUser thuộc về |

---

## 3. Công nghệ sử dụng

- Framework: NestJS 12, Node.js (ES Modules).
- Ngôn ngữ: TypeScript 6.
- Cơ sở dữ liệu: PostgreSQL 16+, Prisma ORM 7.
- Kiểm thử: Vitest (182 Unit tests + 137 E2E tests = 319 tests — 100% Passed).
- Tài liệu API: OpenAPI / Swagger UI.

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

### Bước 2: Đồng bộ cơ sở dữ liệu và khởi động
```bash
# Cài đặt dependencies
npm install

# Đồng bộ schema Prisma với PostgreSQL
npx prisma generate
npx prisma db push

# Chạy máy chủ ở chế độ phát triển
npm run start:dev

# Chạy toàn bộ kiểm thử
npm test
npm run test:e2e
```

### Bước 3: Truy cập hệ thống
- Developer Console: http://localhost:3000 (hoặc http://localhost:3000/dashboard/)
- Tài khoản quản trị mặc định: `admin@example.com` / `Admin123!`
- Tài liệu API Swagger: http://localhost:3000/api
- Kiểm tra sức khỏe hệ thống: http://localhost:3000/health

---

## 5. Danh sách Endpoints chính

| Phương thức | Endpoint | Bảo vệ | Mô tả |
| :--- | :--- | :--- | :--- |
| POST | /auth/register | Public | Đăng ký tài khoản Platform User mới |
| POST | /auth/login | Public | Đăng nhập, nhận JWT (`type: "platform"`) |
| GET | /auth/providers | Public | Danh sách OAuth Provider khả dụng |
| GET | /auth/oauth/:provider | Public | Khởi tạo luồng OAuth 2.0 |
| GET | /auth/oauth/:provider/callback | Public | Callback OAuth, cấp JWT (`type: "app_user"`) |
| GET | /auth/verify-service | AppAuth | Xác thực danh tính dịch vụ thành viên |
| GET | /users/me | JWT | Lấy profile (định tuyến theo `type` trong JWT) |
| GET | /users | JWT + ADMIN | Danh sách Platform Users (bảng `users`) |
| GET | /applications | JWT | Danh sách ứng dụng của Developer |
| GET | /applications/:id/users | JWT + Owner/ADMIN | Danh sách AppUsers của ứng dụng |
| PATCH | /applications/:id | JWT + Owner/ADMIN | Cập nhật thông tin ứng dụng, `adminEmails` |
| POST | /applications/:id/regenerate-token | JWT + Owner/ADMIN | Tái sinh AppToken |
