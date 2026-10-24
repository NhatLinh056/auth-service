import 'dotenv/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { AppStatus, Role } from '../src/generated/prisma/enums.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// ─────────────────────────────────────────────────────────────────────────────
// E2E Test Suite — Application Management Lifecycle (TODO 77)
// Báo cáo nghiệm thu Phase 3.6 (Application Management & AppID/AppToken)
// - Authentication Guard (@Auth() bảo vệ tất cả endpoint)
// - Create Application (POST /applications) cho User và Admin
// - Data Isolation & Multi-tenancy (GET /applications)
// - Application Details (GET /applications/:id) với phân quyền Owner / Admin
// - Update Application (PATCH & PUT /applications/:id)
// - Regenerate AppToken (POST /applications/:id/regenerate-token)
// - Delete Application (DELETE /applications/:id)
// - Cascade Deletion & Security Constraints
// ─────────────────────────────────────────────────────────────────────────────

describe('Application Management Lifecycle & Security Matrix (TODO 77 E2E)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const TIMESTAMP = Date.now();
  const PASSWORD = 'AppTestPassword123!';

  const USER1_EMAIL = `app_user1_${TIMESTAMP}@test.com`;
  const USER2_EMAIL = `app_user2_${TIMESTAMP}@test.com`;
  const ADMIN_EMAIL = `app_admin_${TIMESTAMP}@test.com`;

  let user1Token: string;
  let user1Id: string;

  let user2Token: string;
  let user2Id: string;

  let adminToken: string;
  let adminId: string;

  let user1AppId: string;
  let adminAppId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<INestApplication<App>>();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // 1. Tạo User 1
    const user1Reg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: USER1_EMAIL, password: PASSWORD, name: 'App Owner 1' });
    user1Id = user1Reg.body.id;

    const user1Login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: USER1_EMAIL, password: PASSWORD });
    user1Token = user1Login.body.accessToken;

    // 2. Tạo User 2
    const user2Reg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: USER2_EMAIL, password: PASSWORD, name: 'App Owner 2' });
    user2Id = user2Reg.body.id;

    const user2Login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: USER2_EMAIL, password: PASSWORD });
    user2Token = user2Login.body.accessToken;

    // 3. Tạo Admin User
    const adminReg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: ADMIN_EMAIL, password: PASSWORD, name: 'App Admin' });
    adminId = adminReg.body.id;

    await prisma.user.update({
      where: { id: adminId },
      data: { role: Role.ADMIN },
    });

    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: ADMIN_EMAIL, password: PASSWORD });
    adminToken = adminLogin.body.accessToken;
  });

  afterAll(async () => {
    // Dọn dẹp dữ liệu kiểm thử
    if (prisma) {
      await prisma.application.deleteMany({
        where: { userId: { in: [user1Id, user2Id, adminId] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [user1Id, user2Id, adminId] } },
      });
    }
    if (app) {
      await app.close();
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. AUTHENTICATION GUARDS (401 UNAUTHORIZED)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('1. Authentication Guard Validation (Thiếu/Sai JWT Token)', () => {
    it('POST /applications -> 401 khi không gửi Bearer token', async () => {
      await request(app.getHttpServer())
        .post('/applications')
        .send({ name: 'Order Service' })
        .expect(401);
    });

    it('GET /applications -> 401 khi không gửi Bearer token', async () => {
      await request(app.getHttpServer())
        .get('/applications')
        .expect(401);
    });

    it('GET /applications/:id -> 401 khi không gửi Bearer token', async () => {
      await request(app.getHttpServer())
        .get('/applications/00000000-0000-0000-0000-000000000000')
        .expect(401);
    });

    it('PATCH /applications/:id -> 401 khi không gửi Bearer token', async () => {
      await request(app.getHttpServer())
        .patch('/applications/00000000-0000-0000-0000-000000000000')
        .send({ name: 'New Name' })
        .expect(401);
    });

    it('PUT /applications/:id -> 401 khi không gửi Bearer token', async () => {
      await request(app.getHttpServer())
        .put('/applications/00000000-0000-0000-0000-000000000000')
        .send({ name: 'New Name' })
        .expect(401);
    });

    it('DELETE /applications/:id -> 401 khi không gửi Bearer token', async () => {
      await request(app.getHttpServer())
        .delete('/applications/00000000-0000-0000-0000-000000000000')
        .expect(401);
    });

    it('POST /applications/:id/regenerate-token -> 401 khi không gửi Bearer token', async () => {
      await request(app.getHttpServer())
        .post('/applications/00000000-0000-0000-0000-000000000000/regenerate-token')
        .expect(401);
    });

    it('GET /applications -> 401 khi gửi token bị giả mạo / sai chữ ký', async () => {
      const forgedToken = user1Token.slice(0, -5) + 'xxxxx';
      await request(app.getHttpServer())
        .get('/applications')
        .set('Authorization', `Bearer ${forgedToken}`)
        .expect(401);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. CREATE APPLICATION (POST /applications)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('2. Create Application Endpoint (POST /applications)', () => {
    it('USER thường tạo ứng dụng thành công, tự động sinh AppID và AppToken chuẩn', async () => {
      const res = await request(app.getHttpServer())
        .post('/applications')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ name: 'Payment Microservice' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Payment Microservice');
      expect(res.body.userId).toBe(user1Id);
      expect(res.body.status).toBe(AppStatus.ACTIVE);

      // Kiểm tra chuẩn AppID: app_ + 24 hex chars (tổng 28 chars)
      expect(res.body.appId).toMatch(/^app_[0-9a-f]{24}$/);
      expect(res.body.appId).toHaveLength(28);

      // Kiểm tra chuẩn AppToken: apt_ + 64 hex chars (tổng 68 chars)
      expect(res.body.appToken).toMatch(/^apt_[0-9a-f]{64}$/);
      expect(res.body.appToken).toHaveLength(68);

      user1AppId = res.body.id;

      // Xác minh dữ liệu trực tiếp trong PostgreSQL
      const dbApp = await prisma.application.findUnique({
        where: { id: user1AppId },
      });
      expect(dbApp).toBeDefined();
      expect(dbApp?.appId).toBe(res.body.appId);
      expect(dbApp?.userId).toBe(user1Id);
    });

    it('ADMIN tạo ứng dụng cho chính mình khi không truyền userId', async () => {
      const res = await request(app.getHttpServer())
        .post('/applications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Admin Gateway Service' })
        .expect(201);

      expect(res.body.userId).toBe(adminId);
      expect(res.body.name).toBe('Admin Gateway Service');
      adminAppId = res.body.id;
    });

    it('ADMIN tạo ứng dụng và chỉ định quyền sở hữu cho USER khác qua userId', async () => {
      const res = await request(app.getHttpServer())
        .post('/applications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Log Service assigned by Admin', userId: user2Id })
        .expect(201);

      expect(res.body.userId).toBe(user2Id);
      expect(res.body.name).toBe('Log Service assigned by Admin');

      // Dọn dẹp ứng dụng tạm
      await prisma.application.delete({ where: { id: res.body.id } });
    });

    it('USER thường truyền userId của người khác -> hệ thống bỏ qua và tự gán cho chính mình', async () => {
      const res = await request(app.getHttpServer())
        .post('/applications')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ name: 'Spoofed User App', userId: user2Id })
        .expect(201);

      // Vẫn thuộc về user1, không bị chiếm quyền sở hữu
      expect(res.body.userId).toBe(user1Id);

      // Dọn dẹp ứng dụng tạm
      await prisma.application.delete({ where: { id: res.body.id } });
    });

    it('ADMIN truyền userId không tồn tại trong hệ thống -> 404 Not Found', async () => {
      const res = await request(app.getHttpServer())
        .post('/applications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Orphan App', userId: 'a0000000-0000-4000-8000-000000000000' })
        .expect(404);

      expect(res.body.message).toContain('Không tìm thấy người dùng');
    });

    it('POST /applications gửi body thiếu name -> 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post('/applications')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({})
        .expect(400);
    });

    it('POST /applications gửi thuộc tính không cho phép (whitelist validation) -> 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post('/applications')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ name: 'Hack App', appId: 'app_custom_id', evilField: true })
        .expect(400);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. GET APPLICATIONS & DATA ISOLATION (GET /applications)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('3. Application List & Data Isolation (GET /applications)', () => {
    it('USER thường chỉ thấy các ứng dụng do chính mình sở hữu', async () => {
      const res = await request(app.getHttpServer())
        .get('/applications')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);

      // Tất cả app trả về đều phải có userId trùng với user1
      const allBelongToUser1 = res.body.every(
        (app: { userId: string }) => app.userId === user1Id,
      );
      expect(allBelongToUser1).toBe(true);

      // Không chứa app của Admin
      const containsAdminApp = res.body.some(
        (app: { id: string }) => app.id === adminAppId,
      );
      expect(containsAdminApp).toBe(false);
    });

    it('USER 2 chưa tạo ứng dụng nào -> trả về mảng rỗng []', async () => {
      const res = await request(app.getHttpServer())
        .get('/applications')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });

    it('ADMIN thấy toàn bộ ứng dụng của tất cả người dùng trong hệ thống', async () => {
      const res = await request(app.getHttpServer())
        .get('/applications')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);

      const appIds = res.body.map((a: { id: string }) => a.id);
      expect(appIds).toContain(user1AppId);
      expect(appIds).toContain(adminAppId);

      // Kiểm tra cấu trúc include user relation
      const targetApp = res.body.find((a: { id: string }) => a.id === user1AppId);
      expect(targetApp).toHaveProperty('user');
      expect(targetApp.user.email).toBe(USER1_EMAIL);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. GET APPLICATION DETAIL (GET /applications/:id)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('4. Application Detail & Access Control (GET /applications/:id)', () => {
    it('Chủ sở hữu (User 1) xem chi tiết ứng dụng của mình thành công (200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/applications/${user1AppId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(res.body.id).toBe(user1AppId);
      expect(res.body.name).toBe('Payment Microservice');
      expect(res.body.user).toBeDefined();
      expect(res.body.user.id).toBe(user1Id);
    });

    it('User 2 cố tình xem ứng dụng của User 1 -> 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get(`/applications/${user1AppId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);

      expect(res.body.message).toContain('Bạn không có quyền truy cập ứng dụng của người khác');
    });

    it('ADMIN xem chi tiết ứng dụng của bất kỳ người dùng nào thành công (200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/applications/${user1AppId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.id).toBe(user1AppId);
      expect(res.body.user.email).toBe(USER1_EMAIL);
    });

    it('Xem ứng dụng với ID không tồn tại -> 404 Not Found', async () => {
      const res = await request(app.getHttpServer())
        .get('/applications/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(404);

      expect(res.body.message).toContain('Không tìm thấy ứng dụng');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. UPDATE APPLICATION (PATCH & PUT /applications/:id)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('5. Update Application Endpoint (PATCH / PUT /applications/:id)', () => {
    it('Chủ sở hữu cập nhật name của ứng dụng qua PATCH -> 200 OK', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/applications/${user1AppId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ name: 'Payment Microservice V2' })
        .expect(200);

      expect(res.body.name).toBe('Payment Microservice V2');
    });

    it('Chủ sở hữu cập nhật status thành INACTIVE qua PUT -> 200 OK', async () => {
      const res = await request(app.getHttpServer())
        .put(`/applications/${user1AppId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ status: AppStatus.INACTIVE })
        .expect(200);

      expect(res.body.status).toBe(AppStatus.INACTIVE);
    });

    it('ADMIN cập nhật ứng dụng của USER khác thành công (200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/applications/${user1AppId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: AppStatus.ACTIVE })
        .expect(200);

      expect(res.body.status).toBe(AppStatus.ACTIVE);
    });

    it('User 2 cố tình cập nhật ứng dụng của User 1 -> 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/applications/${user1AppId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ name: 'Malicious Change' })
        .expect(403);

      expect(res.body.message).toContain('Bạn không có quyền cập nhật ứng dụng');
    });

    it('Cập nhật ứng dụng không tồn tại -> 404 Not Found', async () => {
      await request(app.getHttpServer())
        .patch('/applications/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ name: 'Non Existent' })
        .expect(404);
    });

    it('Cập nhật với status không hợp lệ -> 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .patch(`/applications/${user1AppId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ status: 'INVALID_STATUS' })
        .expect(400);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. REGENERATE APP TOKEN (POST /applications/:id/regenerate-token)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('6. Regenerate AppToken Endpoint (POST /applications/:id/regenerate-token)', () => {
    let originalToken: string;

    beforeAll(async () => {
      const currentApp = await prisma.application.findUniqueOrThrow({
        where: { id: user1AppId },
      });
      originalToken = currentApp.appToken;
    });

    it('User 2 cố cấp lại token của User 1 -> 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .post(`/applications/${user1AppId}/regenerate-token`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);

      expect(res.body.message).toContain('Bạn không có quyền cấp lại token');
    });

    it('Cấp lại token cho ứng dụng không tồn tại -> 404 Not Found', async () => {
      await request(app.getHttpServer())
        .post('/applications/00000000-0000-0000-0000-000000000000/regenerate-token')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(404);
    });

    it('Chủ sở hữu cấp lại token thành công -> nhận token mới chuẩn 256 bits (200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/applications/${user1AppId}/regenerate-token`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(res.body.id).toBe(user1AppId);
      expect(res.body.appToken).toMatch(/^apt_[0-9a-f]{64}$/);
      expect(res.body.appToken).not.toBe(originalToken);

      // Xác minh trong DB đã được cập nhật token mới
      const dbApp = await prisma.application.findUniqueOrThrow({
        where: { id: user1AppId },
      });
      expect(dbApp.appToken).toBe(res.body.appToken);
      originalToken = res.body.appToken;
    });

    it('ADMIN cấp lại token cho ứng dụng của USER khác thành công (200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/applications/${user1AppId}/regenerate-token`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.appToken).toMatch(/^apt_[0-9a-f]{64}$/);
      expect(res.body.appToken).not.toBe(originalToken);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. DELETE APPLICATION (DELETE /applications/:id)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('7. Delete Application Endpoint (DELETE /applications/:id)', () => {
    it('User 2 cố tình xóa ứng dụng của User 1 -> 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/applications/${user1AppId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);

      expect(res.body.message).toContain('Bạn không có quyền xóa ứng dụng');
    });

    it('Xóa ứng dụng không tồn tại -> 404 Not Found', async () => {
      await request(app.getHttpServer())
        .delete('/applications/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(404);
    });

    it('Chủ sở hữu xóa ứng dụng thành công (200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/applications/${user1AppId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(res.body).toHaveProperty('message', 'Xóa ứng dụng thành công');
      expect(res.body.application.id).toBe(user1AppId);

      // Kiểm tra lại bằng GET -> 404 Not Found
      await request(app.getHttpServer())
        .get(`/applications/${user1AppId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(404);
    });

    it('ADMIN xóa ứng dụng của chính mình thành công (200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/applications/${adminAppId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('message', 'Xóa ứng dụng thành công');

      // Kiểm tra trực tiếp trong DB đã biến mất
      const dbCheck = await prisma.application.findUnique({
        where: { id: adminAppId },
      });
      expect(dbCheck).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. DATABASE CASCADE DELETION TEST
  // ═══════════════════════════════════════════════════════════════════════════
  describe('8. Database Integrity: Cascade Deletion on User Deletion', () => {
    it('Khi User bị xóa khỏi hệ thống, tất cả Application của user đó tự động bị xóa theo (Cascade)', async () => {
      // Tạo user tạm
      const tempUserReg = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `cascade_user_${TIMESTAMP}@test.com`,
          password: PASSWORD,
          name: 'Cascade User',
        });
      const tempUserId = tempUserReg.body.id;

      const tempUserLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: `cascade_user_${TIMESTAMP}@test.com`,
          password: PASSWORD,
        });
      const tempUserToken = tempUserLogin.body.accessToken;

      // Tạo application cho user tạm
      const tempAppRes = await request(app.getHttpServer())
        .post('/applications')
        .set('Authorization', `Bearer ${tempUserToken}`)
        .send({ name: 'Temporary Cascade App' })
        .expect(201);
      const tempAppId = tempAppRes.body.id;

      // Xóa User qua Admin API
      await request(app.getHttpServer())
        .delete(`/users/${tempUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Xác minh Application cũng tự động biến mất khỏi PostgreSQL
      const appCheck = await prisma.application.findUnique({
        where: { id: tempAppId },
      });
      expect(appCheck).toBeNull();
    });
  });
});
