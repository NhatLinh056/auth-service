# Auth Service

Dịch vụ định danh trung tâm: NestJS, Prisma, PostgreSQL và Developer Console React.

- Console: http://localhost:3000
- Swagger: http://localhost:3000/api
- Health: http://localhost:3000/health

## Chức năng chính

- Tài khoản nền tảng đăng nhập Developer Console để tạo và quản lý ứng dụng khách.
- Mỗi ứng dụng có AppID/AppToken, danh sách URL quay về và cấu hình Google/Facebook.
- Auth Service cung cấp màn hình đăng nhập tập trung bằng email/mật khẩu hoặc OAuth, cấp mã dùng một lần và chuẩn hóa quyền người dùng (khách hàng app mang quyền USER; tách biệt với quyền quản trị nền tảng và quản trị doanh nghiệp).
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

Trong `.env`, đặt `ENABLE_DEMO_SEED=true` và `SEED_APP_TOKEN=apt_<64 ký tự hex ngẫu nhiên>`, sau đó chạy `npm run seed`. Lệnh tạo tài khoản và ứng dụng mẫu; xem thông tin mẫu trong script seed. Provider OAuth mới mặc định tắt; cần cấu hình và bật trong Developer Console. Seed giữ nguyên provider đã có. Đặt lại `ENABLE_DEMO_SEED=false` sau khi seed. Không seed lại DB có dữ liệu cần giữ cấu hình, vì seed cập nhật tài khoản và ứng dụng mẫu.

## Cấu hình OAuth & Quản lý Tài khoản

Trang **Tài khoản** trên Project 1 quản lý thông tin định danh (User ID, Role, Doanh nghiệp trực thuộc) và mật khẩu của danh tính chung. Việc liên kết tài khoản OAuth được thực hiện an toàn qua luồng Client Sign-In của ứng dụng khi có xác nhận mật khẩu hoặc phiên đăng nhập (`ACCOUNT_LINK_REQUIRED`), chống tuyệt đối việc chiếm đoạt tài khoản hoặc tự ý gộp tài khoản chỉ dựa trên email trùng. Cấu hình OAuth theo từng app (Google/Facebook) được quản lý độc lập tại chi tiết ứng dụng trong Developer Console.

Khi triển khai bằng domain thật, đặt `AUTH_PUBLIC_URL=https://auth.example.com` trong `.env` của Auth Service và khởi động lại. Console sẽ hiển thị callback tương ứng; đăng ký URL đó tại Google/Meta. URL này là đường về **Auth Service**, dùng chung cho các ứng dụng trên cùng domain Auth; người dùng cuối không tự nhập URL này.

Ví dụ Google: `https://auth.example.com/auth/oauth/google/callback`; Facebook: `https://auth.example.com/auth/oauth/facebook/callback`. `AUTH_PUBLIC_URL` phải là origin HTTPS công khai, không có đường dẫn con, query hay fragment. HTTP chỉ dùng cho localhost khi phát triển.

Trong chi tiết ứng dụng trên Console:

1. Điền Client ID/Secret và bật Google hoặc Facebook.
2. Đăng ký callback hiển thị trong Console tại nhà cung cấp. Khi chạy local, dùng `http://localhost:3000/auth/oauth/google/callback` hoặc `http://localhost:3000/auth/oauth/facebook/callback`.
3. Thêm URL Portal chính xác, chẳng hạn `https://shop.example.com/`, vào **URL quay về ứng dụng sau đăng nhập** trong chi tiết app. Có thể đăng ký thêm URL staging hoặc localhost cho các môi trường khác.

Redirect phải khớp chính xác. Luồng đăng nhập dùng state gắn với trình duyệt, PKCE và mã dùng một lần; không truyền JWT qua URL.

## API chính

Tenant đại diện doanh nghiệp. Mỗi user thuộc tối đa một tenant; người tạo tự trở thành chủ (Tenant Owner). Chủ quản lý thông tin, phê duyệt/từ chối yêu cầu gia nhập, loại thành viên, chuyển quyền cho thành viên hiện tại và xóa doanh nghiệp khi không còn thành viên khác. Thành viên thường có thể tự rời doanh nghiệp (chủ sở hữu phải chuyển quyền trước khi rời). Super Admin có thể can thiệp chuyển quyền cho thành viên hoặc user chưa thuộc doanh nghiệp (bắt buộc ghi lý do can thiệp), nhưng không can thiệp vào các thao tác quản trị nội bộ khác của tenant. Chủ cũ trở thành thành viên sau khi chuyển quyền; không thể xóa tài khoản còn sở hữu doanh nghiệp.

