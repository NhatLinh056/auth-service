import 'dotenv/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { Role } from '../src/generated/prisma/enums.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Roles & Admin Access (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const ADMIN_EMAIL = `admin_${Date.now()}@test.com`;
  const USER_EMAIL = `user_${Date.now()}@test.com`;
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

    // 1. Đăng ký user thường
    const userReg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: USER_EMAIL, password: PASSWORD, name: 'Normal User' });
    userId = userReg.body.id;

    // Đăng nhập user thường lấy token
    const userLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: USER_EMAIL, password: PASSWORD });
    userToken = userLogin.body.accessToken;

    // 2. Đăng ký admin user
    const adminReg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: ADMIN_EMAIL, password: PASSWORD, name: 'Admin User' });
    adminId = adminReg.body.id;

    // Nâng cấp user này lên ADMIN trực tiếp trong DB để test quyền ADMIN
    await prisma.user.update({
      where: { id: adminId },
      data: { role: Role.ADMIN },
    });

    // Đăng nhập admin lấy token (token sẽ mang role ADMIN)
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: ADMIN_EMAIL, password: PASSWORD });
    adminToken = adminLogin.body.accessToken;
  });

  afterAll(async () => {
    // Dọn dẹp dữ liệu test
    try {
      if (adminId) await prisma.user.deleteMany({ where: { id: adminId } });
      if (userId) await prisma.user.deleteMany({ where: { id: userId } });
    } catch {
      // Bỏ qua lỗi dọn dẹp nếu có
    }
    if (app) {
      await app.close();
    }
  });

  describe('GET /roles', () => {
    it('nên trả về danh sách các vai trò (ADMIN, USER) trong hệ thống', async () => {
      const res = await request(app.getHttpServer())
        .get('/roles')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);

      const roles = res.body.map((r: { role: string }) => r.role);
      expect(roles).toContain('ADMIN');
      expect(roles).toContain('USER');
    });
  });

  describe('GET /roles/admin (Kiểm soát quyền ADMIN)', () => {
    it('nên trả về 401 Unauthorized khi không gửi kèm Bearer token', async () => {
      await request(app.getHttpServer())
        .get('/roles/admin')
        .expect(401);
    });

    it('nên trả về 403 Forbidden khi người dùng có role USER cố gắng truy cập', async () => {
      const res = await request(app.getHttpServer())
        .get('/roles/admin')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(res.body.message).toContain('Bạn không có quyền truy cập tài nguyên này');
    });

    it('nên trả về 200 OK cùng dữ liệu dashboard khi người dùng có role ADMIN truy cập', async () => {
      const res = await request(app.getHttpServer())
        .get('/roles/admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('stats');
      expect(res.body.stats).toHaveProperty('totalUsers');
      expect(res.body.stats).toHaveProperty('adminCount');
      expect(res.body.stats).toHaveProperty('userCount');
      expect(res.body.currentUser.role).toBe(Role.ADMIN);
      expect(res.body.currentUser.email).toBe(ADMIN_EMAIL);
    });
  });

  describe('GET /roles/user (Quyền hạn của role USER)', () => {
    it('nên trả về 401 Unauthorized khi không gửi kèm Bearer token', async () => {
      await request(app.getHttpServer())
        .get('/roles/user')
        .expect(401);
    });

    it('nên trả về 200 OK khi người dùng có role USER truy cập', async () => {
      const res = await request(app.getHttpServer())
        .get('/roles/user')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('permissions');
      expect(res.body.currentUser.role).toBe(Role.USER);
      expect(res.body.currentUser.email).toBe(USER_EMAIL);
    });

    it('nên trả về 200 OK khi người dùng có role ADMIN truy cập không gian người dùng', async () => {
      const res = await request(app.getHttpServer())
        .get('/roles/user')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('message');
      expect(res.body.currentUser.role).toBe(Role.ADMIN);
      expect(res.body.currentUser.email).toBe(ADMIN_EMAIL);
    });
  });

  describe('POST /roles/assign (Gán vai trò bởi ADMIN)', () => {
    it('nên trả về 401 Unauthorized khi không gửi token', async () => {
      await request(app.getHttpServer())
        .post('/roles/assign')
        .send({ userId, role: Role.ADMIN })
        .expect(401);
    });

    it('nên trả về 403 Forbidden khi người dùng có role USER cố gắng gán vai trò', async () => {
      const res = await request(app.getHttpServer())
        .post('/roles/assign')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ userId, role: Role.ADMIN })
        .expect(403);

      expect(res.body.message).toContain('Bạn không có quyền truy cập tài nguyên này');
    });

    it('nên trả về 400 Bad Request khi role không hợp lệ', async () => {
      await request(app.getHttpServer())
        .post('/roles/assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId, role: 'INVALID_ROLE' })
        .expect(400);
    });

    it('nên trả về 400 Bad Request khi userId không phải UUID hợp lệ', async () => {
      await request(app.getHttpServer())
        .post('/roles/assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: 'not-a-uuid', role: Role.ADMIN })
        .expect(400);
    });

    it('nên trả về 404 Not Found khi userId là UUID không tồn tại trong DB', async () => {
      const nonExistentUuid = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .post('/roles/assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: nonExistentUuid, role: Role.ADMIN })
        .expect(404);
    });

    it('nên cho phép ADMIN nâng cấp người dùng USER thành ADMIN thành công', async () => {
      const res = await request(app.getHttpServer())
        .post('/roles/assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId, role: Role.ADMIN })
        .expect(200);

      expect(res.body).toHaveProperty('message');
      expect(res.body.user.id).toBe(userId);
      expect(res.body.user.role).toBe(Role.ADMIN);
      expect(res.body.user).not.toHaveProperty('passwordHash');

      // Đăng nhập lại với tài khoản vừa được nâng cấp -> JWT token mới phải có role ADMIN
      const reLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: USER_EMAIL, password: PASSWORD })
        .expect(200);

      const upgradedToken = reLogin.body.accessToken;

      // Dùng token mới để truy cập endpoint ADMIN -> phải thành công 200 OK!
      await request(app.getHttpServer())
        .get('/roles/admin')
        .set('Authorization', `Bearer ${upgradedToken}`)
        .expect(200);
    });

    it('nên cho phép ADMIN hạ quyền tài khoản từ ADMIN về USER', async () => {
      const res = await request(app.getHttpServer())
        .post('/roles/assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId, role: Role.USER })
        .expect(200);

      expect(res.body.user.role).toBe(Role.USER);

      // Đăng nhập lại để nhận token mới với role USER
      const reLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: USER_EMAIL, password: PASSWORD })
        .expect(200);

      const downgradedToken = reLogin.body.accessToken;

      // Cố gắng truy cập endpoint ADMIN -> bị chặn với 403 Forbidden!
      await request(app.getHttpServer())
        .get('/roles/admin')
        .set('Authorization', `Bearer ${downgradedToken}`)
        .expect(403);
    });
  });

  describe('GET /roles/users/:id (Tra cứu vai trò người dùng)', () => {
    it('nên trả về 401 Unauthorized khi không gửi token', async () => {
      await request(app.getHttpServer())
        .get(`/roles/users/${userId}`)
        .expect(401);
    });

    it('nên trả về 404 Not Found khi ID người dùng không tồn tại', async () => {
      const nonExistentUuid = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(`/roles/users/${nonExistentUuid}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });

    it('nên trả về thông tin vai trò của regular user (USER)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/roles/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('userId', userId);
      expect(res.body).toHaveProperty('email', USER_EMAIL);
      expect(res.body).toHaveProperty('role', Role.USER);
      expect(res.body).toHaveProperty('roleName', 'User');
      expect(res.body).toHaveProperty('description');
    });

    it('nên trả về thông tin vai trò của admin user (ADMIN)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/roles/users/${adminId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('userId', adminId);
      expect(res.body).toHaveProperty('email', ADMIN_EMAIL);
      expect(res.body).toHaveProperty('role', Role.ADMIN);
      expect(res.body.roleName).toBe('Administrator');
      expect(res.body).toHaveProperty('description');
    });
  });

  describe('Role API Edge Cases & Security Validations', () => {
    it('nên trả về 401 khi token bị giả mạo / sai chữ ký', async () => {
      const tamperedToken = adminToken.slice(0, -6) + 'abcdef';
      await request(app.getHttpServer())
        .get('/roles/admin')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(401);
    });

    it('nên trả về 401 khi Authorization header không đúng định dạng Bearer', async () => {
      await request(app.getHttpServer())
        .get('/roles/user')
        .set('Authorization', 'Basic dXNlcjpwYXNz')
        .expect(401);
    });

    it('nên trả về 400 khi POST /roles/assign gửi kèm thuộc tính lạ không khai báo (whitelist validation)', async () => {
      await request(app.getHttpServer())
        .post('/roles/assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId, role: Role.ADMIN, maliciousField: 'injection' })
        .expect(400);
    });

    it('nên trả về 400 khi POST /roles/assign thiếu toàn bộ request body', async () => {
      await request(app.getHttpServer())
        .post('/roles/assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });
  });
});
