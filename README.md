# HỆ THỐNG XÁC THỰC VÀ PHÂN QUYỀN CHO KIẾN TRÚC MICROSERVICES
(Identity & Access Management Platform)

## 1. Giới thiệu tổng quan

Dự án cung cấp giải pháp Quản lý Định danh và Quyền truy cập tập trung (Identity & Access Management - IAM / Central Identity Provider) cho các hệ thống phân tán (Microservices). Hệ thống được tổ chức thành hai phân hệ độc lập:

1. auth-service (Cổng 3000):
   Dịch vụ IAM trung tâm chịu trách nhiệm quản lý tài khoản người dùng, băm mật khẩu bằng bcrypt, cấp phát JSON Web Token (JWT) không lưu trạng thái, phân quyền dựa trên vai trò (RBAC: ADMIN / USER), quản lý ứng dụng thành viên (Application Management qua AppID / AppToken) và cung cấp Developer Console.

2. demo-service (Cổng 3001):
   Dịch vụ khách độc lập (Client Microservice) đóng vai trò ứng dụng kiểm chứng (Proof of Concept - PoC). Dịch vụ cung cấp giao diện Cổng Khách Hàng (Customer Portal) cho phép đăng nhập qua Google hoặc Facebook, hiển thị trực quan hồ sơ người dùng sau khi xác thực (Họ tên, Email, Avatar, Vai trò, UID và Token JWT). Dịch vụ tích hợp auth-client để thực hiện bắt tay dịch vụ (Service Handshake) qua AppID / AppToken và ủy quyền thẩm định token người dùng (Delegated User JWT Verification). Đồng thời, dịch vụ tích hợp REST API mẫu (/orders) được bảo vệ bởi UserAuthGuard để minh họa việc kiểm soát quyền truy cập tài nguyên nội bộ mà không cần lưu trữ cơ sở dữ liệu người dùng riêng.

---

## 2. Sơ đồ kiến trúc tổng thể

```
   [Người dùng / Trình duyệt]
            |
    1. Đăng nhập & Nhận JWT
            v
+-------------------------------+     2. Gọi API kèm Bearer JWT     +-------------------------------+
|         auth-service          | <-------------------------------- |         demo-service          |
|         (Port: 3000)          |       3. Handshake & Verify       |         (Port: 3001)          |
| - Quản lý User & RBAC         |          Headers gửi kèm:         | - Cổng Khách Hàng (Web Portal)|
| - Cấp phát & Kiểm tra JWT     |          - X-App-Id               | - Hiển thị Profile & Token JWT|
| - Quản lý AppID / AppToken    |          - X-App-Token            | - UserAuthGuard ủy quyền JWT  |
| - Sign-in Methods đa dự án    |                                   | - Bắt tay kiểm tra kết nối    |
| - Developer Console WebApp    |                                   | - Không lưu trữ DB User riêng |
+---------------+---------------+                                   | - REST API mẫu (/orders)      |
                |                                                   +-------------------------------+
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
- Frontend Console & Client Portal: React 19, TypeScript, Vite 8, HTML5/CSS3.
- Kiểm thử tự động: Vitest (181 Unit tests + 137 E2E tests + 20 Client tests = 100% Passed).

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

- Truy cập Cổng Khách Hàng: Mở trình duyệt tại http://localhost:3001 để thử nghiệm đăng nhập qua Google / Facebook và xem thông tin hồ sơ tài khoản (UID, Role, Token JWT).
- Kiểm tra trạng thái bắt tay dịch vụ: Truy cập http://localhost:3001/status trên trình duyệt (kết quả mong đợi: status: "ONLINE", handshakeStatus: "SUCCESS").
- Gọi thử nghiệm REST API nội bộ: Gửi yêu cầu GET http://localhost:3001/orders kèm Bearer Token của người dùng lấy từ Auth Service để kiểm tra phân quyền dữ liệu.
