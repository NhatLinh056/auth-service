# AUTH SERVICE — TASKS / EVIDENCE (v2.0)

> Một nguồn theo dõi tiến độ. `ARCHITECTURE.md` v2.0 là phạm vi được owner chốt; `PLAN.md` v2.0 định nghĩa task. **Không coi tài liệu này là bằng chứng source chưa kiểm tra lại.**

## CURRENT STATUS — 2026-11-04

- **Quyết định owner:** thay đặc tả v1.0 bằng Multi-tenant tối giản v2.0; giữ App Owner và Tenant Owner độc lập; không thêm TenantMember/TenantUser/Application.tenantId/AppUser.tenantUserId.
- **P0 lịch sử:** P0-T01, P0-T02, P0-T03 **APPROVED theo v1.0**; chỉ audit/document, không chỉnh application code hoặc chạy migration. Kết quả review và test baseline được bảo lưu ở phần dưới.
- **Cảnh báo phạm vi:** Đề xuất app thuộc tenant, migration/backfill và quản lý TenantUser/AppUser đa tầng trong P0-T03 là **SUPERSEDED (v1.0)** — KHÔNG triển khai dù nội dung audit cũ đã được duyệt.
- **Active Phase / Task:** **P5 / P5-T01 — Security regression, E2E an toàn với DB cô lập, typecheck/build, README, Codex final review**.
- **Implementer status:** **READY_FOR_REVIEW**; P5-T01 đã được Codex nghiệm thu.
- **Reviewer verdict:** **APPROVED** (P5-T01, Codex re-review 2026-11-04); P5-F001 RESOLVED.
- **Next action:** P5-T01 DONE. Reviewer xác nhận response `GET /status` không còn `handshake.owner`, UI chỉ dùng `appName`/`applicationStatus`; chạy Demo unit 85/85 PASS. Auth unit 339/339, 3 typecheck, 2 build, Prisma validate và JS syntax đã PASS ở lượt review trước; E2E DB cô lập 41/41 do Anti ghi, reviewer chưa chạy lại. Live Google/Facebook OAuth thật NOT VERIFIED.
- **Source snapshot hiện tại:** branch `main`, HEAD `fde93a8f25a1131b0de22de6bb6c1c10357e371d`. Sửa đổi trong P5-T01: `demo-service/src/orders/orders.controller.ts` (loại bỏ handshake.owner khỏi GET /status), `demo-service/src/orders/orders.controller.spec.ts` (assert không rò rỉ owner trong GET /status), `demo-service/src/auth-client/public-login.spec.ts` (+1 test unauthenticated checkHandshake, tổng 21 tests), `README.md` (đồng bộ luồng OAuth 2 nút, API bảo vệ GET /auth/protected, phân quyền độc lập v2.0), `demo-service/README.md` (chuẩn hóa 4 chức năng và GET /auth/protected tối thiểu), `auth-service/README.md` (giữ nguyên vẹn kiến trúc định danh tập trung và multi-tenant). 0 migration mới.

## CHECKLIST — KẾ HOẠCH v2.0

`[x]` chỉ khi Codex đã APPROVED task tương ứng. Các P0 `[x]` là phê duyệt **lịch sử theo v1.0**, không phê duyệt các quyết định schema v1.0.

### P0 — Historical baseline (đã duyệt)

- [x] **P0-T01** — Source/schema/API/UI inventory và baseline unit/build/typecheck.
- [x] **P0-T02** — Trace `User`, `OAuthIdentity`, `AppUser`, `Tenant`, `Application` và Demo OAuth.
- [x] **P0-T03** — Đánh giá impact/migration của phương án **v1.0** (giữ kết quả rà soát, bỏ phần triển khai v1.0).

### P1 — Delta audit v2.0

- [x] **P1-T01** — So source thực tế với v2.0; bảng KEEP/GAP/SIMPLIFY/SAFE-REMOVE-LATER; xác nhận không cần migration mới. **NO CODE CHANGE**.

### P2 — Multi-tenant tối giản

- [x] **P2-T01** — Rà soát/chỉ sửa gap: Tenant CRUD, owner, `User.tenantId`, Apply/Approve/Reject, thành viên, Super Admin transfer/audit, phân quyền độc lập và negative tests.

### P3 — Danh tính tập trung

- [x] **P3-T01** — User đăng nhập từ Demo có mặt trong `User` chung và Console của System Admin; OAuth linking/AppUser an toàn; tenant owner chỉ thấy thành viên mình.

### P4 — Demo tối giản

- [x] **P4-T01** — Login Google/Facebook, Profile, Logout, đúng một API bảo vệ; bỏ order/tenant proxy không dùng sau dependency audit; giữ phần kỹ thuật OAuth.

### P5 — Nghiệm thu

- [x] **P5-T01** — Security regression, E2E an toàn với DB cô lập, typecheck/build, README, Codex final review.

## TASK IMPLEMENTATION / REVIEW — v2.0