API tenant chấp nhận phiên nền tảng hoặc phiên ứng dụng hợp lệ; quyền Super Admin chỉ áp dụng cho phiên nền tảng (`type === 'platform'`), token ứng dụng (`type === 'app_user'`) bị chặn khỏi các quyền này. `GET /tenants/me` trả doanh nghiệp, context quyền và yêu cầu gia nhập hiện tại; `/tenants` hỗ trợ tạo/danh sách, `/tenants/:id` xem/sửa/xóa, `POST /tenants/:id/transfer` chuyển chủ. Luồng gia nhập gồm `POST /tenants/join`, `GET /tenants/join-request/my`, `POST /tenants/join-request/:id/cancel`, `GET /tenants/:id/join-requests`, `POST /tenants/join-requests/:id/approve` và `POST /tenants/join-requests/:id/reject`. Thành viên rời bằng `POST /tenants/leave`; chủ loại thành viên bằng `DELETE /tenants/:id/members/:userId`. Nhật ký tenant tại `/tenants/:id/audit`; chỉ Super Admin với platform token được xem `/tenants/audit` toàn hệ thống. Nhật ký audit được giữ nguyên ngay cả khi tenant bị xóa.

Danh tính người dùng được lưu chung trong `User`; `AppUser` là quan hệ thành viên và quyền riêng trong từng ứng dụng. Trong phiên ứng dụng, `userId` là ID danh tính chung; `id` và JWT `sub` vẫn là ID thành viên để giữ tương thích dữ liệu nghiệp vụ.

Google dùng định danh provider chung; Facebook được phân biệt thêm theo Client ID. Hệ thống không tự liên kết tài khoản chỉ vì trùng email. Trang đăng nhập Auth yêu cầu mật khẩu hiện tại hoặc phiên Auth của tài khoản đích để xác nhận (`ACCOUNT_LINK_REQUIRED`). Xác nhận OAuth có hiệu lực tối đa 5 phút, giới hạn 5 lần; mã cuối cùng trả về ứng dụng có hiệu lực 60 giây và dùng một lần. Ứng dụng khách chỉ gửi code/verifier, không tiếp nhận mật khẩu hoặc token nền tảng để liên kết.

Migration `20261102010000_shared_user_identity` giữ nguyên user, thành viên và OAuth identity cũ. Thành viên cũ được gắn vào danh tính chung sau lần đăng nhập và xác minh tiếp theo; phiên OAuth cũ chưa được gắn user cần đăng nhập lại. Trường hợp dữ liệu cũ mâu thuẫn được giữ lại để đối chiếu, không tự gộp hoặc xóa.

- `POST /auth/flows`: backend ứng dụng tạo yêu cầu đăng nhập bằng AppID/AppToken, URL quay về đã đăng ký, PKCE và state.
- `GET /auth/flows/:id`: thông tin ứng dụng hiển thị tại màn hình đăng nhập Auth.
- `POST /auth/oauth/exchange`: backend ứng dụng đổi code/verifier lấy JWT riêng của app.
- `/auth/login`: đăng nhập tài khoản nền tảng.
- `/auth/verify-service`: xác thực AppID/AppToken.
- `/users/verify-app-user`: xác thực JWT cùng credential dịch vụ và trả context quyền hiện hành (`isTenantOwner`, `tenantId`, `isAppOwner`); người dùng chưa thuộc doanh nghiệp có `tenantId: null`.
- `/applications`: quản lý ứng dụng bằng tài khoản nền tảng.
- `POST /auth/account/password`: tạo mật khẩu cho tài khoản OAuth đã xác minh hoặc đổi mật khẩu với `currentPassword`.
- `/tenants`: quản lý doanh nghiệp, danh sách, chi tiết, chuyển chủ, xin gia nhập, phê duyệt và audit log.

Frontend đã được build vào `public`. Sau khi sửa React, chạy: `npm --prefix frontend run build` và đồng bộ `frontend/dist/*` sang `public/`.

Yêu cầu đăng nhập và mã tạm được lưu trong bộ nhớ của một tiến trình. Restart làm hết hiệu lực yêu cầu đang chờ; triển khai nhiều instance cần kho dùng chung có TTL và thao tác tiêu thụ mã nguyên tử.
