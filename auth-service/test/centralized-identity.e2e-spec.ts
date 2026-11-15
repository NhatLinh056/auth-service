import 'dotenv/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { OAuthGrantsService } from '../src/auth/oauth-grants.service.js';
import type { OAuthCallbackResult } from '../src/auth/oauth.service.js';
import { OAuthProviderType } from '../src/generated/prisma/enums.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Centralized identity and external app user isolation on isolated PostgreSQL (Phase 3)', () => {
  let app: INestApplication;
  let db: PrismaService;
  let jwt: JwtService;
  let grants: OAuthGrantsService;

  const verifier = 'v'.repeat(64);
  const challenge = createHash('sha256').update(verifier).digest('base64url');

  beforeAll(async () => {
    if (!new URL(process.env.DATABASE_URL!).pathname.startsWith('/identity_task5_')) {
      throw new Error('Isolated database required for E2E tests');
    }
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    db = app.get(PrismaService);
    jwt = app.get(JwtService);
    grants = app.get(OAuthGrantsService);
  });

  afterAll(async () => {
    await app?.close();
  });

  const createPlatformUser = async (role: 'ADMIN' | 'USER' = 'USER') => {
    const user = await db.user.create({
      data: {
        email: `platform-${randomUUID()}@test.invalid`,
        name: `Platform ${role}`,
        role,
      },
    });
    const token = jwt.sign({ sub: user.id, email: user.email, role, type: 'platform' });
    return { ...user, token };
  };

  const createTenantWithOwner = async () => {
    const owner = await createPlatformUser('USER');
    const tenant = await db.tenant.create({
      data: {
        name: `Tenant-${randomUUID().slice(0, 8)}`,
        ownerUserId: owner.id,
      },
    });
    await db.user.update({
      where: { id: owner.id },
      data: { tenantId: tenant.id },
    });
    return { owner, tenant };
  };

  const createApplication = async (ownerUserId: string) => {
    const appId = `app-${randomUUID().slice(0, 8)}`;
    const appToken = `apt_${randomUUID().replace(/-/g, '')}${randomUUID().replace(/-/g, '')}`;
    const application = await db.application.create({
      data: {
        name: `App-${appId}`,
        appId,
        appToken,
        userId: ownerUserId,
        status: 'ACTIVE',
      },
    });
    return application;
  };

  const createOAuthContext = (
    email: string,
    providerUserId: string,
    application: any,
    provider: OAuthProviderType = OAuthProviderType.GOOGLE,
    providerScope = 'google',
  ): OAuthCallbackResult => ({
    provider,
    providerScope,
    applicationId: application.id,
    appId: application.appId,
    redirectUri: 'http://localhost:3001/',
    codeChallenge: challenge,
    profile: {
      email,
      name: 'Simulated OAuth Customer',
      providerUserId,
      isEmailVerified: true,
    },
  });

  const exchangeOAuthCode = async (code: string, application: any, proof: Record<string, string> = {}, expectedStatus = 200) => {
    if (Object.keys(proof).length > 0) {
      try {
        const body = await grants.exchange(code, verifier, application.appId, proof);
        expect(expectedStatus).toBe(200);
        return { body };
      } catch (error: any) {
        const status = error.getStatus ? error.getStatus() : (error.status || 500);
        expect(status).toBe(expectedStatus);
        return { body: error.getResponse ? error.getResponse() : (error.response || {}) };
      }
    }
    return request(app.getHttpServer())
      .post('/auth/oauth/exchange')
      .set('x-app-id', application.appId)
      .set('x-app-token', application.appToken)
      .send({ code, verifier })
      .expect(expectedStatus);
  };

  const oAuthLogin = async (ctx: OAuthCallbackResult, application: any) => {
    const code = grants.issue(ctx, application.appId, challenge);
    const res = await exchangeOAuthCode(code, application, {}, 200);
    return res.body;
  };

  it('1. Luồng Demo OAuth exchange tự động tạo User chung, OAuthIdentity, AppUser, AppOAuthIdentity và xuất hiện qua GET /users', async () => {
    const admin = await createPlatformUser('ADMIN');
    const appOwner = await createPlatformUser('USER');
    const application = await createApplication(appOwner.id);

    const extEmail = `ext-oauth-${randomUUID()}@external.invalid`;
    const subject = `google-sub-${randomUUID()}`;
    const ctx = createOAuthContext(extEmail, subject, application);

    // Thực thi luồng OAuth thật: issue code -> POST /auth/oauth/exchange
    const authRes = await oAuthLogin(ctx, application);

    expect(authRes).toHaveProperty('accessToken');
    expect(authRes.user).toBeDefined();
    expect(authRes.user.email).toBe(extEmail);
    const canonicalUserId = authRes.user.userId;
    const membershipId = authRes.user.id;
    expect(canonicalUserId).toBeTruthy();
    expect(membershipId).toBeTruthy();

    // Xác nhận các thực thể dữ liệu được tạo chính xác và liên kết an toàn
    const canonicalUser = await db.user.findUniqueOrThrow({ where: { id: canonicalUserId } });
    expect(canonicalUser.email).toBe(extEmail);
    expect(canonicalUser.tenantId).toBeNull(); // Không bắt buộc thuộc tenant!

    // 1 OAuthIdentity toàn cục
    const oauthIdentity = await db.oAuthIdentity.findUniqueOrThrow({
      where: {
        provider_providerScope_providerUserId: {
          provider: 'GOOGLE',
          providerScope: 'google',
          providerUserId: subject,
        },
      },
    });
    expect(oauthIdentity.userId).toBe(canonicalUserId);

    // 1 AppUser thuộc application
    const appUser = await db.appUser.findUniqueOrThrow({
      where: { applicationId_userId: { applicationId: application.id, userId: canonicalUserId } },
    });
    expect(appUser.id).toBe(membershipId);
    expect(appUser.role).toBe('USER');

    // System Admin gọi GET /users (tương đương Console UsersTab) thấy User mới này
    const listRes = await request(app.getHttpServer())
      .get('/users')
      .auth(admin.token, { type: 'bearer' })
      .expect(200);

    expect(Array.isArray(listRes.body)).toBe(true);
    const found = listRes.body.find((u: any) => u.id === canonicalUserId);
    expect(found).toBeDefined();
    expect(found.email).toBe(extEmail);
    expect(found.tenantId).toBeNull();
    expect(found.role).toBe('USER');
    expect(found).not.toHaveProperty('passwordHash');
  });

  it('2. Tenant Owner bị chặn khỏi danh sách User toàn cục và chỉ thấy thành viên tenant mình', async () => {
    const { owner: tenantOwner, tenant } = await createTenantWithOwner();

    // Tenant Owner cố tình gọi GET /users toàn hệ thống -> 403 Forbidden
    const forbiddenRes = await request(app.getHttpServer())
      .get('/users')
      .auth(tenantOwner.token, { type: 'bearer' })
      .expect(403);
    expect(forbiddenRes.body.message).toBe('Bạn không có quyền truy cập tài nguyên này');

    // Tenant Owner gọi GET /tenants/me -> Chỉ thấy thông tin tenant của chính mình
    const meRes = await request(app.getHttpServer())
      .get('/tenants/me')
      .auth(tenantOwner.token, { type: 'bearer' })
      .expect(200);
    expect(meRes.body.tenant.id).toBe(tenant.id);
    expect(meRes.body.tenant.isOwner).toBe(true);
    expect(meRes.body.isSystemAdmin).toBe(false);
  });

  it('3. App Owner chỉ truy cập phạm vi app của mình; bị chặn khỏi GET /users và app người khác', async () => {
    const appOwnerA = await createPlatformUser('USER');
    const appOwnerB = await createPlatformUser('USER');
    const appA = await createApplication(appOwnerA.id);
    const appB = await createApplication(appOwnerB.id);

    // Đăng nhập một khách hàng vào appA qua OAuth exchange
    const custEmail = `cust-oauth-${randomUUID()}@test.invalid`;
    const authA = await oAuthLogin(createOAuthContext(custEmail, `sub-a-${randomUUID()}`, appA), appA);

    // 3a. App Owner cố gọi GET /users toàn cục -> 403 Forbidden
    await request(app.getHttpServer())
      .get('/users')
      .auth(appOwnerA.token, { type: 'bearer' })
      .expect(403);

    // 3b. App Owner gọi GET /applications/:id/users của chính app mình -> 200 OK
    const appUsersRes = await request(app.getHttpServer())
      .get(`/applications/${appA.id}/users`)
      .auth(appOwnerA.token, { type: 'bearer' })
      .expect(200);
    expect(Array.isArray(appUsersRes.body)).toBe(true);
    expect(appUsersRes.body.some((u: any) => u.id === authA.user.id)).toBe(true);

    // 3c. App Owner A cố xem người dùng của app B -> 403 Forbidden
    await request(app.getHttpServer())
      .get(`/applications/${appB.id}/users`)
      .auth(appOwnerA.token, { type: 'bearer' })
      .expect(403);

    // 3d. Tenant Owner cố xem người dùng của app A -> 403 Forbidden
    const { owner: tenantOwner } = await createTenantWithOwner();
    await request(app.getHttpServer())
      .get(`/applications/${appA.id}/users`)
      .auth(tenantOwner.token, { type: 'bearer' })
      .expect(403);
  });

  it('4. Một User dùng nhiều app qua OAuth exchange giữ nguyên 1 User.id, tạo 2 AppUser và 2 AppOAuthIdentity', async () => {
    const appOwner = await createPlatformUser('USER');
    const appA = await createApplication(appOwner.id);
    const appB = await createApplication(appOwner.id);

    const commonEmail = `multiapp-oauth-${randomUUID()}@external.invalid`;
    const sharedSubject = `google-shared-${randomUUID()}`;

    // Lần 1: Khách hàng đăng nhập vào App A qua Google OAuth exchange
    const firstLogin = await oAuthLogin(createOAuthContext(commonEmail, sharedSubject, appA), appA);

    // Lần 2: Cùng khách hàng (cùng Google subject) đăng nhập vào App B qua Google OAuth exchange
    const secondLogin = await oAuthLogin(createOAuthContext(commonEmail, sharedSubject, appB), appB);

    // Cùng chung canonical User ID!
    expect(firstLogin.user.userId).toBe(secondLogin.user.userId);
    // Khác nhau membership ID (AppUser.id)!
    expect(firstLogin.user.id).not.toBe(secondLogin.user.id);

    // Database Invariant: Bảng users chỉ có đúng 1 bản ghi
    const userCount = await db.user.count({ where: { email: commonEmail } });
    expect(userCount).toBe(1);

    // Bảng app_users có đúng 2 bản ghi (mỗi app 1 bản ghi)
    const membershipCount = await db.appUser.count({ where: { userId: firstLogin.user.userId } });
    expect(membershipCount).toBe(2);

    // Bảng oauth_identities có đúng 1 bản ghi (Google shared scope)
    const globalIdentities = await db.oAuthIdentity.count({ where: { userId: firstLogin.user.userId } });
    expect(globalIdentities).toBe(1);

    // Bảng app_users có 2 bản ghi riêng biệt cho App A và App B
    const appUserA = await db.appUser.findUnique({
      where: { applicationId_userId: { applicationId: appA.id, userId: firstLogin.user.userId } },
    });
    const appUserB = await db.appUser.findUnique({
      where: { applicationId_userId: { applicationId: appB.id, userId: firstLogin.user.userId } },
    });
    expect(appUserA?.id).toBe(firstLogin.user.id);
    expect(appUserB?.id).toBe(secondLogin.user.id);
  });

  it('5. Cross-App Token Rejection: Token OAuth của App A không dùng được cho App B tại verify-app-user', async () => {
    const appOwner = await createPlatformUser('USER');
    const appA = await createApplication(appOwner.id);
    const appB = await createApplication(appOwner.id);

    const email = `token-iso-${randomUUID()}@test.invalid`;
    const authA = await oAuthLogin(createOAuthContext(email, `sub-iso-${randomUUID()}`, appA), appA);

    // Dùng token App A gọi verify-app-user với header của App B -> 403 Forbidden
    const crossRes = await request(app.getHttpServer())
      .get('/users/verify-app-user')
      .auth(authA.accessToken, { type: 'bearer' })
      .set('x-app-id', appB.appId)
      .set('x-app-token', appB.appToken)
      .expect(403);
    expect(crossRes.body.message).toBe('Token belongs to another application');

    // Dùng token App A gọi verify-app-user với header của chính App A -> 200 OK
    const legitRes = await request(app.getHttpServer())
      .get('/users/verify-app-user')
      .auth(authA.accessToken, { type: 'bearer' })
      .set('x-app-id', appA.appId)
      .set('x-app-token', appA.appToken)
      .expect(200);
    expect(legitRes.body.appId).toBe(appA.appId);
    expect(legitRes.body.role).toBe('USER');
    expect(legitRes.body.appRole).toBe('USER');
    expect(legitRes.body.tenantId).toBeNull();
    expect(legitRes.body.isTenantOwner).toBe(false);
  });

  it('6. Bảo toàn danh tính User khi loại khỏi Tenant: loại thành viên không xóa bản ghi User hay AppUser', async () => {
    const { owner: tenantOwner, tenant } = await createTenantWithOwner();
    const appOwner = await createPlatformUser('USER');
    const application = await createApplication(appOwner.id);

    // Thành viên gia nhập tenant và có tài khoản app qua OAuth
    const memberEmail = `member-oauth-${randomUUID()}@test.invalid`;
    const authMember = await oAuthLogin(createOAuthContext(memberEmail, `sub-mem-${randomUUID()}`, application), application);

    // Gán user vào tenant
    await db.user.update({
      where: { id: authMember.user.userId },
      data: { tenantId: tenant.id },
    });

    // Tenant Owner loại thành viên khỏi tenant
    await request(app.getHttpServer())
      .delete(`/tenants/${tenant.id}/members/${authMember.user.userId}`)
      .auth(tenantOwner.token, { type: 'bearer' })
      .expect(200);

    // Kiểm tra: User.tenantId trở thành null
    const updatedMember = await db.user.findUniqueOrThrow({ where: { id: authMember.user.userId } });
    expect(updatedMember.tenantId).toBeNull();

    // Kiểm tra: Bản ghi canonical User và AppUser vẫn tồn tại nguyên vẹn
    expect(await db.user.count({ where: { id: authMember.user.userId } })).toBe(1);
    expect(await db.appUser.count({ where: { id: authMember.user.id } })).toBe(1);

    // User vẫn có thể xác thực và sử dụng token app bình thường
    const verifyRes = await request(app.getHttpServer())
      .get('/users/verify-app-user')
      .auth(authMember.accessToken, { type: 'bearer' })
      .set('x-app-id', application.appId)
      .set('x-app-token', application.appToken)
      .expect(200);
    expect(verifyRes.body.tenantId).toBeNull();
    expect(verifyRes.body.isTenantOwner).toBe(false);
  });

  it('7. Token app_user của tài khoản canonical ADMIN không được vượt RolesGuard nền tảng', async () => {
    const appOwner = await createPlatformUser('USER');
    const application = await createApplication(appOwner.id);

    // User đăng nhập OAuth, nhưng được set role ADMIN ở DB
    const adminEmail = `admin-oauth-${randomUUID()}@test.invalid`;
    const auth = await oAuthLogin(createOAuthContext(adminEmail, `sub-admin-${randomUUID()}`, application), application);

    await db.user.update({
      where: { id: auth.user.userId },
      data: { role: 'ADMIN' },
    });

    // Cố truy cập GET /users (yêu cầu @Auth(Role.ADMIN)) -> RolesGuard từ chối vì type === 'app_user'
    await request(app.getHttpServer())
      .get('/users')
      .auth(auth.accessToken, { type: 'bearer' })
      .expect(403);

    // verify-app-user trả về scoped appRole = USER
    const verifyRes = await request(app.getHttpServer())
      .get('/users/verify-app-user')
      .auth(auth.accessToken, { type: 'bearer' })
      .set('x-app-id', application.appId)
      .set('x-app-token', application.appToken)
      .expect(200);
    expect(verifyRes.body.appRole).toBe('USER');
    expect(verifyRes.body.role).toBe('USER');
  });

  it('8. Yêu cầu proof xác minh tài khoản khi OAuth trùng email với tài khoản mật khẩu hiện hữu (ACCOUNT_LINK_REQUIRED)', async () => {
    const appOwner = await createPlatformUser('USER');
    const application = await createApplication(appOwner.id);

    const sharedEmail = `password-user-${randomUUID()}@test.invalid`;
    const password = 'StrongPassword123!';
    const passwordHash = await bcrypt.hash(password, 10);

    // Tạo sẵn tài khoản nền tảng với mật khẩu
    const existingUser = await db.user.create({
      data: {
        email: sharedEmail,
        passwordHash,
        name: 'Existing Password Account',
        role: 'USER',
      },
    });

    // Cố đăng nhập OAuth lần đầu với email trùng mà không có proof
    const ctx = createOAuthContext(sharedEmail, `sub-link-${randomUUID()}`, application);
    const code = grants.issue(ctx, application.appId, challenge);

    // 8a. Đổi code không kèm proof -> bị từ chối 409 Conflict với mã ACCOUNT_LINK_REQUIRED
    const conflictRes = await exchangeOAuthCode(code, application, {}, 409);
    expect(conflictRes.body.code).toBe('ACCOUNT_LINK_REQUIRED');
    expect(conflictRes.body.message).toContain('Email đã có tài khoản');
    expect(await db.oAuthIdentity.count({ where: { userId: existingUser.id } })).toBe(0);

    // 8b. Đổi code với mật khẩu sai -> bị từ chối 401 Unauthorized
    await exchangeOAuthCode(code, application, { password: 'WrongPassword!' }, 401);

    // 8c. Đổi code với mật khẩu đúng -> Thành công 200 OK, liên kết an toàn
    const successRes = await exchangeOAuthCode(code, application, { password }, 200);
    expect(successRes.body.user.userId).toBe(existingUser.id);
    expect(await db.oAuthIdentity.count({ where: { userId: existingUser.id } })).toBe(1);
    expect((await db.user.findUniqueOrThrow({ where: { id: existingUser.id } })).emailVerifiedAt).not.toBeNull();
  });
});
