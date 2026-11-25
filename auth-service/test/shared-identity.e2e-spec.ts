import 'dotenv/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { OAuthGrantsService } from '../src/auth/oauth-grants.service.js';
import type { OAuthCallbackResult } from '../src/auth/oauth.service.js';
import { SharedIdentityService } from '../src/auth/shared-identity.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Shared identity migration and verified linking on isolated PostgreSQL', () => {
  let app: INestApplication;
  let db: PrismaService;
  let grants: OAuthGrantsService;
  let identities: SharedIdentityService;
  let jwt: JwtService;
  let appA: any;
  let appB: any;
  const verifier = 'v'.repeat(64);
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  let sequence = 0;
  const email = () => `test-${Date.now()}-${++sequence}@identity.invalid`;

  beforeAll(async () => {
    if (!new URL(process.env.DATABASE_URL!).pathname.startsWith('/identity_task5_')) throw new Error('Isolated DB required');
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    db = app.get(PrismaService);
    grants = app.get(OAuthGrantsService);
    identities = app.get(SharedIdentityService);
    jwt = app.get(JwtService);

    await db.tenantAuditLog.deleteMany();
    await db.tenantJoinRequest.deleteMany();
    await db.appUser.deleteMany();
    await db.oAuthIdentity.deleteMany();
    await db.oAuthProvider.deleteMany();
    await db.application.deleteMany();
    await db.tenant.deleteMany();
    await db.user.deleteMany();

    const owner = await db.user.create({ data: { email: email() } });
    appA = await db.application.upsert({
      where: { appId: 'app-A' },
      create: { name: 'A', appId: 'app-A', appToken: 'token-A', userId: owner.id, status: 'ACTIVE' },
      update: { userId: owner.id, appToken: 'token-A', status: 'ACTIVE' },
    });
    appB = await db.application.upsert({
      where: { appId: 'app-B' },
      create: { name: 'B', appId: 'app-B', appToken: 'token-B', userId: owner.id, status: 'ACTIVE' },
      update: { userId: owner.id, appToken: 'token-B', status: 'ACTIVE' },
    });
    await db.application.upsert({
      where: { id: 'legacy-app' },
      create: { id: 'legacy-app', name: 'Legacy App', appId: 'legacy-app', appToken: 'token-legacy', userId: owner.id, status: 'ACTIVE' },
      update: {},
    });
    for (const application of [appA, appB]) {
      for (const provider of ['GOOGLE', 'FACEBOOK'] as const) {
        await db.oAuthProvider.upsert({
          where: { applicationId_provider: { applicationId: application.id, provider } },
          create: { applicationId: application.id, provider, name: provider, isEnabled: true, clientId: `${provider.toLowerCase()}-client`, clientSecret: `${provider.toLowerCase()}-secret` },
          update: { isEnabled: true },
        });
      }
    }
    const legacyUser = await db.user.create({ data: { email: 'legacy-member@test.invalid' } });
    await db.oAuthIdentity.create({
      data: { provider: 'GOOGLE', providerScope: 'google', providerUserId: 'legacy-subject', email: 'legacy-member@test.invalid', userId: legacyUser.id },
    });
    await db.appUser.upsert({
      where: { id: 'legacy-member' },
      create: { id: 'legacy-member', applicationId: 'legacy-app', email: 'legacy-member@test.invalid', role: 'USER', userId: legacyUser.id },
      update: { userId: legacyUser.id },
    });
  });
  afterAll(async () => { await app?.close(); });

  const context = (mail: string, subject: string, application = appA, provider = 'GOOGLE', scope = 'google') => ({
    provider, providerScope: scope, applicationId: application.id, appId: application.appId,
    redirectUri: 'http://localhost:3001/', codeChallenge: challenge,
    profile: { email: mail, name: 'Test', providerUserId: subject, isEmailVerified: true },
  } as OAuthCallbackResult);
  const exchange = async (code: string, proof = {}, application = appA, expected = 200) => {
    if (Object.keys(proof).length) {
      try {
        const body = await grants.exchange(code, verifier, application.appId, proof);
        expect(expected).toBe(200); return { body };
      } catch (error: any) { expect(error.getStatus()).toBe(expected); return { body: error.getResponse() }; }
    }
    return request(app.getHttpServer()).post('/auth/oauth/exchange')
      .set('x-app-id', application.appId).set('x-app-token', application.appToken)
      .send({ code, verifier }).expect(expected);
  };
  const login = async (input: OAuthCallbackResult) => {
    const application = input.appId === appB.appId ? appB : appA;
    return (await exchange(grants.issue(input, input.appId, challenge), {}, application)).body;
  };

  it('creates one common user with independent app memberships', async () => {
    const mail = email();
    const first = await login(context(mail, 'shared-google'));
    const second = await login(context(mail, 'shared-google', appB));
    expect(first.user.userId).toBe(second.user.userId);
    expect(first.user.id).not.toBe(second.user.id);
    expect(await db.user.count({ where: { email: mail } })).toBe(1);
    expect(await db.appUser.count({ where: { userId: first.user.userId } })).toBe(2);
    const payload = await jwt.verifyAsync(first.accessToken);
    expect(payload).toMatchObject({ sub: first.user.id, userId: first.user.userId, appId: 'app-A' });
    await request(app.getHttpServer()).get('/users/verify-app-user').auth(first.accessToken, { type: 'bearer' })
      .set('x-app-id', appB.appId).set('x-app-token', appB.appToken).expect(403);
  });

  it('requires password proof rather than auto-linking an existing email', async () => {
    const mail = email();
    const existing = await db.user.create({ data: { email: mail, passwordHash: await bcrypt.hash('Password123!', 4) } });
    const input = context(mail, 'password-link');
    const code = grants.issue(input, input.appId, challenge);
    const pending = await exchange(code, {}, appA, 409);
    expect(pending.body.code).toBe('ACCOUNT_LINK_REQUIRED');
    expect(await db.oAuthIdentity.count({ where: { userId: existing.id } })).toBe(0);
    await exchange(code, { password: 'wrong' }, appA, 401);
    const confirmed = await exchange(code, { password: 'Password123!' });
    expect(confirmed.body.user.userId).toBe(existing.id);
    expect((await db.user.findUniqueOrThrow({ where: { id: existing.id } })).emailVerifiedAt).not.toBeNull();
    await exchange(code, {}, appA, 401);
  });

  it('links a second provider only after proof of the existing session', async () => {
    const mail = email();
    await db.oAuthProvider.upsert({
      where: { applicationId_provider: { applicationId: appA.id, provider: 'FACEBOOK' } },
      create: { applicationId: appA.id, provider: 'FACEBOOK', name: 'Facebook', isEnabled: true, clientId: 'facebook-client-a' },
      update: { clientId: 'facebook-client-a', isEnabled: true },
    });
    const first = await login(context(mail, 'first-provider'));
    const input = context(mail, 'second-provider', appA, 'FACEBOOK', 'facebook-client-a');
    const code = grants.issue(input, input.appId, challenge);
    await exchange(code, {}, appA, 409);
    const confirmed = await exchange(code, { linkToken: first.accessToken });
    expect(confirmed.body.user.userId).toBe(first.user.userId);
    expect(confirmed.body.user.id).toBe(first.user.id);
    expect(await db.oAuthIdentity.count({ where: { userId: first.user.userId } })).toBe(2);
    const profile = await request(app.getHttpServer()).get('/users/verify-app-user')
      .auth(confirmed.body.accessToken, { type: 'bearer' })
      .set('x-app-id', appA.appId).set('x-app-token', appA.appToken).expect(200);
    expect(profile.body.linkedAccounts).toEqual(expect.arrayContaining([
      { provider: 'google', email: mail }, { provider: 'facebook', email: mail },
    ]));
    expect(profile.body.linkedAccounts).toHaveLength(2);
  });

  it('allows explicit linking of different emails with proof of the current account', async () => {
    const first = await login(context(email(), 'different-email-first'));
    const input = context(email(), 'different-email-second', appA, 'FACEBOOK', 'fb-client');
    const code = grants.issue(input, input.appId, challenge);
    const linked = await exchange(code, { linkToken: first.accessToken });
    expect(linked.body.user.userId).toBe(first.user.userId);
    expect(linked.body.user.email).toBe(first.user.email);
  });

  it('never transfers an already linked OAuth identity to another user', async () => {
    const first = await login(context(email(), 'identity-owner'));
    const other = await login(context(email(), 'other-owner'));
    const input = context(first.user.email, 'identity-owner');
    await exchange(grants.issue(input, input.appId, challenge), { linkToken: other.accessToken }, appA, 409);
  });

  it('keeps Facebook client scopes separate even for the same provider subject', async () => {
    const first = await login(context(email(), 'scoped-subject', appA, 'FACEBOOK', 'client-a'));
    const second = await login(context(email(), 'scoped-subject', appB, 'FACEBOOK', 'client-b'));
    expect(first.user.userId).not.toBe(second.user.userId);
  });

  it('preserves the ID of a legacy membership after verified sign-in', async () => {
    const legacy = await db.application.findUniqueOrThrow({ where: { id: 'legacy-app' } });
    const result = await identities.resolve(context('legacy-member@test.invalid', 'legacy-subject', legacy));
    expect(result.id).toBe('legacy-member');
    expect(result.userId).toBeTruthy();
    const updatedMember = await db.appUser.findUniqueOrThrow({ where: { id: 'legacy-member' } });
    expect(updatedMember.userId).toBe(result.userId);
  });

  it('does not claim an unrelated legacy membership merely by matching email', async () => {
    const mail = email();
    const legacy = await db.appUser.create({ data: { applicationId: appA.id, email: mail } });
    const input = context(mail, 'unrelated-legacy');
    await exchange(grants.issue(input, input.appId, challenge), {}, appA, 409);
    expect((await db.appUser.findUniqueOrThrow({ where: { id: legacy.id } })).userId).toBeNull();
    expect(await db.user.count({ where: { email: mail } })).toBe(0);
  });

  it('rejects unverified emails before storing identities', async () => {
    const input = context(email(), 'unverified');
    input.profile.isEmailVerified = false;
    await expect(identities.resolve(input)).rejects.toThrow('Verified OAuth email required');
  });

  it('keeps global privilege independent of app delegation and does not grant ADMIN to AppUser', async () => {
    const mail = email();
    await db.application.update({ where: { id: appA.id }, data: { adminEmails: [mail] } });
    const first = await login(context(mail, 'delegated-subject'));
    const second = await login(context(mail, 'delegated-subject', appB));
    expect(first.user.role).toBe('USER');
    expect(second.user.role).toBe('USER');
    expect((await db.user.findUniqueOrThrow({ where: { id: first.user.userId } })).role).toBe('USER');
    const verifyFirst = await request(app.getHttpServer())
      .get('/users/verify-app-user')
      .auth(first.accessToken, { type: 'bearer' })
      .set('X-App-Id', appA.appId)
      .set('X-App-Token', appA.appToken)
      .expect(200);
    expect(verifyFirst.body.appRole).toBe('USER');
    expect(verifyFirst.body.role).toBe('USER');
    expect(verifyFirst.body.isAppOwner).toBe(false);
    await request(app.getHttpServer()).get('/users').auth(first.accessToken, { type: 'bearer' }).expect(403);
  });

  it('supports adding a password to a verified OAuth account and then checks the old password', async () => {
    const first = await login(context(email(), 'set-password'));
    const platformToken = await jwt.signAsync({ sub: first.user.userId, type: 'platform' });
    await request(app.getHttpServer()).post('/auth/account/password').auth(first.accessToken, { type: 'bearer' }).send({ password: 'NewPassword123!' }).expect(403);
    await request(app.getHttpServer()).post('/auth/account/password').auth(platformToken, { type: 'bearer' })
      .send({ password: 'NewPassword123!' }).expect(200);
    const signed = await request(app.getHttpServer()).post('/auth/login').send({ email: first.user.email.toUpperCase(), password: 'NewPassword123!' }).expect(200);
    expect(signed.body.user.id).toBe(first.user.userId);
    await request(app.getHttpServer()).post('/auth/account/password').auth(platformToken, { type: 'bearer' })
      .send({ password: 'Changed123!' }).expect(401);
    await request(app.getHttpServer()).post('/auth/account/password').auth(platformToken, { type: 'bearer' })
      .send({ password: 'Changed123!', currentPassword: 'NewPassword123!' }).expect(200);
  });

  it('rejects app sessions immediately after deletion of the common user', async () => {
    const first = await login(context(email(), 'delete-common'));
    await db.user.delete({ where: { id: first.user.userId } });
    await request(app.getHttpServer()).get('/auth/unused').expect(404);
    await request(app.getHttpServer()).get('/users/verify-app-user').auth(first.accessToken, { type: 'bearer' })
      .set('x-app-id', appA.appId).set('x-app-token', appA.appToken).expect(401);
  });

  it('converges concurrent first logins without duplicate identities', async () => {
    const mail = email();
    const input = context(mail, 'concurrent-subject');
    const results = await Promise.all([identities.resolve(input), identities.resolve(input)]);
    expect(results[0].userId).toBe(results[1].userId);
    expect(results[0].id).toBe(results[1].id);
    expect(await db.user.count({ where: { email: mail } })).toBe(1);
  });

  it('rejects codes for another app and wrong browser verifier before linking', async () => {
    const input = context(email(), 'invalid-exchange');
    const code = grants.issue(input, input.appId, challenge);
    await exchange(code, {}, appB, 401);
    await request(app.getHttpServer()).post('/auth/oauth/exchange').set('x-app-id', appA.appId).set('x-app-token', appA.appToken)
      .send({ code, verifier: 'x'.repeat(64) }).expect(401);
    await exchange(code);
  });

  it('limits repeated failed account confirmations for one code', async () => {
    const mail = email();
    await db.user.create({ data: { email: mail, passwordHash: await bcrypt.hash('Password123!', 4) } });
    const input = context(mail, 'limit-retries');
    const code = grants.issue(input, input.appId, challenge);
    for (let attempt = 0; attempt < 5; attempt++) await exchange(code, { password: 'wrong' }, appA, 401);
    await exchange(code, { password: 'Password123!' }, appA, 401);
  });
});
