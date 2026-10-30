# HỆ THỐNG XÁC THỰC VÀ PHÂN QUYỀN CHO KIẾN TRÚC MICROSERVICES
(Identity & Access Management Platform)

- Đề tài: Nghiên cứu và xây dựng hệ thống quản lý định danh, xác thực và phân quyền tập trung cho kiến trúc Microservices.
- Tác giả: Lê Nhật Linh - Lớp CNTT-Việt Pháp K68, Trường Công nghệ Thông tin & Truyền thông, Đại học Bách khoa Hà Nội (HUST).

---

## 1. Giới thiệu tổng quan

Dự án cung cấp giải pháp Quản lý Định danh và Quyền truy cập tập trung (Identity & Access Management - IAM / Central Identity Provider) cho các hệ thống phân tán (Microservices). Hệ thống được tổ chức thành hai phân hệ độc lập:

1. auth-service (Cổng 3000):
   Dịch vụ IAM trung tâm chịu trách nhiệm quản lý tài khoản người dùng, băm mật khẩu bằng bcrypt, cấp phát JSON Web Token (JWT) không lưu trạng thái, phân quyền dựa trên vai trò (RBAC: ADMIN / USER), quản lý ứng dụng thành viên (Application Management qua AppID / AppToken) và cung cấp Developer Console.

2. demo-service (Cổng 3001):
   Dịch vụ khách độc lập (Client Microservice) đóng vai trò ứng dụng kiểm chứng (Proof of Concept - PoC). Dịch vụ tích hợp auth-client để thực hiện bắt tay dịch vụ (Service Handshake) và ủy quyền thẩm định token người dùng (Delegated User JWT Verification).
   Lưu ý về nghiệp vụ: Phân hệ "Đơn hàng" (Orders) trong demo-service là nghiệp vụ mẫu giả lập (Sample Resource với dữ liệu in-memory), nhằm chứng minh cơ chế bảo vệ endpoint nội bộ bằng UserAuthGuard mà không cần quản lý cơ sở dữ liệu người dùng riêng.

---

## 2. Sơ đồ kiến trúc tổng thể

```
   [Người dùng / Client]
            |
    1. Đăng nhập & Nhận JWT
            v
+-------------------------------+     2. Gọi API kèm Bearer JWT     +-------------------------------+
|         auth-service          | <-------------------------------- |         demo-service          |
|         (Port: 3000)          |       3. Handshake & Verify       |         (Port: 3001)          |
| - Quản lý User & RBAC         |          Headers gửi kèm:         | - Nghiệp vụ mẫu: Đơn hàng     |
| - Cấp phát & Kiểm tra JWT     |          - X-App-Id               | - UserAuthGuard ủy quyền JWT  |
| - Quản lý AppID / AppToken    |          - X-App-Token            | - Bắt tay kiểm tra kết nối    |
| - Sign-in Methods đa dự án    |                                   | - Không lưu trữ DB User riêng |
| - Developer Console WebApp    |                                   | - Client Portal (/status)     |
+---------------+---------------+                                   +-------------------------------+
                |
                v
      +-------------------+
      |    PostgreSQL     |
      |  auth_service_db  |
      +-------------------+
```

---

## 3. Tính năng cốt lõi

1. Xác thực tập trung (Authentication):
   Đăng ký và đăng nhập mật khẩu với thuật toán băm bcrypt (10 salt rounds), cấp phát JWT Access Token không lưu trạng thái.

2. Phân quyền theo vai trò (RBAC):
   Phân định quyền hạn giữa ADMIN và USER, bảo vệ route bằng Custom Guard (@Auth(), RolesGuard).

3. Bảo mật liên dịch vụ (Service-to-Service):
   Cấp phát AppID và AppToken (entropy 256-bit), hỗ trợ thu hồi và tái sinh token ngay lập tức để bảo vệ kết nối giữa các microservices.

4. Cấu hình đăng nhập đa dự án (Project-scoped Sign-in Methods):
   Mỗi ứng dụng thành viên được cấu hình bật/tắt các phương thức OAuth (Google, Facebook) độc lập, bảo đảm cô lập cấu hình đa khách hàng (Multi-Tenancy).

5. Giao diện Developer Console:
   Giao diện quản trị Single Page Application xây dựng bằng React 19 + TypeScript + Vite, tích hợp phục vụ trực tiếp tại cổng 3000.

6. Cơ chế phòng thủ an toàn thông tin:
   Ngăn chặn lỗ hổng IDOR bằng OwnerOrAdminGuard, phòng chống Bcrypt DoS bằng giới hạn độ dài mật khẩu (@MaxLength), chống CSRF trong luồng OAuth bằng tham số state có chữ ký HMAC.

---

## 4. Công nghệ sử dụng

- Backend: NestJS 12, TypeScript 6, Node.js (ES Modules).
- Cơ sở dữ liệu: PostgreSQL 16+, Prisma ORM 7.
- Bảo mật & Mật mã: Passport.js, JWT, bcrypt, Node.js crypto (CSPRNG).
- Frontend Console: React 19, TypeScript, Vite 8, Vanilla CSS Design System.
- Kiểm thử tự động: Vitest (179 Unit tests + 137 E2E tests + 20 Client tests = 100% Passed).

---

## 5. Hướng dẫn khởi chạy hệ thống

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

- Địa chỉ truy cập Developer Console: http://localhost:3000 (hoặc http://localhost:3000/dashboard/)
- Tài khoản quản trị khởi tạo mặc định: admin@example.com / Admin123!
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

- Kiểm tra trạng thái bắt tay dịch vụ: Truy cập http://localhost:3001/status trên trình duyệt (kết quả mong đợi: status: "ONLINE", handshakeStatus: "SUCCESS").
- Gọi thử nghiệm endpoint nghiệp vụ mẫu: Gửi yêu cầu GET http://localhost:3001/orders kèm Bearer Token của người dùng lấy từ Auth Service.

