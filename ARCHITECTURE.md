# AUTH SERVICE — KIẾN TRÚC ĐÍCH v2.0 (TỐI GIẢN)

**Trạng thái:** Quyết định phạm vi mới do owner yêu cầu ngày 2026-11-04. Đây là **đặc tả đích**, không phải khẳng định mọi chức năng đã có trong source. Kết quả P0 theo v1.0 là bằng chứng về source tại thời điểm review; những đề xuất schema/migration v1.0 đã bị thay thế.

## 1. Mục tiêu
Xây Auth Service tập trung **lấy ý tưởng từ Firebase Authentication ở mức cơ bản**, để nhiều ứng dụng sử dụng chung chức năng đăng nhập và cơ sở danh tính. Bổ sung Multi-tenant đúng yêu cầu giảng viên: CRUD doanh nghiệp, `User.tenantId`, tạo tenant tự làm chủ, gửi yêu cầu gia nhập bằng tenantId, chủ duyệt và System Admin có thể can thiệp khi có tranh chấp.

- **Project 1 (`auth-service`)**: quản lý User, xác thực mật khẩu/OAuth, liên kết danh tính, JWT/token exchange/verification, Application, OAuth provider settings, Tenant, yêu cầu gia nhập, thành viên, System Admin.
- **Project 2 (`demo-service`)**: ứng dụng tích hợp độc lập; chỉ hai nút Login Google/Facebook, Profile, Logout và **một endpoint minh họa được bảo vệ**; các endpoint kỹ thuật phục vụ OAuth/profile/provider-discovery vẫn được giữ khi cần. Không có database user/password riêng.
- Không triển khai bản sao đầy đủ của Firebase/Google Identity Platform, SaaS, đơn hàng, billing, multi-tenant credential stores, quyền ứng dụng phức tạp, mời thành viên bằng email.

## 2. Khái niệm và quan hệ
- **User** (`User.id`): một danh tính toàn hệ thống. `User.tenantId` **nullable** trỏ tới `Tenant.id`; mỗi User thuộc **tối đa một** Tenant, có thể chưa thuộc Tenant nào. User từ ứng dụng bên ngoài cũng được Auth Service quản lý tập trung.
- **Tenant**: doanh nghiệp/nhóm người dùng. `Tenant.ownerUserId` trỏ tới một User; chủ phải thuộc chính tenant đó. Mỗi tenant có nhiều Users qua `User.tenantId`.
- **Tenant Owner**: User có `Tenant.ownerUserId == User.id`; được quản lý thành viên và yêu cầu gia nhập tenant của mình, không tự động sở hữu hay quản lý Application.
- **Tenant Member**: User có `User.tenantId == Tenant.id` nhưng không phải owner. Có quyền dùng tài khoản và app phù hợp, không được duyệt thành viên hoặc quản lý Application chỉ vì membership.
- **Application**: client tích hợp Auth Service; `Application.userId` là **App Owner** (chủ cấu hình ứng dụng). Một Application có thể phục vụ Users thuộc nhiều Tenant hoặc `tenantId = null`. Không thêm `Application.tenantId` bắt buộc.
- **App Owner**: có quyền quản lý Application của mình (AppID/AppToken, redirect URIs, Google/Facebook provider, trạng thái) theo chính sách hiện có; không được tự duyệt người gia nhập tenant.
- **AppUser**: quan hệ một canonical User với một Application, dùng `AppUser.userId` và `AppUser.applicationId` theo schema hiện tại; một User có thể có nhiều AppUser ở nhiều ứng dụng. Giữ dữ liệu/quan hệ legacy (kể cả `userId` nullable nếu đang tồn tại) đến khi xác minh an toàn, không tạo bản ghi User trùng.
- **OAuthIdentity / AppOAuthIdentity / OAuthProvider**: giữ để xác thực, liên kết nhà cung cấp, lưu cài đặt theo app. Không tự liên kết tài khoản khi không có bằng chứng xác thực.
- **TenantJoinRequest**: lưu `(userId, tenantId, status)` cho Apply → Approve/Reject/Cancel theo logic hiện có.
- **TenantAuditLog**: lưu can thiệp/chuyển chủ/xóa tenant theo chính sách hiện tại, không làm mất bằng chứng quản trị.
- **System Admin**: quyền quản trị nền tảng, không đồng nhất với App Owner hoặc Tenant Owner.

