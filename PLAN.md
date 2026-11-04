# AUTH SERVICE — KẾ HOẠCH THỰC HIỆN v2.0

**Nguồn quyết định:** `ARCHITECTURE.md` v2.0. **Nguồn sự thật hiện trạng:** source, schema, Git và tests. **Theo dõi tiến độ:** `TASKS.md`. Chỉ làm một task ACTIVE tại một thời điểm; Antigravity implement, Codex review và duyệt. Không tự chuyển phase.

## P0 — Audit lịch sử v1.0 (ĐÃ HOÀN THÀNH, KHÔNG LÀM LẠI)
- **P0-T01:** Đối chiếu danh mục mã nguồn/schema/API/UI và test baseline — Codex `APPROVED` (theo TASKS.md ngày 2026-11-03).
- **P0-T02:** Truy vết User/AppUser/OAuth/Tenant/Application/Demo — Codex `APPROVED` (theo TASKS.md ngày 2026-11-04).
- **P0-T03:** Đánh giá migration/API impact **theo kiến trúc v1.0** — Codex `APPROVED` về chất lượng đánh giá, nhưng **đề xuất schema/backfill v1.0 không còn là kế hoạch được phép triển khai**.
- **Tái sử dụng:** source facts, case bảo mật, regression baseline, review findings. **Không tái sử dụng:** TenantMember/TenantUser, app thuộc tenant, migration/backfill, phân quyền app theo Tenant Owner.

## P1 — Đối chiếu phạm vi mới với source (CHỈ ĐỌC / DOCUMENT)
**P1-T01 — Delta audit v2.0**
- Kiểm tra `git status`, HEAD, các module liên quan; so sánh source với `ARCHITECTURE.md` v2.0 và bằng chứng P0; không coi audit cũ là source hiện thời.
- Lập bảng **KEEP / GAP / SIMPLIFY / SAFE-REMOVE-LATER** cho Tenant, User, AppUser, Application, OAuth, Console và Demo.
- Ghi rõ quyền App Owner/Tenant Owner, trạng thái danh sách User tập trung, backend Demo còn `/orders`/tenant proxy và các phụ thuộc thực tế.
- Không viết code, không migration, không xóa gì; ghi kết quả gọn trong `TASKS.md`.
- **Gate:** Codex xác minh gap map và xác nhận P2–P4 không đòi schema mới ngoài phạm vi. Nếu cần đổi kiến trúc, hỏi owner.

## P2 — Hoàn thiện Multi-tenant theo giảng viên
**P2-T01 — Kiểm tra và chỉ sửa chỗ còn thiếu**
- Kiểm tra Tenant CRUD; `User.tenantId` nullable; người chưa thuộc tenant tạo tenant và làm chủ; owner luôn thuộc tenant mình.
- Kiểm tra xin gia nhập bằng tenantId, PENDING, Approve/Reject/Cancel, cập nhật `tenantId` nguyên tử, tránh một User gia nhập hai tenant.
- Kiểm tra owner xem/loại thành viên của tenant mình; owner không tự rời/bị loại; chuyển chủ và Super Admin intervention có lý do/audit.
- Kiểm tra phân biệt App Owner, Tenant Owner, System Admin; chống IDOR/cross-tenant, không cấp `ADMIN` qua email hoặc sở hữu App.
- Không triển khai lại chức năng đã đạt; chỉ sửa source/test thực sự thiếu hoặc sai. **Không tạo TenantMember/TenantUser hay đổi ownership Application.**
- **Gate:** Codex duyệt các ca hợp lệ và bị từ chối, không phát sinh migration không được phép.

## P3 — Danh tính tập trung và hiển thị User ứng dụng ngoài
**P3-T01 — User/OAuth/AppUser và Console Users**
- Theo luồng Demo sign-in: xác nhận tạo/tìm canonical `User`, OAuthIdentity/AppOAuthIdentity và `AppUser` gắn đúng Application; User chưa có tenant vẫn đăng nhập.
- Kiểm tra `User` không bị nhân bản khi dùng nhiều app với danh tính đã liên kết hợp lệ; giữ luồng yêu cầu xác nhận liên kết khi cần.
- Kiểm tra API/Console danh sách User toàn cục cho System Admin: hiển thị cả User lần đầu đăng nhập qua ứng dụng bên ngoài, không lọc nhầm người dùng Project 1.
- Tenant Owner chỉ truy cập danh sách thành viên tenant mình; App Owner chỉ truy cập phạm vi app được cho phép, không nhầm quyền tenant.
- Tái dùng API/bảng hiện hữu, không dựng hệ thống membership/trạng thái người dùng đa tầng và không mở dashboard mới nếu query/filter hiện tại đã đủ.
- **Gate:** User ngoài app xuất hiện trong User chung và hiển thị đúng quyền; test app-token cross-app và liên kết danh tính đạt.

## P4 — Demo chỉ chứng minh tích hợp
**P4-T01 — Tinh gọn Demo**
- Đảm bảo giao diện có đúng 2 nút Google/Facebook; sau login chỉ Profile, Logout và nút/thao tác thử 1 API bảo vệ; không yêu cầu tenant để đăng nhập.
- Phân loại proxy/API/UI/service/test cũ về `/orders`, tenant, role business; bỏ **chỉ khi** xác minh không còn phụ thuộc. Thay đơn hàng bằng endpoint minh họa token tối giản nếu cần.
- Giữ endpoints kỹ thuật như OAuth start/exchange, profile, provider/status discovery và bộ verify token cần để chức năng hoạt động; không xóa endpoint dùng chung Project 1.
- Không lưu user/password cục bộ hoặc lộ AppToken/JWT trên URL; giữ browser-bound state, PKCE và code một lần.
- **Gate:** Demo build/test PASS, login Google/Facebook mock đúng, logout và protected endpoint hoạt động; negative tests cho token sai/hết hạn.

## P5 — Nghiệm thu, bảo mật, tài liệu
**P5-T01 — Regression và bàn giao**
- Chạy unit, typecheck, build, integration/E2E trên **test DB cô lập** khi khả thi; kiểm thử hai tenants, hai apps, quyền owner chéo, Apply/Approve đồng thời, global Users, AppUser, JWT sai app, redirect/PKCE/code replay.
- Kiểm tra không lộ secrets, không xóa User khi rời tenant, không mất dữ liệu; cập nhật README hiện có đúng code cuối cùng.
- Chỉ ghi `PASS` cho thứ đã thực thi; live OAuth thật chưa có credentials/môi trường thì ghi `NOT VERIFIED`.
- **Gate:** Codex final `APPROVED` khi đạt tiêu chí `ARCHITECTURE.md`; nếu thiếu, ghi blocker cụ thể, không tự nhận DONE.

## Nguyên tắc dừng
- Mỗi task phải ghi file sửa, lệnh test, kết quả, rủi ro và Codex verdict vào `TASKS.md`.
- Nếu khám phá yêu cầu schema mới, quyền không rõ, dữ liệu cũ xung đột hoặc xóa API ảnh hưởng client khác: dừng và xin owner quyết định.
- Không commit/push, tự sửa nhiều phase hay tạo tài liệu tiến độ khác.
