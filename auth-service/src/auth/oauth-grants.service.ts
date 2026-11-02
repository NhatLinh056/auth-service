import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import type { OAuthCallbackResult } from './oauth.service.js';

/** Single-process demo store. Restarts invalidate pending logins; never fail open. */
@Injectable()
export class OAuthGrantsService {
  private readonly grants = new Map<string, {
    expiresAt: number; appId: string; challenge: string; result: OAuthCallbackResult;
  }>();

  issue(result: OAuthCallbackResult, appId: string, challenge: string): string {
    for (const [key, grant] of this.grants) {
      if (grant.expiresAt <= Date.now()) this.grants.delete(key);
    }
    if (this.grants.size >= 10000) throw new UnauthorizedException('Login capacity exceeded');
    const code = randomBytes(32).toString('base64url');
    this.grants.set(code, { result, appId, challenge, expiresAt: Date.now() + 60000 });
    return code;
  }

  exchange(code: unknown, verifier: unknown, appId: string) {
    if (typeof code !== 'string' || typeof verifier !== 'string' ||
        !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) {
      throw new UnauthorizedException('Invalid login exchange');
    }
    const grant = this.grants.get(code);
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    if (!grant || grant.expiresAt <= Date.now() || grant.appId !== appId || grant.challenge !== challenge) {
      throw new UnauthorizedException('Invalid or expired login code');
    }
    this.grants.delete(code);
    return { accessToken: grant.result.accessToken, user: grant.result.user };
  }
}
