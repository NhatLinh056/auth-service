import 'dotenv/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { Role } from '../src/generated/prisma/enums.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// ─────────────────────────────────────────────────────────────────────────────
// E2E Test Suite — Comprehensive Authorization & Permissions (TODO 68)
// Nghiệm thu toàn diện ma trận phân quyền (Permission Matrix) của PHASE 3.5:
// - Public endpoints (Bypass authentication)
// - Authenticated endpoints (401 Unauthorized khi thiếu/sai token)
// - Admin-only endpoints (403 Forbidden cho regular USER, 200 cho ADMIN)
// - Resource Owner vs Impersonator (403 khi can thiệp tài khoản khác)
// - Security edge cases: Privilege escalation prevention, tampered token, malformed header
// ─────────────────────────────────────────────────────────────────────────────

describe('Comprehensive Authorization Matrix (TODO 68 E2E)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const TIMESTAMP = Date.now();
  const PASSWORD = 'AuthPassword123!';

  const USER_EMAIL = `auth_user_${TIMESTAMP}@test.com`;
  const ADMIN_EMAIL = `auth_admin_${TIMESTAMP}@test.com`;
  const VICTIM_EMAIL = `auth_victim_${TIMESTAMP}@test.com`;

  let userToken: string;
  let userId: string;

  let adminToken: string;
  let adminId: string;

  let victimToken: string;
  let victimId: string;

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

    // 1. Tạo Regular User
    const userReg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: USER_EMAIL, password: PASSWORD, name: 'Normal User' });
    userId = userReg.body.id;

    const userLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: USER_EMAIL, password: PASSWORD });
    userToken = userLogin.body.accessToken;

    // 2. Tạo Admin User
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

    // 3. Tạo Victim User (để test quyền sở hữu tài nguyên)
    const victimReg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: VICTIM_EMAIL, password: PASSWORD, name: 'Victim User' });
    victimId = victimReg.body.id;

    const victimLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: VICTIM_EMAIL, password: PASSWORD });
    victimToken = victimLogin.body.accessToken;
  });

  afterAll(async () => {
    try {
      await prisma.user.deleteMany({
        where: {
          email: { in: [USER_EMAIL, ADMIN_EMAIL, VICTIM_EMAIL] },
        },
      });
    } catch {
      // Bỏ qua lỗi dọn dẹp nếu có
    }
    if (app) {
      await app.close();
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. MA TRẬN 1: PUBLIC ENDPOINTS (Không yêu cầu xác thực JWT)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Ma trận 1: Public Endpoints (Không cần token)', () => {
    it('GET /health -> phản hồi 200 OK không cần Authorization header', async () => {
      const res = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(res.body).toHaveProperty('status', 'ok');
    });

    it('GET /roles -> phản hồi 200 OK trả về danh sách vai trò hệ thống không cần token', async () => {
      const res = await request(app.getHttpServer())
        .get('/roles')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
    });

    it('POST /auth/login -> phản hồi 200 OK với thông tin xác thực hợp lệ', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: USER_EMAIL, password: PASSWORD })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
    });

    it('POST /auth/logout -> phản hồi 200 OK không cần token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(200);

      expect(res.body).toHaveProperty('message');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. MA TRẬN 2: AUTHENTICATION ENFORCEMENT (401 khi không có / sai token)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Ma trận 2: Xác thực bắt buộc (401 Unauthorized)', () => {
    it('các protected endpoints phải trả về 401 khi không gửi token', async () => {
      const protectedRoutes = [
        { method: 'get', path: '/users/me' },
        { method: 'get', path: '/users' },
        { method: 'get', path: `/users/${userId}` },
        { method: 'get', path: '/roles/admin' },
        { method: 'get', path: '/roles/user' },
        { method: 'get', path: `/roles/users/${userId}` },
        { method: 'patch', path: `/users/${userId}` },
        { method: 'delete', path: `/users/${userId}` },
      ];

      for (const route of protectedRoutes) {
        const req = (request(app.getHttpServer()) as any)[route.method](route.path);
        await req.expect(401);
      }
    });

    it('GET /users/me -> trả về 401 khi token bị giả mạo / sai chữ ký', async () => {
      const tamperedToken = userToken.slice(0, -5) + 'fake1';
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(401);
    });

    it('GET /users/me -> trả về 401 khi Authorization header không đúng định dạng Bearer', async () => {
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Basic dXNlcjpwYXNz')
        .expect(401);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. MA TRẬN 3: ADMIN-ONLY ENDPOINTS (@Auth(Role.ADMIN))
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Ma trận 3: Đặc quyền quản trị viên (@Auth(Role.ADMIN))', () => {
    it('GET /users -> người dùng USER gọi bị chặn với 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(res.body.message).toBe('Bạn không có quyền truy cập tài nguyên này');
    });

    it('GET /users -> quản trị viên ADMIN gọi thành công 200 OK', async () => {
      const res = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(3);
    });

    it('GET /roles/admin -> người dùng USER gọi bị chặn với 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get('/roles/admin')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('GET /roles/admin -> quản trị viên ADMIN gọi thành công 200 OK', async () => {
      const res = await request(app.getHttpServer())
        .get('/roles/admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.currentUser).toHaveProperty('role', Role.ADMIN);
      expect(res.body).toHaveProperty('stats');
    });

    it('POST /roles/assign -> người dùng USER gọi bị chặn với 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .post('/roles/assign')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ userId: victimId, role: Role.ADMIN })
        .expect(403);
    });

    it('POST /roles/assign -> quản trị viên ADMIN gọi gán vai trò thành công 200 OK', async () => {
      const res = await request(app.getHttpServer())
        .post('/roles/assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: victimId, role: Role.ADMIN })
        .expect(200);

      expect(res.body.user.role).toBe(Role.ADMIN);

      // Hạ lại quyền về USER để chuẩn bị cho test tiếp theo
      await request(app.getHttpServer())
        .post('/roles/assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: victimId, role: Role.USER })
        .expect(200);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. MA TRẬN 4: RESOURCE OWNER RESTRICTION (@AuthOwnerOrAdmin())
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Ma trận 4: Giới hạn chủ sở hữu tài nguyên (@AuthOwnerOrAdmin())', () => {
    it('PATCH /users/:id -> USER cố sửa thông tin VICTIM bị chặn với 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/users/${victimId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Hacked Name' })
        .expect(403);

      expect(res.body.message).toBe('Bạn không có quyền thao tác trên tài khoản của người khác');
    });

    it('PATCH /users/:id -> USER tự sửa thông tin chính mình thành công 200 OK', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Self Updated Name' })
        .expect(200);

      expect(res.body.name).toBe('Self Updated Name');
    });

    it('PATCH /users/:id -> ADMIN được phép sửa thông tin của bất kỳ ai thành công 200 OK', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/users/${victimId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Admin Modified Name' })
        .expect(200);

      expect(res.body.name).toBe('Admin Modified Name');
    });

    it('DELETE /users/:id -> USER cố xóa tài khoản VICTIM bị chặn với 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/users/${victimId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(res.body.message).toBe('Bạn không có quyền thao tác trên tài khoản của người khác');
    });

    it('DELETE /users/:id -> ADMIN có toàn quyền xóa tài khoản của người khác thành công 200 OK', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/users/${victimId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.user.id).toBe(victimId);
    });

    it('DELETE /users/:id -> sau khi bị ADMIN xóa, VICTIM không còn tồn tại trong hệ thống (404)', async () => {
      await request(app.getHttpServer())
        .get(`/users/${victimId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. MA TRẬN 5: SECURITY VALIDATIONS & PRIVILEGE ESCALATION ATTEMPTS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Ma trận 5: Kiểm tra an ninh & ngăn chặn leo thang quyền lực', () => {
    it('USER cố tình gửi thuộc tính role trong PATCH /users/:id để tự nâng cấp quyền -> bị chặn bởi whitelist validation (400)', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Hacker', role: 'ADMIN' })
        .expect(400);

      // Xác minh lại quyền của USER vẫn là USER nguyên vẹn trong DB
      const userCheck = await prisma.user.findUnique({ where: { id: userId } });
      expect(userCheck?.role).toBe(Role.USER);
    });

    it('GET /roles/user -> cho phép cả USER lẫn ADMIN truy cập thành công', async () => {
      // User thường truy cập
      await request(app.getHttpServer())
        .get('/roles/user')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Admin truy cập
      await request(app.getHttpServer())
        .get('/roles/user')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });
});