### Sơ đồ quan hệ logic (không thêm bảng)
```text
User.id ───────────────────────────┐
  ├─ User.tenantId ───────────────> Tenant.id
  ├─ Tenant.ownerUserId ──────────> User.id  [chủ phải thuộc tenant]
  ├─ Application.userId ──────────> User.id  [App Owner độc lập]
  ├─ AppUser.userId ──────────────> User.id
  ├─ OAuthIdentity.userId ────────> User.id
  └─ TenantJoinRequest.userId ────> User.id

AppUser.applicationId ────────────> Application.id
TenantJoinRequest.tenantId ───────> Tenant.id
OAuthProvider.applicationId ──────> Application.id
```

**Không tạo:** `TenantMember`, `TenantUser`, `AppUser.tenantUserId`, quan hệ `Tenant -> Application` bắt buộc, bảng User riêng cho Demo. **Không xóa** các bảng hiện hữu để đạt cấu trúc này.

## 3. Quyền — phân biệt rõ ba chủ thể
| Hành động | System Admin | App Owner | Tenant Owner | Tenant Member / App User |
|---|---|---|---|---|
| Xem danh tính User toàn hệ thống | Có (chỉ dữ liệu an toàn) | Không mặc định | Không | Không |
| CRUD Application mình sở hữu / cấu hình provider | Theo quyền hệ thống | Có, app của mình | Chỉ nếu đồng thời là App Owner | Không |
| Tạo Tenant mới | Có theo chính sách | Có nếu chưa thuộc Tenant | Không tạo tenant thứ hai khi vẫn thuộc tenant hiện tại | Có nếu chưa thuộc Tenant |
| Xem/quản lý thành viên của Tenant | Có theo quyền hệ thống | Chỉ nếu đồng thời là Tenant Owner | Có, tenant của mình | Không mặc định |
| Approve / Reject yêu cầu gia nhập | Có theo quyền can thiệp nếu triển khai | Chỉ nếu đồng thời là Tenant Owner | Có, tenant của mình | Không |
| Đăng nhập ứng dụng tích hợp | Như User thường | Như User thường | Như User thường | Có, không bắt buộc tenant |

Không mặc định `App Owner == Tenant Owner`. Không tự nâng quyền bằng email, `adminEmails` hay vai trò truyền từ frontend. Tenant Owner **không** được xóa tài khoản `User` toàn cục khi loại một thành viên; loại thành viên chỉ thay đổi liên kết `tenantId`. Nếu App Owner muốn xem User của app mình, chỉ sử dụng API phạm vi app đã được kiểm soát quyền; không cho Tenant Owner quyền quản lý AppUser trên mọi ứng dụng.

## 4. Luồng nghiệp vụ bắt buộc
1. **Đăng nhập:** Demo → Auth Service → Google/Facebook → Auth callback → mã cấp quyền một lần → Demo backend exchange → app-scoped token → Profile/API bảo vệ. Không qua Developer Console hay trang chọn phương thức trung gian của Project 1.
2. **Tạo User từ app ngoài:** Auth Service tìm User qua danh tính OAuth đã xác minh; nếu chưa có thì tạo User chung (`tenantId = null`), liên kết OAuth và tạo/tìm `AppUser` trong phạm vi Application. Không tự gộp chỉ bằng email trùng; có thể cần xác nhận liên kết.
3. **Tạo Tenant:** User chưa thuộc Tenant tạo Tenant, trở thành owner và được gán `User.tenantId` ngay; bảo đảm owner thuộc tenant mình.
4. **Xin gia nhập:** User chưa thuộc Tenant nhập Tenant ID và gửi yêu cầu `PENDING`. Chủ đúng tenant duyệt/từ chối. Chỉ `APPROVED` mới gán `User.tenantId`; kiểm tra transaction để ngăn gia nhập đồng thời hai tenant.
5. **Quản lý thành viên:** Tenant Owner xem/thao tác trong tenant mình; không đọc/chỉnh thành viên tenant khác; không xóa User toàn cục. Thành viên rời/bị loại có `tenantId = null`, vẫn có thể đăng nhập app nếu app cho phép.
6. **Chuyển chủ:** Chặn owner rời/bị loại/xóa khiến tenant không còn chủ hợp lệ. Super Admin can thiệp chuyển chủ phải có lý do và audit log; không chiếm quyền Application của người đó.
7. **Xóa Tenant:** Không tự động xóa User, Application, tài khoản OAuth; kiểm tra ràng buộc và hậu quả trước khi xóa.

