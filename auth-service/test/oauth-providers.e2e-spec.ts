import 'dotenv/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { Role } from '../src/generated/prisma/enums.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('OAuth Providers Management (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const ADMIN_EMAIL = `admin_oauth_${Date.now()}@test.com`;
  const USER_EMAIL = `user_oauth_${Date.now()}@test.com`;
  const PASSWORD = 'Password123!';

  let adminToken: string;
  let userToken: string;
  let adminId: string;
  let userId: string;

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

    // 1. Tạo user thường
    const userReg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: USER_EMAIL, password: PASSWORD, name: 'Normal User' });
    userId = userReg.body.id;

    const userLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: USER_EMAIL, password: PASSWORD });
    userToken = userLogin.body.accessToken;

    // 2. Tạo admin user
    const adminReg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: ADMIN_EMAIL, password: PASSWORD, name: 'Admin User' });
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
    // Dọn dẹp user test
    if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    if (adminId) await prisma.user.delete({ where: { id: adminId } }).catch(() => {});
    await app.close();
  });

  describe('Quyền truy cập API (Authentication & Authorization)', () => {
    it('Chưa xác thực (không có token) -> 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer()).get('/oauth-providers');
      expect(res.status).toBe(401);
    });

    it('User thường (role USER) truy cập -> 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get('/oauth-providers')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(403);
    });

    it('Admin (role ADMIN) truy cập -> 200 OK', async () => {
      const res = await request(app.getHttpServer())
        .get('/oauth-providers')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Bảo mật dữ liệu (Data Privacy)', () => {
    it('Tuyệt đối không trả về clientSecret trong response danh sách hoặc chi tiết', async () => {
      const listRes = await request(app.getHttpServer())
        .get('/oauth-providers')
        .set('Authorization', `Bearer ${adminToken}`);

      for (const item of listRes.body) {
        expect(item.clientSecret).toBeUndefined();
        expect(typeof item.hasSecret).toBe('boolean');
      }

      const detailRes = await request(app.getHttpServer())
        .get('/oauth-providers/google')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(detailRes.status).toBe(200);
      expect(detailRes.body.clientSecret).toBeUndefined();
      expect(typeof detailRes.body.hasSecret).toBe('boolean');
    });
  });

  describe('Cập nhật cấu hình & Toggle trạng thái', () => {
    it('PATCH /oauth-providers/google -> cập nhật clientId và clientSecret thành công', async () => {
      const updateRes = await request(app.getHttpServer())
        .patch('/oauth-providers/google')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          clientId: 'test-google-client-id.apps.googleusercontent.com',
          clientSecret: 'GOCSPX-super-secret-test-key',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.clientId).toBe(
        'test-google-client-id.apps.googleusercontent.com',
      );
      expect(updateRes.body.hasSecret).toBe(true);
      expect(updateRes.body.clientSecret).toBeUndefined();
    });

    it('POST /oauth-providers/google/toggle -> bật / tắt thành công khi đã đủ thông tin', async () => {
      const toggleRes1 = await request(app.getHttpServer())
        .post('/oauth-providers/google/toggle')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(toggleRes1.status).toBe(200);
      const firstState = toggleRes1.body.isEnabled;

      const toggleRes2 = await request(app.getHttpServer())
        .post('/oauth-providers/google/toggle')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(toggleRes2.status).toBe(200);
      expect(toggleRes2.body.isEnabled).toBe(!firstState);
    });

    it('POST /oauth-providers/facebook/toggle -> ném 400 nếu bật khi chưa cấu hình secret', async () => {
      // Đảm bảo facebook chưa có credentials
      await prisma.oAuthProvider.update({
        where: { provider: 'FACEBOOK' },
        data: { clientId: null, clientSecret: null, isEnabled: false },
      });

      const res = await request(app.getHttpServer())
        .post('/oauth-providers/facebook/toggle')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('chưa cấu hình đầy đủ Client ID và Client Secret');
    });
  });
});
