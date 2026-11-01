# Demo Service — Client Microservice (Project 2)

Dịch vụ khách độc lập (Client Microservice) minh họa mô hình liên thông dịch vụ và ủy quyền xác thực với Auth Service (Project 1).

Dịch vụ cung cấp giao diện Cổng Dịch Vụ Khách Hàng (Customer Portal) phục vụ tại http://localhost:3001, cho phép người dùng đăng nhập bằng tài khoản mạng xã hội (Google, Facebook) và hiển thị hồ sơ cá nhân đã được xác thực an toàn.

---

## 1. Tính năng cốt lõi

1. **Mô hình Phân quyền Đa tầng (Multi-tenant RBAC — Tương tự Firebase Auth):**
   - Người dùng đăng nhập nhanh chóng thông qua OAuth 2.0 (Google hoặc Facebook).
   - **Tự động cấp quyền ADMIN**: Khi tài khoản Google/Facebook đăng nhập có email trùng khớp với Chủ sở hữu ứng dụng (App Owner đã tạo app ở Project 1) hoặc nằm trong danh sách `adminEmails` của ứng dụng $\rightarrow$ Hệ thống tự động trao toàn quyền Quản trị viên (`ADMIN`), cho phép xem và quản lý toàn bộ đơn hàng trong hệ thống.
   - **Quyền Khách hàng (USER)**: Khách hàng thông thường khi đăng nhập chỉ có quyền xem và tạo các đơn hàng của riêng mình.
   - **Loại bỏ form mật khẩu**: Project 2 không lưu trữ bất kỳ mật khẩu nào và không cần form nhập user/pass, trải nghiệm người dùng 100% dựa trên OAuth hiện đại.

2. **Giao diện Cổng Khách Hàng (Customer Portal Web UI tại http://localhost:3001):**
   - Thiết kế tinh gọn, hiện đại theo phong cách Dark Mode chuyên nghiệp.
   - Đăng nhập 1-click qua Google hoặc Facebook.
   - Quản lý phiên làm việc: Hiển thị Avatar, Họ tên, Email, Huy hiệu vai trò (`👑 Quản Trị Viên` / `👤 Khách Hàng`) và Access Token JWT.
   - **Giao diện Quản lý Đơn hàng trực quan (Orders Table)**:
     + Bảng danh sách đơn hàng với đầy đủ thông tin: Mã đơn, Tên sản phẩm, Số lượng, Đơn giá, Khách hàng đặt mua, Trạng thái đơn (PENDING, CONFIRMED, SHIPPED).
     + Nút `+ Đặt Hàng Thử Nghiệm`: Giúp khách hàng tạo đơn hàng mẫu tức thì.
     + Tùy chọn xem phản hồi thô API (`{ } Xem Dữ Liệu API (JSON)`) phục vụ việc kiểm thử kỹ thuật.

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
