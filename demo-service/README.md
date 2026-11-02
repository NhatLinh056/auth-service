# Demo Service

Customer Portal minh họa tích hợp đăng nhập tập trung và quản lý đơn hàng. Dịch vụ không lưu mật khẩu hoặc bảng người dùng riêng.

- Portal: http://localhost:3001
- Kiểm tra kết nối Auth: http://localhost:3001/status

## Chức năng chính

- Chuyển sang màn hình Auth Service để đăng nhập bằng email/mật khẩu hoặc Google/Facebook đã bật cho ứng dụng.
- Đổi mã đăng nhập một lần lấy phiên người dùng và kiểm tra JWT qua Auth Service khi truy cập API đơn hàng.
- Tạo và xem đơn hàng mẫu: USER chỉ xem đơn của mình; ADMIN xem toàn bộ đơn của ứng dụng.
- Hiển thị trạng thái kết nối và thông tin ứng dụng tại `/status`.

## Cài đặt và chạy

Phần **Doanh nghiệp** trong Portal cho phép tạo và xem tenant. Chủ doanh nghiệp có thể sửa thông tin, chuyển quyền cho thành viên, xem nhật ký và xóa tenant khi không còn thành viên khác. Super Admin có thêm danh sách doanh nghiệp và quyền chuyển chủ với lý do được ghi nhận. Luồng xin gia nhập/phê duyệt và giới hạn đơn hàng theo tenant sẽ được bổ sung riêng.

Liên kết Google/Facebook, xác nhận tài khoản trùng email và thiết lập mật khẩu được thực hiện tại **Auth Service**. Demo không nhận mật khẩu hoặc phiên nền tảng để liên kết. Các ứng dụng dùng chung `userId`, còn ID thành viên và quyền trong từng app được giữ riêng.

Luồng tích hợp: trình duyệt tạo PKCE và state → backend Demo dùng AppID/AppToken tạo yêu cầu đăng nhập → chuyển sang Auth → quay về Demo với mã dùng một lần và state → backend đổi mã lấy JWT giới hạn cho app. AppToken chỉ nằm ở backend.

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
2. Mở Portal, chọn **Đăng nhập qua Auth Service**, xác nhận tài khoản tại Auth và kiểm tra quay về Portal.
3. USER chỉ xem đơn của mình; owner hoặc OAuth user thuộc `adminEmails` nhận ADMIN và xem toàn bộ đơn.
4. Bỏ token khi gọi `/orders`: phải nhận 401. Platform Admin không tự được quyền ADMIN của ứng dụng.

Mỗi request nghiệp vụ được Auth Service xác thực lại bằng JWT và AppID/AppToken. Không dùng cache handshake để cấp quyền. Đơn hàng lưu trong bộ nhớ và mất khi restart.
