import 'dotenv/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Role } from '../src/generated/prisma/enums.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// ──────────────────────────────────────────────────────────
// E2E Test Suite — User API (TODO 56 & TODO 66)
// Kiểm thử tích hợp toàn bộ luồng nghiệp vụ User API
// dùng database thực (auth_service_db), không mock.
// ──────────────────────────────────────────────────────────

describe('User API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  // Email duy nhất mỗi lần chạy để tránh conflict với dữ liệu cũ
  const TEST_EMAIL = `e2e_user_${Date.now()}@test.com`;
  const TEST_PASSWORD = 'TestPass123!';
  const TEST_NAME = 'E2E Test User';

  const ADMIN_EMAIL = `e2e_admin_${Date.now()}@test.com`;

  let accessToken: string;
  let userId: string;

  let adminAccessToken: string;
  let adminUserId: string;

  // ── Khởi tạo app một lần cho toàn bộ test suite ──
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<INestApplication<App>>();

    // Áp dụng ValidationPipe giống hệt main.ts để đảm bảo hành vi nhất quán
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Tạo và cấp quyền ADMIN cho tài khoản admin test
    const adminReg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: ADMIN_EMAIL, password: TEST_PASSWORD, name: 'E2E Admin User' });
    adminUserId = adminReg.body.id;

    await prisma.user.update({
      where: { id: adminUserId },
      data: { role: Role.ADMIN },
    });

    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: ADMIN_EMAIL, password: TEST_PASSWORD });
    adminAccessToken = adminLogin.body.accessToken;
  });

  // ── Dọn dẹp dữ liệu test và đóng app sau khi toàn bộ test chạy xong ──
  afterAll(async () => {
    // Xóa user test nếu còn tồn tại
    try {
      await prisma.user.deleteMany({
        where: { email: { in: [TEST_EMAIL, ADMIN_EMAIL] } },
      });
    } catch {
      // Bỏ qua nếu user đã bị xóa bởi test
    }
    await app.close();
  });

  // ════════════════════════════════════════════════════════
  // 1. POST /auth/register
  // ════════════════════════════════════════════════════════
  describe('POST /auth/register', () => {
    it('nên đăng ký thành công và trả về 201 không có passwordHash', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.email).toBe(TEST_EMAIL);
      expect(res.body.name).toBe(TEST_NAME);
      expect(res.body).not.toHaveProperty('passwordHash');

      // Lưu userId để dùng cho các test sau
      userId = res.body.id as string;
    });

    it('nên trả về 409 khi email đã tồn tại', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
        .expect(409);
    });

    it('nên trả về 400 khi email không hợp lệ', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'not-an-email', password: TEST_PASSWORD })
        .expect(400);
    });

    it('nên trả về 400 khi password quá ngắn (dưới 6 ký tự)', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: `short_pw_${Date.now()}@test.com`, password: '123' })
        .expect(400);
    });

    it('nên trả về 400 khi thiếu các field bắt buộc', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({})
        .expect(400);
    });
  });

  // ════════════════════════════════════════════════════════
  // 2. POST /auth/login
  // ════════════════════════════════════════════════════════
  describe('POST /auth/login', () => {
    it('nên đăng nhập thành công và trả về accessToken', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(typeof res.body.accessToken).toBe('string');
      expect(res.body.accessToken.length).toBeGreaterThan(0);
      expect(res.body.user).not.toHaveProperty('passwordHash');

      // Lưu token để dùng cho toàn bộ test còn lại
      accessToken = res.body.accessToken as string;
    });

    it('nên trả về 401 khi sai mật khẩu', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: TEST_EMAIL, password: 'WrongPassword!' })
        .expect(401);
    });

    it('nên trả về 401 khi email không tồn tại', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'ghost@test.com', password: TEST_PASSWORD })
        .expect(401);
    });

    it('nên trả về 400 khi thiếu field', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: TEST_EMAIL })
        .expect(400);
    });
  });

  // ════════════════════════════════════════════════════════
  // 3. GET /users/me
  // ════════════════════════════════════════════════════════
  describe('GET /users/me', () => {
    it('nên trả về profile của chính mình khi có token hợp lệ', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.id).toBe(userId);
      expect(res.body.email).toBe(TEST_EMAIL);
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('nên trả về 401 khi không có token', async () => {
      await request(app.getHttpServer())
        .get('/users/me')
        .expect(401);
    });

    it('nên trả về 401 khi token không hợp lệ', async () => {
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });
  });

  // ════════════════════════════════════════════════════════
  // 4. GET /users (Chỉ dành riêng cho ADMIN)
  // ════════════════════════════════════════════════════════
  describe('GET /users', () => {
    it('nên trả về 403 Forbidden khi người dùng thường (USER) cố truy cập', async () => {
      const res = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      expect(res.body.message).toBe('Bạn không có quyền truy cập tài nguyên này');
    });

    it('nên trả về 200 OK và danh sách users khi quản trị viên (ADMIN) truy cập', async () => {
      const res = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      // Đảm bảo không có phần tử nào chứa passwordHash
      for (const user of res.body as Record<string, unknown>[]) {
        expect(user).not.toHaveProperty('passwordHash');
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('email');
      }
    });

    it('nên trả về 401 khi không có token', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .expect(401);
    });

    it('nên trả về 401 khi token không hợp lệ', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });
  });

  // ════════════════════════════════════════════════════════
  // 5. GET /users/:id
  // ════════════════════════════════════════════════════════
  describe('GET /users/:id', () => {
    it('nên trả về user theo ID chính xác không có passwordHash', async () => {
      const res = await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.id).toBe(userId);
      expect(res.body.email).toBe(TEST_EMAIL);
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('nên trả về 404 khi ID không tồn tại', async () => {
      await request(app.getHttpServer())
        .get('/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('nên trả về 401 khi không có token', async () => {
      await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .expect(401);
    });
  });

  // ════════════════════════════════════════════════════════
  // 6. PATCH /users/:id
  // ════════════════════════════════════════════════════════
  describe('PATCH /users/:id', () => {
    it('nên cập nhật name thành công và trả về dữ liệu mới không có passwordHash', async () => {
      const newName = 'Updated E2E Name';
      const res = await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: newName })
        .expect(200);

      expect(res.body.name).toBe(newName);
      expect(res.body.id).toBe(userId);
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('nên cập nhật password thành công và đăng nhập lại được với mật khẩu mới', async () => {
      const newPassword = 'NewTestPass456!';

      await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ password: newPassword })
        .expect(200);

      // Đăng nhập lại với mật khẩu mới
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: TEST_EMAIL, password: newPassword })
        .expect(200);

      expect(loginRes.body).toHaveProperty('accessToken');

      // Cập nhật token và khôi phục mật khẩu gốc
      accessToken = loginRes.body.accessToken as string;
      await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ password: TEST_PASSWORD })
        .expect(200);

      // Lấy token mới với mật khẩu gốc cho các test còn lại
      const restoreRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
        .expect(200);
      accessToken = restoreRes.body.accessToken as string;
    });

    it('nên trả về 400 khi password quá ngắn', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ password: '123' })
        .expect(400);
    });

    it('nên trả về 404 khi ID không tồn tại', async () => {
      await request(app.getHttpServer())
        .patch('/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Ghost' })
        .expect(404);
    });

    it('nên trả về 401 khi không có token', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .send({ name: 'No Auth' })
        .expect(401);
    });
  });

  // ════════════════════════════════════════════════════════
  // 7. DELETE /users/:id
  // ════════════════════════════════════════════════════════
  describe('DELETE /users/:id', () => {
    it('nên trả về 401 khi không có token', async () => {
      await request(app.getHttpServer())
        .delete(`/users/${userId}`)
        .expect(401);
    });

    it('nên trả về 404 khi ID không tồn tại', async () => {
      await request(app.getHttpServer())
        .delete('/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('nên xóa user thành công và trả về thông tin user đã xóa (không có passwordHash)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.id).toBe(userId);
      expect(res.body.user).not.toHaveProperty('passwordHash');
    });

    it('sau khi xóa: GET /users/:id nên trả về 404', async () => {
      await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('sau khi xóa: đăng nhập lại nên trả về 401', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
        .expect(401);
    });
  });

  // ════════════════════════════════════════════════════════
  // 8. POST /auth/logout (stateless — luôn trả về 200)
  // ════════════════════════════════════════════════════════
  describe('POST /auth/logout', () => {
    it('nên trả về 200 kèm message đăng xuất thành công', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(200);

      expect(res.body).toHaveProperty('message');
    });
  });
});
