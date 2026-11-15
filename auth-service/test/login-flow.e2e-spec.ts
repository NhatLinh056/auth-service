import 'dotenv/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { LoginFlowService } from '../src/auth/login-flow.service.js';
import { OAuthService, type OAuthCallbackResult } from '../src/auth/oauth.service.js';

describe('Centralized client sign-in on isolated PostgreSQL', () => {
  let app: INestApplication, db: PrismaService, flows: LoginFlowService, jwt: JwtService;
  let client: any, owner: any;
  const verifier = 'v'.repeat(64), browserVerifier = 'b'.repeat(64), state = 's'.repeat(64);
  const hash = (value: string) => createHash('sha256').update(value).digest('base64url');
  const secret = 'Password123!';
  beforeAll(async () => {
    if (!new URL(process.env.DATABASE_URL!).pathname.startsWith('/identity_task5_')) throw new Error('Isolated DB required');
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init(); db = app.get(PrismaService); flows = app.get(LoginFlowService); jwt = app.get(JwtService);
    owner = await db.user.create({ data: { email: 'flow-owner@test.invalid', passwordHash: await bcrypt.hash(secret, 4) } });
    client = await db.application.create({ data: { name: 'Flow client', userId: owner.id, appId: 'flow-client', appToken: 'flow-token', allowedRedirectUris: ['http://localhost:3001/'] } });
  });
  afterAll(async () => { await app?.close(); });
  const create = (redirectUri = 'http://localhost:3001/', token = client.appToken) => request(app.getHttpServer()).post('/auth/flows')
    .set('x-app-id', client.appId).set('x-app-token', token).send({ redirectUri, codeChallenge: hash(verifier), state });
  const id = async () => new URL((await create().expect(201)).body.authorizeUrl).searchParams.get('signin')!;
  const exchange = (code: string, extra = {}, expected = 200) => request(app.getHttpServer()).post('/auth/oauth/exchange')
    .set('x-app-id', client.appId).set('x-app-token', client.appToken).send({ code, verifier, ...extra }).expect(expected);
  const pending = async (flowId: string, subject: string, email: string) => {
    const redirect = await flows.acceptOAuth({ flowId, appId: client.appId, applicationId: client.id, redirectUri: 'http://localhost:3001/',
      codeChallenge: hash(browserVerifier), provider: 'GOOGLE', providerScope: 'google',
      profile: { providerUserId: subject, email, name: 'Flow test', isEmailVerified: true } } as OAuthCallbackResult);
    return new URL(redirect).searchParams.get('oauth_login_code')!;
  };
  it('requires application credentials and rejects unregistered destinations', async () => {
    await create('http://localhost:3001/', 'wrong').expect(401);
    await create('https://unregistered.invalid/').expect(400);
  });
  it('shows only safe client information on the central page', async () => {
    const response = await request(app.getHttpServer()).get(`/auth/flows/${await id()}`).expect(200);
    expect(response.body).toMatchObject({ appName: 'Flow client', destination: 'http://localhost:3001' });
    expect(JSON.stringify(response.body)).not.toContain(client.appToken);
  });
  it('authenticates centrally and exchanges an app-scoped code only once', async () => {
    const flowId = await id();
    await request(app.getHttpServer()).post(`/auth/flows/${flowId}/password`).send({ email: owner.email, password: 'wrong' }).expect(401);
    const signed = await request(app.getHttpServer()).post(`/auth/flows/${flowId}/password`).send({ email: owner.email, password: secret }).expect(200);
    expect((await jwt.verifyAsync(signed.body.accessToken)).type).toBe('platform');
    expect(signed.headers['cache-control']).toBe('no-store');
    const redirect = new URL(signed.body.redirectUrl);
    expect(redirect.origin).toBe('http://localhost:3001'); expect(redirect.searchParams.get('state')).toBe(state);
    expect(redirect.searchParams.has('token')).toBe(false);
    const code = redirect.searchParams.get('code')!;
    await exchange(code, { password: secret }, 400);
    const result = await exchange(code);
    expect(await jwt.verifyAsync(result.body.accessToken)).toMatchObject({ type: 'app_user', appId: client.appId, userId: owner.id });
    await exchange(code, {}, 401);
    await request(app.getHttpServer()).get(`/auth/flows/${flowId}`).expect(401);
  });
  it('rejects app tokens as the session used to continue at Auth', async () => {
    const token = await jwt.signAsync({ sub: owner.id, type: 'app_user', appId: client.appId });
    await request(app.getHttpServer()).post(`/auth/flows/${await id()}/session`).auth(token, { type: 'bearer' }).send({}).expect(401);
  });
  it('accepts an explicit platform-session continuation', async () => {
    const token = await jwt.signAsync({ sub: owner.id, type: 'platform' });
    const signed = await request(app.getHttpServer()).post(`/auth/flows/${await id()}/session`).auth(token, { type: 'bearer' }).send({}).expect(200);
    expect(signed.body.user.id).toBe(owner.id);
  });
  it('keeps OAuth email confirmation at Auth and binds it to the Auth browser', async () => {
    const flowId = await id(), code = await pending(flowId, 'flow-oauth-owner', owner.email);
    const complete = (body: object) => request(app.getHttpServer()).post(`/auth/flows/${flowId}/oauth/complete`).send({ code, verifier: browserVerifier, ...body });
    await complete({ verifier: 'x'.repeat(64) }).expect(401);
    const required = await complete({}).expect(409); expect(required.body.code).toBe('ACCOUNT_LINK_REQUIRED');
    await complete({ password: 'wrong' }).expect(401);
    const result = await complete({ password: secret }).expect(200);
    expect(result.body.user.id).toBe(owner.id);
    const finalCode = new URL(result.body.redirectUrl).searchParams.get('code')!;
    await exchange(finalCode);
    await complete({ password: secret }).expect(401);
  });
  it('rejects a client session as OAuth account-link proof', async () => {
    const flowId = await id(), code = await pending(flowId, 'flow-oauth-new', 'flow-new@test.invalid');
    const linkToken = await jwt.signAsync({ sub: 'any', type: 'app_user', appId: client.appId });
    await request(app.getHttpServer()).post(`/auth/flows/${flowId}/oauth/complete`).send({ code, verifier: browserVerifier, linkToken }).expect(401);
    expect(await db.user.count({ where: { email: 'flow-new@test.invalid' } })).toBe(0);
  });
  it('routes a provider callback back to the Auth page before returning a client code', async () => {
    await db.oAuthProvider.update({ where: { applicationId_provider: { applicationId: client.id, provider: 'GOOGLE' } }, data: { isEnabled: true, clientId: 'flow-client.apps.googleusercontent.com', clientSecret: 'valid-test-secret-value' } });
    const flowId = await id();
    const begin = await request(app.getHttpServer()).post(`/auth/flows/${flowId}/oauth/google/begin`).send({ codeChallenge: hash(browserVerifier) }).expect(201);
    const startUrl = new URL(begin.body.startUrl);
    const start = await request(app.getHttpServer()).get(startUrl.pathname + startUrl.search).expect(302);
    const oauthState = new URL(start.headers.location).searchParams.get('state')!;
    const profile = vi.spyOn(app.get(OAuthService), 'exchangeCodeForProfile').mockResolvedValue({ providerUserId: 'callback-flow-subject', email: 'callback-flow@test.invalid', name: 'Callback', isEmailVerified: true });
    try {
      const callback = await request(app.getHttpServer()).get('/auth/oauth/google/callback').set('Cookie', start.headers['set-cookie']).query({ code: 'provider-code', state: oauthState }).expect(302);
      const location = new URL(callback.headers.location);
      expect(location.searchParams.get('signin')).toBe(flowId);
      expect(location.searchParams.has('code')).toBe(false);
      expect(location.searchParams.has('token')).toBe(false);
      const result = await request(app.getHttpServer()).post(`/auth/flows/${flowId}/oauth/complete`).send({ code: location.searchParams.get('oauth_login_code'), verifier: browserVerifier }).expect(200);
      expect(new URL(result.body.redirectUrl).origin).toBe('http://localhost:3001');
    } finally { profile.mockRestore(); }
  });
  it('checks current application status when a pending final code is exchanged', async () => {
    const token = await jwt.signAsync({ sub: owner.id, type: 'platform' });
    const signed = await request(app.getHttpServer()).post(`/auth/flows/${await id()}/session`).auth(token, { type: 'bearer' }).send({}).expect(200);
    await db.application.update({ where: { id: client.id }, data: { status: 'INACTIVE' } });
    try { await exchange(new URL(signed.body.redirectUrl).searchParams.get('code')!, {}, 403); }
    finally { await db.application.update({ where: { id: client.id }, data: { status: 'ACTIVE' } }); }
  });
});
