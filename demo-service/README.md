# Demo Service — Client Microservice (Project 2)

Dịch vụ khách độc lập (Client Microservice) minh họa mô hình liên thông dịch vụ và ủy quyền xác thực với Auth Service (Project 1).

Dịch vụ cung cấp giao diện Cổng Dịch Vụ Khách Hàng (Customer Portal) phục vụ tại http://localhost:3001, cho phép người dùng đăng nhập bằng tài khoản mạng xã hội và hiển thị hồ sơ cá nhân đã được xác thực an toàn.

---

## 1. Tính năng cốt lõi

1. Giao diện Cổng Khách Hàng (Customer Portal Web UI):
   - Cho phép người dùng đăng nhập qua các nhà cung cấp bên thứ ba (Google, Facebook).
   - Hiển thị trực quan bảng thông tin tài khoản sau khi đăng nhập: Họ tên, Email, Ảnh đại diện, Vai trò (USER / ADMIN), Mã tài khoản (UID) và chuỗi Access Token (JWT).
   - Cung cấp tính năng sao chép token và nút đăng xuất tài khoản.

2. Bắt tay dịch vụ (Service-to-Service Handshake):
   - Đọc AppID và AppToken từ biến môi trường (.env).
   - Gửi yêu cầu bắt tay tới endpoint GET /auth/verify-service trên Auth Service (http://localhost:3000).
   - Xác nhận quyền hạn hoạt động hợp lệ và trạng thái ACTIVE của ứng dụng khách.

3. Ủy quyền xác thực người dùng (Delegated User JWT Verification):
   - Không chứa bất kỳ bảng cơ sở dữ liệu User hay mật khẩu nào.
   - Nhận Bearer JWT từ người dùng và ủy quyền thẩm định qua Auth Service (GET /users/me).
   - Trích xuất định danh và quyền hạn (@CurrentUser()) để kiểm soát quyền truy cập tài nguyên.

4. REST API mẫu nội bộ (/orders):
   - Cung cấp các endpoint GET /orders, POST /orders, GET /orders/:id được bảo vệ bởi UserAuthGuard.
   - Đóng vai trò API mẫu backend để chứng minh cách bảo vệ endpoint nội bộ và phân quyền RBAC (tài khoản ADMIN xem được toàn bộ danh sách, tài khoản USER chỉ xem được dữ liệu của chính mình).

---

## 2. Hướng dẫn khởi chạy

### Bước 1: Cấu hình biến môi trường
Tạo file .env từ .env.example:
```env
PORT=3001
AUTH_SERVICE_URL=http://localhost:3000
APP_ID=app_your_app_id_here
APP_TOKEN=apt_your_app_token_here
```

### Bước 2: Cài đặt và khởi chạy
```bash
# Cài đặt dependencies
npm install

# Chạy ở chế độ phát triển
npm run start:dev

# Chạy kiểm thử tự động
npm test
```
Dịch vụ sẽ khởi động tại: http://localhost:3001

---

## 3. Danh sách Endpoints

| Phương thức | Endpoint | Cơ chế bảo vệ | Mô tả chức năng |
| :--- | :--- | :--- | :--- |
| GET | / | Public | Giao diện Cổng Khách Hàng (Customer Portal) |
| GET | /status | Public | Bắt tay kiểm tra kết nối với Auth Service qua AppID / AppToken |
| GET | /auth/providers | Public | Truy vấn danh sách nhà cung cấp OAuth khả dụng từ Auth Service |
| GET | /orders | UserAuthGuard | REST API mẫu: Lấy danh sách tài nguyên (ủy quyền xác thực User JWT) |
| POST | /orders | UserAuthGuard | REST API mẫu: Tạo tài nguyên mới gắn với định danh người dùng |
| GET | /orders/:id | UserAuthGuard | REST API mẫu: Lấy chi tiết tài nguyên theo ID |
