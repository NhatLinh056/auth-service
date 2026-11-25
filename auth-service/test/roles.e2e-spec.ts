import 'dotenv/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { Role } from '../src/generated/prisma/enums.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Roles Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Dữ liệu người dùng mẫu phục vụ kiểm thử
  const ADMIN_EMAIL = 'admin_role_e2e@example.com';
  const USER_EMAIL = 'user_role_e2e@example.com';
  const PASSWORD = 'Password123!';

  let adminToken: string;
  let userToken: string;
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

    // Dọn dẹp dữ liệu cũ nếu còn sót lại từ lần chạy trước
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [ADMIN_EMAIL, USER_EMAIL],
        },
      },
    });

    // 1. Tạo tài khoản USER thông qua endpoint đăng ký
    const userRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: USER_EMAIL,
        password: PASSWORD,
        name: 'Regular User',
      })
      .expect(201);

    userId = userRes.body.id || userRes.body.user?.id;

    // 2. Đăng nhập để lấy token của USER
    const userLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: USER_EMAIL,
        password: PASSWORD,
      })
      .expect(200);

    userToken = userLoginRes.body.accessToken;

    // 3. Tạo tài khoản ADMIN trực tiếp qua Prisma để có quyền ADMIN hợp lệ
    await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        passwordHash: '$2b$10$abcdefghijklmnopqrstuv',
        name: 'System Admin',
        role: Role.ADMIN,
      },
    });

    // Cập nhật lại password hash hợp lệ cho ADMIN bằng cách login sau khi gán hash giống user
    const adminUser = await prisma.user.findUnique({ where: { email: USER_EMAIL } });
    await prisma.user.update({
      where: { email: ADMIN_EMAIL },
      data: { passwordHash: adminUser!.passwordHash },
    });

    // 4. Đăng nhập để lấy token của ADMIN
    const adminLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: ADMIN_EMAIL,
        password: PASSWORD,
      })
      .expect(200);

    adminToken = adminLoginRes.body.accessToken;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({
        where: {
          email: {
            in: [ADMIN_EMAIL, USER_EMAIL],
          },
        },
      });
    }
    if (app) {
      await app.close();
    }
  });

  describe('GET /roles (Danh sách vai trò)', () => {
    it('nên trả về 200 OK cùng danh sách tất cả các vai trò hợp lệ trong hệ thống', async () => {
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

  describe('POST /roles/assign (Gán & thay đổi vai trò)', () => {
    it('nên trả về 401 Unauthorized khi không gửi kèm Bearer token', async () => {
      await request(app.getHttpServer())
        .post('/roles/assign')
        .send({ userId, role: Role.ADMIN })
        .expect(401);
    });

    it('nên trả về 403 Forbidden khi người dùng role USER cố gắng gán vai trò', async () => {
      const res = await request(app.getHttpServer())
        .post('/roles/assign')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ userId, role: Role.ADMIN })
        .expect(403);

      expect(res.body.message).toContain('Bạn không có quyền truy cập tài nguyên này');
    });

    it('nên trả về 400 Bad Request khi role gửi lên không hợp lệ (không thuộc enum Role)', async () => {
      const res = await request(app.getHttpServer())
        .post('/roles/assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId, role: 'SUPER_HERO' })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it('nên trả về 400 Bad Request khi userId không đúng định dạng UUID', async () => {
      const res = await request(app.getHttpServer())
        .post('/roles/assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: 'not-a-uuid-1234', role: Role.ADMIN })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it('nên trả về 404 Not Found khi userId là UUID hợp lệ nhưng không tồn tại trong DB', async () => {
      const nonExistentUuid = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer())
        .post('/roles/assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: nonExistentUuid, role: Role.ADMIN })
        .expect(404);

      expect(res.body.message).toContain('Không tìm thấy người dùng');
    });

    it('nên nâng quyền người dùng thành ADMIN thành công khi ADMIN gọi', async () => {
      const res = await request(app.getHttpServer())
        .post('/roles/assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId, role: Role.ADMIN })
        .expect(200);

      expect(res.body).toHaveProperty('message');
      expect(res.body.user).toHaveProperty('id', userId);
      expect(res.body.user).toHaveProperty('role', Role.ADMIN);
      expect(res.body.user).not.toHaveProperty('passwordHash');

      const userInDb = await prisma.user.findUnique({ where: { id: userId } });
      expect(userInDb?.role).toBe(Role.ADMIN);
    });

    it('nên hạ quyền người dùng trở lại USER thành công khi ADMIN gọi', async () => {
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
        .post('/roles/assign')
        .set('Authorization', `Bearer ${downgradedToken}`)
        .send({ userId, role: Role.ADMIN })
        .expect(403);
    });

    it('nên từ chối 400 khi ADMIN tự hạ quyền chính mình', async () => {
      const adminInDb = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
      const res = await request(app.getHttpServer())
        .post('/roles/assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: adminInDb!.id, role: Role.USER })
        .expect(400);

      expect(res.body.message).toContain('Không thể tự hạ quyền');
    });

    it('nên từ chối 403 khi Admin bị hạ quyền trong DB dùng token cũ cố hạ quyền Admin cuối cùng', async () => {
      const runTag = Date.now();
      const secondAdmin = await prisma.user.create({
        data: {
          email: `second_admin_e2e_${runTag}@test.invalid`,
          passwordHash: '$2b$10$abcdefghijklmnopqrstuv',
          name: 'Second Admin',
          role: Role.ADMIN,
        },
      });

      const otherAdmins = await prisma.user.findMany({
        where: {
          role: Role.ADMIN,
          id: { notIn: [secondAdmin.id] },
        },
      });
      const mainAdmin = otherAdmins.find((a) => a.email === ADMIN_EMAIL);
      const extraAdmins = otherAdmins.filter((a) => a.email !== ADMIN_EMAIL);

      try {
        for (const extra of extraAdmins) {
          await prisma.user.update({ where: { id: extra.id }, data: { role: Role.USER } });
        }

        // Hạ quyền secondAdmin -> thành công
        await request(app.getHttpServer())
          .post('/roles/assign')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ userId: secondAdmin.id, role: Role.USER })
          .expect(200);

        const count = await prisma.user.count({ where: { role: Role.ADMIN } });
        expect(count).toBe(1);

        const thirdAdmin = await prisma.user.create({
          data: {
            email: `third_admin_e2e_${runTag}@test.invalid`,
            passwordHash: mainAdmin!.passwordHash,
            name: 'Third Admin',
            role: Role.ADMIN,
          },
        });
        const thirdLogin = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: `third_admin_e2e_${runTag}@test.invalid`, password: PASSWORD })
          .expect(200);
        const thirdToken = thirdLogin.body.accessToken;

        // Hạ quyền thirdAdmin trực tiếp trong DB để chỉ còn mainAdmin
        await prisma.user.update({ where: { id: thirdAdmin.id }, data: { role: Role.USER } });
        expect(await prisma.user.count({ where: { role: Role.ADMIN } })).toBe(1);

        // JwtStrategy đọc role từ DB nên từ chối 403 khi token cũ cố thao tác quyền ADMIN
        await request(app.getHttpServer())
          .post('/roles/assign')
          .set('Authorization', `Bearer ${thirdToken}`)
          .send({ userId: mainAdmin!.id, role: Role.USER })
          .expect(403);
      } finally {
        await prisma.user.deleteMany({
          where: {
            email: {
              in: [
                `second_admin_e2e_${runTag}@test.invalid`,
                `third_admin_e2e_${runTag}@test.invalid`,
              ],
            },
          },
        });
        for (const extra of extraAdmins) {
          await prisma.user.update({ where: { id: extra.id }, data: { role: Role.ADMIN } });
        }
      }
    });
  });

  describe('Role API Edge Cases & Security Validations', () => {
    it('nên trả về 401 khi token bị giả mạo / sai chữ ký', async () => {
      const tamperedToken = adminToken.slice(0, -6) + 'abcdef';
      await request(app.getHttpServer())
        .post('/roles/assign')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .send({ userId, role: Role.ADMIN })
        .expect(401);
    });

    it('nên trả về 401 khi Authorization header không đúng định dạng Bearer', async () => {
      await request(app.getHttpServer())
        .post('/roles/assign')
        .set('Authorization', 'Basic dXNlcjpwYXNz')
        .send({ userId, role: Role.ADMIN })
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