| Task   | Implementer      | Changed source                                 | Tests / evidence                                                                                                                 | Codex verdict | Notes                                                                                  |
| ------ | ---------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------- |
| P1-T01 | READY_FOR_REVIEW | None (chỉ tài liệu delta audit trong TASKS.md) | Auth vitest: 287/287 PASS; Demo vitest: 72/72 PASS; Typecheck: 3/3 PASS; Build: 2/2 PASS; JS syntax: PASS; Prisma validate: PASS | APPROVED | 2026-11-04 final re-review: P1-F001/F002/F003 RESOLVED; delta map v2.0 khớp schema, quyền độc lập, 17 route Tenant, danh sách User tập trung và phụ thuộc Demo. Không có source/migration mới thuộc P1-T01. Reviewer chạy focused tenant-ui 6/6 PASS ở lượt trước; các baseline khác do Anti ghi, chưa chạy lại lượt này. Chưa kiểm chứng live OAuth/E2E hoặc client ngoài; các kiểm tra đó thuộc phase sau. |
| P2-T01 | READY_FOR_REVIEW | auth-service/src/tenants/tenants.controller.ts, auth-service/src/tenants/tenants.controller.spec.ts (new), auth-service/src/tenants/tenants.service.spec.ts, auth-service/test/tenant-ownership.e2e-spec.ts | Anti ghi Auth 325/325, Demo 72/72, E2E DB cô lập 18/18, typecheck 3/3, build 2/2 PASS; Codex chạy focused Tenant unit 93/93 PASS; reviewer không chạy lại DB E2E | APPROVED | 2026-11-04 final re-review: P2-F001/F002/F003 RESOLVED. Source và assertions E2E khớp tiêu chí; Anti ghi credential cũ bị PostgreSQL từ chối 28P01, credential mới đăng nhập được cả DB chính/test và E2E 18/18 PASS. Codex quét 7 tài liệu không còn credential URL; không có migration diff. P2-T01 DONE. |
| P3-T01 | READY_FOR_REVIEW | auth-service/src/applications/applications.controller.spec.ts, auth-service/src/applications/applications.service.spec.ts, auth-service/src/users/users.controller.spec.ts, auth-service/src/users/users.service.spec.ts, auth-service/test/centralized-identity.e2e-spec.ts (new), auth-service/test/shared-identity.e2e-spec.ts, auth-service/vitest.config.e2e.ts | Anti ghi Auth 339/339, Demo 72/72, E2E cô lập 41/41, typecheck 3/3, build 2/2 PASS; Codex chạy focused P3 unit 89/89 PASS; reviewer không chạy DB E2E | APPROVED | 2026-11-04 final re-review: P3-F001 RESOLVED. E2E hiện đi qua grant và HTTP exchange với profile OAuth giả lập đã xác minh, assert User/OAuthIdentity/AppUser/AppOAuthIdentity, danh sách System Admin, hai app cùng User, proof khi trùng email; kiểm tra scope và quyền âm. Anti ghi 41/41 E2E PASS; Codex không chạy DB E2E vì TEST_DATABASE_URL chưa cấu hình. P3-T01 DONE. |
| P4-T01 | READY_FOR_REVIEW | demo-service/src/orders/orders.controller.ts, demo-service/src/orders/orders.controller.spec.ts, demo-service/public/index.html, demo-service/public/app.js, demo-service/src/auth-client/public-login.spec.ts, demo-service/src/auth-client/guards/user-auth.guard.spec.ts, demo-service/README.md | Codex chạy Demo vitest 84/84 PASS; Anti ghi Auth 339/339, E2E cô lập 41/41, typecheck 3/3, build 2/2 PASS | APPROVED | 2026-11-04 final re-review: P4-F001/F002 RESOLVED. GET /auth/protected qua UserAuthGuard độc lập tenant, trả thông tin xác minh tối thiểu; UI chỉ hiển thị dữ liệu an toàn và không gọi /orders. Route cũ /orders, /tenant/* giữ để tương thích; không migration. P4-T01 DONE. |
| P5-T01 | READY_FOR_REVIEW | `demo-service/src/orders/orders.controller.ts`, ignored unit tests, 3 README | Anti: Demo 85/85, Auth 339/339, E2E cô lập 41/41, typecheck 3/3, build 2/2 PASS. Codex: Demo 85/85 PASS lượt này; Auth 339/339 và các gate tĩnh PASS lượt trước. Live OAuth thật NOT VERIFIED. | APPROVED | 2026-11-04 final re-review: P5-F001 RESOLVED; public `/status` không còn owner, UI vẫn nhận appName/status; P5-T01 DONE. |

## OPEN FINDINGS — v2.0

| ID  | Severity | Task | File:Line | Evidence / issue              | Minimum fix | Status |
| --- | -------- | ---- | --------- | ----------------------------- | ----------- | ------ |
| P1-F001 | MEDIUM | P1-T01 | `TASKS.md:85,131-149`; `auth-service/src/tenants/tenants.controller.ts:22-98` | Audit cũ đếm 14 route. Anti đã liệt kê đủ 17 decorator route kèm access policy; reviewer đối chiếu controller và đếm lại 17 ngày 2026-11-04. | Không cần sửa thêm; kiểm tra quyền từng route trong P2-T01. | RESOLVED |
| P1-F002 | MEDIUM | P1-T01 | `TASKS.md:164-174`; `demo-service/src/orders/tenant-ui.spec.ts:23-70`; `demo-service/src/orders/orders.module.ts:5-9` | Anti đã sửa đúng cách test nạp `app.js` và `tenant.js` qua `new URL(..., import.meta.url)`, liệt kê chính xác 6 ca DOM và tách tác động: xóa script làm test fail; gỡ controller cần cập nhật module và kiểm tra client gọi `/tenant`. Reviewer đối chiếu test/module ngày 2026-11-04; focused test đã chạy ở lượt trước: 6/6 PASS. | Không cần sửa thêm trong P1; kiểm tra client và regression khi thực hiện P4-T01. | RESOLVED |
| P1-F003 | MEDIUM | P1-T01 | `TASKS.md:112-127`; `demo-service/src/orders/orders.controller.ts:116-152`; `README.md:8,60`; `demo-service/README.md:14` | Audit cũ gộp rủi ro hệ thống thành 0%. Anti đã tách kết luận không đổi schema/migration theo v2.0 khỏi rủi ro tương thích API chưa xác minh, ghi route phụ, client ngoài và điều kiện kiểm tra trước P4. Reviewer đối chiếu source/README ngày 2026-11-04. | Không cần sửa thêm; kiểm kê client và regression API thuộc P4-T01. | RESOLVED |
| P2-F001 | HIGH | P2-T01 | `auth-service/test/tenant-ownership.e2e-spec.ts:174-217,254-293`; `auth-service/src/tenants/tenants.service.ts:197-250` | Đã bổ sung HTTP E2E trên DB cô lập: hai owner approve song song, assert HTTP `[201,409]`, request `APPROVED/CANCELLED`, `User.tenantId` khớp tenant thắng; app_user token của canonical ADMIN bị chặn global audit và admin transfer. Anti ghi 18/18 PASS; Codex đọc source và chạy focused unit 93/93 PASS, không tự chạy DB E2E. | Không cần sửa thêm cho tình huống approve hai đơn và token scope; giữ regression E2E. | RESOLVED |
| P2-F002 | MEDIUM | P2-T01 | `auth-service/test/tenant-ownership.e2e-spec.ts:236-256` | Anti đã assert approve 201, apply 409, `User.tenantId` đúng tenant A, request A APPROVED và request B không PENDING/APPROVED. Source đã đối chiếu; Anti ghi E2E 18/18 PASS, Codex chạy focused unit 93/93 PASS nhưng không chạy DB E2E. | Không cần sửa thêm; giữ assertion regression. | RESOLVED |
| P2-F003 | HIGH | P2-T01 | `TASKS.md:235-255` | Anti ghi đã thay mật khẩu PostgreSQL engine: mật khẩu cũ bị từ chối 28P01, mật khẩu mới kết nối được DB chính và DB test; E2E DB cô lập chạy lại 18/18 PASS. Codex đối chiếu bằng chứng và quét 7 tài liệu, không còn credential URL; không đọc bí mật hoặc tự thử đăng nhập. | Không cần sửa thêm; giữ bí mật trong cấu hình môi trường, không ghi vào tài liệu. | RESOLVED |
| P3-F001 | HIGH | P3-T01 | `auth-service/test/centralized-identity.e2e-spec.ts:73-177,240-282,400-441`; `auth-service/src/auth/shared-identity.service.ts:54-163` | Anti đã thay dữ liệu dựng sẵn bằng grant và HTTP POST /auth/oauth/exchange với profile giả lập đã xác minh. Test assert User mới có tenantId null, OAuthIdentity/AppUser/AppOAuthIdentity đúng app, GET /users thấy User; cùng Google subject qua app thứ hai giữ User.id; email trùng cần proof (409/401/200). Shared-identity E2E 15/15 và centralized E2E 8/8 PASS do Anti ghi; Codex đọc test/source, chạy focused unit 89/89 PASS, không chạy DB E2E. | Không cần sửa thêm trong P3; live Google/Facebook OAuth thuộc nghiệm thu sau. | RESOLVED |
| P4-F001 | HIGH | P4-T01 | `demo-service/src/orders/orders.controller.ts:111-135`; `demo-service/public/app.js:312-352`; `demo-service/src/auth-client/public-login.spec.ts:225-278` | Anti thêm GET /auth/protected qua UserAuthGuard, không gọi OrdersService; UI chuyển sang endpoint này. Unit xác nhận thành công cho User có/chưa có tenant, 401/403 qua guard và UI; Codex đối chiếu source và chạy focused 42/42 PASS. Route /orders và /tenant/* vẫn còn để tương thích. | Không cần sửa thêm cho việc tách endpoint và bỏ phụ thuộc tenant. | RESOLVED |
| P4-F002 | MEDIUM | P4-T01 | `demo-service/src/orders/orders.controller.ts:111-130`; `demo-service/public/app.js:325-353`; `demo-service/src/orders/orders.controller.spec.ts:95-135`; `demo-service/README.md:13-16` | Anti thu gọn GET /auth/protected chỉ còn authenticated, service, appId, user id/email/tenantId tùy chọn; UI tạo displayData theo allowlist. Test assert response không còn role, appRole, isTenantOwner, isAppOwner, tenantName; Codex đối chiếu source và chạy toàn bộ Demo unit 84/84 PASS. | Không cần sửa thêm trong P4; giữ response tối thiểu khi thay đổi profile sau này. | RESOLVED |
| P5-F001 | MEDIUM | P5-T01 | `demo-service/src/orders/orders.controller.ts:29-53`; `demo-service/src/orders/orders.controller.spec.ts:27-62`; `demo-service/src/auth-client/public-login.spec.ts:336-364` | Đã bỏ `handshake.owner` khỏi public `/status`; controller unit đưa dữ liệu owner giả vào upstream rồi xác nhận response không có email/userId/role. UI test xác nhận `/status` và banner app vẫn hoạt động; Codex chạy Demo 85/85 PASS ngày 2026-11-04. Không có HTTP integration test trực tiếp cho `/status`; kết luận dựa trên controller source và unit. | Không cần sửa thêm; giữ regression khi đổi handshake. | RESOLVED |

## P1-T01 DELTA AUDIT EVIDENCE (v2.0)

### 1. Hiện trạng Git và Môi trường

- **Branch:** `main`, HEAD: `fde93a8f25a1131b0de22de6bb6c1c10357e371d` (trùng khớp với commit kiểm toán tại P0).
- **Working Tree:** 0 file mã nguồn nào bị thay đổi trong P1-T01. Chỉ cập nhật tài liệu `TASKS.md`.
- **Kết quả kiểm thử Baseline thực thi dưới v2.0 (2026-11-04):**
  - Auth Service unit tests: `cd auth-service; npx vitest run` -> **25/25 files passed, 287/287 tests passed** (4.54s).
  - Demo Service unit tests: `cd demo-service; npx vitest run` -> **8/8 files passed, 72/72 tests passed** (1.12s).
  - Typecheck backend Auth: `npx --prefix auth-service tsc -p auth-service/tsconfig.build.json --noEmit` -> **0 errors**.
  - Typecheck backend Demo: `npx --prefix demo-service tsc -p demo-service/tsconfig.json --noEmit` -> **0 errors**.
  - Typecheck frontend Auth: `npx --prefix auth-service/frontend tsc -p auth-service/frontend/tsconfig.app.json --noEmit` -> **0 errors**.
  - Build Auth Service: `npm --prefix auth-service run build` (`nest build`) -> **PASS (0 errors)**.
  - Build Demo Service: `npm --prefix demo-service run build` (`nest build`) -> **PASS (0 errors)**.
  - Cú pháp script: `node --check demo-service/public/app.js` -> **PASS**.
  - Xác thực Prisma Schema: `cd auth-service; npx prisma validate` -> **Valid 🚀 (0 errors)**.

### 2. Bảng phân loại KEEP / GAP / SIMPLIFY / SAFE-REMOVE-LATER (7 khu vực)

| Khu vực                 | Hiện trạng Source thực tế                                                                                                                                                                                                                                                                              | Đối chiếu ARCHITECTURE v2.0                                                                                                                                                                       | Phân loại                        | Hành động cụ thể theo Phase                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Tenant**           | `schema.prisma:46-97` (Tenant, TenantJoinRequest, TenantAuditLog). `tenants.service.ts` & `tenants.controller.ts` (**đúng 17 route decorators**: 1. `GET /tenants/me`, 2. `GET /tenants/audit`, 3. `GET /tenants`, 4. `POST /tenants`, 5. `POST /tenants/join`, 6. `GET /tenants/join-request/my`, 7. `POST /tenants/join-request/:id/cancel`, 8. `POST /tenants/join-requests/:id/approve`, 9. `POST /tenants/join-requests/:id/reject`, 10. `POST /tenants/leave`, 11. `GET /tenants/:id`, 12. `GET /tenants/:id/join-requests`, 13. `DELETE /tenants/:id/members/:userId`, 14. `PATCH /tenants/:id`, 15. `POST /tenants/:id/transfer`, 16. `DELETE /tenants/:id`, 17. `GET /tenants/:id/audit`). | Đáp ứng đầy đủ yêu cầu: User tạo tenant tự làm chủ (`ownerUserId`), tự thuộc tenant mình (`User.tenantId = t.id`), Apply bằng tenantId, chủ duyệt, System Admin transfer/audit.                   | **KEEP**                         | - **KEEP:** Toàn bộ model và đầy đủ 17 route decorator tenant hiện có.<br>- **GAP (P2-T01):** Bao phủ toàn bộ 17 route trong ma trận phân quyền và kiểm thử tính nguyên tử transaction khi xử lý race condition (approve 2 request song song, apply khi vừa được approve).<br>- **SIMPLIFY:** Không thêm `TenantMember` hay `TenantUser`.                                                                                                                            |
| **2. User**             | `schema.prisma:34-53` (User với `id`, `email`, `role`, `tenantId` nullable). `users.controller.ts` (GET /users dành riêng ADMIN; GET /users/verify-app-user; GET /users/me; CRUD User).                                                                                                                | Đáp ứng: danh tính User duy nhất, tập trung; `tenantId` nullable (mỗi user thuộc tối đa 1 tenant hoặc chưa có tenant); System Admin quản lý toàn cục; Tenant Owner không có quyền admin hệ thống. | **KEEP**                         | - **KEEP:** Model `User` và các endpoint `/users` hiện có.<br>- **GAP (P3-T01):** Kiểm tra hiển thị `tenantId` trong danh sách System Admin; đảm bảo Tenant Owner không thể truy cập `GET /users` toàn cục (đã bảo vệ bằng `@Auth(Role.ADMIN)`).<br>- **SIMPLIFY:** Không thêm quan hệ trung gian `TenantUser`.                                                                                                                                                              |
| **3. AppUser**          | `schema.prisma:153-173` (`AppUser` liên kết `applicationId` và `userId` nullable). `applications.controller.ts:132-144` (`GET /applications/:id/users` gọi `getAppUsers` kiểm tra App Owner hoặc ADMIN).                                                                                               | Đáp ứng: `AppUser` là quan hệ thành viên giữa canonical User và Application; nhiều app có nhiều `AppUser` độc lập.                                                                                | **KEEP**                         | - **KEEP:** Model `AppUser`, quan hệ `(applicationId, userId)`, API `GET /applications/:id/users`.<br>- **GAP (P3-T01):** Xác minh hiển thị AppUser trong Console, đảm bảo Tenant Owner không can thiệp AppUser của App người khác.<br>- **SIMPLIFY:** Hủy bỏ đề xuất `AppUser.tenantUserId` và hệ thống enable/disable đa tầng của v1.0.                                                                                                                                    |
| **4. Application**      | `schema.prisma:134-151` (`Application` có `userId` FK to `User.id`). `applications.controller.ts` (8 routes) và `oauth-providers.controller.ts` (4 routes). Quyền quản lý thuộc về **App Owner** (`app.userId === user.sub`) hoặc ADMIN.                                                               | Khớp hoàn toàn: `Application.userId` là **App Owner**, độc lập với Tenant Owner; Application phục vụ users thuộc nhiều tenant hoặc chưa có tenant; KHÔNG thuộc về Tenant.                         | **KEEP**                         | - **KEEP:** Toàn bộ model `Application`, 8 routes của `ApplicationsController`, 4 routes của `OAuthProvidersController`.<br>- **GAP:** Không có gap so với v2.0.<br>- **SIMPLIFY:** Giữ nguyên tính độc lập của App Owner; không thêm `Application.tenantId`, không chuyển quyền quản lý app cho Tenant Owner.                                                                                                                                                               |
| **5. OAuth**            | `schema.prisma:100-132, 175-189` (`OAuthIdentity`, `OAuthProvider`, `AppOAuthIdentity`). `oauth.service.ts`, `shared-identity.service.ts`, `oauth-grants.service.ts`. Phân biệt Google (shared) vs Facebook (client scope); PKCE S256; cấp JWT app-scoped.                                             | Khớp: xác thực Google/Facebook an toàn; không tự động gộp User khi chưa có proof; token được bind chặt với `appId` và `sub`.                                                                      | **KEEP**                         | - **KEEP:** Toàn bộ luồng OAuth, PKCE, Single-use authorization code, cơ chế liên kết tài khoản an toàn.<br>- **GAP:** Không có gap so với v2.0.<br>- **SIMPLIFY:** Không nhồi nhét `tenantId` bắt buộc vào token hay bảng OAuth.                                                                                                                                                                                                                                            |
| **6. Console Frontend** | React SPA tại `auth-service/frontend`: 6 tabs (Overview, Applications, Providers, Users, Tenants, Account). `TenantsTab.tsx` quản lý tenant toàn diện. `UsersTab.tsx` chỉ hiển thị cho System Admin (`isAdmin`). `ApplicationsTab.tsx` cho App Owner.                                                  | Khớp: Tenant Owner quản lý thành viên/join request tại `TenantsTab`; System Admin xem toàn bộ User tại `UsersTab`; App Owner quản lý App tại `ApplicationsTab`.                                   | **KEEP**                         | - **KEEP:** Toàn bộ 6 tabs và các modals hiện hữu.<br>- **GAP (P3-T01):** Kiểm tra hiển thị thông tin tenant của User trong `UsersTab` cho System Admin.<br>- **SIMPLIFY:** Không tạo dashboard quản lý đa tầng phức tạp (Tenant -> App -> TenantUser -> AppUser) như đề xuất v1.0.                                                                                                                                                                                          |
| **7. Demo Service**     | `public/index.html` (2 nút Google/Facebook, Profile, Logout). `public/app.js` (gọi 5 API kỹ thuật: /status, /auth/providers, /auth/start, /auth/exchange, /auth/me). `orders.controller.ts` (chứa các API kỹ thuật và 3 route `/orders`). `tenants.controller.ts` (controller proxy mounted trong `OrdersModule`). `tenant.js` (script mồ côi trên UI nhưng được `tenant-ui.spec.ts:24` nạp vào vm context qua `readFileSync(new URL('../../public/tenant.js', import.meta.url), 'utf8')`). | Demo chỉ cần: Login Google/Facebook, Profile, Logout, đúng **1 API minh họa được bảo vệ**. Không có DB riêng.                                                                                     | **KEEP (OAuth + 1 Protected API) / CONDITIONAL (Proxy & Orders phụ thuộc P4)** | - **KEEP:** Các endpoint kỹ thuật phục vụ OAuth: `/status`, `/auth/providers`, `/auth/start`, `/auth/exchange`, `/auth/me` và đúng 1 API bảo vệ (`GET /orders`).<br>- **GAP (P4-T01):** Bổ sung nút/vùng gọi thử API bảo vệ trên `index.html` để kiểm chứng token sau login.<br>- **CONDITIONAL (P4-T01):** KHÔNG gỡ bỏ ngay; chỉ gỡ `tenant.js`, `tenants.controller.ts` và rút gọn `/orders` sau khi: (1) đối chiếu client bên ngoài và cập nhật `OrdersModule`, (2) gỡ bỏ đồng bộ test suite `tenant-ui.spec.ts` trước khi xóa `tenant.js` (tránh fail test do `readFileSync`), (3) xác nhận không gãy route phụ thuộc. |

### 3. Phân định Quyền hạn và Phân lập 3 Chủ thể (Quy tắc v2.0)

- **System Admin (`role = ADMIN`):**
  - Quản trị toàn bộ hệ thống; xem danh sách `User` toàn cầu (`GET /users` qua `UsersTab`); can thiệp chuyển chủ sở hữu Tenant với lý do bắt buộc (`POST /tenants/:id/transfer`); xem toàn bộ audit log hệ thống (`GET /tenants/audit`).
  - Không đồng nhất với App Owner hay Tenant Owner.
- **App Owner (`Application.userId === currentUser.sub`):**
  - Toàn quyền quản trị Application do mình sở hữu: cấu hình provider Google/Facebook (`/applications/:id/auth-methods`), AppID/AppToken (`/applications/:id/regenerate-token`), redirect URIs, xem danh sách người dùng cuối của app (`GET /applications/:id/users`).
  - Không được cấp quyền quản trị Tenant, không được duyệt thành viên tenant trừ khi đồng thời là Tenant Owner của tenant đó.
- **Tenant Owner (`Tenant.ownerUserId === currentUser.sub`):**
  - Quản trị thành viên trong Tenant của mình (`GET /tenants/me`, `DELETE /tenants/:id/members/:userId`), duyệt hoặc từ chối yêu cầu gia nhập (`POST /tenants/join-requests/:id/approve`, `reject`), xem audit log tenant mình (`GET /tenants/:id/audit`).
  - Không tự động có quyền trên Application; không được quản lý hay xem cấu hình App trừ khi đồng thời là App Owner của app đó.
  - Khi loại thành viên khỏi tenant: chỉ cập nhật `User.tenantId = null`, tuyệt đối **không xóa** bản ghi `User` toàn cục.
- **Tenant Member (`User.tenantId === Tenant.id` nhưng không phải owner):**
  - Người dùng bình thường thuộc doanh nghiệp; có thể tự rời tenant (`POST /tenants/leave`); không có quyền duyệt thành viên, không quản trị App.
- **App User (Người dùng đăng nhập qua Demo App):**
  - Xác thực qua OAuth Google/Facebook; tự động tạo/liên kết canonical `User` với `tenantId = null` (nếu chưa có tenant) và tạo `AppUser` thuộc về Application; không bắt buộc phải thuộc tenant mới được đăng nhập.

### 4. Khẳng định về Schema, Migration và Đánh giá Rủi ro

- **Database Schema Invariant (0% Schema Change):**
  - Số lượng Prisma Models giữ nguyên đúng **9 models** hiện hữu (`User`, `Tenant`, `TenantJoinRequest`, `TenantAuditLog`, `OAuthIdentity`, `OAuthProvider`, `Application`, `AppUser`, `AppOAuthIdentity`).
  - Thêm bảng mới: **0 bảng** (Không thêm `TenantMember`, `TenantUser`).
  - Thêm cột mới: **0 cột** (Không thêm `Application.tenantId`, `AppUser.tenantUserId`).
  - Migration DDL: **0 migration** (Không chạy bất kỳ file migration DDL nào).
  - Dữ liệu chuyển đổi / Backfill: **0 backfill** (Không chuyển đổi hay di chuyển dữ liệu).
  - Rủi ro phá vỡ schema database hoặc mất dữ liệu DB: **0%**.

- **Rủi ro Tương thích Ứng dụng & API (CHƯA XÁC MINH / UNVERIFIED RISK):**
  - *Căn cứ hiện trạng:* `README.md:8,60` và `demo-service/README.md:14` ghi nhận các endpoint `/orders` (`POST /orders`, `GET /orders/:id`) và controller proxy `/tenant/*` vẫn đang được duy trì ở backend Demo nhằm giữ tương thích với client bên ngoài và các kịch bản test trước đó.
  - *Tác động rủi ro:* Việc P4-T01 rút gọn Demo loại bỏ các route `/orders` phụ hoặc gỡ bỏ proxy `/tenant/*` tiềm ẩn nguy cơ phá vỡ tương thích (breaking change) đối với các client bên ngoài hoặc làm fail test suite nếu gỡ bỏ đơn phương.
  - *Tiêu chuẩn & Tiêu chí kiểm soát trước khi xóa tại P4-T01:*
    1. Kiểm kê và xác minh toàn bộ các client / harness gọi vào cổng 3001 (bao gồm cả yêu cầu chấm điểm của giảng viên).
    2. Đồng bộ tái cấu trúc / loại bỏ test suite `tenant-ui.spec.ts` (6 tests) trước khi xóa file `tenant.js`.
    3. Gỡ bỏ `TenantsController` khỏi `OrdersModule` và hàm `tenantRequest` trong `AuthClientService` theo đúng thứ tự dependency.
    4. Chạy full regression test suite (`vitest run`, build, typecheck) cả trước và sau khi dọn dẹp để đảm bảo 0 regression.

### 5. Phân tích Phụ thuộc Demo Service và Danh mục 17 Route Tenant

#### A. Danh mục đầy đủ 17 Route Decorator của `TenantsController` (`auth-service`)
Căn cứ đối chiếu trực tiếp mã nguồn `auth-service/src/tenants/tenants.controller.ts:22-98`:
1. `GET /tenants/me` (line 22): Mọi người dùng đã đăng nhập -> trả về ngữ cảnh tenant, yêu cầu pending, cờ quyền.
2. `GET /tenants/audit` (line 25): System Admin chỉ định (`requirePlatformAdmin`, chặn 403 đối với non-admin).
3. `GET /tenants` (line 28): Người dùng đã đăng nhập (System Admin xem tất cả; User thường xem tenant mình).
4. `POST /tenants` (line 31): Người dùng chưa có tenant (`tenantId == null`, chặn 409 nếu đã có tenant).
5. `POST /tenants/join` (line 34): Người dùng chưa có tenant xin gia nhập (`tenantId == null`, chặn 409 nếu đã có tenant/yêu cầu pending).
6. `GET /tenants/join-request/my` (line 39): Người dùng xem yêu cầu gia nhập pending của bản thân.
7. `POST /tenants/join-request/:id/cancel` (line 44): Người nộp đơn hủy yêu cầu pending của chính mình.
8. `POST /tenants/join-requests/:id/approve` (line 49): Chủ doanh nghiệp (`Tenant.ownerUserId`) duyệt đơn gia nhập.
9. `POST /tenants/join-requests/:id/reject` (line 54): Chủ doanh nghiệp (`Tenant.ownerUserId`) từ chối đơn gia nhập kèm lý do.
10. `POST /tenants/leave` (line 63): Thành viên rời tenant (Chủ doanh nghiệp bị chặn 409, phải chuyển chủ trước).
11. `GET /tenants/:id` (line 68): Chủ sở hữu, thành viên thuộc tenant `:id`, hoặc System Admin.
12. `GET /tenants/:id/join-requests` (line 71): Chủ doanh nghiệp (`Tenant.ownerUserId`) xem danh sách đơn xin gia nhập.
13. `DELETE /tenants/:id/members/:userId` (line 76): Chủ doanh nghiệp loại thành viên (Chặn loại chủ; gán `targetUser.tenantId = null`).
14. `PATCH /tenants/:id` (line 85): Chủ doanh nghiệp cập nhật tên / mô tả tenant.
15. `POST /tenants/:id/transfer` (line 90): Chủ doanh nghiệp hoặc System Admin can thiệp (bắt buộc lý do) chuyển chủ sở hữu.
16. `DELETE /tenants/:id` (line 95): Chủ doanh nghiệp xóa tenant (Chặn nếu còn thành viên khác).
17. `GET /tenants/:id/audit` (line 98): Chủ doanh nghiệp của `:id` hoặc System Admin xem nhật ký kiểm toán tenant.

#### B. Phụ thuộc Module / Service / Test của Demo Service (Chuẩn bị cho P4-T01)
1. **Các endpoint kỹ thuật bắt buộc GIỮ:**
   - `GET /status` (`orders.controller.ts:30-57`): Handshake giữa Demo và Auth Service để kiểm tra kết nối qua AppID & AppToken.
   - `GET /auth/providers` (`orders.controller.ts:63-66`): Khám phá các nhà cung cấp OAuth đang được bật trong Auth Service.
   - `POST /auth/start` (`orders.controller.ts:68-88`): Khởi tạo quy trình PKCE và trả về `authorizeUrl` để chuyển hướng trình duyệt.
   - `POST /auth/exchange` (`orders.controller.ts:95-104`): Đổi mã ủy quyền một lần (single-use authorization code) và PKCE verifier lấy app-scoped JWT.
   - `GET /auth/me` (`orders.controller.ts:106-110`): Trả về thông tin profile người dùng đã đăng nhập (bảo vệ bởi `UserAuthGuard`).
2. **Endpoint minh họa được bảo vệ DUY NHẤT:**
   - `GET /orders` (`orders.controller.ts:116-124`): Bảo vệ bởi `UserAuthGuard` (ủy quyền xác thực sang Auth Service `GET /users/verify-app-user`).
3. **Chi tiết các liên kết phụ thuộc thực tế của `/tenant` và `tenant.js` (KHÔNG ĐƯỢC GỠ ĐƠN PHƯƠNG):**
   - **Module Dependency:** `demo-service/src/orders/orders.module.ts:5,9` khai báo `import { TenantsController } from './tenants.controller.js'` và đưa vào `controllers: [OrdersController, TenantsController]`.
   - **Controller Dependency:** `demo-service/src/orders/tenants.controller.ts:1-43` export 8 route proxy: `GET /tenant/me`, `GET /tenant`, `POST /tenant`, `GET /tenant/:id`, `PATCH /tenant/:id`, `POST /tenant/:id/transfer`, `DELETE /tenant/:id`, `GET /tenant/:id/audit`.
   - **Service Dependency:** `demo-service/src/auth-client/auth-client.service.ts:245-265` triển khai hàm `tenantRequest()` để forward HTTP request sang Auth Service.
   - **Test Dependency (`tenant-ui.spec.ts`):** `demo-service/src/orders/tenant-ui.spec.ts:23-24` nạp script vào `node:vm` context bằng `readFileSync(new URL('../../public/app.js', import.meta.url), 'utf8')` và `readFileSync(new URL('../../public/tenant.js', import.meta.url), 'utf8')` (không dùng `path.join(process.cwd(), ...)`). Test suite gồm đúng 6 ca test kiểm thử logic DOM/UI thuần túy:
     1. Cung cấp chức năng tạo tenant cho user chưa có công ty (`offers tenant creation to users who do not have a company`).
     2. Chỉ hiển thị các nút điều khiển quản lý (`updateTenant`, `transferTenant`, `deleteTenant`, email thành viên) cho owner hoặc System Admin (`shows management controls only to the owner or system admin`).
     3. Bắt buộc nhập lý do (`name="reason" required`) và ẩn nút của owner khi System Admin can thiệp vào công ty khác (`requires a reason when a system admin intervenes in another company and hides owner-only controls`).
     4. Escape HTML tên và mô tả công ty chống XSS trước khi render (`escapes company names and descriptions before rendering`).
     5. Hiển thị thông báo lỗi API kèm nút hành động thử lại (`shows API errors with a retry action`).
     6. Bỏ qua / không render dữ liệu tenant từ phản hồi mạng đến trễ sau khi user đã logout (`does not render a late profile response after logout`).
   - **Tách bạch hệ quả phụ thuộc (Decoupled Dependency Impact):**
     - *Xóa file `public/tenant.js`:* Do `tenant-ui.spec.ts:24` đọc trực tiếp file này qua `fs.readFileSync`, nếu xóa hoặc đổi tên `tenant.js` mà chưa gỡ bỏ/sửa suite test `tenant-ui.spec.ts`, test suite sẽ bị lỗi `ENOENT` / fail ngay lập tức (6/6 tests).
     - *Gỡ bỏ `TenantsController`:* Vì `tenant-ui.spec.ts` chỉ chạy script DOM trong `node:vm` với mock `fetch`, không mount NestJS application hay controller, việc gỡ bỏ riêng `TenantsController` **không làm fail** `tenant-ui.spec.ts`. Tuy nhiên, việc gỡ bỏ controller bắt buộc phải cập nhật `OrdersModule` (`demo-service/src/orders/orders.module.ts:5,9`) để tránh lỗi biên dịch TypeScript/NestJS, và sẽ trả về 404 đối với các client bên ngoài gọi vào `http://localhost:3001/tenant/*`.
   - **External Compatibility:** `README.md:8,60` và `demo-service/README.md:14` ghi nhận các route này phục vụ tích hợp bên ngoài; việc loại bỏ phải có kế hoạch kiểm tra tương thích kỹ lưỡng trong P4-T01.

## P2-T01 IMPLEMENTATION & VERIFICATION EVIDENCE (v2.0)

### 1. Mục tiêu và Tiêu chí nghiệm thu (Đối chiếu PLAN.md v2.0)
- **Tenant CRUD:** User chưa thuộc tenant tạo tenant và làm chủ (`ownerUserId = user.id`); tự động gán `User.tenantId = tenant.id` ngay trong transaction; `User.tenantId` là nullable; người đã thuộc tenant bị chặn 409 khi tạo thêm.
- **Yêu cầu gia nhập (Apply/Approve/Reject/Cancel):** Nộp đơn bằng `tenantId`, tạo `TenantJoinRequest` trạng thái `PENDING`; chủ doanh nghiệp duyệt (`APPROVE`) hoặc từ chối (`REJECT`) kèm lý do; giao dịch nguyên tử kiểm tra chống một user được duyệt vào 2 tenant; hủy đơn (`CANCEL`) khi tự tạo tenant hoặc người nộp đơn chủ động hủy; không cấp quyền chéo.
- **Quản lý thành viên & Chuyển chủ:** Chủ xem danh sách thành viên và loại thành viên (`tenantId = null`, giữ nguyên bản ghi `User`); chủ không tự rời hoặc bị loại (phải chuyển chủ trước); thành viên bình thường có thể tự rời tenant; Super Admin can thiệp chuyển chủ bắt buộc có lý do và ghi `TenantAuditLog`.
- **Phân định quyền 3 chủ thể & Chống IDOR:** Phân lập tuyệt đối giữa **App Owner**, **Tenant Owner** và **System Admin**. App Owner không có quyền duyệt thành viên, xem thông tin nội bộ hay quản trị tenant người khác. Tenant Owner không có quyền xem thông tin platform toàn cục hoặc quản trị app. Không tự nâng quyền bằng email hay sở hữu app.
- **Phạm vi mã nguồn:** Không tạo bất kỳ bảng mới nào (`TenantMember`, `TenantUser`); không thêm quan hệ `Application.tenantId`; không chạy migration mới (0 migration DDL).

### 2. Các thay đổi mã nguồn thực tế trong P2-T01
1. **Chuẩn hóa Actor Resolution trong `TenantsController` (`auth-service/src/tenants/tenants.controller.ts:15-20`):**
   - *Vấn đề phát hiện:* Trước đây `actor(user: JwtPayload)` chỉ trả về chuỗi `id` (`user.sub` hoặc `user.userId!`), khiến `TenantsService` coi mọi đầu vào chuỗi là type `'platform'`, dẫn tới rủi ro token `app_user` (nếu user có role ADMIN ở DB) bị nhầm thành Platform Admin.
   - *Khắc phục:* Trả về đối tượng `TenantActor` đầy đủ: `{ id: user.type === 'platform' ? user.sub : (user.userId || user.sub), type: user.type || 'platform' }`. Điều này đảm bảo cờ `isPlatformAdmin = type === 'platform' && user.role === Role.ADMIN` luôn đánh giá chính xác `false` đối với token `app_user`.
2. **Tạo mới test suite Unit cho Controller (`auth-service/src/tenants/tenants.controller.spec.ts` — 31 tests):**
   - Kiểm thử toàn diện đầy đủ 17 route decorator của `TenantsController`:
     - Route 1: `GET /tenants/me` (actor resolution cho Platform, AppUser, Fallback).
     - Route 2: `GET /tenants/audit` (toàn cục, kiểm tra lan truyền ForbiddenException cho non-admin).
     - Route 3: `GET /tenants` (danh sách tenant).
     - Route 4: `POST /tenants` (tạo tenant, kiểm tra lan truyền ConflictException).
     - Route 5: `POST /tenants/join` (nộp đơn xin gia nhập, NotFoundException khi sai ID).
     - Route 6: `GET /tenants/join-request/my` (xem đơn của mình).
     - Route 7: `POST /tenants/join-request/:id/cancel` (hủy đơn, ForbiddenException khi không sở hữu đơn).
     - Route 8: `POST /tenants/join-requests/:id/approve` (duyệt đơn, ForbiddenException khi không phải chủ).
     - Route 9: `POST /tenants/join-requests/:id/reject` (từ chối kèm lý do DTO).
     - Route 10: `POST /tenants/leave` (thành viên rời, ConflictException khi chủ tự rời).
     - Route 11: `GET /tenants/:id` (chi tiết tenant, ForbiddenException khi truy cập tenant khác).
     - Route 12: `GET /tenants/:id/join-requests` (danh sách đơn của tenant).
     - Route 13: `DELETE /tenants/:id/members/:userId` (loại thành viên, ConflictException khi loại chủ).
     - Route 14: `PATCH /tenants/:id` (cập nhật tên/mô tả).
     - Route 15: `POST /tenants/:id/transfer` (chuyển quyền sở hữu, BadRequestException khi thiếu lý do).
     - Route 16: `DELETE /tenants/:id` (xóa tenant, ConflictException khi còn thành viên).
     - Route 17: `GET /tenants/:id/audit` (nhật ký kiểm toán cụ thể của tenant).
   - Kiểm tra xử lý token `platform` vs `app_user` vs fallback legacy.
3. **Mở rộng ma trận phân quyền và chống IDOR trong `auth-service/src/tenants/tenants.service.spec.ts` (+7 tests, tổng 62 tests):**
   - IDOR: Chặn App Owner xem chi tiết tenant mà mình không thuộc về (`ForbiddenException: Không được truy cập doanh nghiệp khác`).
   - Cross-boundary: Chặn App Owner duyệt đơn gia nhập của tenant mình không làm chủ.
   - Cross-boundary: Chặn App Owner loại thành viên khỏi tenant mình không làm chủ.
   - Cross-boundary: Chặn App Owner cập nhật hoặc xóa tenant người khác.
   - Privilege boundary: Tenant Owner không có quyền admin hệ thống (bị chặn xem audit toàn cục `audit()`, query `list()` chỉ lấy đúng tenant của mình).
   - Privilege boundary: System Admin không thể vượt mặt Tenant Owner để cập nhật thông tin tenant hoặc tự ý loại thành viên (bị chặn 403; chỉ được can thiệp chuyển chủ khi có lý do).

### 3. Kết quả kiểm thử thực tế (100% PASS)
- **Auth Service Unit Tests:** `cd auth-service; npx vitest run` -> **26/26 files passed, 325/325 tests passed** (10.58s). (Tăng từ 287 lên 325 tests: +31 tests controller, +7 tests service matrix).
- **Demo Service Unit Tests:** `cd demo-service; npx vitest run` -> **8/8 files passed, 72/72 tests passed** (2.35s).
- **Focused Tenants Controller:** `cd auth-service; npx vitest run src/tenants/tenants.controller.spec.ts` -> **31/31 tests passed** (58ms).
- **Focused Tenants Service:** `cd auth-service; npx vitest run src/tenants/tenants.service.spec.ts` -> **62/62 tests passed** (1786ms).
- **Typecheck (3/3):**
  - Backend Auth (`tsconfig.build.json`): **PASS (0 errors)**.
  - Backend Demo (`tsconfig.json`): **PASS (0 errors)**.
  - Frontend Auth (`tsconfig.app.json`): **PASS (0 errors)**.
- **Build (2/2):**
  - `npm --prefix auth-service run build`: **PASS (0 errors)**.
  - `npm --prefix demo-service run build`: **PASS (0 errors)**.
- **Prisma Schema validate:** `cd auth-service; npx prisma validate`: **Valid 🚀 (0 errors)**.
- **Database Schema & Migrations:** 0 bảng mới, 0 cột mới, 0 migration DDL, 0 backfill.

### 4. Khắc phục P2-F001, P2-F002, P2-F003 — Kiểm thử E2E trên Database PostgreSQL cô lập (`identity_task5_p2`)
- **Môi trường Database cô lập & Thu hồi credential (Khắc phục triệt để P2-F003):**
  - Database riêng biệt: `identity_task5_p2` (tạo trên PostgreSQL localhost, hoàn toàn cô lập khỏi `auth_service_db`).
  - Schema đồng bộ bằng: `npx prisma db push --url="$env:TEST_DATABASE_URL"` (Done in 790ms, 0 migration DDL).
  - **Thu hồi và thay thế credential trong PostgreSQL engine (Engine-level revocation):**
    - Đã thực thi lệnh quản trị trực tiếp trên PostgreSQL engine: `ALTER USER "postgres" WITH PASSWORD '<strong_random_secret>'`.
    - **Kiểm chứng 1 (Vô hiệu hóa mật khẩu cũ):** Kết nối với thông tin đăng nhập cũ lập tức thất bại và bị engine từ chối với mã lỗi `28P01 (password authentication failed for user "postgres")`. Xác nhận mật khẩu cũ đã hoàn toàn vô hiệu lực.
    - **Kiểm chứng 2 (Kích hoạt mật khẩu mới):** Kết nối với thông tin đăng nhập mới thành công trên database chính (`auth_service_db`), xác nhận `SELECT current_user, current_database()` trả về `postgres, auth_service_db`.
    - **Kiểm chứng 3 (Kích hoạt mật khẩu mới trên DB test):** Kết nối với thông tin đăng nhập mới thành công trên database test cô lập (`identity_task5_p2`), xác nhận `SELECT current_user, current_database()` trả về `postgres, identity_task5_p2`.
    - Cập nhật an toàn file `auth-service/.env` với chuỗi kết nối chứa mật khẩu mới.
    - Tuyệt đối không lưu giá trị mật khẩu trong tài liệu hay chat; các câu lệnh kiểm thử và CI/CD sử dụng biến môi trường `$env:TEST_DATABASE_URL`.
- **Các ca kiểm thử đã bổ sung vào `auth-service/test/tenant-ownership.e2e-spec.ts` (+3 tests, tổng 18 tests):**
  1. *Ngăn duyệt đồng thời vào 2 tenant (Concurrent Approve — Khắc phục P2-F001):*
     - Tạo 2 yêu cầu `PENDING` của cùng 1 applicant vào 2 tenant khác nhau (`tenantA`, `tenantB`) trực tiếp trong DB.
     - Hai chủ doanh nghiệp gửi đồng thời HTTP `POST /tenants/join-requests/:id/approve` qua `Promise.all`.
     - *Kết quả thực tế:* HTTP response statuses là `[201, 409]`; trong DB trạng thái 2 request là `['APPROVED', 'CANCELLED']`; `User.tenantId` được gán chính xác theo đúng tenant thắng (winning tenant).
  2. *Đua giữa applyJoin và approveJoinRequest (Race apply-approve — Khắc phục P2-F002):*
     - Applicant có đơn pending tại tenant A; chủ A gửi approve đồng thời với việc applicant gửi `POST /tenants/join` xin vào tenant B.
     - *Khắc phục P2-F002:* Siết chặt assertion: kiểm tra `approveRes.status === 201`, `applyRes.status === 409` (bảo đảm API trả về Conflict chính xác, không xảy ra 500 Internal Server Error); `User.tenantId` thuộc về tenant A; `reqA.status === 'APPROVED'`; `reqB` không ở trạng thái `PENDING` và không ở trạng thái `APPROVED`.
     - *Kết quả thực tế:* 100% assertions PASS; race được giải quyết an toàn ở tầng cơ sở dữ liệu/giao dịch.
  3. *Chặn quyền platform admin đối với token app_user của canonical ADMIN:*
     - User trong DB có `Role.ADMIN`, tạo Application và nhận app-scoped token (`type: 'app_user', appId, userId`).
     - Gọi `GET /tenants/me` -> trả về `isSystemAdmin: false` (không nhận nhầm thành Platform Admin).
     - Gọi `GET /tenants/audit` (global audit log) -> trả về **403 Forbidden**.
     - Gọi `POST /tenants/:id/transfer` (can thiệp chuyển chủ Admin) -> trả về **403 Forbidden**.
- **Lệnh chạy và kết quả E2E thực tế sau khi đổi credential (Khắc phục P2-F003):**
  - Lệnh:
    ```powershell
    $raw = (Get-Content auth-service/.env | Where-Object { $_ -match '^DATABASE_URL=' }) -replace '^DATABASE_URL=', ''
    $env:DATABASE_URL = $raw.Trim('"').Trim("'") -replace 'auth_service_db', 'identity_task5_p2'
    cd auth-service
    npx vitest run --config vitest.config.e2e.ts test/tenant-ownership.e2e-spec.ts
    ```
  - Kết quả: **1/1 test file passed, 18/18 tests passed** (duration 2.68s, test execution 868ms).

## P3-T01 IMPLEMENTATION & VERIFICATION EVIDENCE (v2.0)

### 1. Mục tiêu và Tiêu chí nghiệm thu (Đối chiếu PLAN.md v2.0)
- **Tập trung danh tính (Centralized Identity):** User đăng nhập từ ứng dụng bên ngoài (Demo App) được lưu trong bảng `User` chung của Auth Service với `tenantId = null` (nếu chưa thuộc tenant) và có bản ghi `AppUser` gắn đúng Application; User chưa có tenant vẫn đăng nhập app bình thường.
- **Không nhân bản User (No Duplicate Accounts):** Một User dùng nhiều ứng dụng với danh tính đã liên kết hợp lệ vẫn chỉ là một bản ghi canonical `User` duy nhất trong DB; mỗi ứng dụng có bản ghi `AppUser` tương ứng; bảo vệ liên kết tài khoản (`ACCOUNT_LINK_REQUIRED` khi cần chứng minh mật khẩu/linkToken).
- **Console & API System Admin:** System Admin (`Role.ADMIN`) gọi `GET /users` xem được toàn bộ danh tính toàn cầu, bao gồm cả User lần đầu đăng nhập qua ứng dụng bên ngoài; không lọc nhầm người dùng Project 1.
- **Phân định ranh giới 3 chủ thể:**
  - **Tenant Owner:** Chỉ xem danh sách thành viên tenant mình; bị chặn **403 Forbidden** khi gọi `GET /users` toàn cục hoặc `GET /applications/:id/users`. Loại thành viên tenant chỉ gán `tenantId = null`, tuyệt đối không xóa User hay AppUser.
  - **App Owner:** Xem danh sách `AppUser` thuộc app mình qua `GET /applications/:id/users`; bị chặn **403 Forbidden** khi xem app người khác hoặc gọi `GET /users` toàn cục; không nhầm quyền tenant.
  - **App User:** Token app-scoped (`type: 'app_user'`) bị cách ly chặt chẽ; token của App A không dùng được cho App B; token app_user của canonical ADMIN không được cấp quyền Platform Admin (RolesGuard chặn 403).
- **Phạm vi mã nguồn:** 0 bảng mới, 0 cột mới, 0 migration DDL (Schema Invariant: 9 models, 4 enums giữ nguyên).

### 2. Các thay đổi mã nguồn và kiểm thử trong P3-T01
1. **Kiểm thử Unit ApplicationsController (`auth-service/src/applications/applications.controller.spec.ts` — +2 tests, tổng 17 tests):**
   - Bổ sung ca kiểm thử ủy quyền và DTO cho `getAppUsers(id, currentUser)`.
   - Bổ sung kiểm tra Security Metadata `@Auth()` cho phương thức `getAppUsers`.
2. **Kiểm thử Unit ApplicationsService (`auth-service/src/applications/applications.service.spec.ts` — +4 tests, tổng 36 tests):**
   - Kiểm tra App Owner xem danh sách AppUser của chính ứng dụng mình.
   - Kiểm tra System Admin có quyền xem danh sách AppUser của bất kỳ ứng dụng nào.
   - Kiểm tra chặn `ForbiddenException (403)` đối với Tenant Owner hoặc người dùng khác không sở hữu ứng dụng.
   - Kiểm tra ném `NotFoundException (404)` khi ứng dụng không tồn tại.
3. **Kiểm thử Unit UsersController (`auth-service/src/users/users.controller.spec.ts` — +5 tests, tổng 20 tests):**
   - Chặn `ForbiddenException (403)` khi token `app_user` thuộc app khác (`identity.appId !== app.appId`).
   - Chặn `ForbiddenException (403)` khi user resolved thuộc app khác (`user.appId !== app.appId`).
   - Ném `NotFoundException (404)` khi user không tồn tại trong database.
   - Đánh dấu chính xác `isAppOwner: true` khi `user.userId === app.userId`.
   - Xử lý chính xác người dùng chưa thuộc tenant (`tenantId: null, tenantName: null, isTenantOwner: false, role: USER`).
4. **Kiểm thử Unit UsersService (`auth-service/src/users/users.service.spec.ts` — +3 tests, tổng 16 tests):**
   - `findAll`: trả về toàn bộ User (kể cả user không có tenant `tenantId: null` từ app ngoài) sắp xếp theo `createdAt: desc`.
   - `findById`: trả về `null` nếu `appUser.user` bị thiếu.
   - `findById`: trả về thông tin app_user không có tenant (`tenantId: null`, `isTenantOwner: false`).
5. **Tạo mới test suite E2E trên Database PostgreSQL cô lập (`auth-service/test/centralized-identity.e2e-spec.ts` — 8 tests):**
   - Test 1: Luồng Demo OAuth exchange tự động tạo User chung, OAuthIdentity, AppUser, AppOAuthIdentity và xuất hiện qua `GET /users` (`tenantId: null`, không lọc nhầm).
   - Test 2: Tenant Owner bị chặn khỏi danh sách User toàn cục (403) và chỉ thấy thành viên tenant mình.
   - Test 3: App Owner chỉ truy cập phạm vi app của mình; bị chặn khỏi GET /users (403) và app người khác (403); Tenant Owner bị chặn xem app (403).
   - Test 4: Một User dùng nhiều app qua OAuth exchange giữ nguyên 1 User.id, tạo 2 AppUser và 2 AppOAuthIdentity.
   - Test 5: Cross-App Token Rejection: Token OAuth của App A không dùng được cho App B tại verify-app-user (403 'Token belongs to another application').
   - Test 6: Bảo toàn danh tính User khi loại khỏi Tenant: loại thành viên không xóa bản ghi User hay AppUser, token app vẫn verify bình thường.
   - Test 7: Token `app_user` của tài khoản canonical ADMIN không được vượt RolesGuard nền tảng (403 Forbidden).
   - Test 8: Yêu cầu proof xác minh tài khoản khi OAuth trùng email với tài khoản mật khẩu hiện hữu (ACCOUNT_LINK_REQUIRED: 409 Conflict; mật khẩu sai 401 Unauthorized; mật khẩu đúng 200 OK liên kết an toàn).
6. **Đồng bộ test suite E2E Shared Identity (`auth-service/test/shared-identity.e2e-spec.ts` — 15 tests) & Cấu hình E2E (`auth-service/vitest.config.e2e.ts`):**
   - Cập nhật dọn dẹp DB trước khi chạy, khởi tạo fixture `legacy-app` an toàn, sinh email duy nhất timestamp tránh xung đột `users_email_key`.
   - Bổ sung `fileParallelism: false` vào `vitest.config.e2e.ts` để các suite test E2E thực thi tuần tự, ngăn ngừa race condition xóa đè dữ liệu trên DB test dùng chung.

### 3. Kết quả kiểm thử thực tế (100% PASS)
- **Auth Service Unit Tests:** `cd auth-service; npx vitest run` -> **26/26 files passed, 339/339 tests passed** (5.20s). (+14 tests mới).
- **Demo Service Unit Tests:** `cd demo-service; npx vitest run` -> **8/8 files passed, 72/72 tests passed** (981ms).
- **Focused Applications Controller:** `npx vitest run src/applications/applications.controller.spec.ts` -> **17/17 tests passed**.
- **Focused Applications Service:** `npx vitest run src/applications/applications.service.spec.ts` -> **36/36 tests passed**.
- **Focused Users Controller:** `npx vitest run src/users/users.controller.spec.ts` -> **20/20 tests passed**.
- **Focused Users Service:** `npx vitest run src/users/users.service.spec.ts` -> **16/16 tests passed**.
- **E2E Database cô lập (`identity_task5_p2`):**
  - Lệnh thực thi:
    ```powershell
    $raw = (Get-Content auth-service/.env | Where-Object { $_ -match '^DATABASE_URL=' }) -replace '^DATABASE_URL=', ''
    $env:DATABASE_URL = $raw.Trim('"').Trim("'") -replace 'auth_service_db', 'identity_task5_p2'
    cd auth-service
    npx vitest run --config vitest.config.e2e.ts test/centralized-identity.e2e-spec.ts test/tenant-ownership.e2e-spec.ts test/shared-identity.e2e-spec.ts
    ```
  - `test/centralized-identity.e2e-spec.ts`: **8/8 tests passed** (843ms).
  - `test/shared-identity.e2e-spec.ts`: **15/15 tests passed** (977ms).
  - `test/tenant-ownership.e2e-spec.ts`: **18/18 tests passed** (1081ms).
  - Tổng E2E cô lập: **3/3 files passed, 41/41 tests passed** (8.66s).
- **Typecheck (3/3):**
  - Backend Auth (`tsconfig.build.json`): **PASS (0 errors)**.
  - Backend Demo (`tsconfig.json`): **PASS (0 errors)**.
  - Frontend Auth (`tsconfig.app.json`): **PASS (0 errors)**.
- **Build (2/2):**
  - `npm --prefix auth-service run build`: **PASS (0 errors)**.
  - `npm --prefix demo-service run build`: **PASS (0 errors)**.
- **Prisma Schema validate:** `cd auth-service; npx prisma validate`: **Valid 🚀 (0 errors, 0 migration DDL mới)**.

### 4. Khắc phục triệt để finding P3-F001 (E2E OAuth Grant/Exchange Pipeline)
- **Vấn đề Codex nêu:** E2E P3 trước đây tự tạo User/AppUser bằng Prisma DB trực tiếp, chưa thực thi luồng OAuth grant/exchange, chưa kiểm chứng tạo/tìm User chung, OAuthIdentity/AppOAuthIdentity và ACCOUNT_LINK_REQUIRED.
- **Giải pháp tối thiểu và hoàn chỉnh đã thực hiện:**
  1. Tái cấu trúc toàn bộ luồng đăng nhập trong `auth-service/test/centralized-identity.e2e-spec.ts` sử dụng hàm `OAuthGrantsService.issue` và gọi HTTP `POST /auth/oauth/exchange` với profile OAuth đã xác minh (không cần provider Google/Facebook bên ngoài).
  2. Bổ sung Test 1 assert chính xác việc tạo 1 `User` (`tenantId: null`), 1 `OAuthIdentity`, 1 `AppUser`, 1 `AppOAuthIdentity`; sau đó System Admin gọi `GET /users` kiểm chứng thấy User mới xuất hiện với đầy đủ thông tin an toàn.
  3. Bổ sung Test 4 mô phỏng cùng người dùng OAuth (cùng subject Google) đăng nhập vào App thứ hai qua OAuth exchange: assert giữ nguyên đúng 1 canonical `User.id`, tạo 2 bản ghi `AppUser` độc lập và 2 bản ghi `AppOAuthIdentity` độc lập.
  4. Bổ sung Test 8 mô phỏng khách hàng OAuth có email trùng với tài khoản mật khẩu nền tảng hiện hữu: đổi code trực tiếp bị từ chối `409 Conflict` (`code: 'ACCOUNT_LINK_REQUIRED'`); đổi code kèm mật khẩu sai bị từ chối `401 Unauthorized`; đổi code kèm mật khẩu đúng hoàn tất liên kết an toàn (`200 OK`).
  5. Chạy toàn bộ 3 test suite E2E trên DB test cô lập `identity_task5_p2` (`tenant-ownership` 18 tests, `shared-identity` 15 tests, `centralized-identity` 8 tests), đạt 41/41 tests PASS (8.66s).

## P4-T01 IMPLEMENTATION & VERIFICATION EVIDENCE (v2.0)

### 1. Mục tiêu và Tiêu chí nghiệm thu (Đối chiếu PLAN.md v2.0)
- **Giao diện người dùng tinh gọn (Đúng 4 chức năng người dùng + 1 API bảo vệ):**
  - Chưa đăng nhập: Đúng 2 nút "Đăng nhập bằng Google" và "Đăng nhập bằng Facebook", cùng trạng thái kết nối Auth Service.
  - Sau đăng nhập: Hiển thị thông tin hồ sơ tài khoản cơ bản (Tên, Email, User ID, Provider, Verified status) kèm thông tin `tenantId` tùy chọn (nếu có thì hiển thị tên và ID doanh nghiệp; nếu không có thì hiển thị "Chưa tham gia", không bắt buộc tenant khi đăng nhập).
  - Nút Đăng xuất (`Logout`).
  - **Nút/khu vực kiểm chứng API bảo vệ:** Nút "Thử Gọi API Bảo Vệ" gọi endpoint `GET /auth/protected` kèm Bearer token để chứng minh token đúng app được Auth Service (`UserAuthGuard`) xác thực hợp lệ và phản hồi kết quả trực quan trên giao diện, hoạt động thành công cho mọi User (có hoặc chưa có tenant) mà không làm lộ nghiệp vụ đơn hàng.
- **Tương thích API backend:** Bảo lưu các endpoint kỹ thuật (`GET /status`, `GET /auth/providers`, `POST /auth/start`, `POST /auth/exchange`, `GET /auth/me`), API bảo vệ (`GET /auth/protected`, `GET /orders`) và proxy `/tenant/*` để giữ tương thích với các bài kiểm thử Task 7 và client bên ngoài.
- **Bảo mật luồng OAuth:** PKCE S256, browser-bound state, authorization code đổi một lần, AppToken chỉ lưu ở backend, không đưa JWT vào URL.
- **Phân loại dependency audit:** Không có client ngoài nào phụ thuộc vào `tenant.js` (script mồ côi không được nạp trong `index.html`); bảo toàn test suite `tenant-ui.spec.ts` (6 tests) để kiểm chứng tính an toàn của DOM rendering và encoding; mở rộng kiểm thử toàn diện `public-login.spec.ts`, `orders.controller.spec.ts` và `user-auth.guard.spec.ts`.

### 2. Chi tiết các thay đổi trong P4-T01
1. **`demo-service/src/orders/orders.controller.ts`:**
   - Bổ sung endpoint minh họa bảo vệ `GET /auth/protected` bảo vệ bằng `@UseGuards(UserAuthGuard)`.
   - Trả về verification context an toàn: `message`, `authenticated: true`, `service: 'demo-service'`, `appId`, và thông tin user không chứa dữ liệu đơn hàng. Hoạt động 200 OK cho mọi user có hoặc chưa có tenant.
2. **`demo-service/src/orders/orders.controller.spec.ts` (+2 tests, tổng 16 tests):**
   - Kiểm tra `getProtectedResource` trả về ngữ cảnh xác thực an toàn cho User có tenant (200 OK).
   - Kiểm tra `getProtectedResource` trả về ngữ cảnh xác thực an toàn cho User chưa có tenant `tenantId: null` (200 OK).
3. **`demo-service/public/index.html`:**
   - Bổ sung trường `Doanh Nghiệp (Tenant ID)` vào bảng thông tin tài khoản (hiển thị `#user-tenant-display`, mặc định "Chưa tham gia").
   - Bổ sung section `Kiểm Chứng Token (Protected API)` với nút `Thử Gọi API Bảo Vệ` (`#btn-test-protected-api`), status badge (`#api-test-status`), và vùng hiển thị kết quả JSON (`#api-test-result`) gọi `GET /auth/protected`.
4. **`demo-service/public/app.js`:**
   - Bổ sung từ khóa bản dịch `profile.tenant` và `api_test.*` cho cả tiếng Anh (`en`) và tiếng Việt (`vi`).
   - Cập nhật `updateAuthUI()` hiển thị `#user-tenant-display` theo `tenantName`/`tenantId` hoặc "Chưa tham gia" / "None".
   - Thêm hàm `testProtectedApi()` gọi `GET /auth/protected` kèm Bearer token `Authorization: Bearer ${state.token}`, xử lý các mã phản hồi HTTP 200 (thành công), 401 (token lỗi/hết hạn), 403 (token sai app / access denied), và hiển thị kết quả trực quan trên UI.
   - Cập nhật `logout()` dọn dẹp sạch sẽ kết quả test API bảo vệ (`#api-test-result` và `#api-test-status`) khi người dùng đăng xuất.
5. **`demo-service/src/auth-client/public-login.spec.ts` (+7 tests, tổng 20 tests):**
   - Kiểm tra `updateAuthUI` hiển thị `tenantId` (xử lý chính xác cả trường hợp null và có tenant).
   - Kiểm tra `testProtectedApi` từ chối gọi khi chưa đăng nhập (thông báo lỗi yêu cầu đăng nhập trước).
   - Kiểm tra `testProtectedApi` gửi đúng Bearer token tới `/auth/protected` và render kết quả 200 OK cho User chưa có tenant.
   - Kiểm tra `testProtectedApi` gửi đúng Bearer token tới `/auth/protected` và render kết quả 200 OK cho User có tenant.
   - Kiểm tra `testProtectedApi` xử lý 403 Forbidden khi token bị từ chối truy cập app.
   - Kiểm tra `testProtectedApi` xử lý 401 Unauthorized khi token lỗi/hết hạn.
   - Kiểm tra `logout` dọn dẹp sạch vùng hiển thị kết quả kiểm chứng token.
6. **`demo-service/src/auth-client/guards/user-auth.guard.spec.ts` (+3 tests, tổng 6 tests):**
   - Kiểm tra từ chối Bearer token rỗng (`UnauthorizedException`).
   - Kiểm tra lan truyền `UnauthorizedException` khi token hết hạn / không hợp lệ.
   - Kiểm tra lan truyền `ForbiddenException` khi quyền truy cập ứng dụng bị từ chối.
7. **`demo-service/README.md`:**
   - Cập nhật tài liệu phản ánh chính xác 4 chức năng người dùng + nút kiểm chứng API bảo vệ `GET /auth/protected`.

### 3. Kết quả kiểm thử thực tế (100% PASS)
- **Demo Service Unit Tests:** `powershell -Command "cd demo-service; npx vitest run"` -> **8/8 files passed, 84/84 tests passed** (929ms). (+12 tests mới).
- **Auth Service Unit Tests:** `powershell -Command "cd auth-service; npx vitest run"` -> **26/26 files passed, 339/339 tests passed** (3.89s).
- **Focused Orders Controller Tests:** `npx vitest run src/orders/orders.controller.spec.ts` -> **16/16 tests passed** (9ms).
- **Focused Public Login Tests:** `npx vitest run src/auth-client/public-login.spec.ts` -> **20/20 tests passed** (47ms).
- **Focused UserAuthGuard Tests:** `npx vitest run src/auth-client/guards/user-auth.guard.spec.ts` -> **6/6 tests passed** (5ms).
- **E2E Database cô lập (`identity_task5_p2`):**
  - Lệnh thực thi:
    ```powershell
    $raw = (Get-Content auth-service/.env | Where-Object { $_ -match '^DATABASE_URL=' }) -replace '^DATABASE_URL=', ''
    $env:DATABASE_URL = $raw.Trim('"').Trim("'") -replace 'auth_service_db', 'identity_task5_p2'
    cd auth-service
    npx vitest run --config vitest.config.e2e.ts test/centralized-identity.e2e-spec.ts test/tenant-ownership.e2e-spec.ts test/shared-identity.e2e-spec.ts
    ```
  - `test/shared-identity.e2e-spec.ts`: **15/15 tests passed** (1234ms).
  - `test/tenant-ownership.e2e-spec.ts`: **18/18 tests passed** (881ms).
  - `test/centralized-identity.e2e-spec.ts`: **8/8 tests passed** (1035ms).
  - Tổng E2E cô lập: **3/3 files passed, 41/41 tests passed** (9.87s).
- **Typecheck (3/3):**
  - Backend Auth (`tsconfig.build.json`): **PASS (0 errors)**.
  - Backend Demo (`tsconfig.json`): **PASS (0 errors)**.
  - Frontend Auth (`tsconfig.app.json`): **PASS (0 errors)**.
- **Build (2/2):**
  - `npm --prefix auth-service run build`: **PASS (0 errors)**.
  - `npm --prefix demo-service run build`: **PASS (0 errors)**.
- **Prisma Schema validate:** `cd auth-service; npx prisma validate`: **Valid 🚀 (0 errors, 0 migration DDL mới)**.
- **Cú pháp client script:** `node --check demo-service/public/app.js`: **PASS**.

### 4. Khắc phục triệt để finding P4-F001 (Endpoint minh họa API bảo vệ độc lập tenant)
- **Vấn đề Codex nêu:** Nút thử API bảo vệ trước đây gọi `GET /orders` khiến User OAuth mới (có `tenantId = null`) bị `OrdersService.findAll` ném 403 Forbidden dù token hợp lệ; trong khi User có tenant nhận danh sách đơn hàng làm lộ nghiệp vụ ngoài phạm vi Demo.
- **Giải pháp tối thiểu và hoàn chỉnh đã thực hiện:**
  1. Thêm endpoint minh họa bảo vệ `GET /auth/protected` bảo vệ bằng `UserAuthGuard` tại `OrdersController`. Endpoint này chỉ xác thực token app-scoped qua Auth Service và trả về ngữ cảnh xác thực an toàn (`authenticated: true`, `appId`, `user` context) mà không yêu cầu hay trả về bất kỳ dữ liệu đơn hàng nào.
  2. Endpoint trả về 200 OK cho cả người dùng đã có tenant và người dùng chưa thuộc tenant (`tenantId: null`), thỏa mãn tiêu chí mọi người dùng Demo đều chứng minh được token hợp lệ.
  3. Cập nhật `index.html` và `app.js` để nút "Thử Gọi API Bảo Vệ" gọi tới `GET /auth/protected`.
  4. Bảo lưu nguyên vẹn các route `/orders` và `/tenant/*` cũ ở backend để đảm bảo tương thích 100% với các client bên ngoài và kịch bản test Task 7.
  5. Bổ sung các ca kiểm thử unit bao phủ đầy đủ: 200 OK khi có/không có tenant, 401 khi token thiếu/sai/hết hạn, 403 khi token sai app. Toàn bộ 84/84 unit tests của Demo Service đạt PASS.

### 5. Khắc phục triệt để finding P4-F002 (Thu gọn response API bảo vệ, loại bỏ cờ vai trò/chủ)
- **Vấn đề Codex nêu:** `GET /auth/protected` trả `role`, `appRole`, `isTenantOwner`, `isAppOwner` và `tenantName`; `testProtectedApi` hiển thị toàn bộ JSON đó trên Demo. Khi User là chủ tenant/app bấm nút kiểm chứng sẽ thấy các cờ quản trị dù Demo chỉ được trình bày đăng nhập, profile cơ bản và kết quả xác minh token. README nói không hiển thị vai trò tenant, trái với response ban đầu.
- **Giải pháp tối thiểu và hoàn chỉnh đã thực hiện:**
  1. `demo-service/src/orders/orders.controller.ts`: Thu gọn response `GET /auth/protected` chỉ trả về đúng: `authenticated: true`, `service: 'demo-service'`, `appId`, `user: { id, email, tenantId }`, và `timestamp`. Loại bỏ hoàn toàn các cờ `role`, `appRole`, `isTenantOwner`, `isAppOwner` và trường `tenantName`.
  2. `demo-service/public/app.js`: Thêm bước sanitize `displayData` tại `testProtectedApi()` để bảo đảm trên UI chỉ hiển thị thông tin xác thực tối thiểu, không in ra các cờ quản trị hay thông tin thừa.
  3. `demo-service/README.md`: Cập nhật mô tả rõ ràng response của `GET /auth/protected` chỉ gồm thông tin xác thực tối thiểu, không chứa vai trò hay cờ chủ quyền.
  4. `demo-service/src/orders/orders.controller.spec.ts`: Cập nhật 2 unit tests cho `getProtectedResource` (cho user có tenant và user không có tenant), assert cụ thể rằng `role`, `appRole`, `isTenantOwner`, `isAppOwner`, `tenantName` đều là `undefined`.
  5. `demo-service/src/auth-client/public-login.spec.ts`: Cập nhật test UI `testProtectedApi`, assert HTTP 200 OK, kết quả JSON chứa email/tenantId nhưng không chứa cờ `isTenantOwner` hay `isAppOwner`.
  6. Toàn bộ 84/84 unit tests Demo Service, 339/339 unit tests Auth Service, 41/41 E2E DB cô lập PASS 100%.

## P5-T01 IMPLEMENTATION & VERIFICATION EVIDENCE (v2.0)

### 1. Mục tiêu và Tiêu chí nghiệm thu (Đối chiếu ARCHITECTURE.md & PLAN.md v2.0)
- **Kiểm thử hồi quy toàn diện trên database cô lập (`identity_task5_p2`):**
  - **Hai tenants:** Tạo tenant, cô lập thành viên, ngăn duyệt chéo giữa các tenant, ngăn thành viên truy cập tenant khác (`tenant-ownership.e2e-spec.ts`, `centralized-identity.e2e-spec.ts`).
  - **Hai apps:** App A và App B, token của App A bị App B từ chối với HTTP 403 Forbidden (`shared-identity.e2e-spec.ts`, `centralized-identity.e2e-spec.ts`).
  - **Quyền owner chéo:** App Owner không tự có quyền Tenant Owner và ngược lại. System Admin có quyền can thiệp theo guard (`roles.guard.ts`, `tenants.controller.ts`).
  - **Apply/Approve đồng thời:** Race condition an toàn bằng transaction atomic, chỉ 1 request APPROVED (201), request còn lại CANCELLED (409), `User.tenantId` gán chính xác (`tenant-ownership.e2e-spec.ts`).
  - **Global Users & AppUser:** Người dùng đăng nhập từ ứng dụng ngoài (Demo) được tạo/tìm canonical User trong danh sách tập trung của Auth Service (System Admin thấy qua `GET /users`), tạo `AppUser` gắn đúng Application, không nhân bản User vô cớ (`centralized-identity.e2e-spec.ts`).
  - **Redirect / PKCE / Code replay:** Bắt buộc PKCE S256, browser-bound state, mã authorization code dùng một lần duy nhất; code replay hoặc sai verifier bị từ chối 401 (`shared-identity.e2e-spec.ts`).
- **Kiểm tra an toàn bảo mật và bảo toàn dữ liệu:**
  - Tuyệt đối không lộ mật khẩu, AppToken, OAuth client secrets trong tài liệu, logs hay Git tracked files.
  - Khi thành viên rời hoặc bị loại khỏi tenant: chỉ cập nhật `User.tenantId = null`, tuyệt đối không xóa bản ghi `User` hay `AppUser` toàn cục.
  - Không xóa dữ liệu, 0% migration DDL mới (0 bảng mới, 0 cột mới).
- **Đồng bộ tài liệu dự án:**
  - Cập nhật cả 3 file README (`README.md`, `auth-service/README.md`, `demo-service/README.md`) phản ánh chính xác kiến trúc v2.0, giao diện tinh gọn và các endpoint bảo vệ.
- **Phân định kết quả:**
  - Ghi nhận `PASS` cho toàn bộ các kịch bản kiểm thử đã thực thi thật.
  - Ghi nhận `NOT VERIFIED` cho OAuth Google/Facebook trực tiếp trên production live (do chưa có credentials client ID/secret của Google/Meta thật).

### 2. Kết quả kiểm thử Baseline thực tế (100% PASS)
- **Demo Service Unit Tests:** `powershell -Command "cd demo-service; npx vitest run"` -> **8/8 files passed, 84/84 tests passed** (928ms).
- **Auth Service Unit Tests:** `powershell -Command "cd auth-service; npx vitest run"` -> **26/26 files passed, 339/339 tests passed** (3.89s).
- **E2E Suites trên Database PostgreSQL cô lập (`identity_task5_p2`):**
  - `auth-service/test/tenant-ownership.e2e-spec.ts`: **18/18 tests passed** (824ms).
  - `auth-service/test/shared-identity.e2e-spec.ts`: **15/15 tests passed** (1135ms).
  - `auth-service/test/centralized-identity.e2e-spec.ts`: **8/8 tests passed** (775ms).
  - **Tổng E2E cô lập: 3/3 files passed, 41/41 tests passed** (7.93s).
- **Typechecks (3/3):**
  - Backend Auth: `npx --prefix auth-service tsc -p auth-service/tsconfig.build.json --noEmit` -> **0 errors**.
  - Backend Demo: `npx --prefix demo-service tsc -p demo-service/tsconfig.json --noEmit` -> **0 errors**.
  - Frontend Auth: `npx --prefix auth-service/frontend tsc -p auth-service/frontend/tsconfig.app.json --noEmit` -> **0 errors**.
- **Builds (2/2):**
  - `npm --prefix auth-service run build` (`nest build`) -> **PASS (0 errors)**.
  - `npm --prefix demo-service run build` (`nest build`) -> **PASS (0 errors)**.
- **Prisma Schema validate:** `cd auth-service; npx prisma validate` -> **Valid 🚀 (0 errors, 0 migration DDL)**.
- **Cú pháp client script:** `node --check demo-service/public/app.js` -> **PASS**.
- **Quét bảo mật bí mật:** Đã kiểm tra regex `postgres:.*@` và chuỗi token/secret trên toàn bộ file tài liệu và mã nguồn -> **0 bí mật bị lộ**.
- **Live OAuth Provider (Google / Meta thật):** **`NOT VERIFIED`** (chưa có credentials production từ môi trường thật; toàn bộ luồng exchange/grant/linking đã được kiểm chứng 100% qua mock profile xác minh trong test).

### 3. Khắc phục triệt để finding P5-F001 (Thu gọn GET /status công khai, loại bỏ thông tin App Owner)
- **Vấn đề Codex nêu:** `GET /status` là endpoint công khai không guard nhưng trả về `handshake.owner` gồm `userId`, `email`, `name`, `roleInProject1`, `roleInProject2`. Demo UI chỉ cần `appName` và `applicationStatus`, việc trả thông tin chi tiết App Owner là lộ thông tin quản trị không cần thiết.
- **Giải pháp tối thiểu và hoàn chỉnh đã thực hiện:**
  1. `demo-service/src/orders/orders.controller.ts`: Loại bỏ hoàn toàn khối `owner` khỏi response `GET /status`. Response chỉ giữ lại trạng thái kết nối (`status: 'ONLINE'`, `handshakeStatus: 'SUCCESS'`, `appId`, `appName`, `handshake.authService: 'CONNECTED'`, `handshake.applicationStatus: 'ACTIVE'`), danh sách provider và timestamp.
  2. Rà soát dependency audit: Không có bất kỳ client hay script UI nào phụ thuộc `handshake.owner`. Hàm `updateHandshakeUI()` trong `demo-service/public/app.js` chỉ đọc `appName` và `applicationStatus`, hoạt động hoàn toàn bình thường.
  3. `demo-service/src/orders/orders.controller.spec.ts`: Cập nhật unit test `getStatus`, assert cụ thể `(res.handshake as any).owner` là `undefined`, và JSON stringify của response không chứa email, userId hay role của chủ app.
  4. `demo-service/src/auth-client/public-login.spec.ts`: Bổ sung unit test unauthenticated cho `checkHandshake()` (+1 test, tổng 21 tests), xác nhận gọi `GET /status` thành công, cập nhật DOM UI trực quan mà không xử lý hay hiển thị thông tin nhạy cảm của App Owner.
  5. Chạy toàn bộ 85/85 unit tests Demo Service, 339/339 unit tests Auth Service, 41/41 E2E DB cô lập PASS 100%.

## PENDING OWNER DECISIONS

Chỉ ghi khi gặp **blocker thực tế**, không suy diễn thêm yêu cầu. Owner đã xác nhận trong yêu cầu chỉnh bốn file: v2.0 thay thế phần kiến trúc v1.0; không thêm các bảng/quan hệ mở rộng. Nếu dữ liệu thực tế buộc phải migrate hoặc xóa có nguy cơ mất dữ liệu, **dừng để owner duyệt riêng**.

| ID  | Blocking task | Question                                | Recommended minimum | Owner decision |
| --- | ------------- | --------------------------------------- | ------------------- | -------------- |
| —   | —             | Chưa có blocker xác minh từ source v2.0 | —                   | —              |

---

# PHỤ LỤC — P0 LỊCH SỬ (v1.0, BẢO LƯU BẰNG CHỨNG)

**Đọc đúng ngữ cảnh:** Phụ lục này bảo lưu audit/review v1.0 để tránh làm lại việc đã làm. Những mô tả kiểu “gap vì Application chưa thuộc Tenant”, “cần TenantUser”, “cần backfill” là **nhận định thuộc đặc tả cũ đã bị thay thế**; không được đưa lại vào kế hoạch mới. Không có source nào được sửa bởi P0-T01/T02/T03.

## P0 REVIEW FINDINGS (historical; all resolved)

| ID      | Severity | Task   | File:Line                                                                                                                                                                          | Evidence / issue                                                                                                                                                                                                                                                                                                                          | Required minimum fix                                                                                                           | Status   |
| ------- | -------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------- |
| P0-F001 | MEDIUM   | P0-T02 | `TASKS.md:154-164`; `demo-service/public/app.js:229-263,284-315`; `demo-service/src/auth-client/auth-client.service.ts:163-174`                                                    | Original trace had wrong PKCE length/storage keys, redirect actor and post-login API. Anti corrected steps 2/3/6/8 to 64-char hex, `login_state`/`oauth_verifier`, browser navigation and `/auth/me`; reviewer matched source and reran focused public-login 13/13 PASS on 2026-11-04.                                                    | No further fix for this finding.                                                                                               | RESOLVED |
| P0-F002 | MEDIUM   | P0-T02 | `TASKS.md:166-170`; `auth-service/src/auth/oauth.service.ts:251`; `auth-service/src/auth/shared-identity.service.ts:84-119`                                                        | Original trace implied unconditional same-email merging. Anti now distinguishes Google shared scope from Facebook client scope and documents ACCOUNT_LINK_REQUIRED with password or proven link token; reviewer matched source on 2026-11-04.                                                                                             | No further fix for this finding; E2E execution wording is tracked separately as P0-F003.                                       | RESOLVED |
| P0-F003 | MEDIUM   | P0-T02 | `TASKS.md:155,168-171`; `demo-service/public/app.js:329-361`; `demo-service/src/auth-client/auth-client.service.ts:150-158`; `auth-service/test/shared-identity.e2e-spec.ts:28-29` | Original trace cited wrong provider-discovery lines and overstated E2E execution. Anti corrected the citations to the actual discovery functions and now labels shared-identity E2E cases as inspected, not run. Reviewer matched source and test guard on 2026-11-04. Demo public-login 13/13 PASS is separate prior execution evidence. | No further fix for this finding; isolated DB E2E remains for later phase verification.                                         | RESOLVED |
| P0-F004 | HIGH     | P0-T03 | `TASKS.md:222-236,282-285`; `auth-service/src/applications/applications.service.ts:73-99`                                                                                          | Original map inferred tenant ownership from legacy assigned owner. Anti now requires validated app-to-tenant evidence or explicit mapping for every app, including an assignee who owns a tenant, and halts migration when mapping is absent. Reviewer matched the assigned-owner behavior in source on 2026-11-04.                       | No further documentation fix; validate each real app mapping before P1-T02 backfill.                                           | RESOLVED |
| P0-F005 | HIGH     | P0-T03 | `TASKS.md:225-253`; `PLAN.md:27-29`; `auth-service/src/applications/applications.service.ts:112,153,179,242,272`                                                                   | Original map deferred tenant authorization cutover to Phase 4. Anti moved it to P2-T02, removed the proposed assigned-user OR tenant-owner overlap, and added former-owner/member/other-tenant negative cases. Reviewer matched phase contract and source on 2026-11-04. Route-path accuracy is tracked separately in P0-F008.            | No further fix for this finding; implement and test cutover in P2-T02/P2-T03.                                                  | RESOLVED |
| P0-F006 | HIGH     | P0-T03 | `TASKS.md:272-282`; `ARCHITECTURE.md:85`                                                                                                                                           | Original rollback proposed DROP CASCADE and claimed zero data loss. Anti separated transaction abort, pre-live restore, and post-live recovery; explicitly prohibited production DROP CASCADE and acknowledged new-data loss risk. Reviewer checked revised map on 2026-11-04.                                                            | No further fix for this documentation finding; concrete rollback and data checks must be validated in P1-T03 before execution. | RESOLVED |
| P0-F007 | MEDIUM   | P0-T03 | `TASKS.md:204-218,286-299`; `auth-service/prisma/schema.prisma:46-60`                                                                                                              | Original normalization could overwrite an owner belonging to another tenant. Anti now separates NULL (conditional normalization with count checks) from a non-NULL conflicting tenant (hard stop requiring owner reconciliation). Reviewer checked SQL conditions against schema on 2026-11-04.                                           | No further documentation fix; run prechecks and obtain owner decision for any actual conflict before migration.                | RESOLVED |
| P0-F008 | MEDIUM   | P0-T03 | `TASKS.md:244-271`; `auth-service/src/applications/applications.controller.ts:22-132`; `auth-service/src/oauth-providers/oauth-providers.controller.ts:27-111`                     | Original map used wrong paths and omitted routes. Anti now lists all 8 application and 4 auth-method routes, including PUT, user list, provider detail/toggle and regenerate-token; reviewer matched controller decorators on 2026-11-04.                                                                                                 | No further documentation fix; enforce and test all routes during P2-T02/P2-T03.                                                | RESOLVED |

## P0 IMPLEMENTER / CODEX REVIEW LOG (verbatim)

| Task   | Implementer status | Changed files                                                    | Tests and exact result                                                                                                                                        | Codex verdict | Review evidence / notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------ | ------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0-T01 | READY_FOR_REVIEW   | None (source inventory only)                                     | Auth vitest: 287/287 PASS (25 files); Demo vitest: 72/72 PASS (8 files); Typecheck: 3/3 PASS (0 errors); Build: 2/2 PASS (0 errors); Syntax: demo app.js PASS | APPROVED      | 2026-11-03: reviewer counted 9 models, 4 enums, 8 migrations, 12 controllers, 6 guards, 6 Console tabs/4 modals; Demo has 2 OAuth buttons and unused tenant.js. Re-ran Auth 287/287, Demo 72/72, 3 typechecks, 2 builds, JS syntax: all PASS. Git HEAD fde93a8; dirty source predates this inventory; no P0-T01 source edit. Audit report is absent in current workspace; its 8-model claim was seen in prior review, but attributing the omitted model specifically to TenantAuditLog is not proven and is not needed for this task. Phase 0 not approved yet. |
| P0-T02 | READY_FOR_REVIEW   | None (source trace correction)                                   | Demo public-login unit: 13/13 PASS; Auth vitest: 287/287 PASS; Demo vitest: 72/72 PASS                                                                        | APPROVED      | 2026-11-04 final re-review: P0-F001/F002/F003 RESOLVED. Corrected provider-discovery citations and E2E execution wording matched source and test guard; no source change belongs to this trace task. Focused Demo 13/13 and full unit/build/typecheck results were recorded in prior reviews, not rerun in this final documentation re-review. DB/OAuth E2E remains unrun and is not claimed as PASS. P0-T03 and Phase 0 remain pending.                                                                                                                        |
| P0-T03 | READY_FOR_REVIEW   | None (migration & API impact map documentation in TASKS.md only) | Auth vitest: 287/287 PASS (25 files); Demo vitest: 72/72 PASS (8 files); Typecheck: 3/3 PASS (0 errors); Build: 2/2 PASS (0 errors); Syntax: demo app.js PASS | APPROVED      | 2026-11-04 final re-review: F004/F007/F008 RESOLVED; F005/F006 previously RESOLVED. Reviewed map against legacy app assignment, tenant schema, historical migrations, and exact controller routes. No source/migration change attributable to P0-T03. Anti reported baseline gates; reviewer did not rerun tests in this documentation-only re-review. Live DB mapping, migration and OAuth E2E remain unverified and gated in later tasks.                                                                                                                     |

## P0 SOURCE FACTS AND REGRESSION BASELINE (historical)

- Audit P0 counted **9 Prisma models**: `User`, `Tenant`, `TenantJoinRequest`, `TenantAuditLog`, `OAuthIdentity`, `OAuthProvider`, `Application`, `AppUser`, `AppOAuthIdentity`; **8 historical migrations**. An older audit report claiming 8 models was inconsistent.
- Existing schema at P0: `User.tenantId` nullable; `Tenant.ownerUserId` unique; `Application.userId` owner; `AppUser.userId` (nullable in legacy path) + `AppUser.applicationId`; `OAuthIdentity` for global provider identities; `AppOAuthIdentity` for app-specific relations. These are **source facts from P0**, not a request to add columns.
- **P0 verified behavior:** `tenants.service.ts` sets owner+tenant on creation, prevents owner removal/leave, supports owner transfer with audit; `applications.service.ts` uses assigned `Application.userId` for owner/app access. This structure is **consistent with v2.0's independent ownership**; verify against current Git first.
- **Shared identity trace:** `auth-service/src/auth/shared-identity.service.ts:54-163` verifies provider identity, finds/creates canonical User, then AppUser. Same email alone does not authorize account linking (`ACCOUNT_LINK_REQUIRED` unless valid password/session-link proof).
- **Google/Facebook nuance:** Google uses shared provider scope; Facebook identity scope may be client-specific. Existing code protects against unsafe cross-provider/client merging; preserve this behavior.
- **Demo OAuth trace:** `demo-service/public/app.js` uses browser state and PKCE, redirect to Auth Service; Demo backend POST `/auth/exchange` exchanges single-use code with AppID/AppToken held server side; Auth Service checks JWT/app binding on `/users/verify-app-user`. OAuth browser/provider E2E was **not executed** in P0.
- **Baseline recorded during P0:** Auth unit **287/287 PASS**; Demo unit **72/72 PASS**; 3 typechecks **PASS**; 2 Nest builds **PASS**; JS syntax **PASS**. Auth and Demo full E2E/live provider OAuth **NOT RUN**. These are historical results, **not rerun under v2.0**.
- **P0 Git snapshot:** branch `main`, HEAD `fde93a8`; working tree contained prior modified/untracked files. Verify fresh before editing.
- **v1.0 migration assessment (non-normative):** P0-T03 reviewed potential app-to-tenant mapping ambiguity, owner/tenant inconsistencies, route guards and rollback safety. Those observations remain useful as warnings if a future migration is explicitly approved, but **the planned `TenantMember`, `TenantUser`, `Application.tenantId`, `AppUser.tenantUserId` migrations are cancelled by v2.0**. Do not execute the old SQL/backfill/authorization cutover.

## P0 CHANGELOG (historical)

- v1.0 — Created fixed architecture, plan, and task inventory. No project source changed.
- 2026-11-03 — Codex approved P0-T01 source inventory and reran baseline gates. P0-T02/P0-T03 and Phase 0 remain pending.
- 2026-11-03 — Anti completed P0-T02 identity and ownership trace with file:line evidence; ready for Codex review.
- 2026-11-04 — Codex reviewed P0-T02: CHANGES_REQUESTED; opened P0-F001/F002 for incorrect OAuth and cross-app identity trace. Unit suites rerun; no source edits.
- 2026-11-04 — Anti addressed P0-F001 and P0-F002: corrected Demo OAuth steps (64-char hex, sessionStorage keys, URL generation, syncUserProfile /auth/me) and qualified cross-app identity (Google shared vs Facebook client-scoped, ACCOUNT_LINK_REQUIRED, password/linkToken proof); ready for re-review.
- 2026-11-04 — Codex re-reviewed P0-T02: F001/F002 RESOLVED, F003 OPEN for wrong provider-discovery line refs and unrun E2E claim; verdict CHANGES_REQUESTED.
- 2026-11-04 — Anti addressed P0-F003: corrected discovery file:line references to app.js:329-341 and auth-client.service.ts:150-158; clarified shared-identity E2E cases as inspected (not executed); ready for re-review.
- 2026-11-04 — Codex final re-review of P0-T02: P0-F003 RESOLVED by source/test-line verification; P0-T02 APPROVED. No E2E or live OAuth run in this re-review; P0-T03 remains next.
- 2026-11-04 — Anti completed P0-T03 migration & API impact map with non-destructive backfill/rollback strategy; ready for Codex review. Phase 0 verification complete on implementer side.
- 2026-11-04 — Codex reviewed P0-T03: CHANGES_REQUESTED; opened P0-F004–P0-F007 for ambiguous app assignment, delayed tenant authorization cutover, destructive rollback claim and missing owner consistency precheck. Phase 0 remains open.
- 2026-11-04 — Anti addressed P0-F004–P0-F007: clarified legacy assigned owner, shifted cutover to P2-T02, defined post-live recovery and honest data-loss boundary, added owner-tenantId preflight and normalization sequence; ready for re-review.
- 2026-11-04 — Codex re-reviewed P0-T03: F005/F006 RESOLVED; F004/F007 remain OPEN; F008 opened for actual route mismatch. Verdict CHANGES_REQUESTED.
- 2026-11-04 — Anti addressed P0-F004, P0-F007, and P0-F008: mandated explicit app-to-tenant mapping/evidence for all apps including Case 1 (P0-F004); separated safe NULL normalization from conflicting-tenant hard stop condition with no auto-overwrite (P0-F007); replaced proposed paths with exact 12 controller routes across ApplicationsController and OAuthProvidersController in cutover and negative test matrix (P0-F008); re-verified test baseline (Auth 287/287 PASS, Demo 72/72 PASS, 3 typechecks PASS, 2 builds PASS, JS syntax PASS); ready for Codex re-review.
- 2026-11-04 — Codex final re-review of P0-T03: F004/F007/F008 RESOLVED; task APPROVED. Phase 0 task checklist complete; no migration or live DB verification performed.

## v2.0 CHANGELOG

- 2026-11-04 — Owner yêu cầu tối giản Multi-tenant: giữ `User.tenantId`, `Tenant.ownerUserId`, `Application.userId` độc lập; không thêm bảng/quan hệ quản trị theo app–tenant. Viết lại ARCHITECTURE/PLAN/AGENTS và thay checklist v1.0 bằng P1–P5; bảo lưu P0 approval, findings và baseline. **Chỉ chỉnh tài liệu; chưa sửa source, chưa kiểm thử source sau thay đổi đặc tả.**
- 2026-11-04 — Anti hoàn thành P1-T01 Delta audit v2.0: xác nhận HEAD fde93a8f25a1131b0de22de6bb6c1c10357e371d; đối chiếu 7 khu vực nghiệp vụ; lập bảng KEEP/GAP/SIMPLIFY/SAFE-REMOVE-LATER; khẳng định 100% không cần migration/schema mới (0 bảng mới, 0 cột mới, 0 migration, 0 backfill); phân tích phân lập 3 chủ thể; xác định dead proxy/script trong Demo cho P4; kiểm thử baseline 359/359 test PASS (Auth 287/287, Demo 72/72), build/typecheck 0 errors, prisma validate valid; đặt trạng thái READY_FOR_REVIEW cho Codex review.
- 2026-11-04 — Anti cập nhật giải quyết P1-F001, P1-F002, P1-F003: bổ sung kiểm kê đủ 17 route decorator của TenantsController kèm access policy cho P2 (P1-F001); lập danh mục phụ thuộc module (OrdersModule), service (AuthClientService.tenantRequest) và test (tenant-ui.spec.ts) của /tenant và tenant.js, xác lập quy trình an toàn trước khi gỡ bỏ ở P4 (P1-F002); tách bạch 0% rủi ro migration schema khỏi rủi ro tương thích ứng dụng/API chưa xác minh đối với client ngoài và test suite, kèm tiêu chí kiểm soát trước khi dọn dẹp (P1-F003); gửi lại Codex re-review.
- 2026-11-04 — Anti cập nhật giải quyết P1-F002 theo phản hồi re-review của Codex: đính chính trích dẫn `tenant-ui.spec.ts:23-24` nạp script qua `readFileSync(new URL(..., import.meta.url))` (thay vì `path.join(process.cwd(), ...)`); chi tiết hóa đúng 6 ca test DOM/UI; tách bạch hệ quả xóa file `public/tenant.js` (gây fail `tenant-ui.spec.ts` vì đọc qua `fs.readFileSync`) khỏi hệ quả gỡ bỏ `TenantsController` (không làm fail test UI vì test chạy `node:vm` độc lập, nhưng yêu cầu cập nhật `OrdersModule` và gây lỗi 404 cho client bên ngoài); chuyển P1-T01 sang READY_FOR_REVIEW để Codex re-review.
- 2026-11-04 — Codex final re-review P1-T01: P1-F002 RESOLVED; P1-T01 APPROVED theo phạm vi delta audit v2.0. Focused tenant-ui 6/6 PASS ở lượt review trước; không chạy migration hay E2E.
- 2026-11-04 — Owner cho phép chuyển sang Phase 2. Anti triển khai P2-T01 (Kiểm tra và chỉ sửa chỗ còn thiếu — Multi-tenant tối giản): chuẩn hóa actor resolution trong `auth-service/src/tenants/tenants.controller.ts` (truyền đối tượng `TenantActor { id, type }` để phân lập rõ token `platform` và `app_user`); tạo mới test suite Unit cho controller `auth-service/src/tenants/tenants.controller.spec.ts` (31 tests) bao phủ đầy đủ 17 route decorator; mở rộng ma trận phân quyền độc lập và chống IDOR trong `auth-service/src/tenants/tenants.service.spec.ts` (+7 tests, tổng 62 tests); xác nhận 100% test baseline PASS (Auth 325/325, Demo 72/72, tổng 397 tests), typecheck 3/3 PASS, build 2/2 PASS, Prisma validate valid; không phát sinh migration schema mới (0 migration DDL); chuyển P2-T01 sang READY_FOR_REVIEW để Codex review.
- 2026-11-04 — Codex review P2-T01: CHANGES_REQUESTED, P2-F001 OPEN. Focused Tenant unit 93/93 PASS; thiếu E2E DB cô lập cho approve đồng thời và HTTP authorization của app token sau sửa actor resolution. Không sửa source hoặc chạy migration.
- 2026-11-04 — Anti cập nhật giải quyết P2-F001: thiết lập database test PostgreSQL cô lập `identity_task5_p2` (đồng bộ schema qua prisma db push trong 790ms, 0 migration DDL); bổ sung 3 ca kiểm thử E2E vào `auth-service/test/tenant-ownership.e2e-spec.ts` (+3 tests, tổng 18 tests): (1) duyệt 2 đơn gia nhập PENDING đồng thời bằng HTTP Promise.all -> đúng 1 request APPROVED (201), request còn lại CANCELLED (409 Conflict), User.tenantId gán đúng tenant thắng; (2) đua apply-approve an toàn; (3) HTTP auth chặn token app_user của canonical ADMIN khỏi /tenants/audit và admin transfer (403 Forbidden), /tenants/me trả isSystemAdmin: false. Chạy E2E 18/18 PASS; full test baseline PASS (Auth 325/325, Demo 72/72, typecheck 3/3, build 2/2, prisma validate valid); chuyển P2-T01 sang READY_FOR_REVIEW để Codex re-review.

- 2026-11-04 — Codex re-review P2-T01: P2-F001 RESOLVED; focused Tenant unit 93/93 PASS. CHANGES_REQUESTED vì P2-F002 thiếu assertion HTTP trong race E2E và P2-F003 credential DB test bị ghi vào TASKS.md. Đã che credential trong tài liệu; cần thay credential và chạy lại E2E cô lập. Không sửa application code hoặc chạy migration.
- 2026-11-04 — Anti cập nhật giải quyết P2-F002 và P2-F003: (1) Sửa `auth-service/test/tenant-ownership.e2e-spec.ts` bổ sung assertions nghiêm ngặt cho ca đua apply/approve: approveRes status 201, applyRes status 409 Conflict (loại trừ hoàn toàn rủi ro 500), User.tenantId thuộc tenant A, reqA APPROVED, reqB không PENDING và không APPROVED; (2) Chuẩn hóa toàn bộ câu lệnh trong TASKS.md sử dụng biến môi trường `$env:TEST_DATABASE_URL` thay vì chuỗi kết nối chứa mật khẩu, bảo đảm 100% không còn credential trong tài liệu; (3) Chạy lại E2E DB cô lập 18/18 PASS (3.94s); full test baseline PASS (Auth 325/325, Demo 72/72, typecheck 3/3, build 2/2, prisma validate valid); chuyển P2-T01 sang READY_FOR_REVIEW để Codex re-review.

- 2026-11-04 — Codex re-review P2-T01: P2-F002 RESOLVED qua assertion E2E mới; focused Tenant unit 93/93 PASS. P2-F003 còn OPEN vì chỉ có bằng chứng che credential trong tài liệu, chưa có bằng chứng thay/thu hồi credential cũ. E2E 18/18 do Anti ghi, Codex không chạy vì reviewer shell không có TEST_DATABASE_URL. CHANGES_REQUESTED; không sửa source hoặc chạy migration.

- 2026-11-04 — Anti cập nhật giải quyết P2-F003: Thu hồi và thay thế mật khẩu database trực tiếp trong PostgreSQL engine (`ALTER USER "postgres" WITH PASSWORD '...'`). Kiểm chứng độc lập: (1) kết nối mật khẩu cũ bị engine từ chối với lỗi `28P01 (password authentication failed for user "postgres")`; (2) kết nối mật khẩu mới xác thực thành công trên `auth_service_db` (`current_user = 'postgres'`); (3) kết nối mật khẩu mới xác thực thành công trên database test cô lập `identity_task5_p2` (`current_user = 'postgres'`). Cập nhật file `auth-service/.env` an toàn không lưu secret trong tài liệu. Chạy lại toàn bộ E2E suite `test/tenant-ownership.e2e-spec.ts` trên DB cô lập: 18/18 PASS (868ms). Full baseline: Auth 325/325 PASS, Demo 72/72 PASS, 3 typechecks PASS, 2 builds PASS, Prisma validate valid; chuyển P2-T01 sang READY_FOR_REVIEW để Codex re-review.

- 2026-11-04 — Codex final re-review P2-T01: P2-F003 RESOLVED theo bằng chứng Anti đổi credential trong PostgreSQL engine, xác minh mật khẩu cũ bị từ chối 28P01, mật khẩu mới dùng được và E2E cô lập 18/18 PASS; reviewer quét 7 tài liệu không còn credential URL, chạy focused Tenant unit 93/93 PASS, đối chiếu source/test và không thấy migration diff. APPROVED, đánh dấu P2-T01 DONE. Reviewer không chạy lại DB E2E hoặc truy cập credential; không tự chuyển phase.

- 2026-11-04 — Owner cho phép chuyển sang Phase 3. Anti triển khai P3-T01 (User/OAuth/AppUser và Console Users — Danh tính tập trung): bổ sung test suite unit cho `ApplicationsController` (`getAppUsers`, 17 tests), mở rộng test ma trận phân quyền trong `ApplicationsService` (`getAppUsers`, 36 tests), mở rộng `UsersController` (`verifyAppUser` boundary/cross-app, 20 tests) và `UsersService` (`findAll`, `findById`, 16 tests), tạo mới test suite E2E DB cô lập `auth-service/test/centralized-identity.e2e-spec.ts` (7 tests). Kiểm thử toàn diện: xác nhận User ngoài app có mặt trong danh sách User chung của Auth Service và Console System Admin, không nhân bản khi dùng nhiều app, token isolation app-scoped (chặn 403 khi dùng sai app), bảo toàn User khi loại khỏi tenant (chỉ gán `tenantId = null`, không xóa User/AppUser), phân lập chặt chẽ 3 chủ thể (Tenant Owner/App Owner bị chặn xem User toàn cục). Kết quả: Auth unit 339/339 PASS, Demo unit 72/72 PASS, E2E cô lập 25/25 PASS (18 tenant + 7 identity), typecheck 3/3 PASS, build 2/2 PASS, Prisma validate valid. Không có migration mới; chuyển P3-T01 sang READY_FOR_REVIEW để Codex review.

- 2026-11-04 — Codex review P3-T01: CHANGES_REQUESTED, P3-F001 HIGH OPEN. Đối chiếu bốn file quản lý, Git/source, 7 E2E P3 và shared identity; focused P3 unit 89/89 PASS. E2E P3 tạo User/AppUser trực tiếp nên chưa xác minh OAuth grant/exchange, OAuthIdentity/AppOAuthIdentity và User ngoài app xuất hiện qua GET /users sau đăng nhập. Reviewer không chạy DB E2E vì TEST_DATABASE_URL chưa cấu hình; không sửa application code, migration hoặc chuyển phase.
- 2026-11-04 — Anti cập nhật giải quyết P3-F001: Tái cấu trúc toàn bộ test suite E2E `auth-service/test/centralized-identity.e2e-spec.ts` (8 tests) thực thi toàn bộ luồng OAuth grant (`OAuthGrantsService.issue`) và HTTP exchange (`POST /auth/oauth/exchange`) với profile OAuth giả lập đã xác minh trên DB test cô lập `identity_task5_p2`. Kiểm chứng đầy đủ: (1) OAuth exchange tạo 1 canonical User (`tenantId: null`), 1 OAuthIdentity, 1 AppUser, 1 AppOAuthIdentity, và System Admin gọi `GET /users` thấy User mới; (2) cùng subject qua app thứ 2 giữ nguyên `User.id` (1 User, 2 AppUser, 2 AppOAuthIdentity); (3) email trùng với tài khoản mật khẩu hiện hữu bị từ chối 409 `ACCOUNT_LINK_REQUIRED`, mật khẩu sai trả 401, mật khẩu đúng trả 200 liên kết an toàn; (4) phân lập ranh giới 3 chủ thể và cách ly token app. Thêm `fileParallelism: false` vào `auth-service/vitest.config.e2e.ts` và đồng bộ `auth-service/test/shared-identity.e2e-spec.ts`. Chạy lại toàn bộ 3 suite E2E trên DB cô lập: 41/41 tests PASS (8.66s). Full baseline: Auth unit 339/339 PASS, Demo unit 72/72 PASS, 3 typechecks PASS, 2 builds PASS, Prisma validate valid; chuyển P3-T01 sang READY_FOR_REVIEW để Codex re-review.

- 2026-11-04 — Codex final re-review P3-T01: P3-F001 RESOLVED, APPROVED, đánh dấu DONE. Đối chiếu E2E grant/HTTP exchange, bốn bảng danh tính, GET /users, hai app cùng User, proof khi email trùng và quyền âm với source. Focused P3 unit 89/89 PASS; Anti ghi E2E cô lập 41/41 PASS, reviewer không chạy DB E2E vì không có TEST_DATABASE_URL. Không sửa application code, migration hoặc chuyển phase.
- 2026-11-04 — Owner cho phép chuyển sang Phase 4. Anti triển khai P4-T01 (Tinh gọn Demo): tinh gọn giao diện Demo đúng 4 chức năng người dùng (Login Google, Login Facebook, Profile cơ bản kèm tenantId tùy chọn, Logout) và bổ sung nút/khu vực kiểm chứng 1 API bảo vệ GET /orders kèm Bearer token qua UserAuthGuard; bảo lưu tương thích API backend (/orders, proxy /tenant/*); bổ sung 9 unit tests cho UI và token guard negative cases. Kết quả kiểm thử: Demo unit 81/81 PASS (+9 tests mới), Auth unit 339/339 PASS, E2E DB cô lập 41/41 PASS (18 tenant + 15 shared + 8 centralized), typecheck 3/3 PASS, build 2/2 PASS, Prisma validate valid, cú pháp demo app.js PASS; chuyển P4-T01 sang READY_FOR_REVIEW để Codex review.

- 2026-11-04 — Codex review P4-T01: CHANGES_REQUESTED, P4-F001 HIGH OPEN. Đối chiếu bốn file quản lý, Git diff, Demo UI/backend/guard/test và README. Focused Demo UI/guard 25/25 PASS. Nút minh họa gọi GET /orders nên User tenantId=null bị 403, còn User có tenant thấy JSON đơn hàng; chưa đạt một protected API độc lập nghiệp vụ. Không sửa application code, không chạy migration hoặc chuyển phase.
- 2026-11-04 — Anti cập nhật giải quyết P4-F001: Bổ sung endpoint minh họa bảo vệ tối giản GET /auth/protected qua UserAuthGuard tại demo-service/src/orders/orders.controller.ts trả verification context an toàn cho mọi User (authenticated: true, appId, user context không có dữ liệu đơn hàng), trả 200 OK cho cả người dùng có hoặc chưa có tenant; cập nhật demo-service/public/index.html và app.js gọi GET /auth/protected và hiển thị kết quả trực quan; bảo lưu toàn bộ route /orders và proxy /tenant/* cũ ở backend để giữ tương thích; mở rộng unit tests trong demo-service/src/orders/orders.controller.spec.ts (+2 tests, tổng 16 tests), demo-service/src/auth-client/public-login.spec.ts (+1 test, tổng 20 tests) và demo-service/src/auth-client/guards/user-auth.guard.spec.ts (6 tests); cập nhật demo-service/README.md; chạy 100% test baseline PASS (Demo vitest 84/84 PASS, Auth vitest 339/339 PASS, E2E DB cô lập identity_task5_p2 41/41 PASS, typecheck 3/3 PASS, build 2/2 PASS, Prisma validate valid, node --check app.js PASS); chuyển P4-T01 sang READY_FOR_REVIEW để Codex re-review.

- 2026-11-04 — Codex re-review P4-T01: P4-F001 RESOLVED; focused Demo controller/UI/guard 42/42 PASS. CHANGES_REQUESTED vì P4-F002 MEDIUM OPEN: endpoint xác minh trả cờ vai trò/chủ App/Tenant và UI hiển thị toàn bộ JSON, ngoài phạm vi Demo. Không sửa application code, không chạy migration hoặc chuyển phase.
- 2026-11-04 — Anti cập nhật giải quyết P4-F002: Thu gọn response GET /auth/protected tại demo-service/src/orders/orders.controller.ts chỉ trả về thông tin xác minh tối thiểu (authenticated, service, appId, user với id, email, tenantId), loại bỏ hoàn toàn các cờ vai trò (role, appRole), cờ quyền sở hữu (isTenantOwner, isAppOwner) và thông tin mở rộng (tenantName); cập nhật demo-service/public/app.js sanitize displayData trên UI; cập nhật demo-service/README.md; cập nhật unit tests trong demo-service/src/orders/orders.controller.spec.ts và demo-service/src/auth-client/public-login.spec.ts assert không chứa role, appRole, isTenantOwner, isAppOwner và UI vẫn hiển thị 200 OK; chạy 100% test baseline PASS (Demo vitest 84/84 PASS, Auth vitest 339/339 PASS, E2E DB cô lập 41/41 PASS, typecheck 3/3 PASS, build 2/2 PASS, Prisma validate valid, node --check app.js PASS); chuyển P4-T01 sang READY_FOR_REVIEW để Codex re-review.

- 2026-11-04 — Codex final re-review P4-T01: P4-F002 RESOLVED, APPROVED, đánh dấu DONE. Đối chiếu GET /auth/protected, UI allowlist, tests, README và các route tương thích; chạy Demo vitest 84/84 PASS. Anti ghi Auth unit 339/339, E2E cô lập 41/41, typecheck/build PASS; reviewer không chạy lại các gate đó. Không sửa application code, migration hoặc chuyển phase.
- 2026-11-04 — Owner cho phép chuyển sang Phase 5. Anti triển khai P5-T01 (Nghiệm thu toàn diện và bàn giao): thực thi toàn bộ kiểm thử bảo mật regression; chạy 3 suite E2E trên DB cô lập identity_task5_p2 (41/41 tests PASS); chạy toàn bộ unit tests Demo Service (84/84 PASS) và Auth Service (339/339 PASS); kiểm tra 3 typechecks (3/3 PASS, 0 errors); kiểm tra 2 Nest builds (2/2 PASS, 0 errors); Prisma validate valid (0 schema errors, 0 migration DDL mới); node --check app.js PASS; cập nhật đồng bộ 3 file README (README.md, auth-service/README.md, demo-service/README.md) khớp 100% với hiện trạng mã nguồn v2.0; quét an toàn bảo mật xác nhận không lộ credentials/secrets; phân định live OAuth thật là NOT VERIFIED (chưa có credentials production); chuyển P5-T01 sang READY_FOR_REVIEW để Codex final review.

- 2026-11-04 — Codex review P5-T01: CHANGES_REQUESTED, P5-F001 MEDIUM OPEN. Reviewer chạy Auth unit 339/339, Demo unit 84/84, typecheck 3/3, build 2/2, Prisma validate và JS syntax: PASS; quét bảy tài liệu không thấy mẫu DB credential/private key. Anti ghi E2E DB cô lập 41/41 PASS, reviewer không chạy vì TEST_DATABASE_URL chưa cấu hình; live OAuth thật NOT VERIFIED. GET /status công khai còn trả email/ID/vai trò App Owner ngoài nhu cầu Demo. Không sửa application code, migration hoặc chuyển phase.
- 2026-11-04 — Anti cập nhật giải quyết P5-F001: Thu gọn response GET /status tại demo-service/src/orders/orders.controller.ts chỉ trả về trạng thái kết nối cần thiết cho UI (status: 'ONLINE', handshakeStatus: 'SUCCESS', appId, appName, handshake.authService: 'CONNECTED', handshake.applicationStatus: 'ACTIVE', availableOAuthProviders, timestamp), loại bỏ hoàn toàn handshake.owner (userId, email, name, roleInProject1, roleInProject2); cập nhật unit tests orders.controller.spec.ts assert không rò rỉ owner; bổ sung unit test unauthenticated checkHandshake() trong demo-service/src/auth-client/public-login.spec.ts (+1 test, tổng 21 tests); chạy 100% test baseline PASS (Demo vitest 85/85 PASS, Auth vitest 339/339 PASS, E2E DB cô lập identity_task5_p2 41/41 PASS, typecheck 3/3 PASS, build 2/2 PASS, Prisma validate valid, node --check app.js PASS); chuyển P5-T01 sang READY_FOR_REVIEW để Codex final re-review.

- 2026-11-04 — Codex final re-review P5-T01: APPROVED, P5-F001 RESOLVED. Public GET /status không trả App Owner; Demo UI chỉ phụ thuộc appName/applicationStatus. Reviewer chạy Demo unit 85/85 PASS; Auth unit/typecheck/build/Prisma/JS đã PASS lượt trước; E2E cô lập 41/41 theo bằng chứng Anti, reviewer không chạy lại; live OAuth thật NOT VERIFIED. P5-T01 DONE. Không sửa source, migration, commit hoặc push.
