# Demo Service — Client Microservice (Project 2)

Dịch vụ khách độc lập (Client Microservice) minh họa mô hình liên thông dịch vụ và ủy quyền xác thực với Auth Service (Project 1).

Dịch vụ cung cấp giao diện Cổng Dịch Vụ Khách Hàng (Customer Portal) phục vụ tại http://localhost:3001, cho phép người dùng đăng nhập bằng tài khoản mạng xã hội hoặc tài khoản lập trình viên và hiển thị hồ sơ cá nhân đã được xác thực an toàn.

---

## 1. Tính năng cốt lõi

1. **Mô hình Phân quyền Đa tầng (Multi-tenant RBAC — Tương tự Firebase Auth):**
   - Auth Service (Project 1) đóng vai trò là nền tảng Backend-as-a-Service (BaaS) quản lý tập trung tài khoản và ứng dụng.
   - Tài khoản đăng ký tại Project 1 là tài khoản Nhà phát triển (vai trò USER trên nền tảng), tạo ứng dụng để nhận AppID và AppToken tích hợp vào Project 2.
   - **ADMIN tại Project 2**: Là tài khoản tại Project 1 sở hữu ứng dụng đó (App Owner) hoặc các tài khoản được ủy quyền qua danh sách `adminEmails` của ứng dụng.
   - **Lưu ý quan trọng về Platform Admin (Project 1)**: Tài khoản Admin của Project 1 chỉ có vai trò quản lý nền tảng BaaS. Admin Project 1 **KHÔNG** phải là Admin của Project 2. Khi đăng nhập vào Project 2, họ chỉ có quyền `USER` bình thường trừ khi chính họ là chủ sở hữu hoặc nằm trong `adminEmails` của ứng dụng đó.
   - **USER tại Project 2**: Là các khách hàng vãng lai đăng nhập qua mạng xã hội (Google, Facebook), dữ liệu được cô lập trong bảng `app_users` của riêng ứng dụng này.

2. **Giao diện Cổng Khách Hàng (Customer Portal Web UI tại http://localhost:3001):**
   - Cung cấp 2 khu vực đăng nhập trực quan:
     + Khu vực 1 (Khách hàng): Đăng nhập nhanh qua Google hoặc Facebook (Vai trò: USER).
     + Khu vực 2 (Chủ ứng dụng): Đăng nhập bằng tài khoản Project 1 (Email & Mật khẩu) đã tạo ứng dụng (Vai trò: ADMIN).
   - Hiển thị trực quan bảng thông tin tài khoản: Họ tên, Email, Ảnh đại diện, Vai trò tại Project 1 (BaaS) vs Vai trò tại Project 2 (App), Mã UID và chuỗi Access Token (JWT).
   - Tích hợp 2 nút thao tác API trực tiếp trên giao diện:
     + "Gọi Thử API /orders": Kiểm tra phân quyền RBAC (ADMIN xem toàn bộ đơn hàng, USER chỉ xem đơn cá nhân).
     + "+ Tạo Đơn Hàng Mới": Khách hàng tạo thử đơn hàng và xem kết quả cập nhật lập tức trên màn hình.

3. **Bắt tay dịch vụ (Service-to-Service Handshake) & Bộ nhớ đệm TTL:**
   - Đọc AppID và AppToken từ biến môi trường (`.env`).
   - Gửi yêu cầu bắt tay tới endpoint `GET /auth/verify-service` trên Auth Service (http://localhost:3000).
   - Xác nhận quyền hạn hoạt động hợp lệ, trạng thái ACTIVE và trích xuất thông tin Chủ sở hữu ứng dụng (App Owner) cùng danh sách `adminEmails`.
   - Kết quả bắt tay được lưu cache trong bộ nhớ với thời gian sống (TTL) 5 phút, tự động làm mới khi hết hạn.

4. **Ủy quyền xác thực người dùng (Delegated User JWT Verification):**
   - Không chứa bất kỳ bảng cơ sở dữ liệu User hay mật khẩu nào.
   - Nhận Bearer JWT từ người dùng và ủy quyền thẩm định qua Auth Service (`GET /users/me`).
   - So khớp định danh người dùng với Chủ sở hữu ứng dụng hoặc danh sách `adminEmails` để phân quyền ADMIN hoặc USER cho phiên làm việc.

5. **REST API mẫu nội bộ (/orders):**
   - Cung cấp các endpoint `GET /orders`, `POST /orders`, `GET /orders/:id` được bảo vệ bởi `UserAuthGuard`.
   - Dữ liệu được cô lập chặt chẽ theo phân quyền RBAC.

---

## 2. Hướng dẫn khởi chạy

### Bước 1: Cấu hình biến môi trường
Tạo file `.env` từ `.env.example`:
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
| GET | /auth/me | UserAuthGuard | Lấy hồ sơ tài khoản và vai trò trong ngữ cảnh Project 2 (ADMIN / USER) |
| GET | /orders | UserAuthGuard | REST API mẫu: Lấy danh sách tài nguyên (kiểm tra phân quyền RBAC) |
| POST | /orders | UserAuthGuard | REST API mẫu: Tạo tài nguyên mới gắn với định danh người dùng |
| GET | /orders/:id | UserAuthGuard | REST API mẫu: Lấy chi tiết tài nguyên theo ID |
