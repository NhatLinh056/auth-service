# Demo Service — Client Microservice (Project 2)

> Client microservice minh họa liên thông dịch vụ và ủy quyền xác thực với **Auth Service (Project 1)**.

---

## 📌 Tính Năng Cốt Lõi

1. **Service-to-Service Handshake (`GET /status`):**
   - Đọc `APP_ID` và `APP_TOKEN` từ `.env`.
   - Gửi yêu cầu bắt tay tới `GET /auth/verify-service` trên Auth Service (`http://localhost:3000`).
   - Xác nhận quyền hạn hoạt động của microservice và trạng thái `ACTIVE`.
2. **Ủy Quyền Xác Thực Người Dùng (Delegated User JWT):**
   - Không chứa bất kỳ database `User` hay bảng đăng nhập/mật khẩu nào.
   - Nhận Bearer JWT từ người dùng và xác thực ủy quyền qua Auth Service (`GET /auth/profile`).
   - Cung cấp API quản lý Đơn hàng mô phỏng (`GET /orders`, `POST /orders`, `GET /orders/:id`).

---

## 🚀 Hướng Dẫn Khởi Chạy

### 1. Cấu hình biến môi trường
Tạo file `.env` từ `.env.example`:
```env
PORT=3001
AUTH_SERVICE_URL=http://localhost:3000
APP_ID=app_your_app_id_here
APP_TOKEN=apt_your_app_token_here
```

### 2. Cài đặt và chạy
```bash
# Cài đặt dependencies
npm install

# Chạy ở chế độ phát triển
npm run start:dev

# Chạy kiểm thử
npm test
```
Service sẽ khởi động tại: `http://localhost:3001`

---

## 📡 Danh Sách Endpoints

| Phương thức | Endpoint | Bảo vệ bởi | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/status` | Public | Bắt tay kiểm tra kết nối với Auth Service qua AppID/AppToken |
| `GET` | `/orders` | `UserAuthGuard` | Lấy danh sách đơn hàng của người dùng (xác thực User JWT) |
| `POST` | `/orders` | `UserAuthGuard` | Tạo đơn hàng mới cho người dùng |
| `GET` | `/orders/:id` | `UserAuthGuard` | Lấy chi tiết đơn hàng |
