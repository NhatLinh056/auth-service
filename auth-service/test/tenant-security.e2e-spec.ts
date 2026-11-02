import 'dotenv/config';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { OAuthService } from '../src/auth/oauth.service.js';

describe('Real database tenant authorization regression', () => {
  let app: any, db: PrismaService, jwt: JwtService, oauth: OAuthService;
  let owner: any, platformAdmin: any, tenantA: any, tenantB: any, customer: any;
  let customerToken: string, ownerToken: string, adminToken: string;
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    db = app.get(PrismaService); jwt = app.get(JwtService); oauth = app.get(OAuthService);
    const suffix = `${Date.now()}-${Math.random()}`;
    owner = await db.user.create({ data: { email: `owner-${suffix}@example.com`, role: 'USER' } });
    platformAdmin = await db.user.create({ data: { email: `admin-${suffix}@example.com`, role: 'ADMIN' } });
    tenantA = await db.application.create({ data: { name: 'Security A', appId: `app-a-${suffix}`, appToken: 'test-a-only', userId: owner.id, adminEmails: ['delegate@example.com'] } });
    tenantB = await db.application.create({ data: { name: 'Security B', appId: `app-b-${suffix}`, appToken: 'test-b-only', userId: owner.id } });
    customer = await db.appUser.create({ data: { applicationId: tenantA.id, email: 'delegate@example.com', role: 'ADMIN' } });
    customerToken = await jwt.signAsync({ sub: customer.id, type: 'app_user', appId: tenantA.appId, role: 'ADMIN', email: customer.email });
    ownerToken = await jwt.signAsync({ sub: owner.id, type: 'platform', role: 'USER', email: owner.email });
    adminToken = await jwt.signAsync({ sub: platformAdmin.id, type: 'platform', role: 'ADMIN', email: platformAdmin.email });
  });
  afterAll(async () => {
    if (db) await db.user.deleteMany({ where: { id: { in: [owner?.id, platformAdmin?.id].filter(Boolean) } } });
    await app?.close();
  });
  function verify(token: string, tenant = tenantA, secret = tenant.appToken) {
    return request(app.getHttpServer()).get('/users/verify-app-user')
      .set('Authorization', `Bearer ${token}`).set('X-App-Id', tenant.appId).set('X-App-Token', secret);
  }
  it('rejects AppUser ADMIN from platform users, roles, applications and mutations', async () => {
    for (const path of ['/users', '/roles/admin', '/applications', '/users/me']) {
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
  it('does not inherit platform ADMIN', async () => { expect((await verify(adminToken).expect(200)).body.appRole).toBe('USER'); });
  it('recognizes owner by platform ID', async () => { expect((await verify(ownerToken).expect(200)).body.appRole).toBe('ADMIN'); });
  it('applies delegated admin changes immediately even with old ADMIN JWT', async () => {
    expect((await verify(customerToken).expect(200)).body.appRole).toBe('ADMIN');
    await request(app.getHttpServer()).patch(`/applications/${tenantA.id}`).set('Authorization', `Bearer ${ownerToken}`).send({ adminEmails: [] }).expect(200);
    expect((await db.application.findUniqueOrThrow({ where: { id: tenantA.id } })).adminEmails).toEqual([]);
    expect((await verify(customerToken).expect(200)).body.appRole).toBe('USER');
  });
  it('rejects inactive app immediately', async () => {
    await db.application.update({ where: { id: tenantA.id }, data: { status: 'INACTIVE' } });
    try { await verify(customerToken).expect(403); }
    finally { await db.application.update({ where: { id: tenantA.id }, data: { status: 'ACTIVE' } }); }
  });
  it('does not let an unverified platform email claim app admin', async () => {
    await db.application.update({ where: { id: tenantA.id }, data: { adminEmails: [platformAdmin.email] } });
    expect((await verify(adminToken).expect(200)).body.appRole).toBe('USER');
  });
  it('allows one OAuth identity in two tenants without cross-linking', async () => {
    const profile = { providerUserId: 'same-provider-subject', email: 'same@example.com', name: 'Same user', isEmailVerified: true };
    const a = await oauth.findOrCreateOAuthUser('GOOGLE', profile, tenantA);
    const b = await oauth.findOrCreateOAuthUser('GOOGLE', profile, tenantB);
    expect(a.id).not.toBe(b.id);
    expect(a.applicationId).toBe(tenantA.id); expect(b.applicationId).toBe(tenantB.id);
    const repeat = await oauth.findOrCreateOAuthUser('GOOGLE', profile, tenantA);
    expect(repeat.id).toBe(a.id);
  });
});
