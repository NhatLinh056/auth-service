# PROJECT HANDOFF DOCUMENT — PROJECT 3 (AUTH SERVICE & MICROSERVICE INTEROP)

> **File:** `HANDOFF.md`  
> **Location:** Root of repository workspace (`d:/STUDY/2026.1/prj3/HANDOFF.md`)  
> **Last Updated:** 2026-10-18  
> **Purpose:** Document project state, verified architecture, code inventory, and roadmap progress so any incoming developer or AI assistant can immediately understand context, constraints, and next actions without guessing.

---

## 1. QUY TẮC QUAN TRỌNG (RULES FOR ANY AI/DEVELOPER)

1. **KHÔNG được đoán trạng thái project.** Mọi thông tin trong tài liệu này đều được kiểm tra trực tiếp từ source code, file cấu hình, và terminal output.
2. **Kiểm tra trước khi code:** Luôn kiểm tra filesystem, `package.json`, `tsconfig.json`, Prisma schema, controllers, services trước khi đề xuất bất kỳ thay đổi nào.
3. **Phân biệt trạng thái rõ ràng:**
   - `COMPLETED`: Đã được verify bằng source code và chạy thực tế.
   - `PARTIAL` / `IN PROGRESS`: Đang làm dở, đã có code/cấu hình một phần nhưng chưa hoàn thiện/test xong.
   - `NOT IMPLEMENTED` / `NOT STARTED`: Chưa có code thực tế.
   - `UNKNOWN — needs verification`: Chưa đủ bằng chứng để khẳng định.
