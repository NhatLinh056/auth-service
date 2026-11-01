# HỆ THỐNG XÁC THỰC VÀ PHÂN QUYỀN CHO KIẾN TRÚC MICROSERVICES
(Identity & Access Management Platform)

## 1. Giới thiệu tổng quan

Dự án cung cấp giải pháp Quản lý Định danh và Quyền truy cập tập trung (Identity & Access Management - IAM) cho các hệ thống phân tán (Microservices), lấy cảm hứng từ mô hình Firebase Authentication. Hệ thống được tổ chức thành hai phân hệ độc lập:

**1. auth-service (Cổng 3000) — Project 1:**
Dịch vụ IAM trung tâm chịu trách nhiệm quản lý tài khoản người dùng nền tảng (Platform Users - Lập trình viên/Admin), băm mật khẩu bằng bcrypt, cấp phát JWT có trường `type` để phân biệt nguồn gốc token, phân quyền dựa trên vai trò (RBAC: ADMIN / USER), quản lý ứng dụng thành viên (Application Management qua AppID / AppToken), lưu trữ người dùng cuối theo từng ứng dụng (AppUser / AppOAuthIdentity) và cung cấp Developer Console.

**2. demo-service (Cổng 3001) — Project 2:**
Dịch vụ khách độc lập (Client Microservice) đóng vai trò ứng dụng kiểm chứng (Proof of Concept - PoC). Dịch vụ cung cấp giao diện Cổng Khách Hàng (Customer Portal) cho phép đăng nhập nhanh qua Google hoặc Facebook, kiểm tra kết nối với Auth Service qua bắt tay dịch vụ (Service Handshake), ủy quyền thẩm định JWT người dùng qua `GET /users/me`, và cung cấp REST API mẫu `/orders` được bảo vệ bởi UserAuthGuard với phân quyền RBAC đa tầng. Cache thông tin ứng dụng với TTL 5 phút để cân bằng hiệu năng và tính nhất quán.

---

## 2. Sơ đồ kiến trúc tổng thể

```
   [Người dùng / Trình duyệt]
            |
    1. Đăng nhập qua OAuth (Google / Facebook)
            v
+-------------------------------+     2. Gọi API kèm Bearer JWT     +-------------------------------+
|         auth-service          | <-------------------------------- |         demo-service          |
|         (Port: 3000)          |       3. Handshake & Verify       |         (Port: 3001)          |
| - Bảng users (Platform Users) |          Headers gửi kèm:         | - Cổng Khách Hàng (Web Portal)|
| - Bảng app_users (AppUsers)   |          - X-App-Id               | - UserAuthGuard ủy quyền JWT  |
| - Cấp phát JWT (type field)   |          - X-App-Token            | - TTL Cache 5 phút            |
| - Quản lý AppID / AppToken    |                                   | - Bảng Quản Lý Đơn Hàng       |
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
| **End-User** (Khách hàng vãng lai) | `app_users` | `app_user` | — (Chỉ thuộc phạm vi app con) | **USER** (Chỉ xem và quản lý đơn hàng của chính mình) |

**Cấu trúc JWT payload phân biệt nguồn gốc:**
- Đăng nhập mật khẩu (Platform User / Developer): `{ sub, email, role, type: "platform", iat, exp }`
- Đăng nhập OAuth mạng xã hội (AppUser / Khách hàng): `{ sub, email, role, type: "app_user", appId, iat, exp }`

---

## 4. Dữ liệu mẫu khởi tạo sẵn (Demo Out-of-the-Box)

Hệ thống cung cấp sẵn script nạp dữ liệu mẫu giúp chạy demo ngay lập tức:

| Mục | Dữ liệu mẫu | Ghi chú |
| :--- | :--- | :--- |
| **Platform Admin** | `admin@example.com` / `Admin123!` | Đăng nhập tại Developer Console (Cổng 3000) |
| **App Developer** | `developer@example.com` / `Password123!` | Lập trình viên sở hữu ứng dụng mẫu |
| **Ứng dụng mẫu** | `Demo Order Service`<br>AppID: `app_22c57454b00eb44a55c66bf4`<br>AppToken: `apt_926a40eb5a7b8a7341ef0347f4d2fa640b69663ffff2a034197e65e5f030fa51` | Khớp 100% với file `.env.example` của Demo Service |

> **Cơ chế phân quyền OAuth (Admin vs Khách Hàng):**
> - **Mặc định:** Khi bất kỳ tài khoản Google/Facebook nào đăng nhập vào Demo Service (Cổng 3001), hệ thống sẽ cấp vai trò **`Khách Hàng (USER)`**. Người dùng chỉ có quyền xem và tạo đơn hàng của chính mình.
> - **Cấp quyền Quản Trị Viên (ADMIN):** Để trải nghiệm vai trò ADMIN khi đăng nhập Google/Facebook, người kiểm thử có thể chỉ định email của mình làm Admin bằng một trong hai cách:
>   - **Cách 1 (Cấu hình qua file môi trường):** Thêm email Google/Facebook của bạn vào biến `SEED_ADMIN_EMAILS` trong file `auth-service/.env` trước khi chạy seed:
>     ```env
>     SEED_ADMIN_EMAILS=your_email@gmail.com
>     ```
>   - **Cách 2 (Cập nhật trên Developer Console):** Đăng nhập tại `http://localhost:3000` bằng tài khoản App Developer (`developer@example.com`), vào chi tiết ứng dụng "Demo Order Service" để cấu hình danh sách email quản trị.

