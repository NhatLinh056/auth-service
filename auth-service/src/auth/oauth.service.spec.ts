import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OAuthService } from './oauth.service.js';

const redirect = 'http://localhost:3001/';
const challenge = 'a'.repeat(43);
describe('OAuthService tenant security', () => {
  let service: OAuthService;
  let prisma: any;
  let config: any;
  let providers: any;
  let jwt: JwtService;
  beforeEach(() => {
    const application = { id: 'app-db', appId: 'app-public', status: 'ACTIVE', allowedRedirectUris: [redirect], adminEmails: [], user: { email: 'owner@example.com' } };
    prisma = {
      application: { findUnique: vi.fn().mockResolvedValue(application) },
      appUser: { findUnique: vi.fn(), create: vi.fn().mockResolvedValue({ id: 'u1', email: 'user@example.com', name: 'User', role: 'USER' }), update: vi.fn() },
      appOAuthIdentity: { findUnique: vi.fn(), create: vi.fn() },
    };
    config = { application, isEnabled: true, name: 'Google', clientId: 'test-id', clientSecret: 'test-secret', callbackUrl: 'http://localhost:3000/auth/oauth/google/callback' };
    providers = { normalizeProvider: vi.fn((p: string) => p.toUpperCase()), getInternalConfig: vi.fn().mockResolvedValue(config) };
    jwt = new JwtService({ secret: 'unit-test-secret-only', signOptions: { expiresIn: '1h' } });
    service = new OAuthService(prisma, providers, jwt);
    vi.spyOn(service, 'exchangeCodeForProfile').mockResolvedValue({ providerUserId: 'provider-user', email: 'user@example.com', name: 'User', isEmailVerified: true });
  });
  async function state() {
    return new URL(await service.getAuthorizationUrl('google', redirect, 'app-public', challenge)).searchParams.get('state')!;
  }
  it('constructs Google authorization with signed app-scoped state', async () => {
    const payload = await jwt.verifyAsync(await state());
    expect(payload).toMatchObject({ appId: 'app-public', redirectUri: redirect, codeChallenge: challenge });
  });
  it('only returns an error redirect when signed state points to a registered application URL', async () => {
    const signed = await state();
    expect(await service.getErrorRedirectUri(signed, 'google')).toBe(redirect);
    expect(await service.getErrorRedirectUri('forged', 'google')).toBeNull();
    prisma.application.findUnique.mockResolvedValue({ status: 'ACTIVE', allowedRedirectUris: [] });
    expect(await service.getErrorRedirectUri(signed, 'google')).toBeNull();
  });
  it('constructs Facebook authorization', async () => {
    expect(await service.getAuthorizationUrl('facebook', redirect, 'app-public', challenge)).toContain('facebook.com');
  });
  it('requires explicit app ID and PKCE', async () => {
    await expect(service.getAuthorizationUrl('google', redirect)).rejects.toThrow(BadRequestException);
  });
  it.each(['https://attacker.example/', 'http://localhost:3001/other', 'javascript:alert(1)', 'http://localhost:3001/?next=evil'])('rejects unregistered redirect %s', async uri => {
    await expect(service.getAuthorizationUrl('google', uri, 'app-public', challenge)).rejects.toThrow(BadRequestException);
  });
  it('rejects a disabled provider at initiation', async () => {
    config.isEnabled = false;
    await expect(state()).rejects.toThrow(BadRequestException);
  });
  it('rejects missing credentials', async () => {
    config.clientSecret = null;
    await expect(state()).rejects.toThrow(BadRequestException);
  });
  it('rejects provider errors and missing code/state', async () => {
    await expect(service.handleCallback('google', { error: 'denied' })).rejects.toThrow(UnauthorizedException);
    await expect(service.handleCallback('google', {})).rejects.toThrow(BadRequestException);
    await expect(service.handleCallback('google', { code: 'x' })).rejects.toThrow(BadRequestException);
  });
  it('rejects forged state', async () => {
    await expect(service.handleCallback('google', { code: 'x', state: 'invalid' })).rejects.toThrow(UnauthorizedException);
  });
  it('rejects provider mismatch', async () => {
    await expect(service.handleCallback('facebook', { code: 'x', state: await state() })).rejects.toThrow(UnauthorizedException);
  });
  it('rejects disabled provider at callback', async () => {
    const signed = await state(); config.isEnabled = false;
    await expect(service.handleCallback('google', { code: 'x', state: signed })).rejects.toThrow(ForbiddenException);
  });
  it('rejects deleted or inactive application', async () => {
    const signed = await state(); prisma.application.findUnique.mockResolvedValue(null);
    await expect(service.handleCallback('google', { code: 'x', state: signed })).rejects.toThrow(ForbiddenException);
  });
  it('rejects unverified provider email', async () => {
    vi.mocked(service.exchangeCodeForProfile).mockResolvedValue({ providerUserId: 'p', email: 'owner@example.com', name: '', isEmailVerified: false });
    await expect(service.handleCallback('google', { code: 'x', state: await state() })).rejects.toThrow(UnauthorizedException);
    expect(prisma.appUser.create).not.toHaveBeenCalled();
  });
  it('creates AppUser, issues scoped JWT and consumes state once', async () => {
    const signed = await state();
    const result = await service.handleCallback('google', { code: 'x', state: signed });
    expect(await jwt.verifyAsync(result.accessToken)).toMatchObject({ sub: 'u1', type: 'app_user', appId: 'app-public' });
    expect(prisma.appUser.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ applicationId: 'app-db' }) }));
    await expect(service.handleCallback('google', { code: 'x', state: signed })).rejects.toThrow(UnauthorizedException);
  });
  it('links identity to an existing AppUser within its tenant', async () => {
    prisma.appUser.findUnique.mockResolvedValue({ id: 'existing', role: 'USER', email: 'user@example.com' });
    await service.handleCallback('google', { code: 'x', state: await state() });
    expect(prisma.appOAuthIdentity.create).toHaveBeenCalledWith({ data: { appUserId: 'existing', applicationId: 'app-db', provider: 'GOOGLE', providerUserId: 'provider-user', email: 'user@example.com' } });
  });
  it('looks up provider identity using tenant as part of unique key', async () => {
    await service.handleCallback('google', { code: 'x', state: await state() });
    expect(prisma.appOAuthIdentity.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { applicationId_provider_providerUserId: { applicationId: 'app-db', provider: 'GOOGLE', providerUserId: 'provider-user' } } }));
  });
  it('calculates admins only from the target application', () => {
    expect(service.isApplicationAdmin('OWNER@example.com', config.application)).toBe(true);
    expect(service.isApplicationAdmin('other@example.com', config.application)).toBe(false);
    config.application.adminEmails = ['manager@example.com'];
    expect(service.isApplicationAdmin('Manager@example.com', config.application)).toBe(true);
  });
});
