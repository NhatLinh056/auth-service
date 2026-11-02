import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Prisma, OAuthProviderType } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { OAuthService, type NormalizedOAuthProfile } from './oauth.service.js';
import { getAuthPublicUrl, getOAuthCallbackUrl } from './oauth-public-url.js';
import { hasOAuthCredentials } from './oauth-config-policy.js';
import { isTransactionConflict } from '../prisma/transaction-errors.js';
import { setTimeout as retryDelay } from 'node:timers/promises';

interface LinkState { purpose: 'account-link'; sub: string; provider: OAuthProviderType; scope: string; challenge: string; nonce: string }
interface PendingLink { userId: string; provider: OAuthProviderType; scope: string; challenge: string; expires: number }

@Injectable()
export class AccountOAuthService {
  private readonly tickets = new Map<string, PendingLink>();
  private readonly states = new Map<string, PendingLink>();
  private readonly codes = new Map<string, PendingLink & { profile: NormalizedOAuthProfile }>();

  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService, private readonly oauth: OAuthService) {}

  private provider(input: string) {
    const provider = input.toUpperCase();
    if (provider !== 'GOOGLE' && provider !== 'FACEBOOK') throw new BadRequestException('Unsupported OAuth provider');
    return provider as OAuthProviderType;
  }

  private config(provider: OAuthProviderType) {
    const override = process.env[`ACCOUNT_${provider}_CLIENT_ID`]?.trim() || process.env[`ACCOUNT_${provider}_CLIENT_SECRET`]?.trim();
    const prefix = override ? `ACCOUNT_${provider}` : provider;
    const clientId = process.env[`${prefix}_CLIENT_ID`]?.trim();
    const clientSecret = process.env[`${prefix}_CLIENT_SECRET`]?.trim();
    return { clientId, clientSecret, scope: provider === 'GOOGLE' ? 'google' : clientId || '' };
  }

  private clean() {
    for (const map of [this.tickets, this.states, this.codes]) {
      for (const [key, item] of map) if (item.expires <= Date.now()) map.delete(key);
    }
  }

  async profile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, passwordHash: true,
        identities: { select: { provider: true, providerScope: true, email: true } } },
    });
    if (!user) throw new UnauthorizedException('Account no longer exists');
    return {
      id: user.id, email: user.email, name: user.name, hasPassword: Boolean(user.passwordHash),
      providers: (['GOOGLE', 'FACEBOOK'] as const).map(provider => {
        const config = this.config(provider);
        const accounts = user.identities.filter(identity => identity.provider === provider &&
          (identity.providerScope === config.scope || (provider === 'FACEBOOK' && !config.clientId)));
        return { provider: provider.toLowerCase(), configured: hasOAuthCredentials(config),
          callbackUrl: getOAuthCallbackUrl(provider),
          accounts: accounts.map(identity => ({ email: identity.email })),
        };
      }),
    };
  }

  async begin(userId: string, input: string, challenge: string) {
    this.clean();
    const provider = this.provider(input);
    if (!/^[A-Za-z0-9_-]{43}$/.test(challenge)) throw new BadRequestException('S256 challenge required');
    const config = this.config(provider);
    if (!hasOAuthCredentials(config)) throw new BadRequestException('Auth Service chưa cấu hình Client ID/Secret cho phương thức này');
    if (!await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } })) throw new UnauthorizedException('Account no longer exists');
    if (this.tickets.size >= 10000) throw new BadRequestException('Account linking capacity exceeded');
    const ticket = randomBytes(32).toString('base64url');
    this.tickets.set(ticket, { userId, provider, scope: config.scope, challenge, expires: Date.now() + 60000 });
    return { startUrl: `${getAuthPublicUrl()}/auth/account/oauth/start?ticket=${encodeURIComponent(ticket)}` };
  }

  async start(ticket: string) {
    this.clean();
    const pending = this.tickets.get(ticket);
    if (!pending) throw new UnauthorizedException('Link request expired; please retry');
    this.tickets.delete(ticket);
    const config = this.config(pending.provider);
    if (!hasOAuthCredentials(config) || config.scope !== pending.scope) throw new BadRequestException('OAuth configuration changed; please retry');
    if (this.states.size >= 10000) throw new BadRequestException('Account linking capacity exceeded');
    const nonce = randomUUID();
    const state = await this.jwt.signAsync({ purpose: 'account-link', sub: pending.userId,
      provider: pending.provider, scope: pending.scope, challenge: pending.challenge, nonce } satisfies LinkState, { expiresIn: '10m' });
    this.states.set(nonce, { ...pending, expires: Date.now() + 600000 });
    const params = new URLSearchParams({ client_id: config.clientId!, redirect_uri: getOAuthCallbackUrl(pending.provider),
      response_type: 'code', state, scope: pending.provider === 'GOOGLE' ? 'openid email profile' : 'email,public_profile' });
    if (pending.provider === 'GOOGLE') params.set('prompt', 'select_account');
    return { state, url: `${pending.provider === 'GOOGLE' ? 'https://accounts.google.com/o/oauth2/v2/auth' : 'https://www.facebook.com/v19.0/dialog/oauth'}?${params}` };
  }

  async isAccountState(state?: string) {
    if (!state) return false;
    try {
      // Only route expired account callbacks to a safe error page; callback() still enforces expiry.
      const payload = await this.jwt.verifyAsync(state, { ignoreExpiration: true });
      return payload.purpose === 'account-link';
    } catch { return false; }
  }

  async callback(input: string, query: { state?: string; code?: string; error?: string }, cookie?: string) {
    if (!query.state || cookie !== encodeURIComponent(query.state)) throw new UnauthorizedException('Account-link browser session mismatch');
    let payload: LinkState;
    try { payload = await this.jwt.verifyAsync<LinkState>(query.state); }
    catch { throw new UnauthorizedException('Account-link session expired'); }
    const provider = this.provider(input);
    const pending = this.states.get(payload.nonce);
    if (payload.purpose !== 'account-link' || payload.provider !== provider || !pending ||
        pending.expires <= Date.now() || pending.userId !== payload.sub || pending.provider !== provider) {
      throw new UnauthorizedException('Invalid or consumed account-link state');
    }
    this.states.delete(payload.nonce);
    if (query.error) throw new BadRequestException('Account linking cancelled');
    if (!query.code) throw new BadRequestException('OAuth code is required');
    const config = this.config(provider);
    if (!hasOAuthCredentials(config) || config.scope !== pending.scope) throw new BadRequestException('OAuth configuration changed');
    const profile = await this.oauth.exchangeCodeForProfile(provider, query.code, config.clientId!, config.clientSecret!, getOAuthCallbackUrl(provider));
    if (!profile.isEmailVerified) throw new UnauthorizedException('Verified OAuth email required');
    this.clean();
    if (this.codes.size >= 10000) throw new BadRequestException('Account linking capacity exceeded');
    const code = randomBytes(32).toString('base64url');
    this.codes.set(code, { ...pending, profile, expires: Date.now() + 300000 });
    return code;
  }

  async complete(userId: string, code: string, verifier: string) {
    this.clean();
    const pending = this.codes.get(code);
    if (!pending || pending.userId !== userId || !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier) ||
        createHash('sha256').update(verifier).digest('base64url') !== pending.challenge) {
      throw new UnauthorizedException('Invalid account-link confirmation');
    }
    // One authenticated, browser-bound attempt consumes this code, including on conflict.
    this.codes.delete(code);
    for (let attempt = 0; ; attempt++) {
      try {
        await this.prisma.$transaction(async db => {
          const user = await db.user.findUnique({ where: { id: userId } });
          if (!user) throw new UnauthorizedException('Account no longer exists');
          const key = { provider: pending.provider, providerScope: pending.scope, providerUserId: pending.profile.providerUserId };
          const identity = await db.oAuthIdentity.findUnique({ where: { provider_providerScope_providerUserId: key } });
          if (identity && identity.userId !== userId) throw new ConflictException('Tài khoản OAuth này đã liên kết với người dùng khác');
          const existing = await db.oAuthIdentity.findFirst({ where: { userId, provider: pending.provider, providerScope: pending.scope } });
          if (existing && existing.providerUserId !== key.providerUserId) throw new ConflictException('Bạn đã liên kết một tài khoản khác cho phương thức này');
          const email = pending.profile.email.trim().toLowerCase();
          await db.oAuthIdentity.upsert({ where: { provider_providerScope_providerUserId: key },
            create: { ...key, userId, email }, update: { email } });
          if (!user.emailVerifiedAt && user.email.trim().toLowerCase() === email) {
            await db.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
          }
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
        return this.profile(userId);
      } catch (error) {
        if (isTransactionConflict(error) || error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          if (attempt < 3) { await retryDelay(25 * (attempt + 1)); continue; }
          throw new ConflictException('Thông tin liên kết vừa thay đổi. Vui lòng tải lại và thử lại.');
        }
        throw error;
      }
    }
  }
}
