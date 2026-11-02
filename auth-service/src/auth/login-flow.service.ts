import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';
import { OAuthService, type OAuthCallbackResult } from './oauth.service.js';
import { OAuthGrantsService } from './oauth-grants.service.js';
import { SharedIdentityService, type AccountLinkProof } from './shared-identity.service.js';
import { OAuthProvidersService } from '../oauth-providers/oauth-providers.service.js';
import { getAuthPublicUrl } from './oauth-public-url.js';

interface LoginFlow { appId: string; redirectUri: string; challenge: string; state: string; expires: number; busy: boolean }

@Injectable()
export class LoginFlowService {
  private readonly flows = new Map<string, LoginFlow>();
  private readonly tickets = new Map<string, { flowId: string; provider: string; challenge: string; expires: number }>();
  private readonly pending = new Map<string, { context: OAuthCallbackResult; expires: number; attempts: number; busy: boolean }>();
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService,
    private readonly auth: AuthService, private readonly oauth: OAuthService,
    private readonly grants: OAuthGrantsService, private readonly identities: SharedIdentityService,
    private readonly providers: OAuthProvidersService) {}

  private clean() {
    for (const map of [this.flows, this.tickets, this.pending]) {
      for (const [key, item] of map) if (item.expires <= Date.now()) map.delete(key);
    }
  }

  async create(appId: string, redirectUri: string, challenge: string, state: string) {
    this.clean();
    if (!/^[A-Za-z0-9_-]{43}$/.test(challenge) || !/^[A-Za-z0-9_-]{32,128}$/.test(state)) throw new BadRequestException('PKCE and client state required');
    const app = await this.prisma.application.findUnique({ where: { appId } });
    if (!app || app.status !== 'ACTIVE') throw new UnauthorizedException('Application unavailable');
    this.oauth.validateRedirect(redirectUri, app);
    if (this.flows.size >= 10000) throw new BadRequestException('Login capacity exceeded');
    const flowId = randomBytes(32).toString('base64url');
    this.flows.set(flowId, { appId, redirectUri, challenge, state, expires: Date.now() + 600000, busy: false });
    return { authorizeUrl: `${getAuthPublicUrl()}/?signin=${flowId}` };
  }

  private async flow(id: string) {
    this.clean();
    const flow = this.flows.get(id);
    if (!flow) throw new UnauthorizedException('Yêu cầu đăng nhập đã hết hạn. Hãy quay lại ứng dụng và thử lại.');
    const app = await this.prisma.application.findUnique({ where: { appId: flow.appId } });
    if (!app || app.status !== 'ACTIVE') throw new UnauthorizedException('Application unavailable');
    this.oauth.validateRedirect(flow.redirectUri, app);
    return { flow, app };
  }

  async details(id: string) {
    const { flow, app } = await this.flow(id);
    return { appName: app.name, destination: new URL(flow.redirectUri).origin,
      providers: await this.providers.getPublicProviders(app.appId) };
  }

  async oauthBegin(id: string, provider: string, challenge: string) {
    const { flow } = await this.flow(id);
    if (!/^[A-Za-z0-9_-]{43}$/.test(challenge)) throw new BadRequestException('Browser S256 challenge required');
    await this.oauth.checkOAuthAvailability(provider, flow.appId, flow.redirectUri);
    if (this.tickets.size >= 10000) throw new BadRequestException('Login capacity exceeded');
    const ticket = randomBytes(32).toString('base64url');
    this.tickets.set(ticket, { flowId: id, provider, challenge, expires: Date.now() + 60000 });
    return { startUrl: `${getAuthPublicUrl()}/auth/flows/oauth/start?ticket=${ticket}` };
  }

  async oauthStart(ticket: string) {
    this.clean();
    const pending = this.tickets.get(ticket);
    if (!pending) throw new UnauthorizedException('OAuth start request expired');
    this.tickets.delete(ticket);
    const { flow } = await this.flow(pending.flowId);
    const url = await this.oauth.getAuthorizationUrl(pending.provider, flow.redirectUri, flow.appId, pending.challenge, pending.flowId);
    return { url, state: new URL(url).searchParams.get('state')! };
  }

  async acceptOAuth(context: OAuthCallbackResult) {
    const { flow } = await this.flow(context.flowId!);
    if (context.appId !== flow.appId || context.redirectUri !== flow.redirectUri) throw new UnauthorizedException('OAuth flow mismatch');
    if (this.pending.size >= 10000) throw new BadRequestException('Login capacity exceeded');
    const code = randomBytes(32).toString('base64url');
    this.pending.set(code, { context, expires: Date.now() + 300000, attempts: 0, busy: false });
    return `${getAuthPublicUrl()}/?signin=${encodeURIComponent(context.flowId!)}&oauth_login_code=${code}`;
  }

  private async finish(id: string, userId: string, provider?: string) {
    const { flow } = await this.flow(id);
    if (flow.busy) throw new UnauthorizedException('Login request is being completed');
    flow.busy = true;
    try {
      const member = await this.identities.membershipForUser(userId, flow.appId);
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true, role: true, tenantId: true } });
      if (!user) throw new UnauthorizedException('Account no longer exists');
      const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email, role: user.role, type: 'platform' });
      const code = this.grants.issueResolved({ ...member, provider }, flow.appId, flow.challenge);
      const target = new URL(flow.redirectUri);
      target.searchParams.set('code', code); target.searchParams.set('state', flow.state);
      this.flows.delete(id);
      return { redirectUrl: target.href, accessToken, user };
    } finally { flow.busy = false; }
  }

  async password(id: string, email: string, password: string) {
    await this.flow(id);
    const session = await this.auth.login({ email, password });
    return this.finish(id, session.user.id);
  }

  session(id: string, userId: string) { return this.finish(id, userId); }

  async oauthComplete(id: string, code: string, verifier: string, proof: AccountLinkProof = {}) {
    await this.flow(id);
    const pending = this.pending.get(code);
    if (!pending || pending.busy || pending.context.flowId !== id || pending.expires <= Date.now() ||
        !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier) ||
        createHash('sha256').update(verifier).digest('base64url') !== pending.context.codeChallenge) {
      throw new UnauthorizedException('Invalid OAuth browser confirmation');
    }
    pending.busy = true;
    try {
      if (proof.linkToken) {
        let payload: any;
        try { payload = await this.jwt.verifyAsync(proof.linkToken); } catch { throw new UnauthorizedException('Invalid account session'); }
        if (payload.type !== 'platform') throw new UnauthorizedException('Project 1 session required');
      }
      const member = await this.identities.resolve(pending.context, proof);
      const result = await this.finish(id, member.userId, pending.context.provider);
      this.pending.delete(code);
      return result;
    } catch (error) {
      if (++pending.attempts >= 5) this.pending.delete(code);
      throw error;
    } finally { pending.busy = false; }
  }
}
