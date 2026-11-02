# Demo Service

Customer Portal minh họa đăng nhập Google/Facebook và quản lý đơn hàng. Dịch vụ không lưu mật khẩu hoặc bảng người dùng riêng.

- Portal: http://localhost:3001
- Kiểm tra kết nối Auth: http://localhost:3001/status

## Chức năng chính

- Hiển thị các cách đăng nhập Google/Facebook đã được bật cho ứng dụng; chuyển người dùng đến Auth Service để đăng nhập.
- Đổi mã đăng nhập một lần lấy phiên người dùng và kiểm tra JWT qua Auth Service khi truy cập API đơn hàng.
- Tạo và xem đơn hàng mẫu: USER chỉ xem đơn của mình; ADMIN xem toàn bộ đơn của ứng dụng.
- Hiển thị trạng thái kết nối và thông tin ứng dụng tại `/status`.

## Cài đặt và chạy

Chạy trong `demo-service`:

```powershell
# Cài các gói phụ thuộc.
npm install
# Tạo file cấu hình từ mẫu nếu chưa có .env.
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Cấu hình:

```env
PORT=3001
AUTH_SERVICE_URL=http://localhost:3000
PUBLIC_URL=http://localhost:3001
APP_ID=<AppID từ Developer Console>
APP_TOKEN=<AppToken từ Developer Console>
```

Khởi động Auth Service trước, rồi chạy:

```powershell
# Chạy Customer Portal ở chế độ phát triển.
npm run start:dev
```

Để đăng nhập OAuth, bật provider trong Console, điền credential hợp lệ và khai báo `http://localhost:3001/` trong danh sách URL quay về của ứng dụng.

Khi chạy trên domain thật, dùng `AUTH_SERVICE_URL=https://auth.example.com` và `PUBLIC_URL=https://shop.example.com`; thêm **chính xác** `https://shop.example.com/` vào danh sách URL quay về của ứng dụng trong Developer Console. Cấu hình `AUTH_PUBLIC_URL=https://auth.example.com` bên Auth Service và đăng ký callback Auth tại Google/Meta. Cả hai domain cần HTTPS. Sau khi đổi `.env`, khởi động lại dịch vụ.

## Kiểm thử thủ công

1. Mở `/status`: cần `handshakeStatus=SUCCESS`, `handshake.applicationStatus=ACTIVE`.
2. Mở Portal và đăng nhập Google/Facebook.
3. USER chỉ xem đơn của mình; owner hoặc OAuth user thuộc `adminEmails` nhận ADMIN và xem toàn bộ đơn.
4. Bỏ token khi gọi `/orders`: phải nhận 401. Platform Admin không tự được quyền ADMIN của ứng dụng.

Mỗi request nghiệp vụ được Auth Service xác thực lại bằng JWT và AppID/AppToken. Không dùng cache handshake để cấp quyền. Đơn hàng lưu trong bộ nhớ và mất khi restart.

## Kiểm thử dành cho phát triển

```powershell
# Chạy unit test của Demo Service.
npm test
```

Kiểm thử tích hợp hai dịch vụ chạy bằng `npm run test:security` trong `auth-service`.
