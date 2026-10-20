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
});
