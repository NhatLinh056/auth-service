# Auth Service — Nền Tảng Quản Lý Định Danh & Xác Thực Tập Trung (Project 1)

Dịch vụ IAM (Identity & Access Management) trung tâm cung cấp giải pháp xác thực, phân quyền và quản lý ứng dụng thành viên trong kiến trúc Microservices.

---

## 1. Tính năng cốt lõi

1. Quản lý tài khoản và định danh:
   - Đăng ký, đăng nhập tài khoản người dùng bằng email và mật khẩu.
   - Băm mật khẩu bảo mật bằng thuật toán bcrypt với 10 salt rounds.
   - Cấp phát JSON Web Token (JWT) không lưu trạng thái (Stateless Access Token).
   - Xác thực đa phương thức thông qua OAuth 2.0 (Google, Facebook).

2. Phân quyền truy cập dựa trên vai trò (RBAC):
   - Hỗ trợ các vai trò người dùng: ADMIN, USER.
   - Cấu hình Whitelist Email Quản trị (ADMIN_EMAILS) tự động cấp quyền ADMIN khi đăng nhập qua Google hoặc Facebook.
   - Bảo vệ các endpoint nội bộ và quản trị bằng Custom Decorator (@Auth()) và RolesGuard.
   - Cơ chế phòng thủ IDOR (Insecure Direct Object References) với OwnerOrAdminGuard.

3. Quản lý ứng dụng thành viên (Application Management):
   - Cấp phát cặp khóa định danh AppID và AppToken (mã hóa CSPRNG 256-bit).
   - Hỗ trợ thu hồi (Revoke) và tái sinh (Regenerate) AppToken tức thì.
   - Xác thực danh tính liên dịch vụ (Service-to-Service Handshake) qua header X-App-Id và X-App-Token.

4. Cấu hình đăng nhập đa dự án (Multi-Tenancy Sign-in Methods):
   - Cho phép từng ứng dụng thành viên bật hoặc tắt các phương thức đăng nhập OAuth độc lập.

5. Developer Console:
   - Giao diện quản trị Single Page Application (React 19 + TypeScript + Vite) tích hợp phục vụ trực tiếp tại cổng 3000.

---

## 2. Công nghệ sử dụng

- Framework: NestJS 12, Node.js (ES Modules).
- Ngôn ngữ: TypeScript 6.
- Cơ sở dữ liệu: PostgreSQL 16+, Prisma ORM 7.
- Kiểm thử: Vitest (182 Unit tests + 137 E2E tests = 100% Passed).
- Tài liệu API: OpenAPI / Swagger UI.

---

## 3. Hướng dẫn khởi chạy

### Bước 1: Cấu hình biến môi trường
Tạo file .env từ .env.example:
```env
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/auth_service_db
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
ADMIN_EMAILS="admin@example.com,developer@company.com"
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
- Tài khoản quản trị mặc định: admin@example.com / Admin123!
- Tài liệu API Swagger: http://localhost:3000/api
- Kiểm tra sức khỏe hệ thống: http://localhost:3000/health
