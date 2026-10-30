# Demo Service — Client Microservice (Project 2)

Dịch vụ khách độc lập (Client Microservice) minh họa mô hình liên thông dịch vụ và ủy quyền xác thực với Auth Service (Project 1).

Lưu ý quan trọng về bản chất nghiệp vụ:
Dịch vụ này KHÔNG PHẢI là một hệ thống quản lý đơn hàng hay thương mại điện tử thực tế. Phân hệ "Đơn hàng" (Orders) chỉ là một tài nguyên mẫu giả lập (Sample Resource với dữ liệu lưu trong bộ nhớ in-memory), được xây dựng để chứng minh cơ chế bảo vệ tài nguyên nội bộ thông qua ủy quyền xác thực người dùng mà không cần lưu trữ cơ sở dữ liệu tài khoản cục bộ.

---

## 1. Tính năng cốt lõi

1. Bắt tay dịch vụ (Service-to-Service Handshake):
   - Đọc AppID và AppToken từ biến môi trường (.env).
   - Gửi yêu cầu bắt tay tới endpoint GET /auth/verify-service trên Auth Service (http://localhost:3000).
   - Xác nhận quyền hạn hoạt động hợp lệ và trạng thái ACTIVE của ứng dụng khách.

2. Ủy quyền xác thực người dùng (Delegated User JWT Verification):
   - Không chứa bất kỳ bảng cơ sở dữ liệu User hay mật khẩu nào.
   - Nhận Bearer JWT từ người dùng và ủy quyền thẩm định qua Auth Service (GET /users/me).
   - Trích xuất định danh và quyền hạn (@CurrentUser()) để kiểm soát quyền truy cập tài nguyên.

3. Tài nguyên mẫu Đơn hàng (Mock Orders API):
   - Cung cấp các endpoint GET /orders, POST /orders, GET /orders/:id.
   - Minh họa phân quyền RBAC: Tài khoản ADMIN xem được toàn bộ đơn hàng; tài khoản USER chỉ xem được đơn hàng của chính mình.

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
| GET | /status | Public | Bắt tay kiểm tra kết nối với Auth Service qua AppID / AppToken |
| GET | /auth/providers | Public | Truy vấn danh sách nhà cung cấp OAuth khả dụng từ Auth Service |
| GET | /orders | UserAuthGuard | Lấy danh sách đơn hàng (ủy quyền xác thực User JWT) |
| POST | /orders | UserAuthGuard | Tạo đơn hàng mới cho người dùng hiện tại |
| GET | /orders/:id | UserAuthGuard | Lấy chi tiết đơn hàng theo ID |