## 5. API và giao diện tối thiểu
**Auth Console:** tài khoản cá nhân; Applications do App Owner quản lý; cấu hình OAuth; Tenant CRUD, thành viên, yêu cầu gia nhập, Approve/Reject; System Admin xem danh sách `User` toàn hệ thống (kể cả User đăng nhập qua Demo) và xử lý can thiệp. Tenant Owner chỉ thấy thành viên tenant mình. AppUser chỉ cần quan hệ/API hiện có nếu cần cho xác thực; **không yêu cầu** hệ thống disable/enable theo `TenantUser`/`AppUser` nhiều tầng hoặc dashboard chuyên sâu theo app.

**Auth APIs:** tái dùng các endpoint đang có cho đăng nhập/OAuth/callback/exchange, ứng dụng, provider, xác minh token, tenant/membership. Chỉ thêm/sửa API khi source audit chứng minh thiếu. Giữ kiểm tra App ACTIVE, redirect allowlist, state, PKCE, mã một lần, audience/app binding và bí mật AppToken ở backend.

**Demo:** hai nút Google/Facebook; profile (tên/email/user ID/provider, `tenantId` chỉ là thông tin tùy chọn); logout; một endpoint được bảo vệ để chứng minh token đúng app. Gỡ UI/backend CRUD tenant/order không còn dùng **sau khi kiểm tra phụ thuộc**, không đụng API chung Auth Service.

## 6. Tiêu chí nghiệm thu
- User có thể đăng nhập qua Demo dù `tenantId = null`; danh tính được tạo/tìm trong **User chung** của Auth Service; có `AppUser` liên kết đúng app, không nhân bản User vô cớ.
- Một User đã liên kết hợp lệ dùng nhiều app vẫn là một User; từng app kiểm tra đúng AppID/token của mình; JWT app A không dùng được với app B.
- CRUD Tenant; tạo tenant tự làm owner; Apply/Approve/Reject; từ chối duyệt chéo tenant và duyệt hai tenant; chủ không mất quyền sở hữu trái phép.
- App Owner không tự nhiên có quyền Tenant Owner, và ngược lại. System Admin có quyền quản trị tập trung theo guard.
- Super Admin có thể xem các User do ứng dụng bên ngoài tạo ra; Tenant Owner chỉ quản lý User có `tenantId` của tenant mình.
- Demo chỉ còn 4 chức năng người dùng được yêu cầu và phần kỹ thuật OAuth cần thiết. Không có user/password store riêng.
- Regression và kiểm thử bảo mật PASS trong điều kiện kiểm thử thực tế; test dùng DB cô lập; ghi rõ OAuth thật/E2E đã chạy hay chưa.

## 7. Quyết định thay đổi so với v1.0
Owner yêu cầu tối giản ngày **2026-11-04**: bỏ đề xuất `TenantMember`, `TenantUser`, `Application.tenantId`, `AppUser.tenantUserId`, backfill theo app-to-tenant và mô hình tenant sở hữu ứng dụng. P0 theo v1.0 vẫn là bằng chứng **về hiện trạng source đã kiểm tra**, không phải quyết định triển khai schema v1.0. Mọi thay đổi khỏi v2.0 phải được owner phê duyệt rõ ràng và cập nhật nhất quán 4 file.
