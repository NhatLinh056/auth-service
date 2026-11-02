import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import type { OAuthCallbackResult } from './oauth.service.js';
import { JwtService } from '@nestjs/jwt';
import { SharedIdentityService, type AccountLinkProof } from './shared-identity.service.js';

/** Single-process demo store. Restarts invalidate pending logins; never fail open. */
@Injectable()
export class OAuthGrantsService {
  constructor(private readonly identities: SharedIdentityService, private readonly jwt: JwtService) {}
  private readonly grants = new Map<string, {
    expiresAt: number; appId: string; challenge: string; result?: OAuthCallbackResult; attempts: number; busy: boolean;
    ready?: { id: string; userId: string; provider?: string };
  }>();

  issue(result: OAuthCallbackResult, appId: string, challenge: string): string {
    for (const [key, grant] of this.grants) {
      if (grant.expiresAt <= Date.now()) this.grants.delete(key);
    }
    if (this.grants.size >= 10000) throw new UnauthorizedException('Login capacity exceeded');
    const code = randomBytes(32).toString('base64url');
    this.grants.set(code, { result, appId, challenge, expiresAt: Date.now() + 300000, attempts: 0, busy: false });
    return code;
  }

  issueResolved(user: { id: string; userId: string; provider?: string }, appId: string, challenge: string) {
    for (const [key, grant] of this.grants) if (grant.expiresAt <= Date.now()) this.grants.delete(key);
    if (this.grants.size >= 10000) throw new UnauthorizedException('Login capacity exceeded');
    const code = randomBytes(32).toString('base64url');
    this.grants.set(code, { ready: user, appId, challenge, expiresAt: Date.now() + 60000, attempts: 0, busy: false });
    return code;
  }

  async exchange(code: unknown, verifier: unknown, appId: string, proof: AccountLinkProof = {}) {
    if (typeof code !== 'string' || typeof verifier !== 'string' ||
        !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) {
      throw new UnauthorizedException('Invalid login exchange');
    }
    const grant = this.grants.get(code);
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    if (!grant || grant.busy || grant.expiresAt <= Date.now() || grant.appId !== appId || grant.challenge !== challenge) {
      throw new UnauthorizedException('Invalid or expired login code');
    }
    grant.busy = true;
    try {
      const user = grant.ready
        ? { ...await this.identities.membershipForUser(grant.ready.userId, appId, grant.ready.id), provider: grant.ready.provider }
        : await this.identities.resolve(grant.result!, proof);
      const accessToken = await this.jwt.signAsync({
        sub: user.id, userId: user.userId, email: user.email, role: user.role,
        type: 'app_user', appId,
      });
      this.grants.delete(code);
      return { accessToken, user };
    } catch (error) {
      if (++grant.attempts >= 5) this.grants.delete(code);
      throw error;
    } finally { grant.busy = false; }
  }
}
