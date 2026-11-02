# Auth Service

Dịch vụ định danh trung tâm: NestJS, Prisma, PostgreSQL và Developer Console React.

- Console: http://localhost:3000
- Swagger: http://localhost:3000/api
- Health: http://localhost:3000/health

## Chức năng chính

- Tài khoản nền tảng đăng nhập Developer Console để tạo và quản lý ứng dụng khách.
- Mỗi ứng dụng có AppID/AppToken, danh sách URL quay về, cấu hình Google/Facebook và danh sách email quản trị (`adminEmails`).
- Auth Service xử lý đăng nhập OAuth, cấp mã đăng nhập một lần và xác định quyền USER/ADMIN theo ứng dụng.
- Demo Service gửi AppID/AppToken để xác thực ứng dụng và kiểm tra JWT, quyền người dùng qua API của Auth Service.

## Cài đặt lần đầu

Chạy trong `auth-service`:

```powershell
# Cài các gói phụ thuộc.
npm install
# Tạo file cấu hình từ mẫu nếu chưa có .env.
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Điền `DATABASE_URL`, `JWT_SECRET` ngẫu nhiên và thông tin OAuth nếu sử dụng. Sinh giá trị ngẫu nhiên bằng:

```powershell
# Tạo chuỗi hex ngẫu nhiên để dùng làm JWT_SECRET.
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

```powershell
# Tạo Prisma Client từ schema.
npx prisma generate --config prisma7.config.ts
# Áp dụng các migration vào database đã cấu hình.
npx prisma migrate deploy --config prisma7.config.ts
# Chạy API và Developer Console ở chế độ phát triển.
npm run start:dev
```

Không cần chạy lại migration khi chỉ khởi động dịch vụ đã cài đặt.

## Dữ liệu demo (tùy chọn, chỉ local)

Trong `.env`, đặt `ENABLE_DEMO_SEED=true` và `SEED_APP_TOKEN=apt_<64 ký tự hex ngẫu nhiên>`, sau đó chạy `npm run seed`. Lệnh tạo tài khoản và ứng dụng mẫu; xem thông tin mẫu trong script seed. Đặt lại `ENABLE_DEMO_SEED=false` sau khi seed. Không seed lại DB có dữ liệu cần giữ cấu hình, vì seed cập nhật tài khoản và ứng dụng mẫu.

## Cấu hình OAuth

Khi triển khai bằng domain thật, đặt `AUTH_PUBLIC_URL=https://auth.example.com` trong `.env` của Auth Service và khởi động lại. Console sẽ hiển thị callback tương ứng; đăng ký URL đó tại Google/Meta. URL này là đường về **Auth Service**, dùng chung cho các ứng dụng trên cùng domain Auth; người dùng cuối không tự nhập URL này.

Ví dụ Google: `https://auth.example.com/auth/oauth/google/callback`; Facebook: `https://auth.example.com/auth/oauth/facebook/callback`. `AUTH_PUBLIC_URL` phải là origin HTTPS công khai, không có đường dẫn con, query hay fragment. HTTP chỉ dùng cho localhost khi phát triển.

Trong chi tiết ứng dụng trên Console:

1. Điền Client ID/Secret và bật Google hoặc Facebook.
2. Đăng ký callback hiển thị trong Console tại nhà cung cấp. Khi chạy local, dùng `http://localhost:3000/auth/oauth/google/callback` hoặc `http://localhost:3000/auth/oauth/facebook/callback`.
3. Thêm URL Portal chính xác, chẳng hạn `https://shop.example.com/`, vào **URL quay về ứng dụng sau đăng nhập** trong chi tiết app. Có thể đăng ký thêm URL staging hoặc localhost cho các môi trường khác.
4. Điền `adminEmails` nếu muốn ủy quyền quản trị cho tài khoản OAuth.

Redirect phải khớp chính xác. Luồng đăng nhập dùng state gắn với trình duyệt, PKCE và mã dùng một lần; không truyền JWT qua URL.

## API chính

- `/auth/login`: đăng nhập tài khoản nền tảng.
- `/auth/verify-service`: xác thực AppID/AppToken.
- `/users/verify-app-user`: xác thực JWT cùng credential dịch vụ, kiểm tra tenant và trả `appRole` mới nhất.
- `/applications`: quản lý ứng dụng bằng tài khoản nền tảng.

## Kiểm thử dành cho phát triển

```powershell
# Chạy kiểm thử đơn vị.
npm test
# Chạy kiểm thử tích hợp trên database tạm.
npm run test:security
```

`test:security` cần quyền tạo database và cổng 3300/3301 trống.

Frontend đã được build vào `public`. Sau khi sửa React, chạy trong `frontend`: `npm run build -- --outDir ../public`.
