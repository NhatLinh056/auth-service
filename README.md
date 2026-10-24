# Authentication & Microservice Interoperability Platform

> **Project 3 — Hệ Thống Xác Thực & Phân Quyền Liên Thông Giữa Các Microservices**  
> Kiến trúc Monorepo tiêu chuẩn chứa 2 dịch vụ độc lập: **Auth Service (IAM Core)** và **Demo Service (Client Microservice)**.

---

## 🏛️ Sơ Đồ Kiến Trúc Hệ Thống (Architecture)

```
                     ┌─────────────────────────────────────────────────────────┐
                     │               NGƯỜI DÙNG / TRÌNH DUYỆT                  │
                     └────────────────────┬────────────────────────────────────┘
                                          │
                  1. Login / Register     │ 2. Gọi API kèm Bearer JWT
                  & Nhận User JWT         │    (ví dụ: GET /orders)
                                          │
                                          ▼
┌───────────────────────────────┐                  ┌───────────────────────────────┐
│         PROJECT 1             │                  │         PROJECT 2             │
│        auth-service           │ ◄─────────────── │         demo-service          │
│       (Cổng: 3000)            │  3. Xác thực &   │         (Cổng: 3001)          │
│                               │     Ủy quyền     │                               │
│ • Quản lý User & RBAC         │                  │ • Không có DB User            │
│ • Cấp JWT (Access Token)      │  Headers gửi kèm:│ • AppAuthMiddleware           │
│ • Quản lý AppID / AppToken    │  - X-App-Id      │   tự động tiêm App ID & Token │
│ • AppAuthGuard & RBAC Guards  │  - X-App-Token   │ • Nghiệp vụ Đơn Hàng (Orders) │
│ • Developer Console (/dashboard/) - Authorization│ • Bắt tay kiểm tra kết nối    │
└───────────────┬───────────────┘                  └───────────────────────────────┘
                │
                ▼
      ┌───────────────────┐
      │    PostgreSQL     │
      │  auth_service_db  │
      └───────────────────┘
```

---

## 📂 Cấu Trúc Thư Mục Repository

```text
.
├── auth-service/                  # [PROJECT 1] Dịch vụ IAM & Xác thực Trung tâm (Port 3000)
│   ├── src/                       # Source code NestJS (Auth, Users, Roles, Applications)
│   ├── prisma/                    # Schema database PostgreSQL (Prisma 7 ORM)
│   ├── public/                    # Developer & Admin Console WebApp (/dashboard/)
│   ├── test/                      # 120 E2E tests trên PostgreSQL thật
│   ├── package.json               # Dependencies độc lập của Project 1
│   └── .env.example
│
├── demo-service/                  # [PROJECT 2] Client Microservice Demo (Port 3001)
│   ├── src/                       # Source code NestJS (AppAuthMiddleware, Orders Module)
│   ├── test/                      # Integration tests liên thông sang Project 1
│   ├── package.json               # Dependencies độc lập của Project 2
│   └── .env.example
│
├── HANDOFF.md                     # Tài liệu nhật ký kỹ thuật & roadmap chi tiết
├── README.md                      # Hướng dẫn tổng quan toàn bộ hệ thống (file này)
└── .gitignore                     # Bỏ qua node_modules, .env, dist của cả 2 services
```

---

## 🚀 Hướng Dẫn Khởi Chạy Nhanh (Quickstart)

### Bước 1: Khởi động PROJECT 1 (Auth Service — Port 3000)

1. Mở terminal, di chuyển vào thư mục `auth-service`:
   ```bash
   cd auth-service
   ```
2. Cài đặt thư viện và chuẩn bị file môi trường `.env`:
   ```bash
   npm install
   cp .env.example .env
   ```
   *Đảm bảo PostgreSQL đang chạy và chuỗi `DATABASE_URL` trong `.env` chính xác.*
3. Chạy migration và seed dữ liệu khởi tạo (nếu chưa có):
   ```bash
   npx prisma migrate dev
   ```
4. Khởi chạy server ở chế độ phát triển:
   ```bash
   npm run start:dev
   ```
   *Auth Service sẽ lắng nghe tại: `http://localhost:3000`*
   *Developer Console có thể truy cập tại: `http://localhost:3000/dashboard/`*

---

### Bước 2: Tạo Khóa Kết Nối Trên Developer Console

1. Mở trình duyệt truy cập: `http://localhost:3000/dashboard/`.
2. Đăng nhập bằng tài khoản Quản trị viên (Admin) mặc định:
   * **Email:** `admin@example.com`
   * **Mật khẩu:** `Admin123!`
   *(Hoặc click nút **"Điền Nhanh" / "Quick Fill"** trên màn hình đăng nhập).*
3. Chuyển sang tab **"Applications"** $\rightarrow$ Click **"+ Create Application"**.
4. Điền tên ứng dụng (ví dụ: `Demo Order Service`) $\rightarrow$ Click Tạo.
5. Click **"Chi Tiết" (Details)** trên ứng dụng vừa tạo:
   * Sao chép **App ID** (ví dụ: `app_xxxxxxxxxxxx`)
   * Sao chép **App Token** (ví dụ: `apt_xxxxxxxxxxxxxxxxxxxxxxxx`)

---

### Bước 3: Cấu Hình & Khởi Động PROJECT 2 (Demo Service — Port 3001)

1. Mở terminal thứ 2, di chuyển vào thư mục `demo-service`:
   ```bash
   cd demo-service
   ```
2. Cài đặt thư viện và tạo file cấu hình `.env`:
   ```bash
   npm install
   cp .env.example .env
   ```
3. Điền các giá trị đã lấy từ Bước 2 vào `.env` của `demo-service`:
   ```env
   PORT=3001
   AUTH_SERVICE_URL=http://localhost:3000
   APP_ID=app_xxxxxxxxxxxx
   APP_TOKEN=apt_xxxxxxxxxxxxxxxxxxxxxxxx
   ```
4. Khởi chạy Demo Service:
   ```bash
   npm run start:dev
   ```
   *Demo Service sẽ lắng nghe tại: `http://localhost:3001`*

---

### Bước 4: Kiểm Chứng Liên Thông (Verification)

1. **Kiểm tra bắt tay liên thông (Handshake):**
   ```bash
   curl -i http://localhost:3001/status
   ```
   *Kết quả mong đợi:* Nhận về `200 OK` xác nhận kết nối thành công với Auth Service.
2. **Kiểm tra gọi API nghiệp vụ được bảo vệ:**
   * Gửi request tới `http://localhost:3001/orders` kèm theo Bearer JWT của người dùng để kiểm chứng Project 2 ủy quyền xác thực sang Project 1 thành công.