4. **Không tự ý thêm công nghệ ngoài luồng** (xem mục [Scope Control](#14-scope-control)).
5. **Không bao giờ commit secrets (.env)** hoặc làm lộ credentials trong tài liệu.

---

## 2. PROJECT CONTEXT & YÊU CẦU CỦA GIẢNG VIÊN

Project này là **Project 3**.

### Mục tiêu tổng thể:
Xây dựng 2 project để giải quyết bài toán Authentication, Authorization và phân quyền liên thông giữa các dịch vụ (microservices):

### PROJECT 1: Auth Service (Web API)
- **Công nghệ:** NestJS (TypeScript), PostgreSQL, Prisma ORM.
- **Nhiệm vụ:**
  - Quản lý tài khoản người dùng (`User`).
  - Đăng ký (`register`), Đăng nhập (`login`), Đăng xuất (`logout`), xác thực JWT.
  - Phân quyền theo vai trò (`Role`: `ADMIN`, `USER`).
  - Quản lý định danh và token cho các ứng dụng/microservice con (`Application`: `AppID`, `AppToken`).
  - Cung cấp API để các service khác xác thực quyền hạn và thông tin người dùng.

### PROJECT 2: Demo Service (Client Microservice)
- **Công nghệ:** NestJS (TypeScript).
- **Nhiệm vụ:**
  - Chứng minh khả năng phân tách microservice độc lập.
  - Sử dụng **Middleware** đọc `APP_ID` và `APP_TOKEN` từ file `.env`.
  - Tự động gắn headers/metadata vào HTTP request khi gọi sang Project 1 (Auth Service).
  - Có một số endpoint nghiệp vụ đơn giản để minh họa liên thông dịch vụ.

### Mục tiêu kiến trúc cuối cùng:
Bất kỳ microservice nào trong tương lai muốn kết nối vào hệ sinh thái chỉ cần tái sử dụng middleware và format tương tự Project 2 để ủy quyền xác thực và phân quyền cho Project 1.

---

## 3. PREVIOUS LEARNING (CÁC BƯỚC ĐỆM ĐÃ HỌC)

Trước khi bước vào Project 3 chính thức, người học đã thực hiện 2 project demo tìm hiểu bản chất cơ chế xác thực:

1. **STEP 1 — OAuth Demo**
   - **Repository:** `oauth-service-demo` (Git remote: `https://github.com/NhatLinh056/oauth-service-demo.git`)
   - **Mục tiêu đã học:** Cơ chế OAuth 2.0, vai trò Auth Provider (Google, Facebook), Authorization Flow, Authorization Code, Token Exchange, Callback handler.

2. **STEP 2 — Firebase Authentication Demo**
   - **Repository:** `firebase-auth-demo` (Git remote: `https://github.com/NhatLinh056/firebase-auth-demo.git`)
   - **Mục tiêu đã học:** Cơ chế Identity Provider (IdP) của Firebase, xử lý đăng nhập Google/Facebook provider trên frontend/client, quản lý authentication state, login/logout flow.

> **Lưu ý quan trọng:** Cả hai project trên là repository demo/học tập riêng biệt, **KHÔNG** phải là Project 1 hay Project 2 của Project 3.

---

## 4. CURRENT PROJECT STRUCTURE (CẤU TRÚC THỰC TẾ)

Cấu trúc thư mục thực tế tại workspace `d:/STUDY/2026.1/prj3/`:

```text
prj3/                                        # Root workspace
├── auth-service/                            # PROJECT 1 (Auth Service - NestJS)
│   ├── .env                                 # Environment config (Local - Git ignored)
│   ├── .env.example                         # Example environment variables
│   ├── .gitignore                           # Git ignore configuration
│   ├── nest-cli.json                        # NestJS CLI configuration
│   ├── package.json                         # Dependencies & npm scripts
│   ├── package-lock.json                    # Lockfile
│   ├── prisma7.config.ts                    # Prisma 7 configuration file
│   ├── tsconfig.json                        # TypeScript configuration (ESM nodenext)
│   ├── tsconfig.build.json                  # Build tsconfig
│   ├── vitest.config.ts                     # Unit test configuration
│   ├── vitest.config.e2e.ts                 # E2E test configuration
│   ├── README.md                            # Auth Service README
│   ├── prisma/
│   │   └── schema.prisma                    # Prisma 7 datasource & generator
│   ├── src/
│   │   ├── main.ts                          # Bootstrap: NestFactory + Swagger setup (/api)
│   │   ├── app.module.ts                    # Root module: imports HealthModule
│   │   ├── app.controller.ts                # Root controller: GET /
│   │   ├── app.service.ts                   # Root service: getHello()
│   │   ├── app.controller.spec.ts           # Root controller spec
│   │   ├── health/                          # Health check module
│   │   │   ├── health.controller.ts         # GET /health
│   │   │   ├── health.service.ts            # getStatus()
│   │   │   └── health.module.ts             # HealthModule
│   │   ├── auth/                            # [Placeholder] AuthModule
│   │   │   └── .gitkeep                     # Not implemented yet
│   │   ├── users/                           # [Placeholder] UsersModule
│   │   │   └── .gitkeep                     # Not implemented yet
│   │   ├── roles/                           # [Placeholder] RolesModule
│   │   │   └── .gitkeep                     # Not implemented yet
│   │   ├── applications/                    # [Placeholder] ApplicationsModule
│   │   │   └── .gitkeep                     # Not implemented yet
│   │   └── common/                          # [Placeholder] Common utilities / guards / filters
│   │       └── .gitkeep                     # Not implemented yet
│   └── test/
│       └── app.e2e-spec.ts                  # E2E tests
├── firebase-auth-demo/                      # [Step 2 Learning Repo]
├── oauth-service-demo/                      # [Step 1 Learning Repo]
└── HANDOFF.md                               # [Tài liệu bàn giao này]
```

> **Ghi chú về Project 2:** Thư mục của Project 2 (Demo Microservice) **chưa được khởi tạo** trong workspace (`Not implemented`). Sẽ triển khai sau khi hoàn thành mốc nghiệm thu của Project 1 (TODO 77).

---

## 5. TECHNOLOGY STACK

### Implemented (Đã cài đặt & kiểm chứng trong mã nguồn):
- **Runtime:** Node.js (v24+ hỗ trợ ESM)
- **Framework:** NestJS v12 (`@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`, `@nestjs/cli`)
- **Language:** TypeScript v6 (Target `ES2023`, Module `nodenext`, strict mode enabled)
- **API Documentation:** Swagger / OpenAPI v12 (`@nestjs/swagger`) mounted at `/api`
- **ORM:** Prisma v7 (`prisma@7.10.1`, `@prisma/client@7.10.1`, `prisma7.config.ts`)
- **Environment Management:** `dotenv@18.0.8` (dùng cho Prisma 7 config)
- **Testing:** Vitest v4 (`vitest`, `@vitest/coverage-v8`, `@nestjs/testing`, `supertest`)
- **Linting & Formatting:** `oxlint`, `prettier`
- **Version Control:** Git, GitHub repository (`https://github.com/NhatLinh056/auth-service.git`)

### Planned (Dự kiến triển khai theo roadmap, chưa cài vào package.json):
- **Database Server:** PostgreSQL (đã cài đặt local, service đang chạy, chưa chạy migrations)
- **Password Hashing:** `bcrypt` hoặc `argon2` (cho TODO 49)
- **Authentication & Tokens:** `@nestjs/jwt`, `passport`, `passport-jwt` (cho TODO 50, 63–68)
- **Request Validation:** `class-validator`, `class-transformer` (cho DTO validation)
- **UUID / Token Generator:** `crypto` (native Node.js) hoặc `uuid` cho AppToken generation (TODO 74–76)
- **Project 2 Client:** `@nestjs/axios` hoặc native `fetch` / `axios` cho microservice HTTP calls

---

## 6. ARCHITECTURE

### Sơ đồ kiến trúc hiện tại (Actual State):

```text
Client (Browser / Postman / Swagger UI)
  │
  ▼
main.ts (Port 3000, Swagger mounted at /api)
  │
  ▼
AppModule
  │
  ├── AppController (GET /)
  │     └── AppService -> returns "Hello World!"
  │
  └── HealthModule
        └── HealthController (GET /health)
              └── HealthService -> returns JSON { status: 'ok', message: '...', timestamp: '...' }

Database Layer (Configured, Not Connected at Runtime yet):
  prisma7.config.ts ── reads DATABASE_URL ──► .env (PostgreSQL local auth_service_db)
  prisma/schema.prisma (datasource postgresql valid, 0 models)
```

### Sơ đồ kiến trúc mục tiêu của Project 1 (Target State at TODO 77):

```text
HTTP Request (Client / Admin / Microservice)
  │
  ▼
NestJS Middleware / Interceptors (Logger, Tracing)
  │
  ▼
NestJS Guards:
  ├── JwtAuthGuard (Xác thực User Bearer Token)
  ├── RolesGuard (@Roles('ADMIN', 'USER'))
  └── AppAuthGuard (Xác thực Header X-App-Id & X-App-Token)
  │
  ▼
Controllers (AuthController, UsersController, RolesController, ApplicationsController)
  │
  ▼
Services (Business logic, password hashing, token issue)
  │
  ▼
PrismaService (Prisma Client)
  │
  ▼
PostgreSQL Database (auth_service_db)
  ├── User
  ├── Role (Enum)
  └── Application
```

### Sơ đồ kiến trúc liên thông Project 1 & Project 2 (Target Full Architecture):

```text
[ PROJECT 2: Demo Service ]
Request to Demo Service
  │
  ▼
AppAuthMiddleware (Project 2)
  ├── Reads APP_ID & APP_TOKEN from .env
  └── Injects Headers:
        X-App-Id: <APP_ID>
        X-App-Token: <APP_TOKEN>
  │
  ▼
HTTP Call via Axios/Fetch
  │
  ▼
[ PROJECT 1: Auth Service (Port 3000) ]
AppAuthGuard verifies AppID + AppToken against database
  │
  ▼
Allow Request / Grant Service Access
```

---

## 7. MODULES STATUS

| Module | Files Thực Tế | Trách Nhiệm Hiện Tại | Endpoints Đã Triển Khai |
|---|---|---|---|
| **AppModule** | `src/app.module.ts`<br>`src/app.controller.ts`<br>`src/app.service.ts` | Root module khởi tạo, import các module con | `GET /` |
| **HealthModule** | `src/health/health.module.ts`<br>`src/health/health.controller.ts`<br>`src/health/health.service.ts` | Kiểm tra tình trạng hoạt động của Web API | `GET /health` |
| **PrismaModule** | `src/prisma/prisma.module.ts`<br>`src/prisma/prisma.service.ts` | Quản lý kết nối runtime tới PostgreSQL qua Prisma Client | Không có (Service Provider) |
| **UsersModule** | `src/users/users.module.ts`<br>`src/users/users.service.ts`<br>`src/users/users.controller.ts`<br>`src/users/dto/update-user.dto.ts`<br>`src/users/users.service.spec.ts`<br>`src/users/users.controller.spec.ts` | Data access service CRUD + Controller expose `GET /users/me`, `GET /users`, `GET /users/:id`, `PATCH /users/:id`, `DELETE /users/:id` bảo vệ bằng JWT Guard | `GET /users/me`<br>`GET /users`<br>`GET /users/:id`<br>`PATCH /users/:id`<br>`DELETE /users/:id` |
| **AuthModule** | `src/auth/auth.module.ts`<br>`src/auth/auth.service.ts`<br>`src/auth/auth.controller.ts`<br>`src/auth/dto/register.dto.ts`<br>`src/auth/dto/login.dto.ts` | Xác thực người dùng, đăng ký, đăng nhập JWT, đăng xuất. Export `JwtStrategy` | `POST /auth/register`<br>`POST /auth/login`<br>`POST /auth/logout` |
| **RolesModule** | `src/roles/roles.module.ts`<br>`src/roles/roles.service.ts`<br>`src/roles/roles.controller.ts`<br>`src/roles/dto/assign-role.dto.ts`<br>`src/roles/roles.service.spec.ts`<br>`src/roles/roles.controller.spec.ts` | Quản lý vai trò (RBAC), kiểm tra quyền ADMIN/USER, gán vai trò người dùng | `GET /roles`<br>`GET /roles/admin`<br>`GET /roles/user`<br>`POST /roles/assign`<br>`GET /roles/users/:id` |
| **ApplicationsModule** | `src/applications/applications.module.ts`<br>`src/applications/applications.service.ts`<br>`src/applications/applications.controller.ts`<br>`src/applications/dto/create-application.dto.ts`<br>`src/applications/dto/update-application.dto.ts`<br>`src/applications/applications.service.spec.ts`<br>`src/applications/applications.controller.spec.ts` | Quản lý ứng dụng microservice, sinh AppID và AppToken | `POST /applications`<br>`GET /applications`<br>`GET /applications/:id`<br>`PATCH /applications/:id`<br>`DELETE /applications/:id` |
| **CommonModule** | `src/common/guards/jwt-auth.guard.ts`<br>`src/common/guards/roles.guard.ts`<br>`src/common/guards/owner-or-admin.guard.ts`<br>`src/common/guards/app-auth.guard.ts`<br>`src/common/decorators/auth.decorator.ts`<br>`src/common/decorators/app-auth.decorator.ts`<br>`src/common/decorators/current-user.decorator.ts`<br>`src/common/decorators/current-app.decorator.ts`<br>`src/common/decorators/public.decorator.ts`<br>`src/common/decorators/roles.decorator.ts`<br>`src/common/strategies/jwt.strategy.ts` | Bảo mật dùng chung: JWT Auth Guard, Roles Guard, Owner Or Admin Guard, AppAuthGuard (Service-to-Service), Decorators phân quyền và trích xuất dữ liệu | `GET /auth/verify-service` (bảo vệ bởi `@AppAuth()`) |

---

## 8. DATABASE STATUS

### 1. Prisma Schema (`prisma/schema.prisma`):
```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

enum Role {
  ADMIN
  USER
}

enum AppStatus {
  ACTIVE
  INACTIVE
}

model User {
  id           String        @id @default(uuid())
  email        String        @unique
  passwordHash String
  name         String?
  role         Role          @default(USER)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  applications Application[]

  @@map("users")
}

model Application {
  id        String    @id @default(uuid())
  name      String
  appId     String    @unique
  appToken  String
  status    AppStatus @default(ACTIVE)
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  @@map("applications")
}
```

### 2. Cấu hình Prisma 7 (`prisma7.config.ts`):
- Sử dụng `defineConfig` từ `prisma/config`.
- URL kết nối: `process.env["DATABASE_URL"]` nạp qua `dotenv/config`.
- Đã kiểm tra tính hợp lệ bằng lệnh `npx prisma validate`: **Schema is valid**.

### 3. Trạng thái Models & Tables:
- **Models hiện tại:** `User` (kèm enum `Role`: `ADMIN`, `USER`) và `Application` (kèm enum `AppStatus`: `ACTIVE`, `INACTIVE`).
- **Migrations:** Đã chạy 2 migrations (`20261018082724_init_user_model`, `20261023155948_add_application_model`), bảng `users`, `applications` và các enum `Role`, `AppStatus` đã được tạo trong PostgreSQL.
- **Relationship:** `User` 1-N `Application` (Một người dùng có thể sở hữu nhiều Application, xóa User thì tự động cascade xóa Applications).
- **Models cần tạo tiếp theo:** Không còn (đã hoàn thiện toàn bộ models cho Project 1).

---

## 9. API INVENTORY

| Method | Endpoint | Controller | Swagger Tag | Status | Ghi Chú |
|---|---|---|---|---|---|
| `GET` | `/` | `AppController` | - | **IMPLEMENTED** | Trả về `"Hello World!"` |
| `GET` | `/health` | `HealthController` | `health` | **IMPLEMENTED** | Trả về `{ status: 'ok', message: '...', timestamp: '...' }` |
| `GET` | `/api` | SwaggerModule | - | **IMPLEMENTED** | Swagger UI tương tác trực tiếp |
| `POST` | `/auth/register` | `AuthController` | `auth` | **IMPLEMENTED** | Đăng ký tài khoản, hash bcrypt, validate DTO, loại bỏ passwordHash |
| `POST` | `/auth/login` | `AuthController` | `auth` | **IMPLEMENTED** | Xác thực mật khẩu qua bcrypt, cấp phát JWT Bearer access token |
| `POST` | `/auth/logout` | `AuthController` | `auth` | **IMPLEMENTED** | Trả về `200 OK` với message đăng xuất thành công (stateless JWT, client tự xóa token) |
| `GET` | `/users/me` | `UsersController` | `users` | **IMPLEMENTED** | Bảo vệ bằng `JwtAuthGuard`, trả về profile của user đang login (từ JWT sub) |
| `GET` | `/users` | `UsersController` | `users` | **IMPLEMENTED** | Bảo vệ bằng `JwtAuthGuard`, trả về mảng tất cả users sắp xếp theo `createdAt` giảm dần (không có passwordHash) |
| `GET` | `/users/:id` | `UsersController` | `users` | **IMPLEMENTED** | Bảo vệ bằng `JwtAuthGuard`, trả về thông tin user theo ID, 404 nếu không tìm thấy |
| `PATCH` | `/users/:id` | `UsersController` | `users` | **IMPLEMENTED** | Bảo vệ bằng `JwtAuthGuard`, cập nhật `name` hoặc `password` (băm bcrypt), trả về user sau update (loại bỏ passwordHash), 404 nếu không tìm thấy |
| `DELETE` | `/users/:id` | `UsersController` | `users` | **IMPLEMENTED** | Bảo vệ bằng `JwtAuthGuard`, xóa user theo ID, trả về `{ message, user }` (loại bỏ passwordHash), 404 nếu không tìm thấy |
| `GET` | `/roles` | `RolesController` | `roles` | **IMPLEMENTED** | Trả về danh sách vai trò hệ thống (`ADMIN`, `USER`) kèm mô tả |
| `GET` | `/roles/admin` | `RolesController` | `roles` | **IMPLEMENTED** | Bảo vệ bằng `JwtAuthGuard` + `RolesGuard` (`ADMIN`), trả về dashboard thống kê |
| `GET` | `/roles/user` | `RolesController` | `roles` | **IMPLEMENTED** | Bảo vệ bằng `JwtAuthGuard` + `RolesGuard` (`USER`, `ADMIN`), trả về không gian cá nhân |
| `POST` | `/roles/assign` | `RolesController` | `roles` | **IMPLEMENTED** | Bảo vệ bằng `JwtAuthGuard` + `RolesGuard` (`ADMIN`), gán/thay đổi vai trò người dùng |
| `GET` | `/roles/users/:id` | `RolesController` | `roles` | **IMPLEMENTED** | Bảo vệ bằng `JwtAuthGuard`, trả về thông tin vai trò của người dùng theo ID |
| `POST` | `/applications` | `ApplicationsController` | `applications` | **IMPLEMENTED** | Bảo vệ bằng `@Auth()`, tự sinh `appId` và `appToken`, gán người dùng sở hữu (hoặc target user nếu ADMIN chỉ định) |
| `GET` | `/applications` | `ApplicationsController` | `applications` | **IMPLEMENTED** | Bảo vệ bằng `@Auth()`, User xem ứng dụng của chính mình, ADMIN xem toàn bộ ứng dụng hệ thống |
| `GET` | `/applications/:id` | `ApplicationsController` | `applications` | **IMPLEMENTED** | Bảo vệ bằng `@Auth()`, xem chi tiết ứng dụng theo ID (chủ sở hữu hoặc ADMIN; chặn 403 nếu cố xem của người khác; 404 nếu không tìm thấy) |
| `PATCH` / `PUT` | `/applications/:id` | `ApplicationsController` | `applications` | **IMPLEMENTED** | Bảo vệ bằng `@Auth()`, cập nhật `name` hoặc `status` (chủ sở hữu hoặc ADMIN; chặn 403 nếu cố sửa của người khác; 404 nếu không tìm thấy) |
| `DELETE`| `/applications/:id` | `ApplicationsController` | `applications` | **IMPLEMENTED** | Bảo vệ bằng `@Auth()`, xóa ứng dụng theo ID (chủ sở hữu hoặc ADMIN; chặn 403 nếu cố xóa của người khác; 404 nếu không tìm thấy) |
| `POST` | `/applications/:id/regenerate-token` | `ApplicationsController` | `applications` | **NOT IMPLEMENTED** | Thuộc TODO 76 |

---

## 10. TODO PROGRESS TRACKER

### PHASE 3.1 — NestJS Setup & Baseline API
- [x] **TODO 36 — Create NestJS project**  
  *Status:* `COMPLETED`  
  *Evidence:* Project `auth-service` khởi tạo thành công với NestJS CLI v12.
- [x] **TODO 37 — TypeScript**  
  *Status:* `COMPLETED`  
  *Evidence:* `tsconfig.json` cấu hình target `ES2023`, module `nodenext`, decorators enabled.
- [x] **TODO 38 — Module structure**  
  *Status:* `COMPLETED`  
  *Evidence:* Cấu trúc thư mục `src/health`, `src/auth`, `src/users`, `src/roles`, `src/applications`, `src/common` đã sẵn sàng.
- [x] **TODO 39 — Run NestJS**  
  *Status:* `COMPLETED`  
  *Evidence:* Chạy `npm run start` và `npm run start:dev` thành công trên cổng 3000.
- [x] **TODO 40 — REST API**  
  *Status:* `COMPLETED`  
  *Evidence:* Endpoint `GET /` và `GET /health` phản hồi chính xác JSON.
- [x] **TODO 41 — Postman / Swagger**  
  *Status:* `COMPLETED`  
  *Evidence:* `SwaggerModule` cài đặt tại `src/main.ts`, truy cập và test trực tiếp tại `http://localhost:3000/api`.

### PHASE 3.2 — Database & ORM (PostgreSQL & Prisma)
- [x] **TODO 42 — PostgreSQL**  
  *Status:* `COMPLETED`  
  *Evidence:* PostgreSQL service cài đặt và hoạt động tại `localhost:5432`.
- [x] **TODO 43 — Database**  
  *Status:* `COMPLETED`  
  *Evidence:* Database `auth_service_db` đã được tạo trên PostgreSQL.
- [x] **TODO 44 — Prisma**  
  *Status:* `COMPLETED`  
  *Evidence:* Cài đặt `prisma@7.10.1`, `@prisma/client@7.10.1`, khởi tạo `prisma/schema.prisma`, `prisma7.config.ts`, file `.env` đã có connection string, `npx prisma validate` thành công.
- [x] **TODO 45 — Connection**  
  *Status:* `COMPLETED`  
  *Evidence:* Đã tạo `PrismaService` (kế thừa `PrismaClient` với driver adapter `@prisma/adapter-pg`), cấu hình `PrismaModule` `@Global()`, đăng ký vào `AppModule`. Khi khởi động NestJS, log xác nhận: `[PrismaService] Connected to PostgreSQL database successfully via Prisma`.
- [x] **TODO 46 — User model**  
  *Status:* `COMPLETED`  
  *Evidence:* Đã định nghĩa model `User` (id, email, passwordHash, name, role enum ADMIN/USER, createdAt, updatedAt) và map vào bảng `users`. `npx prisma validate` và `npx prisma generate` thành công.
- [x] **TODO 47 — Migration**  
  *Status:* `COMPLETED`  
  *Evidence:* Chạy `npx prisma migrate dev --name init_user_model` thành công. Đã sinh migration file `prisma/migrations/20261018082724_init_user_model/migration.sql` và áp dụng trực tiếp tạo bảng `users` và enum `Role` trong database `auth_service_db`. `npx prisma migrate status` báo: `Database schema is up to date!`.
- [x] **TODO 48 — Database CRUD**  
  *Status:* `COMPLETED`  
  *Evidence:* Đã tạo `UsersService` (create, findAll, findById, findByEmail, update, delete) và `UsersModule`, đăng ký vào `AppModule`. Viết 7 unit tests (`users.service.spec.ts`) đều pass (8/8 tổng test). Chạy kiểm chứng thực tế CRUD trên database PostgreSQL `auth_service_db` thành công 100%.

### PHASE 3.3 — Authentication (User & Auth API)
- [x] **TODO 49 — Register (Đăng ký tài khoản, hash password)**  
  *Status:* `COMPLETED`  
  *Evidence:* Đã tạo `RegisterDto` (class-validator), `AuthService.register()` (hash bcrypt 10 rounds, check trùng email, loại bỏ passwordHash khi trả về), `AuthController` endpoint `POST /auth/register` (Swagger docs). Viết 5 unit tests pass, kiểm chứng thực tế gửi HTTP POST thành công (201 Created), bắt lỗi trùng email (409 Conflict), bắt lỗi validation (400 Bad Request).
- [x] **TODO 50 — Login (Đăng nhập, sinh JWT token)**  
  *Status:* `COMPLETED`  
  *Evidence:* Cài đặt `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`. Tạo `LoginDto`, cấu hình `JwtModule` trong `AuthModule`, triển khai `AuthService.login()` (xác thực email, so khớp mật khẩu qua bcrypt, ký và trả về JWT accessToken chứa sub, email, role). Viết unit tests đạt 17/17 tests pass. Đã test HTTP thực tế nhận 200 OK kèm Bearer token và 401 khi sai password.
- [x] **TODO 51 — Logout (Đăng xuất, hủy session/token)**  
  *Status:* `COMPLETED`  
  *Evidence:* Thêm method `AuthService.logout()` trả về `{ message: '...' }`, endpoint `POST /auth/logout` phản hồi `200 OK` (stateless JWT — client tự xóa token). Viết 2 unit tests bổ sung đạt **19/19 tests PASS**. Đã kiểm chứng HTTP trực tiếp thành công.
- [x] **TODO 52 — Get user (Xem profile cá nhân)**  
  *Status:* `COMPLETED`  
  *Evidence:* Tạo `JwtStrategy` (passport-jwt, đọc Bearer token từ Authorization header, inject payload vào `request.user`), `JwtAuthGuard` (kế thừa `AuthGuard('jwt')`). Tạo `UsersController` với `GET /users/me` và `GET /users/:id` đều bảo vệ bằng `@UseGuards(JwtAuthGuard)`. Kiểm chứng HTTP: 200 OK có token, 401 không có token, 404 ID không tồn tại. Build pass, 19/19 tests pass.
- [x] **TODO 53 — Get users (Danh sách người dùng)**  
  *Status:* `COMPLETED`  
  *Evidence:* Thêm `GET /users` vào `UsersController`, bảo vệ bằng `JwtAuthGuard`, dùng `Array.map` để loại bỏ `passwordHash` khỏi từng phần tử. Kiểm chứng HTTP: 200 OK trả về 4 users trong DB, 401 khi không có token. Build pass, 19/19 tests pass.
- [x] **TODO 54 — Update user (Cập nhật thông tin)**  
  *Status:* `COMPLETED`  
  *Evidence:* Tạo `UpdateUserDto` (`src/users/dto/update-user.dto.ts`) hỗ trợ cập nhật tùy chọn `name` và `password` (validate độ dài tối thiểu 6 ký tự). Thêm endpoint `PATCH /users/:id` trong `UsersController`, bảo vệ bằng `JwtAuthGuard`. Tự động băm `password` bằng `bcrypt` (10 salt rounds) nếu người dùng cung cấp mật khẩu mới, loại bỏ `passwordHash` khi trả về dữ liệu. Bổ sung 9 unit tests cho `UsersController` (`src/users/users.controller.spec.ts`) nâng tổng test suite lên **28/28 tests PASS**. Kiểm chứng HTTP live: 401 khi không có token, 400 khi password ngắn (<6 ký tự), 404 khi ID không tồn tại, 200 khi cập nhật name/password và login thành công bằng mật khẩu mới.
- [x] **TODO 55 — Delete user (Xóa tài khoản)**  
  *Status:* `COMPLETED`  
  *Evidence:* Thêm endpoint `DELETE /users/:id` trong `UsersController`, bảo vệ bằng `JwtAuthGuard`. Kiểm tra người dùng tồn tại (ném `404 Not Found` nếu không tìm thấy), gọi `UsersService.delete(id)` xóa khỏi PostgreSQL, loại bỏ `passwordHash` và trả về `{ message: 'Xóa người dùng thành công', user }`. Bổ sung unit tests nâng tổng số test lên **30/30 tests PASS**. Kiểm chứng HTTP live: 401 khi thiếu token, 404 khi ID không tồn tại, 200 khi xóa thành công và sau khi xóa thì gọi GET trả về 404 và không thể login bằng tài khoản đã xóa.
- [x] **TODO 56 — Test User API**  
  *Status:* `COMPLETED`  
  *Evidence:* Tạo `test/users.e2e-spec.ts` với **28 E2E test cases** kiểm thử toàn diện vòng đời User API sử dụng database thực (PostgreSQL), `beforeAll`/`afterAll` lifecycle, tự cleanup sau khi chạy xong. Bao phủ đầy đủ: `POST /auth/register` (201, 409 trùng email, 400 validation), `POST /auth/login` (200 + JWT, 401 sai password, 400 thiếu field), `GET /users/me` (200, 401), `GET /users` (200, 401), `GET /users/:id` (200, 404, 401), `PATCH /users/:id` (cập nhật name và password, đổi password và login lại thành công, 400, 404, 401), `DELETE /users/:id` (401, 404, 200 + xác minh GET 404 sau khi xóa + login 401). Thêm 1 test `POST /auth/logout`. Chạy `npm run test:e2e`: **2 test files, 29/29 PASS** (28 tests users + 1 test app). Đã push commit `0bd77d6` lên GitHub.

### PHASE 3.4 — Roles & Authorization Baseline
- [x] **TODO 57 — Role**  
  *Status:* `COMPLETED`  
  *Evidence:* Triển khai nền tảng hệ thống phân quyền (RBAC) với:
  - Custom decorator `@Roles(...roles: Role[])` (`src/common/decorators/roles.decorator.ts`) gắn metadata vai trò yêu cầu.
  - `RolesGuard` (`src/common/guards/roles.guard.ts`) kế thừa `CanActivate`, sử dụng `Reflector` để đọc metadata `@Roles()`, so khớp với `request.user.role` từ JWT và ném `403 ForbiddenException` nếu không đủ quyền.
  - Tạo `RolesService` (`src/roles/roles.service.ts`) quản lý danh sách và metadata các vai trò (`ADMIN`, `USER`), phương thức kiểm tra `isValidRole`.
  - Tạo `RolesController` (`src/roles/roles.controller.ts`) với endpoint `GET /roles` để tra cứu danh sách vai trò hệ thống kèm Swagger docs.
  - Tạo `RolesModule` (`src/roles/roles.module.ts`), đăng ký vào `AppModule`.
  - Viết 14 unit tests mới: 7 tests cho `RolesGuard`, 5 tests cho `RolesService`, 2 tests cho `RolesController`. Tổng unit test suite đạt **44/44 tests PASS**. Chạy E2E tests đạt **29/29 tests PASS**. Đã push commit `ad4bda4` lên GitHub.
- [x] **TODO 58 — Role ADMIN**  
  *Status:* `COMPLETED`  
  *Evidence:* Triển khai phân quyền và bảo vệ endpoint quản trị viên dành riêng cho `ADMIN`:
  - Thêm phương thức `isAdmin(role: string): boolean` và `getAdminDashboard()` trong `RolesService` (`src/roles/roles.service.ts`) truy vấn thống kê người dùng (`totalUsers`, `adminCount`, `userCount`) từ PostgreSQL qua `PrismaService`.
  - Tạo endpoint `GET /roles/admin` trong `RolesController` (`src/roles/roles.controller.ts`), bảo vệ bằng `@UseGuards(JwtAuthGuard, RolesGuard)` và decorator `@Roles(Role.ADMIN)` kèm Swagger documentation.
  - Cập nhật unit test suite đạt **48/48 tests PASS** (8 test files).
  - Tạo bộ E2E test `test/roles.e2e-spec.ts` kiểm thử toàn diện: không gửi token (401), user thường `USER` gọi vào bị chặn (403 Forbidden với message *"Bạn không có quyền truy cập tài nguyên này"*), user `ADMIN` gọi vào thành công (200 OK với dữ liệu dashboard thống kê và profile admin). Chạy `npm run test:e2e`: **3 test files, 33/33 tests PASS**.
  - Đã push commit `7d47d59` lên GitHub.
- [x] **TODO 59 — Role USER**  
  *Status:* `COMPLETED`  
  *Evidence:* Triển khai quyền hạn và không gian làm việc cho vai trò `USER`:
  - Thêm phương thức `isUser(role: string): boolean` và `getUserSpaceInfo(userId: string)` trong `RolesService` (`src/roles/roles.service.ts`).
  - Tạo endpoint `GET /roles/user` trong `RolesController` (`src/roles/roles.controller.ts`), bảo vệ bằng `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles(Role.USER, Role.ADMIN)` kèm Swagger documentation.
  - Cập nhật unit test suite đạt **52/52 tests PASS** (8 test files).
  - Cập nhật bộ E2E test `test/roles.e2e-spec.ts` bổ sung 3 test cases: không token (401), user role `USER` truy cập thành công (200 OK với permissions và thông tin cá nhân), user role `ADMIN` truy cập thành công (200 OK). Tổng E2E test suite đạt **36/36 tests PASS** (3 test files).
  - Đã push commit `c55327e` lên GitHub.
- [x] **TODO 60 — Assign Role**  
  *Status:* `COMPLETED`  
  *Evidence:* Triển khai API gán/thay đổi vai trò người dùng dành riêng cho `ADMIN`:
  - Tạo `AssignRoleDto` (`src/roles/dto/assign-role.dto.ts`) validate `userId` (định dạng UUID) và `role` (`Role.ADMIN` hoặc `Role.USER`) bằng `class-validator` và Swagger annotations.
  - Thêm phương thức `assignRole(assignRoleDto: AssignRoleDto)` trong `RolesService` (`src/roles/roles.service.ts`): kiểm tra tồn tại người dùng trong PostgreSQL qua Prisma (ném `404 Not Found` nếu không tìm thấy), cập nhật trường `role`, loại bỏ `passwordHash` khi phản hồi.
  - Thêm endpoint `POST /roles/assign` trong `RolesController` (`src/roles/roles.controller.ts`) được bảo vệ bằng `@UseGuards(JwtAuthGuard, RolesGuard)` và decorator `@Roles(Role.ADMIN)` với `@HttpCode(HttpStatus.OK)`.
  - Cập nhật unit test suite đạt **55/55 tests PASS** (8 test files).
  - Cập nhật bộ E2E test `test/roles.e2e-spec.ts` bổ sung 7 test cases toàn diện: không token (401), role `USER` gọi bị chặn (403 Forbidden), role không hợp lệ (400), userId không phải UUID (400), UUID ma không tồn tại (404), ADMIN nâng cấp USER thành ADMIN thành công (200 OK + xác thực đăng nhập lại nhận token role ADMIN và truy cập thành công endpoint quản trị), ADMIN hạ quyền tài khoản về USER thành công (200 OK + xác thực đăng nhập lại nhận token USER và bị chặn 403 khi vào endpoint quản trị). Tổng E2E test suite đạt **43/43 tests PASS** (3 test files).
  - Đã push commit `6dd85e8` lên GitHub.
- [x] **TODO 61 — Get Role**  
  *Status:* `COMPLETED`  
  *Evidence:* Triển khai API tra cứu vai trò và quyền hạn người dùng theo ID:
  - Thêm phương thức `getUserRole(userId: string)` trong `RolesService` (`src/roles/roles.service.ts`): truy vấn người dùng trong database theo ID (ném `404 Not Found` nếu không tìm thấy), so khớp với danh sách vai trò để trả về chi tiết `userId`, `email`, `name`, `role`, `roleName`, và `description`.
  - Thêm endpoint `GET /roles/users/:id` trong `RolesController` (`src/roles/roles.controller.ts`) được bảo vệ bằng `JwtAuthGuard`, gắn `@ApiParam` và Swagger documentation.
  - Cập nhật unit test suite đạt **58/58 tests PASS** (8 test files).
  - Cập nhật bộ E2E test `test/roles.e2e-spec.ts` bổ sung 4 test cases: không token (401), ID không tồn tại (404), lấy role của regular user trả về `USER` thành công (200), lấy role của admin user trả về `ADMIN` thành công (200). Tổng E2E test suite đạt **47/47 tests PASS** (3 test files).
  - Đã push commit `2622ac5` lên GitHub.
- [x] **TODO 62 — Test Role API**  
  *Status:* `COMPLETED`  
  *Evidence:* Hoàn thiện và nghiệm thu toàn diện bộ kiểm thử Role API:
  - Test suite E2E [roles.e2e-spec.ts](file:///d:/STUDY/2026.1/prj3/auth-service/test/roles.e2e-spec.ts) đạt **22 E2E test cases** bao phủ 100% các endpoint của RolesController (`GET /roles`, `GET /roles/admin`, `GET /roles/user`, `POST /roles/assign`, `GET /roles/users/:id`) cùng các kịch bản bảo mật chuyên sâu (tampered token, malformed authorization header, whitelist validation chặn thuộc tính lạ).
  - Toàn bộ test suites đạt trạng thái hoàn hảo: **58/58 unit tests PASS** (8 test files) và **51/51 E2E tests PASS** (3 test files) trên PostgreSQL thực tế.
  - Kết thúc thành công **PHASE 3.4 — Roles & Authorization Baseline**.
  - Đã push commit `c60f8cf` lên GitHub.

- [x] **TODO 63 — Authentication vs Authorization**  
  *Status:* `COMPLETED`  
  *Evidence:* Phân định ranh giới kiến trúc rõ ràng giữa Xác thực (Authentication) và Phân quyền (Authorization):
  - **Authentication (401 Unauthorized - Xác định danh tính)**: Được đảm nhiệm bởi `JwtAuthGuard` (`src/common/guards/jwt-auth.guard.ts`) kế thừa `AuthGuard('jwt')`. Kiểm tra tính hợp lệ của JWT Bearer token và nạp `request.user` (`{ sub, email, role }`). Ném 401 khi token thiếu, sai hoặc hết hạn.
  - **Authorization (403 Forbidden - Kiểm soát quyền truy cập)**: Được đảm nhiệm bởi `RolesGuard` (`src/common/guards/roles.guard.ts`) kết hợp `@Roles(...)`. Chạy sau `JwtAuthGuard`, so khớp `request.user.role` với metadata yêu cầu của endpoint. Ném 403 khi người dùng đã xác thực nhưng không đủ quyền.
  - Xây dựng composite decorator `@Auth(...roles: Role[])` (`src/common/decorators/auth.decorator.ts`) chuẩn hóa: `@Auth()` đại diện cho thuần Authentication (chỉ chạy `JwtAuthGuard`), `@Auth(Role.ADMIN)` kết hợp cả Authentication và Authorization (chạy `JwtAuthGuard` + `RolesGuard`), tự động tích hợp Swagger docs (401 & 403).
  - Viết unit test suite `auth.decorator.spec.ts` nâng tổng unit tests lên **61/61 tests PASS** (9 test files). Toàn bộ E2E tests **51/51 tests PASS** (3 test files).
  - Đã push commit `0e296ee` lên GitHub.
- [x] **TODO 64 — Endpoint permissions**  
  *Status:* `COMPLETED`  
  *Evidence:* Thiết lập và áp dụng Ma trận phân quyền (Permission Matrix) chuẩn hóa trên toàn bộ hệ thống qua composite decorator `@Auth()`:
  - **Nhóm Public (Không yêu cầu xác thực):** `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /health`, `GET /roles`.
  - **Nhóm Xác thực người dùng (@Auth()):** `GET /users/me`, `GET /users`, `GET /users/:id`, `PATCH /users/:id`, `DELETE /users/:id`, `GET /roles/users/:id`.
  - **Nhóm Không gian người dùng (@Auth(Role.USER, Role.ADMIN)):** `GET /roles/user`.
  - **Nhóm Quản trị viên tối cao (@Auth(Role.ADMIN)):** `GET /roles/admin`, `POST /roles/assign`.
  - Tái cấu trúc gọn gàng code tại `UsersController` và `RolesController`, loại bỏ boilerplate decorators thủ công, đồng bộ Swagger documentation tự động.
  - Toàn bộ kiểm thử đạt trạng thái hoàn hảo: **61/61 unit tests PASS** (9 test files) và **51/51 E2E tests PASS** (3 test files) trên PostgreSQL thực tế.
  - Đã push commit `e5f4351` lên GitHub.
- [x] **TODO 65 — Authorization logic (Guards & Decorators)**  
  *Status:* `COMPLETED`  
  *Evidence:* Triển khai các guard và decorator phân quyền nâng cao cho Phase 3.5:
  - Custom Param Decorator `@CurrentUser(field?)` (`src/common/decorators/current-user.decorator.ts`) hỗ trợ trích xuất toàn bộ payload hoặc từng trường cụ thể (`sub`, `email`, `role`) từ `request.user` một cách chuẩn hóa, kèm 5 unit tests (`current-user.decorator.spec.ts`).
  - Decorator `@Public()` (`src/common/decorators/public.decorator.ts`) đánh dấu các route công khai không cần kiểm tra quyền truy cập, kèm 2 unit tests (`public.decorator.spec.ts`).
  - Nâng cấp `RolesGuard` (`src/common/guards/roles.guard.ts`) hỗ trợ kiểm tra bypass `@Public()` ngay lập tức, kèm 8 unit tests (`roles.guard.spec.ts`).
  - `OwnerOrAdminGuard` (`src/common/guards/owner-or-admin.guard.ts`) kiểm tra quyền thao tác trên tài nguyên: Cho phép `ADMIN` hoặc chính chủ tài nguyên (`request.user.sub === request.params.id`), chặn người dùng thường khác với `403 ForbiddenException`, kèm 4 unit tests (`owner-or-admin.guard.spec.ts`).
  - Composite Decorator `@AuthOwnerOrAdmin()` (`src/common/decorators/auth.decorator.ts`) tích hợp tuần tự `JwtAuthGuard` + `OwnerOrAdminGuard` + Swagger documentation (401 & 403), kèm 4 unit tests (`auth.decorator.spec.ts`).
  - Toàn bộ test suite đạt **74/74 unit tests PASS** (12 test files) và **51/51 E2E tests PASS** (3 test files). Build TypeScript thành công 100%.
  - Đã push commit `704447d` lên GitHub.
- [x] **TODO 66 — ADMIN access**  
  *Status:* `COMPLETED`  
  *Evidence:* Thiết lập và bảo vệ chặt chẽ các đặc quyền truy cập dành riêng cho vai trò `ADMIN`:
  - Nâng cấp endpoint `GET /users` trong `UsersController` (`src/users/users.controller.ts`) sử dụng `@Auth(Role.ADMIN)` và cập nhật Swagger docs (403 Forbidden). Chặn người dùng thường xem danh sách toàn bộ tài khoản hệ thống.
  - Bổ sung unit test trong `users.controller.spec.ts` kiểm chứng metadata `ROLES_KEY` trên phương thức `getAll` khớp chính xác `[Role.ADMIN]`.
  - Cập nhật bộ kiểm thử E2E trong `test/users.e2e-spec.ts` với tài khoản `ADMIN` riêng biệt: Người dùng thường `USER` gọi `GET /users` bị chặn với `403 Forbidden` ("Bạn không có quyền truy cập tài nguyên này"); Quản trị viên `ADMIN` gọi `GET /users` trả về `200 OK` với đầy đủ danh sách users; Không có token trả về `401 Unauthorized`.
  - Toàn bộ test suite đạt **75/75 unit tests PASS** (12 test files), **53/53 E2E tests PASS** (3 test files). Build TypeScript thành công 100%.
  - Đã push commit `7ed65aa` lên GitHub.
- [x] **TODO 67 — USER restriction**  
  *Status:* `COMPLETED`  
  *Evidence:* Thiết lập giới hạn quyền hạn nghiêm ngặt cho người dùng thường trên tài nguyên người dùng:
  - Áp dụng composite decorator `@AuthOwnerOrAdmin()` lên `PATCH /users/:id` và `DELETE /users/:id` trong `UsersController` (`src/users/users.controller.ts`) kèm Swagger docs (403 Forbidden).
  - Bổ sung 2 unit tests trong `users.controller.spec.ts` kiểm chứng metadata `__guards__` trên `updateUser` và `deleteUser` được bảo vệ tuần tự bởi `JwtAuthGuard` và `OwnerOrAdminGuard`.
  - Cập nhật bộ kiểm thử E2E trong `test/users.e2e-spec.ts`:
    - Người dùng thường `USER` cố sửa tài khoản người khác $\rightarrow$ bị chặn với `403 Forbidden` ("Bạn không có quyền thao tác trên tài khoản của người khác").
    - Người dùng thường `USER` tự sửa tài khoản của chính mình $\rightarrow$ thành công `200 OK`.
    - Quản trị viên `ADMIN` sửa tài khoản của người dùng khác $\rightarrow$ thành công `200 OK`.
    - Người dùng thường `USER` cố xóa tài khoản người khác $\rightarrow$ bị chặn với `403 Forbidden` ("Bạn không có quyền thao tác trên tài khoản của người khác").
    - Người dùng thường `USER` tự xóa tài khoản của chính mình $\rightarrow$ thành công `200 OK`.
    - Quản trị viên `ADMIN` gọi sửa/xóa ID không tồn tại $\rightarrow$ vượt qua guard và nhận `404 Not Found` từ service.
  - Toàn bộ test suite đạt **77/77 unit tests PASS** (12 test files), **56/56 E2E tests PASS** (3 test files). Build TypeScript thành công 100%.
  - Đã push commit `b5fbdf9` lên GitHub.
- [x] **TODO 68 — Test authorization**  
  *Status:* `COMPLETED`  
  *Evidence:* Nghiệm thu toàn diện bộ kiểm thử phân quyền (Authorization Matrix) kết thúc trọn vẹn **PHASE 3.5 — Endpoint Permissions & Protection**:
  - Tạo bộ test E2E chuyên sâu `test/authorization.e2e-spec.ts` (21 test cases) bao phủ 5 ma trận phân quyền và bảo mật:
    1. **Ma trận Public**: Kiểm chứng `GET /health`, `GET /roles`, `POST /auth/login`, `POST /auth/logout` phản hồi chuẩn xác không cần token.
    2. **Ma trận Authentication**: Kiểm chứng toàn bộ 8 endpoint được bảo vệ trả về `401 Unauthorized` khi không gửi token, token bị sửa chữ ký (tampered), hoặc Authorization header sai định dạng.
    3. **Ma trận ADMIN đặc quyền**: `GET /users`, `GET /roles/admin`, `POST /roles/assign` chặn `USER` với `403 Forbidden`, cho phép `ADMIN` truy cập với `200 OK`.
    4. **Ma trận Resource Owner**: `USER` không thể sửa/xóa tài khoản của `VICTIM` (403 Forbidden); tự sửa tài khoản của mình thành công (200 OK); `ADMIN` có toàn quyền sửa/xóa bất kỳ tài khoản nào (200 OK).
    5. **Ma trận An ninh & Leo thang đặc quyền**: Ngăn chặn người dùng tự thêm `role: 'ADMIN'` vào payload cập nhật qua whitelist validation (400 Bad Request); kiểm chứng `GET /roles/user` cho phép cả `USER` lẫn `ADMIN`.
  - Toàn bộ test suite đạt trạng thái hoàn hảo: **77/77 unit tests PASS** (12 test files), **77/77 E2E tests PASS** (4 test files). Build TypeScript thành công 100%.
  - Đã push commit `c0f91f9` lên GitHub.
### PHASE 3.6 — Application Management (AppID / AppToken)
- [x] **TODO 69 — Application model**  
  *Status:* `COMPLETED`  
  *Evidence:* Định nghĩa model `Application` và enum `AppStatus` trong `prisma/schema.prisma`, thiết lập quan hệ 1-N với `User` (`onDelete: Cascade`), index unique cho `appId`. Chạy migration `20261023155948_add_application_model` thành công trên database PostgreSQL `auth_service_db`, sinh Prisma Client mới với đầy đủ types. Toàn bộ test suites giữ vững: 77/77 unit tests PASS (12 test files), 77/77 E2E tests PASS (4 test files), build NestJS PASS 100%.
- [x] **TODO 70 — Create Application**  
  *Status:* `COMPLETED`  
  *Evidence:* Triển khai API tạo ứng dụng con `POST /applications`:
  - `CreateApplicationDto` (`src/applications/dto/create-application.dto.ts`): validate `name` (chuỗi không rỗng) và tùy chọn `userId` (định dạng UUID v4).
  - `ApplicationsService` (`src/applications/applications.service.ts`): phương thức `create` sinh `appId` (`app_` + 16 ký tự hex) và `appToken` (`apt_` + 64 ký tự hex), gán người sở hữu là caller (hoặc target user nếu ADMIN chỉ định và user tồn tại).
  - `ApplicationsController` (`src/applications/applications.controller.ts`): endpoint `POST /applications` được bảo vệ bằng composite decorator `@Auth()` và trích xuất user qua `@CurrentUser()`.
  - `ApplicationsModule` (`src/applications/applications.module.ts`): đăng ký vào `AppModule`.
  - Bổ sung 12 unit tests mới (9 tests cho `ApplicationsService`, 3 tests cho `ApplicationsController`), nâng tổng unit test suite lên **89/89 tests PASS** (14 test files). Toàn bộ 77/77 E2E tests PASS. Build NestJS PASS 100%.
- [x] **TODO 71 — Get Applications**  
  *Status:* `COMPLETED`  
  *Evidence:* Triển khai API lấy danh sách và chi tiết ứng dụng:
  - `ApplicationsService.findAll(currentUser)`: Phân quyền theo vai trò — `USER` thường chỉ lấy các ứng dụng do chính mình sở hữu (`where: { userId: currentUser.sub }`), `ADMIN` lấy toàn bộ ứng dụng hệ thống kèm thông tin tóm tắt tài khoản sở hữu (`id`, `email`, `name`).
  - `ApplicationsService.findById(id, currentUser)`: Ném 404 nếu ứng dụng không tồn tại; ném 403 `ForbiddenException` nếu `USER` thường cố xem ứng dụng của người khác; cho phép `ADMIN` hoặc chủ sở hữu xem chi tiết.
  - `ApplicationsController`: Endpoint `GET /applications` và `GET /applications/:id` được bảo vệ bằng composite decorator `@Auth()`, tích hợp Swagger documentation và HTTP response codes.
  - Bổ sung 10 unit tests mới (6 tests cho `ApplicationsService`, 4 tests cho `ApplicationsController`), nâng tổng unit test suite lên **99/99 tests PASS** (14 test files). Toàn bộ 77/77 E2E tests PASS. Build NestJS PASS 100%.
- [x] **TODO 72 — Update Application**  
  *Status:* `COMPLETED`  
  *Evidence:* Triển khai API cập nhật ứng dụng `PATCH /applications/:id` (hỗ trợ cả `PUT`):
  - `UpdateApplicationDto` (`src/applications/dto/update-application.dto.ts`): validate tùy chọn `name` (chuỗi không rỗng) và `status` (`AppStatus`: `ACTIVE` hoặc `INACTIVE`).
  - `ApplicationsService.update(id, updateAppDto, currentUser)`: Ném 404 nếu không tìm thấy ứng dụng; ném 403 `ForbiddenException` nếu `USER` thường cố cập nhật ứng dụng của người khác; cho phép `ADMIN` hoặc chủ sở hữu cập nhật thành công.
  - `ApplicationsController.update`: Bảo vệ bằng composite decorator `@Auth()`, hỗ trợ cả `@Patch(':id')` và `@Put(':id')`, tích hợp Swagger documentation và HTTP response codes (200, 400, 401, 403, 404).
  - Bổ sung 6 unit tests mới (4 tests cho `ApplicationsService`, 2 tests cho `ApplicationsController`), nâng tổng unit test suite lên **105/105 tests PASS** (14 test files). Toàn bộ 77/77 E2E tests PASS. Build NestJS PASS 100%.
- [x] **TODO 73 — Delete Application**  
  *Status:* `COMPLETED`  
  *Evidence:* Triển khai API xóa ứng dụng `DELETE /applications/:id`:
  - `ApplicationsService.delete(id, currentUser)`: Ném 404 nếu ứng dụng không tồn tại; ném 403 `ForbiddenException` nếu `USER` thường cố xóa ứng dụng của người khác; cho phép `ADMIN` hoặc chủ sở hữu xóa ứng dụng thành công khỏi database và trả về `{ message, application }`.
  - `ApplicationsController.delete`: Endpoint `DELETE /applications/:id` được bảo vệ bằng composite decorator `@Auth()`, tích hợp Swagger documentation và HTTP response codes (200, 401, 403, 404).
  - Bổ sung 6 unit tests mới (4 tests cho `ApplicationsService`, 2 tests cho `ApplicationsController`), nâng tổng unit test suite lên **111/111 tests PASS** (14 test files). Toàn bộ 77/77 E2E tests PASS. Build NestJS PASS 100%.
- [x] **TODO 74 — Generate AppID**  
  *Status:* `COMPLETED`  
  *Evidence:* Chuẩn hóa cơ chế sinh `AppID` bảo mật và chống xung đột:
  - Định dạng chuẩn: `app_` + 24 ký tự hex (tổng 28 ký tự) sinh từ CSPRNG `crypto.randomBytes(12)`.
  - Triển khai `generateUniqueAppId(maxRetries = 5)`: Tự động kiểm tra tính tồn tại của `appId` trong cơ sở dữ liệu qua Prisma `findUnique`. Nếu trùng lặp, tự động thử lại tối đa 5 lần; ném `InternalServerErrorException` nếu vượt quá giới hạn.
  - Tích hợp vào quy trình tạo ứng dụng `create()` để bảo đảm tính toàn vẹn và độc nhất của khóa định danh ứng dụng.
  - Bổ sung 3 unit tests mới trong `applications.service.spec.ts` kiểm thử format regex `/^app_[0-9a-f]{24}$/`, retry khi va chạm, và exception khi retry thất bại. Nâng tổng unit test suite lên **114/114 tests PASS** (14 test files). Toàn bộ 77/77 E2E tests PASS. Build NestJS PASS 100%.
- [x] **TODO 75 — Generate AppToken**  
  *Status:* `COMPLETED`  
  *Evidence:* Chuẩn hóa cơ chế sinh `AppToken` bảo mật CSPRNG:
  - Định dạng chuẩn: `apt_` + 64 ký tự hex (tổng 68 ký tự, 256 bits entropy) sinh từ Node.js CSPRNG `crypto.randomBytes(32)`.
  - Đảm bảo độ bảo mật mật mã học tuyệt đối, chống brute-force và va chạm ngẫu nhiên.
  - Bổ sung các unit tests chuyên sâu trong `applications.service.spec.ts` kiểm thử định dạng regex `/^apt_[0-9a-f]{64}$/`, độ dài 68 ký tự, tính duy nhất trong batch 100 token (zero collision) và độ phân tán đa dạng của ký tự hex. Nâng tổng unit test suite lên **116/116 tests PASS** (14 test files). Toàn bộ 77/77 E2E tests PASS. Build NestJS PASS 100%.
- [x] **TODO 76 — Regenerate AppToken**  
  *Status:* `COMPLETED`  
  *Evidence:* Triển khai API cấp lại AppToken `POST /applications/:id/regenerate-token`:
  - `ApplicationsService.regenerateAppToken(id, currentUser)`: Ném 404 `NotFoundException` nếu không tìm thấy ứng dụng; ném 403 `ForbiddenException` nếu `USER` thường cố cấp lại token cho ứng dụng của người khác; cho phép chủ sở hữu hoặc `ADMIN` cấp lại token mới sinh từ CSPRNG 256 bits, cập nhật vào PostgreSQL và trả về ứng dụng với token mới.
  - `ApplicationsController.regenerateToken`: Endpoint `POST /applications/:id/regenerate-token` được bảo vệ bằng composite decorator `@Auth()`, `@HttpCode(HttpStatus.OK)`, Swagger documentation và HTTP response codes (200, 401, 403, 404).
  - Bổ sung 6 unit tests mới (4 tests cho `ApplicationsService`, 2 tests cho `ApplicationsController`), nâng tổng unit test suite lên **122/122 tests PASS** (14 test files). Toàn bộ 77/77 E2E tests PASS. Build NestJS PASS 100%.
- [x] **TODO 77 — Test Application API**  
  *Status:* `COMPLETED` *(REPORTING MILESTONE CHO GIẢNG VIÊN — HOÀN THÀNH 100% PHASE 3.6 VÀ CORE PROJECT 1)*  
  *Evidence:* Xây dựng bộ kiểm thử End-to-End toàn diện `test/applications.e2e-spec.ts` (37 tests) chạy trực tiếp trên PostgreSQL (`auth_service_db`):
  - Kiểm thử Authentication Guard: Chặn 401 toàn bộ 7 endpoint khi thiếu hoặc giả mạo token.
  - Kiểm thử Create Application: User thường tự động sinh AppID chuẩn (`app_[0-9a-f]{24}` 96 bits) và AppToken chuẩn (`apt_[0-9a-f]{64}` 256 bits); Admin tạo và gán cho User khác; chặn giả mạo userId; bắt lỗi 400 validation và 404 khi userId không tồn tại.
  - Kiểm thử List & Data Isolation: User thường chỉ thấy ứng dụng của mình; Admin thấy toàn bộ ứng dụng hệ thống kèm quan hệ User.
  - Kiểm thử Detail Application: Chủ sở hữu và Admin nhận 200; User khác nhận 403; không tồn tại nhận 404.
  - Kiểm thử Update Application: Cả PATCH và PUT đều được hỗ trợ độc lập; bảo vệ quyền sở hữu (403 cho người lạ); validate enum AppStatus (400).
  - Kiểm thử Regenerate Token: Chủ sở hữu và Admin xoay vòng token thành công (200) nhận token mới khác token cũ; cập nhật trực tiếp vào DB; User khác bị chặn (403).
  - Kiểm thử Delete Application: Chủ sở hữu và Admin xóa thành công (200); xác nhận xóa vĩnh viễn khỏi PostgreSQL (404 khi truy vấn lại); User khác bị chặn (403).
  - Kiểm thử Cascade Delete: Khi User bị xóa, toàn bộ Application liên kết tự động bị xóa theo khóa ngoại PostgreSQL.
  - Nâng tổng E2E test suite lên **114/114 tests PASS** (5 test files) và unit test suite lên **124/124 tests PASS** (14 test files). Build NestJS PASS 100%.

### PHASE 4.1 — Service-to-Service Authentication Support (Project 1 Readiness)
- [x] **Service-to-Service Guard & Verification API**  
  *Status:* `COMPLETED`  
  *Evidence:* Xây dựng cơ chế tiếp nhận và xác thực yêu cầu từ các Microservice bên ngoài qua cặp khóa AppID/AppToken:
  - `AppAuthGuard` (`src/common/guards/app-auth.guard.ts`): Đọc headers `X-App-Id` và `X-App-Token`, truy vấn PostgreSQL kiểm tra tính hợp lệ và trạng thái `ACTIVE` của ứng dụng. Ném 401 khi thiếu/sai credentials, ném 403 khi ứng dụng bị `INACTIVE`. Gán thông tin `application` vào request object.
  - `@CurrentApp()` decorator (`src/common/decorators/current-app.decorator.ts`): Trích xuất thông tin application từ request.
  - `@AppAuth()` decorator (`src/common/decorators/app-auth.decorator.ts`): Composite decorator áp dụng `AppAuthGuard`, Swagger headers `X-App-Id`, `X-App-Token` và responses 401, 403.
  - Endpoint `GET /auth/verify-service` (`src/auth/auth.controller.ts`): Endpoint chuyên dụng cho phép các microservice con (Project 2) kiểm tra tính hợp lệ của cặp khóa định danh và kết nối tới Auth Service.
  - Bổ sung 14 unit tests mới (7 tests cho `AppAuthGuard`, 5 tests cho `@CurrentApp()`, 1 test cho `@AppAuth()`, 1 test cho `verifyService`). Nâng tổng unit test suite lên **138/138 tests PASS** (17 test files).
  - Bổ sung 6 E2E tests mới trong `test/applications.e2e-spec.ts`. Nâng tổng E2E test suite lên **120/120 tests PASS** (5 test files) trên PostgreSQL thật. Build NestJS PASS 100%.

### PHASE 4.2 — Developer & Admin Console WebApp (/dashboard/)
- [x] **Developer Console Frontend & Bilingual Support (EN / VI)**  
  *Status:* `COMPLETED`  
  *Evidence:* Xây dựng giao diện WebApp hoàn chỉnh cho Project 1 theo chuẩn Enterprise Developer/Admin Console (phong cách GitHub/Vercel/Cloudflare):
  - **Đường dẫn truy cập:** `http://localhost:3000/dashboard/` (được cấu hình Static Assets trong `src/main.ts` và redirect tại `GET /dashboard`).
  - **Giao diện & Trải nghiệm:** Dark Console theme chuyên nghiệp (`#0b0f19`, `#111827`, viền `#1e293b`), không gradient chói, không emoji trong heading.
  - **Song ngữ Tiếng Anh / Tiếng Việt (EN | VI):** Nút chuyển đổi ngôn ngữ tức thì trên navbar, lưu trạng thái vào `localStorage`.
  - **Trang Overview:** Metrics ứng dụng thực tế, sơ đồ kiến trúc liên thông trực quan (*Client Microservices -> Headers -> Auth Service*), bảng ứng dụng gần đây.
  - **Service Integration Guide:** Khối hướng dẫn kỹ thuật chuẩn enterprise trình bày 3 bước kết nối tổng quát cho bất kỳ client microservice nào (Cấu hình `.env`, đính kèm HTTP Headers `X-App-Id`/`X-App-Token`, và xác thực bắt tay `GET /auth/verify-service`).
  - **Admin Users:** Bảng phân quyền người dùng theo vai trò RBAC (`ADMIN` / `USER`).
  - **Màn Hình Đăng Nhập Độc Lập (Dedicated Login & Register Screen):** Chưa đăng nhập sẽ dừng tại màn hình Login/Register tập trung, có chức năng Quick Fill tài khoản Admin mẫu, chuyển ngữ EN/VI tức thì, sau khi xác thực mới chuyển vào Dashboard.
  - **Trạng thái kiểm thử:** Toàn bộ **258/258 unit và E2E tests** giữ vững trạng thái PASS 100% (138 unit tests, 120 e2e tests).
  - **Git Status:** Đã commit và push thành công lên GitHub repo `https://github.com/NhatLinh056/auth-service.git` (commit `a681796`).
  - **Kết luận:** **PROJECT 1 ĐÃ HOÀN THÀNH 100% TOÀN DIỆN.** Sẵn sàng bước sang Phase 5 (Triển khai Project 2).

### PHASE 5 — Triển Khai PROJECT 2 (Client Microservice) & Báo Cáo Nghiệm Thu Liên Thông
- [x] **TODO 85 — Initialize Project 2 (`demo-service`)**  
  *Status:* `COMPLETED`  
  *Evidence:* Khởi tạo thành công project NestJS độc lập tại `d:/STUDY/2026.1/prj3/demo-service` cấu hình cổng chạy **Port 3001** (tránh xung đột với Port 3000 của Auth Service). TypeScript build biên dịch thành công 0 lỗi.
- [x] **TODO 86 — Client Configuration & `.env`**  
  *Status:* `COMPLETED`  
  *Evidence:* Cấu hình `app.config.ts` và file `.env.example` chứa: `PORT=3001`, `AUTH_SERVICE_URL=http://localhost:3000`, `APP_ID`, `APP_TOKEN`. Đảm bảo triết lý microservice: Project 2 hoàn toàn **KHÔNG** chứa database User hay bảng xác thực riêng.
- [x] **TODO 87 — Implement `AuthClientService` & `UserAuthGuard`**  
  *Status:* `COMPLETED`  
  *Evidence:* 
  - `AuthClientService` (`src/auth-client/auth-client.service.ts`): Tự động đọc credentials từ config và tiêm cặp header `X-App-Id` & `X-App-Token` vào các HTTP call gọi sang Auth Service (`/auth/verify-service` và `/auth/profile`). Xử lý mã lỗi 401, 403, 502 Bad Gateway.
  - `UserAuthGuard` (`src/auth-client/guards/user-auth.guard.ts`): Bắt token Bearer từ client, chuyển tiếp sang Auth Service để ủy quyền xác thực và gán `request.user` đã được thẩm định.
  - `@CurrentUser()` (`src/auth-client/decorators/current-user.decorator.ts`): Trích xuất thông tin người dùng được ủy quyền.
- [x] **TODO 88 — Implement Demo Business Endpoints**  
  *Status:* `COMPLETED`  
  *Evidence:* 
  - *Handshake Endpoint (`GET /status`):* Bắt tay với Auth Service qua `GET /auth/verify-service`, trả về trạng thái liên thông `CONNECTED`, trạng thái ứng dụng `ACTIVE` và metadata ứng dụng.
  - *Orders Module (`src/orders/`):* Nghiệp vụ đơn hàng mô phỏng (`GET /orders`, `POST /orders`, `GET /orders/:id`) được bảo vệ bằng `UserAuthGuard` ủy quyền xác thực sang Auth Service.
  - Bổ sung 17 unit tests trong `demo-service` (`auth-client.service.spec.ts`, `user-auth.guard.spec.ts`, `orders.service.spec.ts`, `orders.controller.spec.ts`) đạt **17/17 tests PASS (100%)**.
- [ ] **TODO 89 — End-to-End Interoperability Test Suite**  
  *Status:* `IN PROGRESS`  
  *Mục tiêu:* Kiểm chứng bắt tay trực tiếp giữa 2 service đang chạy và viết kịch bản test liên thông thực tế.
- [ ] **TODO 90 — Thesis Defense Demonstration Script & Final Package**  
  *Status:* `NOT STARTED`  
  *Mục tiêu:* Hoàn thiện tài liệu thuyết minh, script chạy demo trực tiếp cho giảng viên và hướng dẫn đóng gói toàn bộ đồ án Project 3.

---

## 11. CURRENT MILESTONE

**CURRENT MILESTONE ĐÃ HOÀN THÀNH VÀ NGHIỆM THU 100%:**
> **Project 1 Core Web API + Service-to-Service Handshake + Developer & Admin Console WebApp**

**Ý nghĩa:**
- Project 1 (Auth Service) đã hoàn thiện trọn vẹn toàn bộ các tính năng cốt lõi theo đề bài:
  - Đăng ký, đăng nhập JWT, đăng xuất, User CRUD, Role RBAC (`ADMIN`, `USER`), ma trận phân quyền `@Auth()`, `@Roles()`, `@AuthOwnerOrAdmin()`.
  - Quản lý Application: sinh `AppID` (chống va chạm), `AppToken` (CSPRNG 256 bits), cấp lại token `regenerate-token`.
  - Cổng giao tiếp Service-to-Service: `AppAuthGuard`, `@AppAuth()`, `@CurrentApp()`, endpoint `GET /auth/verify-service`.
  - Giao diện WebApp Developer & Admin Console (`/dashboard/`) song ngữ Anh/Việt.
- Test metrics toàn diện: **138/138 Unit Tests PASS** (17 test files), **120/120 E2E Tests PASS** (5 test files) = **258/258 Tests PASS**.

---

## 12. NEXT TASK (CÔNG VIỆC TIẾP THEO)

> **NEXT TASK: BẮT ĐẦU TODO 85 — KHỞI TẠO PROJECT 2 (`demo-service`) TRÊN PORT 3001**

### Lộ trình chi tiết từng bước thực hiện:
```text
BƯỚC 1: Khởi tạo NestJS service tại d:/STUDY/2026.1/prj3/demo-service (Port 3001)
   ↓
BƯỚC 2: Cấu hình .env (AUTH_SERVICE_URL=http://localhost:3000, APP_ID, APP_TOKEN)
   ↓
BƯỚC 3: Xây dựng AppAuthMiddleware / HttpService tự động gắn X-App-Id & X-App-Token
   ↓
BƯỚC 4: Xây dựng endpoint nghiệp vụ (GET /status & GET /orders có bảo vệ)
   ↓
BƯỚC 5: Chạy kiểm thử liên thông thực tế giữa Project 2 và Project 1
```

---

## 13. IMPORTANT TECHNICAL DECISIONS (QUYẾT ĐỊNH KỸ THUẬT ĐÃ THỐNG NHẤT)

1. **Cấu trúc Repository:**
   - `auth-service` (Project 1) và service demo (Project 2) được lưu trữ cùng workspace Project 3.
   - `oauth-service-demo` và `firebase-auth-demo` giữ nguyên là các repository học tập độc lập.
2. **Database & ORM:**
   - Sử dụng **PostgreSQL** kết hợp với **Prisma 7**.
   - Lưu ý Prisma 7 sử dụng `prisma7.config.ts` để đọc biến môi trường qua `dotenv` và xuất client ra thư mục nội bộ (mặc định cấu hình `src/generated/prisma`).
3. **Mật khẩu người dùng:**
   - Tuyệt đối **KHÔNG** lưu plaintext password. Bắt buộc dùng `passwordHash` (thư viện `bcrypt` hoặc `argon2`).
4. **Phân quyền người dùng (User Role):**
   - Giữ thiết kế tinh gọn: giai đoạn đầu chỉ hỗ trợ 2 vai trò: `ADMIN` và `USER`.
   - Không áp dụng hệ thống phân quyền phức tạp (như fine-grained dynamic permissions) khi chưa được yêu cầu.
5. **AppID & AppToken:**
   - Phục vụ xác thực giữa các dịch vụ / ứng dụng (Service-to-Service Authentication), tách bạch hoàn toàn với tài khoản người dùng (`User`).
6. **OAuth Provider Management (TODO 78–84):**
   - Không tự động triển khai. Chỉ thực hiện khi có yêu cầu cụ thể từ giảng viên sau mốc TODO 77.

---

## 14. SCOPE CONTROL (GIỚI HẠN PHẠM VI — CỰC KỲ QUAN TRỌNG)

AI hỗ trợ **TUYỆT ĐỐI KHÔNG ĐƯỢC TỰ Ý THÊM** các công nghệ và mô hình sau vào project:
- ❌ **Không thêm Redis** (trừ khi có yêu cầu cache rõ ràng từ giảng viên).
- ❌ **Không thêm Docker / Kubernetes / Helm**.
- ❌ **Không thêm Message Broker:** Kafka, RabbitMQ, BullMQ, MQTT.
- ❌ **Không thêm API Gateway:** Kong, Traefik, Ocelot.
- ❌ **Không tự dựng OAuth2 Server đầy đủ** (Authorization Server phức tạp) vượt ngoài scope.
- ❌ **Không triển khai Microservices Event Bus / Saga Pattern / CQRS**.
- ❌ **Không thêm OpenTelemetry / Jaeger / Distributed Tracing**.
- ❌ **Không cài các thư viện tiện ích dư thừa** gây phình to codebase.

> **Tiêu chí tối thượng:** Tập trung hoàn thành đúng và đủ yêu cầu của giảng viên, giữ code trong sáng, dễ hiểu, phù hợp với tiến độ tiếp thu của sinh viên.

---

## 15. SECURITY NOTES

- **Password Hashing:** `IMPLEMENTED` (Sử dụng `bcrypt` với 10 salt rounds tại `AuthService.register()`).
- **Environment Variables (.env):** `IMPLEMENTED` (.env đã nằm trong `.gitignore`, có file `.env.example` làm mẫu).
- **Secret Exposure:** `CAUTION` (Không bao giờ ghi mật khẩu thật, JWT secrets hay database credentials nhạy cảm vào git hoặc tài liệu bàn giao).
- **Sensitive Data in Responses:** `IMPLEMENTED` (Khi trả về kết quả register, `passwordHash` đã được bóc tách và loại bỏ an toàn).
- **Validation:** `IMPLEMENTED` (Đã cài đặt `ValidationPipe` toàn cục cùng `class-validator` và `class-transformer` cho DTO).
- **CORS:** `NEEDS IMPROVEMENT` (Cần cấu hình `app.enableCors()` khi kết nối với client/microservice khác).

---

## 16. KNOWN ISSUES & GOTCHAS

1. **Prisma 7 Configuration:**
   - *Issue:* Prisma 7 có cơ chế cấu hình mới (`prisma7.config.ts`), không tự nạp `.env` theo cách cũ của Prisma 5 nếu thiếu `import "dotenv/config"`.
   - *Status:* `RESOLVED` (Đã thêm `import "dotenv/config"` trong `prisma7.config.ts`).
2. **TypeScript Module Resolution (NodeNext ESM):**
   - *Issue:* Project sử dụng `"type": "module"` và `"moduleResolution": "nodenext"`, mọi import local file đều cần có đuôi `.js` (ví dụ: `import { AppModule } from './app.module.js'`).
   - *Status:* `NOTED` (Cần tuân thủ khi tạo bất kỳ service/module/controller mới).
3. **Chưa có Prisma Client Generation:**
   - *Issue:* Vì chưa có model nào trong `schema.prisma`, lệnh `prisma generate` chưa sinh ra các types thực tế cho User hay Application.
   - *Status:* `RESOLVED` (Đã sinh đầy đủ types sau khi tạo model `User` ở TODO 46).

---

## 17. TESTING STATUS

| Hạng Mục Kiểm Thử | Trạng Thái | Ghi Chú |
|---|---|---|
| NestJS khởi động (`npm run start`) | **PASS** | Chạy trơn tru trên port 3000 |
| Swagger UI (`/api`) | **PASS** | Giao diện hiển thị đúng tài liệu OpenAPI |
| Endpoint `GET /` | **PASS** | Phản hồi string |
| Endpoint `GET /health` | **PASS** | Phản hồi JSON trạng thái |
| Prisma Schema Validate (`npx prisma validate`) | **PASS** | Cấu hình datasource PostgreSQL hợp lệ |
| Kết nối runtime NestJS -> PostgreSQL | **PASS** | `PrismaService` kết nối thành công khi app bootstrap |
| User CRUD (UsersService) | **PASS** | Kiểm chứng CRUD thành công trên PostgreSQL & 7 unit tests pass |
| Endpoint `POST /auth/register` | **PASS** | Test thành công 201 Created, 409 Duplicate, 400 Bad Request & 5 unit tests pass |
| Endpoint `POST /auth/login` | **PASS** | Test thành công 200 OK trả về JWT Bearer token, 401 Unauthorized khi sai password & 6 unit tests pass |
| Application & AppToken APIs | **PASS** | Hoàn thành 100% (43 E2E tests, 61 unit tests pass trên PostgreSQL) |
| Service-to-Service Verification (`/auth/verify-service`) | **PASS** | `AppAuthGuard` xác thực X-App-Id & X-App-Token (6 E2E tests, 14 unit tests pass) |

---

## 18. GITHUB STATUS

- **Auth Service Repo:** `https://github.com/NhatLinh056/auth-service.git`
- **Current Branch:** `main` (Up to date with `origin/main`)
- **Recent Commits:**
  - `e8a6e3b`: `feat: add get all users endpoint with jwt protection`
  - `0057315`: `feat: implement jwt guard and user profile endpoints`
  - `fd229be`: `feat: implement logout endpoint for stateless jwt`
  - `b2e4745`: `feat: implement user login with jwt access token`
  - `4d8b04a`: `feat: implement user registration with bcrypt password hashing and validation`
  - `7c056f9`: `feat: implement UsersService with database CRUD operations and unit tests`
  - `c2c01a7`: `feat: add initial migration for users table and Role enum`
- **File đang modified/untracked trên working directory:** Clean (Up to date with origin/main)
- **Files tuyệt đối không commit:** `.env`, `.env.local`, `.tsbuildinfo`, `dist/`, `node_modules/`, `HANDOFF.md`.

---

## 19. REPORTING MILESTONE (MỐC BÁO CÁO GIẢNG VIÊN)

Mốc báo cáo trọng tâm số 1 dành cho giảng viên là:
> **TODO 77 — Test Application API (Hoàn thiện toàn bộ Core của Project 1)**

Tại mốc này, Project 1 phải chứng minh đầy đủ:
1. Web API chạy ổn định trên NestJS.
2. Kết nối cơ sở dữ liệu PostgreSQL qua Prisma ORM.
3. Đầy đủ các tính năng: Register, Login, Logout, quản lý User, phân quyền `ADMIN` / `USER`.
4. Cơ chế quản lý Application: sinh `AppID`, `AppToken`, cấp lại `AppToken`.
5. Đầy đủ Swagger UI và kiểm thử API thành công.

Sau khi nghiệm thu TODO 77, tiến hành triển khai **Project 2 (Demo Service)** với Middleware đọc `APP_ID`/`APP_TOKEN` để gọi sang Project 1.

---

## 20. AI WORKING RULES (HƯỚNG DẪN DÀNH CHO AI TIẾP QUẢN)

Bất kỳ AI nào làm việc trên repository này đều phải tuân thủ nghiêm ngặt 15 nguyên tắc:

1. **Đọc HANDOFF.md trước tiên** để nắm ngữ cảnh và quyết định kỹ thuật.
2. **Kiểm tra file mã nguồn thực tế** trước khi đưa ra bất kỳ đề xuất sửa đổi nào.
3. **Không bao giờ giả định code** chỉ dựa vào trí nhớ nếu có thể đọc trực tiếp bằng công cụ xem file.
4. **Không ghi đè (overwrite) file** mà không giải thích rõ nội dung và lý do thay đổi.
5. **Ghi rõ hành động:** `CREATE`, `MODIFY`, `REPLACE`, `DELETE`.
6. Nếu nội dung hiện tại của file chưa rõ, **phải đọc file đó trước** khi sinh code thay thế.
7. **Làm việc tuần tự từng TODO một**, không gộp nhiều TODO phức tạp làm một lúc.
8. **Giải thích ngắn gọn trước khi code**, giúp người học hiểu "tại sao lại làm như vậy".
9. **Chạy kiểm thử (test/run) sau khi viết code** để đảm bảo không gãy ứng dụng.
10. **Không nhảy cóc roadmap.**
11. **Không tự ý thêm công nghệ hay thư viện không cần thiết.**
12. **Bảo toàn kiến trúc hiện tại**, tôn trọng mô hình ESM nodenext và Prisma 7 đã dựng.
13. **Hỏi lại khi yêu cầu mơ hồ** thay vì tự ý quyết định kiến trúc lớn.
14. **Không bao giờ khẳng định một tính năng đã hoàn thành khi chưa chạy verify.**
15. **Cập nhật HANDOFF.md và push lên GitHub** ngay khi hoàn thành mỗi TODO (loại trừ các file nhạy cảm như `.env`).

---

## 21. CURRENT USER LEARNING LEVEL & TEACHING STYLE

Người học đang trong quá trình rèn luyện kỹ năng với stack công nghệ:
- Java, TypeScript, NestJS.
- REST API, Swagger.
- PostgreSQL, Prisma ORM.
- Authentication (JWT, Session), Authorization (RBAC), Microservices communication.

### Phong cách hướng dẫn tối ưu:
```text
EXPLAIN (Giải thích bản chất ngắn gọn, dễ hiểu)
   ↓
IMPLEMENT (Viết code sạch, đúng vị trí)
   ↓
RUN (Khởi chạy ứng dụng)
   ↓
TEST (Kiểm chứng trên Swagger/curl/Postman)
   ↓
EXPLAIN RESULT (Phân tích kết quả đạt được)
```
*Tránh xuất một khối lượng code khổng lồ thiếu giải thích.*

---

## 22. FINAL HANDOFF SUMMARY

```yaml
PROJECT: Project 3 — Authentication Service & Microservice Interoperability
PURPOSE: Xây dựng hệ thống Web API quản lý tài khoản, phân quyền (Role) và cấp phát AppID/AppToken cho các microservice liên thông.
CURRENT STATUS: Hoàn thành 100% Phase 3.1 - Phase 3.6, Phase 4.1 (Service-to-Service Readiness) và hoàn thiện Developer Console Frontend UI (/dashboard/). Project 1 đã sẵn sàng hoàn toàn để liên thông với Project 2.
CURRENT TODO: Phase 4.1 & Frontend Developer Console (COMPLETED)
NEXT TODO: Triển khai PROJECT 2 (Demo Service / Client Microservice)
PROJECT 1 (Auth Service): Core Auth, Users CRUD, Roles RBAC, Ma trận Authorization @Auth()/@AuthOwnerOrAdmin(), Application CRUD, Token Rotation, AppAuthGuard (Service-to-Service), và Developer Console WebApp (/dashboard/) hoàn tất 100% với 138 unit tests và 120 E2E tests pass (Tổng cộng 258/258 tests pass).
PROJECT 2 (Demo Service): NOT IMPLEMENTED (chưa khởi tạo thư mục/mã nguồn).
DATABASE: PostgreSQL (auth_service_db trên localhost:5432), Prisma 7 configured, 2 models (User, Application) defined, 2 migrations applied.
AUTHENTICATION: IMPLEMENTED (Register, Login JWT, Logout, JwtStrategy, JwtAuthGuard hoàn thành 100%).
AUTHORIZATION: IMPLEMENTED (RolesGuard, OwnerOrAdminGuard, AppAuthGuard, @Roles, @CurrentUser, @CurrentApp, @Public, @Auth, @AppAuth, @AuthOwnerOrAdmin hoàn thành 100%).
APPLICATION: IMPLEMENTED (Đã hoàn thiện trọn vẹn CRUD Application, Chuẩn hóa sinh AppID/AppToken, Regenerate Token, AppAuthGuard & Bộ 43 E2E tests kiểm thử vòng đời ứng dụng).
APPID/APPTOKEN: IMPLEMENTED (Chuẩn hóa AppID app_[0-9a-f]{24} chống va chạm và AppToken apt_[0-9a-f]{64} 256 bits CSPRNG an toàn mật mã học, đã có AppAuthGuard xác thực liên thông).
FRONTEND UI: IMPLEMENTED (Developer & Admin Console tại /dashboard/ với Dark Console Theme, Hỗ trợ đa ngôn ngữ EN/VI với nút chuyển đổi tức thì, Overview metrics, Service Integration flow diagram, Applications Data Table, Token Mask/Reveal/Regenerate modal, Microservice Demo simulator kết nối trực tiếp GET /auth/verify-service, Users RBAC management).
KNOWN ISSUES: Prisma 7 yêu cầu import dotenv/config trong prisma7.config.ts; TypeScript ESM yêu cầu đuôi .js trong import statement.
NEXT MILESTONE: Khởi tạo Project 2 (Demo Service) với Middleware đọc APP_ID & APP_TOKEN từ .env.
REPORTING MILESTONE: TODO 77, Phase 4.1 & WebApp Developer Console (ĐÃ HOÀN TẤT VÀ SẴN SÀNG NGHIỆM THU VỚI GIẢNG VIÊN).
```

