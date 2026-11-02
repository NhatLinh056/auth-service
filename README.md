# Hệ thống xác thực Microservices

Hai dịch vụ NestJS dùng chung hệ thống định danh:

| Dịch vụ | Chức năng | Địa chỉ |
|---|---|---|
| [Auth Service](auth-service/README.md) | Quản lý tài khoản, ứng dụng, OAuth; Developer Console | http://localhost:3000 |
| [Demo Service](demo-service/README.md) | Đăng nhập OAuth và quản lý đơn hàng mẫu | http://localhost:3001 |

## Chức năng chính

- Chủ ứng dụng tạo và quản lý ứng dụng trong Developer Console, nhận AppID/AppToken, đăng ký URL quay về và bật Google/Facebook.
- Auth Service xác thực ứng dụng, xử lý đăng nhập và xác định quyền USER/ADMIN riêng cho từng ứng dụng.
- Customer Portal dùng Auth Service để đăng nhập; người dùng tạo, xem đơn hàng theo quyền của mình.

## Chạy trên máy đã cấu hình

Mở hai terminal tại thư mục dự án:

```powershell
# Chuyển vào Auth Service và chạy API cùng Developer Console ở chế độ phát triển.
cd auth-service
npm run start:dev
```

```powershell
# Chuyển vào Demo Service và chạy Customer Portal ở chế độ phát triển.
cd demo-service
npm run start:dev
```

Cần PostgreSQL đang chạy và file `.env` của từng dịch vụ đã cấu hình. Không đưa `.env` hoặc thông tin bí mật vào Git.

## Cài đặt lần đầu

1. Cài Node.js và PostgreSQL, tạo database.
2. Làm theo [hướng dẫn Auth Service](auth-service/README.md) để cài dependencies, cấu hình và chạy migration.
3. Tạo ứng dụng trong Developer Console; chép AppID/AppToken vào `.env` của Demo.
4. Cấu hình Google/Facebook và thêm `http://localhost:3001/` vào danh sách URL quay về của ứng dụng.
5. Chạy hai dịch vụ bằng các lệnh trên.

Khi deploy lên domain thật, xem cấu hình `AUTH_PUBLIC_URL` trong [Auth Service](auth-service/README.md) và `PUBLIC_URL` trong [Demo Service](demo-service/README.md). Callback tại Google/Meta là URL của Auth Service; URL quay về sau đăng nhập là domain của ứng dụng khách và phải nằm trong allowlist của app.

## Test nhanh

- Developer Console: http://localhost:3000
- Customer Portal: http://localhost:3001
- Handshake: http://localhost:3001/status
- API không có token phải trả 401: http://localhost:3001/orders
- Nếu dùng dữ liệu demo, xem thông tin tài khoản mẫu trong script seed của Auth Service. Chỉ dùng dữ liệu này khi chạy local.

Owner và OAuth user trong `adminEmails` có quyền ADMIN của ứng dụng. Platform Admin không tự có quyền ADMIN ở Demo; USER chỉ xem đơn của mình.

Giới hạn bản demo: đơn hàng và state/mã OAuth lưu trong bộ nhớ; khởi động lại làm mất dữ liệu tạm. JWT phía trình duyệt lưu trong localStorage.
