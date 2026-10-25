import 'dotenv/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { Role } from '../src/generated/prisma/enums.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Project-Scoped Sign-in Methods Management (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const ADMIN_EMAIL = `admin_oauth_${Date.now()}@test.com`;
  const USER_A_EMAIL = `user_a_${Date.now()}@test.com`;
  const USER_B_EMAIL = `user_b_${Date.now()}@test.com`;
  const PASSWORD = 'Password123!';

  let adminToken: string;
  let userAToken: string;
  let userBToken: string;
  let adminId: string;
  let userAId: string;
  let userBId: string;

  let appAId: string;
  let appBId: string;
  let appAAppId: string;
  let appBAppId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // 1. Tạo User A
    const regA = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: USER_A_EMAIL, password: PASSWORD, name: 'User A' });
    userAId = regA.body.id;

    const loginA = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: USER_A_EMAIL, password: PASSWORD });
    userAToken = loginA.body.accessToken;

    // 2. Tạo User B
    const regB = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: USER_B_EMAIL, password: PASSWORD, name: 'User B' });
    userBId = regB.body.id;

    const loginB = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: USER_B_EMAIL, password: PASSWORD });
    userBToken = loginB.body.accessToken;

    // 3. Tạo Admin User
    const regAdmin = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: ADMIN_EMAIL, password: PASSWORD, name: 'Admin User' });
    adminId = regAdmin.body.id;

    await prisma.user.update({
      where: { id: adminId },
      data: { role: Role.ADMIN },
    });

    const loginAdmin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: ADMIN_EMAIL, password: PASSWORD });
    adminToken = loginAdmin.body.accessToken;
  });

  afterAll(async () => {
    if (appAId) await prisma.application.delete({ where: { id: appAId } }).catch(() => {});
    if (appBId) await prisma.application.delete({ where: { id: appBId } }).catch(() => {});
    if (userAId) await prisma.user.delete({ where: { id: userAId } }).catch(() => {});
    if (userBId) await prisma.user.delete({ where: { id: userBId } }).catch(() => {});
    if (adminId) await prisma.user.delete({ where: { id: adminId } }).catch(() => {});
    await app.close();
  });

  // ═════════════════════════════════════════════════════════════════════════
  // 10 MANDATORY TEST CASES SPECIFIED BY USER
  // ═════════════════════════════════════════════════════════════════════════

  describe('Case 10: Tự động khởi tạo Sign-in Methods mặc định khi tạo Application mới', () => {
    it('Tạo Application A (User A) -> Tự động sinh Google & Facebook (disabled)', async () => {
      const res = await request(app.getHttpServer())
        .post('/applications')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: 'Application A' })
        .expect(201);

      appAId = res.body.id;
      appAAppId = res.body.appId;
      expect(appAId).toBeDefined();

      // Kiểm tra database có đúng 2 providers gắn với Application A
      const providersInDb = await prisma.oAuthProvider.findMany({
        where: { applicationId: appAId },
      });
      expect(providersInDb).toHaveLength(2);
      expect(providersInDb.every((p) => p.isEnabled === false)).toBe(true);
      expect(providersInDb.map((p) => p.provider).sort()).toEqual(['FACEBOOK', 'GOOGLE']);
    });

    it('Tạo Application B (User B) -> Tự động sinh Google & Facebook (disabled) riêng cho B', async () => {
      const res = await request(app.getHttpServer())
        .post('/applications')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ name: 'Application B' })
        .expect(201);

      appBId = res.body.id;
      appBAppId = res.body.appId;
      expect(appBId).toBeDefined();

      const providersInDb = await prisma.oAuthProvider.findMany({
        where: { applicationId: appBId },
      });
      expect(providersInDb).toHaveLength(2);
      expect(providersInDb.every((p) => p.isEnabled === false)).toBe(true);
    });
  });

  describe('Case 1: A.signInMethods !== B.signInMethods (Hai tập dữ liệu độc lập)', () => {
    it('Cấu hình của A và B có ID và applicationId hoàn toàn khác biệt trong database', async () => {
      const methodsA = await request(app.getHttpServer())
        .get(`/applications/${appAId}/auth-methods`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      const methodsB = await request(app.getHttpServer())
        .get(`/applications/${appBId}/auth-methods`)
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(200);

      const idsA = methodsA.body.map((m: any) => m.id);
      const idsB = methodsB.body.map((m: any) => m.id);

      // Không có bất kỳ ID nào trùng nhau giữa 2 ứng dụng
      for (const id of idsA) {
        expect(idsB).not.toContain(id);
      }
      expect(methodsA.body[0].applicationId).toBe(appAId);
      expect(methodsB.body[0].applicationId).toBe(appBId);
    });
  });

  describe('Case 2: Bật Google ở A -> Verify A.Google = ENABLED, B.Google = DISABLED', () => {
    it('Cập nhật clientId, secret và bật Google ở Application A', async () => {
      // 1. Cấu hình credentials cho Google ở App A
      await request(app.getHttpServer())
        .patch(`/applications/${appAId}/auth-methods/google`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          clientId: 'app-a-google-client-id.apps.googleusercontent.com',
          clientSecret: 'GOCSPX-app-a-secret-key-123',
        })
        .expect(200);

      // 2. Bật Google ở App A
      const toggleRes = await request(app.getHttpServer())
        .post(`/applications/${appAId}/auth-methods/google/toggle`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(toggleRes.body.isEnabled).toBe(true);

      // 3. Kiểm tra lại Application A: Google = ENABLED
      const appAMethods = await request(app.getHttpServer())
        .get(`/applications/${appAId}/auth-methods`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      const googleA = appAMethods.body.find((m: any) => m.provider === 'GOOGLE');
      expect(googleA.isEnabled).toBe(true);
      expect(googleA.clientId).toBe('app-a-google-client-id.apps.googleusercontent.com');

      // 4. Kiểm tra Application B: Google vẫn phải là DISABLED!
      const appBMethods = await request(app.getHttpServer())
        .get(`/applications/${appBId}/auth-methods`)
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(200);

      const googleB = appBMethods.body.find((m: any) => m.provider === 'GOOGLE');
      expect(googleB.isEnabled).toBe(false);
      expect(googleB.clientId).toBeNull();
    });
  });

  describe('Case 3: Bật Facebook ở B -> Verify A.Facebook vẫn giữ nguyên', () => {
    it('Bật Facebook ở Application B không làm ảnh hưởng Facebook của Application A', async () => {
      // 1. Cấu hình credentials cho Facebook ở App B
      await request(app.getHttpServer())
        .patch(`/applications/${appBId}/auth-methods/facebook`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          clientId: 'app-b-fb-app-id-999',
          clientSecret: 'app-b-fb-secret-888',
        })
        .expect(200);

      // 2. Bật Facebook ở App B
      await request(app.getHttpServer())
        .post(`/applications/${appBId}/auth-methods/facebook/toggle`)
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(200);

      // 3. Verify App B: Facebook = ENABLED
      const appBMethods = await request(app.getHttpServer())
        .get(`/applications/${appBId}/auth-methods`)
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(200);

      const fbB = appBMethods.body.find((m: any) => m.provider === 'FACEBOOK');
      expect(fbB.isEnabled).toBe(true);

      // 4. Verify App A: Facebook VẪN GIỮ NGUYÊN (DISABLED, null credentials)
      const appAMethods = await request(app.getHttpServer())
        .get(`/applications/${appAId}/auth-methods`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      const fbA = appAMethods.body.find((m: any) => m.provider === 'FACEBOOK');
      expect(fbA.isEnabled).toBe(false);
      expect(fbA.clientId).toBeNull();
    });
  });

  describe('Case 4: USER A đọc Application A -> 200 OK', () => {
    it('Chủ sở hữu được phép đọc cấu hình Application của mình', async () => {
      const res = await request(app.getHttpServer())
        .get(`/applications/${appAId}/auth-methods`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
    });

    it('Chủ sở hữu được phép đọc chi tiết một auth method cụ thể', async () => {
      const res = await request(app.getHttpServer())
        .get(`/applications/${appAId}/auth-methods/google`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(res.body.provider).toBe('GOOGLE');
      expect(res.body.isEnabled).toBe(true);
      expect(res.body.clientSecret).toBeUndefined(); // An toàn, không lộ secret
    });
  });

  describe('Case 5: USER A cố đọc Application B -> 403 Forbidden', () => {
    it('User không sở hữu không được xem danh sách auth-methods của người khác', async () => {
      const res = await request(app.getHttpServer())
        .get(`/applications/${appBId}/auth-methods`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(403);

      expect(res.body.message).toContain('không có quyền truy cập');
    });

    it('User không sở hữu không được xem chi tiết auth-method của người khác', async () => {
      const res = await request(app.getHttpServer())
        .get(`/applications/${appBId}/auth-methods/facebook`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(403);

      expect(res.body.message).toContain('không có quyền truy cập');
    });
  });

  describe('Case 6: USER A cố sửa Application B -> 403 Forbidden', () => {
    it('User không sở hữu không được PATCH auth-method của người khác', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/applications/${appBId}/auth-methods/google`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ isEnabled: true })
        .expect(403);

      expect(res.body.message).toContain('không có quyền truy cập');
    });

    it('User không sở hữu không được TOGGLE auth-method của người khác', async () => {
      const res = await request(app.getHttpServer())
        .post(`/applications/${appBId}/auth-methods/facebook/toggle`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(403);

      expect(res.body.message).toContain('không có quyền truy cập');
    });
  });

  describe('Case 7 & 8: ADMIN sửa Application A -> A thay đổi, B KHÔNG thay đổi', () => {
    it('ADMIN sửa Google của Application A: A thay đổi thành công', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/applications/${appAId}/auth-methods/google`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          clientId: 'admin-updated-client-id-for-a.apps.googleusercontent.com',
        })
        .expect(200);

      expect(res.body.clientId).toBe(
        'admin-updated-client-id-for-a.apps.googleusercontent.com',
      );
    });

    it('ADMIN sửa Application A tuyệt đối KHÔNG làm Application B bị thay đổi', async () => {
      const resB = await request(app.getHttpServer())
        .get(`/applications/${appBId}/auth-methods/google`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Application B vẫn giữ nguyên clientId = null
      expect(resB.body.clientId).toBeNull();
      expect(resB.body.isEnabled).toBe(false);
    });
  });

  describe('Case 9: Xóa Application A -> Sign-in Methods của A được cascade delete', () => {
    it('DELETE /applications/:id xóa sạch các record oauth_providers liên quan', async () => {
      // Xác nhận trước khi xóa, App A có 2 providers trong DB
      const beforeCount = await prisma.oAuthProvider.count({
        where: { applicationId: appAId },
      });
      expect(beforeCount).toBe(2);

      // Xóa Application A
      await request(app.getHttpServer())
        .delete(`/applications/${appAId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      // Xác nhận sau khi xóa, không còn provider nào của App A trong DB (Cascade)
      const afterCount = await prisma.oAuthProvider.count({
        where: { applicationId: appAId },
      });
      expect(afterCount).toBe(0);

      // Đánh dấu appAId đã xóa để afterAll không cần xóa lại
      appAId = '';
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // CLIENT DISCOVERY & OAUTH FLOW INTEGRATION
  // ═════════════════════════════════════════════════════════════════════════

  describe('Client Discovery & OAuth Flow theo Application Scope', () => {
    it('GET /auth/providers?app_id=:appBAppId -> Trả về cấu hình riêng của Application B', async () => {
      const res = await request(app.getHttpServer())
        .get(`/auth/providers?app_id=${appBAppId}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const fb = res.body.find((p: any) => p.provider === 'facebook');
      const gg = res.body.find((p: any) => p.provider === 'google');

      // Ở App B: Facebook đã được bật, Google chưa bật
      expect(fb.enabled).toBe(true);
      expect(gg.enabled).toBe(false);

      // Không lộ secret hay id nội bộ
      expect(fb.clientSecret).toBeUndefined();
      expect(fb.clientId).toBeUndefined();
    });

    it('GET /auth/oauth/facebook?app_id=:appBAppId&redirect_uri=... -> 302 Redirect sang Facebook OAuth', async () => {
      const res = await request(app.getHttpServer())
        .get(`/auth/oauth/facebook?app_id=${appBAppId}&redirect_uri=http://localhost:3001/`)
        .expect(302);

      const location = res.headers.location;
      expect(location).toContain('https://www.facebook.com');
      expect(location).toContain('client_id=app-b-fb-app-id-999');
      expect(location).toContain('state=');
    });

    it('GET /auth/oauth/google?app_id=:appBAppId khi Google ở App B đang disabled -> 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .get(`/auth/oauth/google?app_id=${appBAppId}&redirect_uri=http://localhost:3001/`)
        .expect(400);

      expect(res.body.message).toContain('vô hiệu hóa');
    });
  });
});