---

## 5. Hướng dẫn khởi chạy hệ thống

### Bước 1: Khởi động Central Auth Service (Cổng 3000)

```bash
cd auth-service
npm install
cp .env.example .env

# Tạo bảng và nạp toàn bộ dữ liệu mẫu (chỉ chạy 1 lần đầu)
npx prisma db push
npm run seed

# Khởi động máy chủ phát triển
npm run start:dev
```

- Developer Console: http://localhost:3000 (hoặc http://localhost:3000/dashboard/)
- Tài khoản quản trị mặc định: `admin@example.com` / `Admin123!`
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

### Bước 3: Trải nghiệm Demo thực tế

1. Mở trình duyệt tại **http://localhost:3001** (Customer Portal).
2. **Kịch bản 1 — Khách Hàng Thông Thường (USER):**
   - Bấm **"Đăng nhập với Google"** hoặc **"Đăng nhập với Facebook"** bằng tài khoản thông thường (chưa khai báo trong danh sách Admin).
   - Nhận huy hiệu **`Khách Hàng (USER)`**.
   - Bấm **"+ Đặt Hàng Thử Nghiệm"** để tạo đơn hàng mới.
   - Bảng Đơn Hàng chỉ hiển thị duy nhất các đơn hàng do tài khoản này tạo (dữ liệu được cô lập bảo mật tuyệt đối).
3. **Kịch bản 2 — Quản Trị Viên (ADMIN):**
   - Bấm **"Đăng xuất"**, sau đó đăng nhập bằng tài khoản Google hoặc Facebook đã được cấp quyền Admin trong hệ thống.
   - Nhận huy hiệu **`Quản Trị Viên (ADMIN)`**.
   - Bảng Đơn Hàng hiển thị **toàn bộ đơn hàng của tất cả khách hàng** trong hệ thống.

---

## 6. Công nghệ sử dụng & Kiểm thử tự động

- **Backend**: NestJS 12, TypeScript 6, Node.js (ES Modules).
- **Cơ sở dữ liệu**: PostgreSQL 16+, Prisma ORM 7.
- **Bảo mật & Mật mã**: Passport.js, JWT, bcrypt, Node.js crypto (CSPRNG).
- **Frontend**: React 19, TypeScript, Vite 8, HTML5/CSS3 Clean Dark Mode.
- **Kiểm thử tự động**: Vitest (**346/346 tests PASSED — 100%**).
  - Auth Service Unit Tests: 182 passed
  - Demo Service Unit Tests: 27 passed
  - Auth Service E2E Tests: 137 passed
