# Demo Service

Ứng dụng phụ tinh gọn dùng để chứng minh khả năng tích hợp đăng nhập OAuth (Google & Facebook) với Auth Service (Project 1). Dịch vụ không lưu mật khẩu hoặc bảng người dùng riêng.

- Portal: http://localhost:3001
- Kiểm tra kết nối Auth: http://localhost:3001/status

## Chức năng chính

- **Giao diện tinh gọn (Đúng 4 chức năng người dùng + 1 API bảo vệ):**
  - Chưa đăng nhập: Hiển thị đúng 2 nút "Đăng nhập bằng Google" và "Đăng nhập bằng Facebook", cùng trạng thái kết nối với Auth Service.
  - Đăng nhập thành công: Hiển thị thông tin tài khoản cơ bản (họ tên, email, User ID, provider, thông tin tenant tùy chọn nếu có) và nút đăng xuất. Mọi tài khoản (có hoặc chưa có tenant) đều đăng nhập và xem được màn hình này.
  - Kiểm chứng API bảo vệ: Nút "Thử Gọi API Bảo Vệ" gọi endpoint `GET /auth/protected` kèm Bearer token (qua `UserAuthGuard`), chứng minh token hợp lệ cho mọi User Demo (có hoặc chưa có tenant) và phản hồi ngữ cảnh xác thực tối thiểu (`authenticated`, `service`, `appId`, `user` gồm `id`, `email`, `tenantId`) mà không chứa cờ vai trò hệ thống/app, cờ quyền sở hữu hay nghiệp vụ đơn hàng.
  - Không hiển thị nội dung quản lý doanh nghiệp (tenant), vai trò tenant/app, cờ quyền sở hữu, bảng đơn hàng hay JWT thô trên giao diện Demo.
- **Tương thích API backend:** Các API `/orders` và proxy `/tenant/*` vẫn được bảo lưu ở backend Demo để giữ tương thích với các bài kiểm thử Task 7 và client bên ngoài; dữ liệu đơn hàng vẫn được cô lập chặt chẽ theo tenant ở tầng backend.
- **Bảo mật luồng OAuth:** PKCE S256, browser-bound state, mã đổi token một lần, AppToken chỉ lưu ở backend, không đưa JWT vào URL.

## Luồng tích hợp

Luồng đăng nhập:
1. Trình duyệt người dùng bấm nút Google/Facebook tại Demo (`http://localhost:3001`).
2. Demo tạo PKCE verifier/challenge (S256) và `state` ngẫu nhiên lưu tại `sessionStorage`.
3. Backend Demo nhận yêu cầu `POST /auth/start`, kiểm tra provider khả dụng/đang bật, dùng AppID/AppToken gọi Auth Service sinh URL chuyển hướng.
4. Trình duyệt chuyển tiếp trực tiếp sang Auth Service (`/auth/oauth/:provider`) rồi sang Google/Facebook (không qua trang chọn trung gian).
5. Sau khi đăng nhập nhà cung cấp, Auth Service xác thực và chuyển hướng trở lại Demo kèm mã code dùng một lần và `state`.
6. Demo kiểm tra `state` khớp trình duyệt, gọi `POST /auth/exchange` để backend Demo dùng code + verifier đổi lấy JWT phiên ứng dụng.
7. Demo lưu JWT trong bộ nhớ trình duyệt, hiển thị thông tin tài khoản và cho phép đăng xuất an toàn.

## Cài đặt và cấu hình

```powershell
# Cài các gói phụ thuộc
npm install
# Tạo file cấu hình từ mẫu nếu chưa có .env
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Cấu hình mẫu (`.env`):

```env
PORT=3001
AUTH_SERVICE_URL=http://localhost:3000
PUBLIC_URL=http://localhost:3001
APP_ID=<AppID từ Developer Console>
APP_TOKEN=<AppToken từ Developer Console>
```

Khởi động Auth Service trước, rồi chạy:

```powershell
# Chạy Customer Portal ở chế độ phát triển
npm run start:dev
```

Để đăng nhập OAuth, bật provider trong Developer Console (`http://localhost:3000`), cấu hình Client ID/Secret và khai báo `http://localhost:3001/` trong allowlist redirect URL.

## Kiểm thử và giới hạn kiểm chứng

- **Kiểm thử tự động:**
  - Demo unit tests: `powershell -Command "cd demo-service; npx vitest run"` (84/84 PASS).
  - Typecheck: `npx --prefix demo-service tsc -p demo-service/tsconfig.json --noEmit` (0 errors).
  - Backend build: `npm --prefix demo-service run build` (PASS).
  - Syntax check: `node --check demo-service/public/app.js` (PASS).
- **Giới hạn chưa kiểm chứng:** Luồng OAuth thực tế cần Client ID và Secret hợp lệ từ Google Cloud Console và Meta Developer Console trong môi trường mạng thực tế.
