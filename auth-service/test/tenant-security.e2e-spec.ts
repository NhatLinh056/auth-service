import 'dotenv/config';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { SharedIdentityService } from '../src/auth/shared-identity.service.js';

describe('Real database tenant authorization regression', () => {
  let app: any, db: PrismaService, jwt: JwtService, oauth: SharedIdentityService;
  let owner: any, platformAdmin: any, tenantA: any, tenantB: any, customer: any;
  let customerToken: string, ownerToken: string, adminToken: string;
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    db = app.get(PrismaService); jwt = app.get(JwtService); oauth = app.get(SharedIdentityService);
    const suffix = `${Date.now()}-${Math.random()}`;
    owner = await db.user.create({ data: { email: `owner-${suffix}@example.com`, role: 'USER' } });
    platformAdmin = await db.user.create({ data: { email: `admin-${suffix}@example.com`, role: 'ADMIN' } });
    const delegateEmail = `delegate-${suffix}@example.com`;
    tenantA = await db.application.create({ data: { name: 'Security A', appId: `app-a-${suffix}`, appToken: 'test-a-only', userId: owner.id, adminEmails: [delegateEmail] } });
    tenantB = await db.application.create({ data: { name: 'Security B', appId: `app-b-${suffix}`, appToken: 'test-b-only', userId: owner.id } });
    const identity = await db.user.create({ data: { email: delegateEmail, emailVerifiedAt: new Date() } });
    customer = await db.appUser.create({ data: { applicationId: tenantA.id, userId: identity.id, email: identity.email, role: 'ADMIN' } });
    customerToken = await jwt.signAsync({ sub: customer.id, type: 'app_user', appId: tenantA.appId, role: 'ADMIN', email: customer.email });
    ownerToken = await jwt.signAsync({ sub: owner.id, type: 'platform', role: 'USER', email: owner.email });
    adminToken = await jwt.signAsync({ sub: platformAdmin.id, type: 'platform', role: 'ADMIN', email: platformAdmin.email });
  });
  afterAll(async () => {
    if (db) await db.user.deleteMany({ where: { id: { in: [owner?.id, platformAdmin?.id, customer?.userId].filter(Boolean) } } });
    await app?.close();
  });
  function verify(token: string, tenant = tenantA, secret = tenant.appToken) {
    return request(app.getHttpServer()).get('/users/verify-app-user')
      .set('Authorization', `Bearer ${token}`).set('X-App-Id', tenant.appId).set('X-App-Token', secret);
  }
  it('rejects AppUser ADMIN from platform users, roles, applications and mutations', async () => {
    for (const path of ['/users', '/applications', '/users/me']) {
      await request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${customerToken}`).expect(403);
    }
    await request(app.getHttpServer()).patch(`/users/${owner.id}`).set('Authorization', `Bearer ${customerToken}`).send({ name: 'intruder' }).expect(403);
    await request(app.getHttpServer()).patch(`/applications/${tenantA.id}`).set('Authorization', `Bearer ${customerToken}`).send({ adminEmails: ['intruder@example.com'] }).expect(403);
  });
  it('rejects a token without an explicit identity type', async () => {
    const token = await jwt.signAsync({ sub: owner.id, role: 'ADMIN' });
    await request(app.getHttpServer()).get('/applications').set('Authorization', `Bearer ${token}`).expect(401);
  });
  it('rejects cross-tenant JWTs', async () => { await verify(customerToken, tenantB).expect(403); });
  it('requires valid service credentials', async () => { await verify(customerToken, tenantA, 'wrong').expect(401); });
  it('rejects platform tokens at verify-app-user and does not inherit platform ADMIN on app_user tokens', async () => {
    await verify(adminToken).expect(403);
    const adminMember = await db.appUser.create({ data: { applicationId: tenantA.id, userId: platformAdmin.id, email: platformAdmin.email, role: 'USER' } });
    const adminAppToken = await jwt.signAsync({ sub: adminMember.id, type: 'app_user', appId: tenantA.appId, role: 'USER', email: platformAdmin.email });
    expect((await verify(adminAppToken).expect(200)).body.appRole).toBe('USER');
  });
  it('recognizes owner by platform ID on app_user token without granting ADMIN role', async () => {
    await verify(ownerToken).expect(403);
    const ownerMember = await db.appUser.create({ data: { applicationId: tenantA.id, userId: owner.id, email: owner.email, role: 'USER' } });
    const ownerAppToken = await jwt.signAsync({ sub: ownerMember.id, type: 'app_user', appId: tenantA.appId, role: 'USER', email: owner.email });
    const res = (await verify(ownerAppToken).expect(200)).body;
    expect(res.appRole).toBe('USER');
    expect(res.role).toBe('USER');
    expect(res.isAppOwner).toBe(true);
  });
  it('does not grant ADMIN to delegated adminEmails or legacy ADMIN JWT', async () => {
    const initial = (await verify(customerToken).expect(200)).body;
    expect(initial.appRole).toBe('USER');
    expect(initial.role).toBe('USER');
    expect(initial.isAppOwner).toBe(false);
    await request(app.getHttpServer()).patch('/applications/' + tenantA.id).set('Authorization', 'Bearer ' + ownerToken).send({ adminEmails: [] }).expect(200);
    expect((await db.application.findUniqueOrThrow({ where: { id: tenantA.id } })).adminEmails).toEqual([]);
    // Re-sign after app update (which advances updatedAt under R-02 revocation policy) while preserving legacy ADMIN claim
    const postUpdateCustomerToken = await jwt.signAsync({
      sub: customer.id,
      type: 'app_user',
      appId: tenantA.appId,
      role: 'ADMIN',
      email: customer.email,
      iatMs: Date.now(),
    });
    const updated = (await verify(postUpdateCustomerToken).expect(200)).body;
    expect(updated.appRole).toBe('USER');
    expect(updated.role).toBe('USER');
  });
  it('rejects inactive app immediately', async () => {
    await db.application.update({ where: { id: tenantA.id }, data: { status: 'INACTIVE' } });
    try { await verify(customerToken).expect(403); }
    finally { await db.application.update({ where: { id: tenantA.id }, data: { status: 'ACTIVE' } }); }
  });
  it('does not let an unverified platform email claim app admin', async () => {
    await db.application.update({ where: { id: tenantA.id }, data: { adminEmails: [platformAdmin.email] } });
    const existing = await db.appUser.findUniqueOrThrow({ where: { applicationId_userId: { applicationId: tenantA.id, userId: platformAdmin.id } } });
    const adminAppToken = await jwt.signAsync({ sub: existing.id, type: 'app_user', appId: tenantA.appId, role: 'USER', email: platformAdmin.email });
    expect((await verify(adminAppToken).expect(200)).body.appRole).toBe('USER');
  });
  it('shares one identity across apps but keeps memberships independent', async () => {
    const profile = { providerUserId: 'same-provider-subject', email: 'same@example.com', name: 'Same user', isEmailVerified: true };
    const context = (application: any) => ({ provider: 'GOOGLE' as const, providerScope: 'google', profile,
      applicationId: application.id, appId: application.appId, redirectUri: 'http://localhost:3001/', codeChallenge: 'x'.repeat(43) });
    const a = await oauth.resolve(context(tenantA));
    const b = await oauth.resolve(context(tenantB));
    expect(a.id).not.toBe(b.id);
    expect(a.userId).toBe(b.userId);
    const repeat = await oauth.resolve(context(tenantA));
    expect(repeat.id).toBe(a.id);
  });

  it('normalizes legacy ADMIN AppUser membership to USER in membershipForUser and resolve', async () => {
    const legacyUser = await db.user.create({
      data: { email: `legacy-${Date.now()}@example.com`, emailVerifiedAt: new Date(), role: 'USER' },
    });
    const legacyMember = await db.appUser.create({
      data: {
        applicationId: tenantA.id,
        userId: legacyUser.id,
        email: legacyUser.email,
        role: 'ADMIN',
      },
    });
    expect(legacyMember.role).toBe('ADMIN');

    // 1. membershipForUser normalizes role to USER in return value and in database
    const memberResult = await oauth.membershipForUser(legacyUser.id, tenantA.appId);
    expect(memberResult.role).toBe('USER');
    const dbMemberAfterForUser = await db.appUser.findUniqueOrThrow({ where: { id: legacyMember.id } });
    expect(dbMemberAfterForUser.role).toBe('USER');

    // Reset back to ADMIN to test resolve path
    await db.appUser.update({ where: { id: legacyMember.id }, data: { role: 'ADMIN' } });

    // 2. resolve normalizes role to USER when OAuth sign-in occurs
    const providerUserId = `prov-${Date.now()}`;
    await db.oAuthIdentity.create({
      data: {
        userId: legacyUser.id,
        provider: 'GOOGLE',
        providerScope: 'google',
        providerUserId,
        email: legacyUser.email,
      },
    });
    const profile = {
      providerUserId,
      email: legacyUser.email,
      name: 'Legacy Admin',
      isEmailVerified: true,
    };
    const context = {
      provider: 'GOOGLE' as const,
      providerScope: 'google',
      profile,
      applicationId: tenantA.id,
      appId: tenantA.appId,
      redirectUri: 'http://localhost:3001/',
      codeChallenge: 'x'.repeat(43),
    };
    const resolveResult = await oauth.resolve(context);
    expect(resolveResult.role).toBe('USER');
    const dbMemberAfterResolve = await db.appUser.findUniqueOrThrow({ where: { id: legacyMember.id } });
    expect(dbMemberAfterResolve.role).toBe('USER');

    await db.user.delete({ where: { id: legacyUser.id } });
  });

  it('updates tenant context live on /users/me and /users/verify-app-user across transfer and removal using the same token', async () => {
    const suffix = `${Date.now()}-${Math.random()}`;
    const userA = await db.user.create({
      data: { email: `tenant-user-${suffix}@example.com`, name: 'Tenant User', role: 'USER', emailVerifiedAt: new Date() },
    });
    const userB = await db.user.create({
      data: { email: `tenant-member-${suffix}@example.com`, name: 'Tenant Member', role: 'USER', emailVerifiedAt: new Date() },
    });
    const memberAppUser = await db.appUser.create({
      data: { applicationId: tenantA.id, userId: userA.id, email: userA.email, role: 'USER' },
    });

    const platformToken = await jwt.signAsync({ sub: userA.id, type: 'platform', role: 'USER', email: userA.email });
    const appUserToken = await jwt.signAsync({ sub: memberAppUser.id, type: 'app_user', appId: tenantA.appId, role: 'USER', email: userA.email });

    // Step 1: User has no tenant
    const meNoTenant = (await request(app.getHttpServer()).get('/users/me').set('Authorization', `Bearer ${platformToken}`).expect(200)).body;
    expect(meNoTenant.tenantId).toBeNull();
    expect(meNoTenant.tenantName).toBeNull();
    expect(meNoTenant.isTenantOwner).toBe(false);

    const verifyNoTenant = (await verify(appUserToken, tenantA).expect(200)).body;
    expect(verifyNoTenant.tenantId).toBeNull();
    expect(verifyNoTenant.tenantName).toBeNull();
    expect(verifyNoTenant.isTenantOwner).toBe(false);

    // Step 2: Create tenant with userA as owner and member
    const tenant = await db.tenant.create({
      data: { name: `Acme ${suffix}`, ownerUserId: userA.id },
    });
    await db.user.update({ where: { id: userA.id }, data: { tenantId: tenant.id } });
    await db.user.update({ where: { id: userB.id }, data: { tenantId: tenant.id } });

    // With the SAME tokens, live DB lookup reflects tenant membership and ownership
    const meWithOwner = (await request(app.getHttpServer()).get('/users/me').set('Authorization', `Bearer ${platformToken}`).expect(200)).body;
    expect(meWithOwner.tenantId).toBe(tenant.id);
    expect(meWithOwner.tenantName).toBe(`Acme ${suffix}`);
    expect(meWithOwner.isTenantOwner).toBe(true);

    const verifyWithOwner = (await verify(appUserToken, tenantA).expect(200)).body;
    expect(verifyWithOwner.tenantId).toBe(tenant.id);
    expect(verifyWithOwner.tenantName).toBe(`Acme ${suffix}`);
    expect(verifyWithOwner.isTenantOwner).toBe(true);

    // Step 3: Transfer ownership to userB (userA remains a member)
    await db.tenant.update({ where: { id: tenant.id }, data: { ownerUserId: userB.id } });

    // With the SAME tokens, userA is now a member, no longer owner
    const meAfterTransfer = (await request(app.getHttpServer()).get('/users/me').set('Authorization', `Bearer ${platformToken}`).expect(200)).body;
    expect(meAfterTransfer.tenantId).toBe(tenant.id);
    expect(meAfterTransfer.tenantName).toBe(`Acme ${suffix}`);
    expect(meAfterTransfer.isTenantOwner).toBe(false);

    const verifyAfterTransfer = (await verify(appUserToken, tenantA).expect(200)).body;
    expect(verifyAfterTransfer.tenantId).toBe(tenant.id);
    expect(verifyAfterTransfer.tenantName).toBe(`Acme ${suffix}`);
    expect(verifyAfterTransfer.isTenantOwner).toBe(false);

    // Step 4: Remove userA from tenant (leave tenant / tenantId = null)
    await db.user.update({ where: { id: userA.id }, data: { tenantId: null } });

    // With the SAME tokens, userA has no tenant
    const meAfterLeave = (await request(app.getHttpServer()).get('/users/me').set('Authorization', `Bearer ${platformToken}`).expect(200)).body;
    expect(meAfterLeave.tenantId).toBeNull();
    expect(meAfterLeave.tenantName).toBeNull();
    expect(meAfterLeave.isTenantOwner).toBe(false);

    const verifyAfterLeave = (await verify(appUserToken, tenantA).expect(200)).body;
    expect(verifyAfterLeave.tenantId).toBeNull();
    expect(verifyAfterLeave.tenantName).toBeNull();
    expect(verifyAfterLeave.isTenantOwner).toBe(false);

    // Cleanup
    await db.tenant.delete({ where: { id: tenant.id } });
    await db.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
  });
});
