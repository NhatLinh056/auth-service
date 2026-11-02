import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OAuthGrantsService } from './oauth-grants.service.js';

describe('OAuth one-time grants', () => {
  afterEach(() => vi.useRealTimers());
  const verifier = 'v'.repeat(64);
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  function setup() {
    const service = new OAuthGrantsService();
    const result = { accessToken: 'private-token', user: { id: 'u' } } as any;
    return { service, code: service.issue(result, 'app-A', challenge) };
  }
  it('requires both correct app and browser verifier', () => {
    const { service, code } = setup();
    expect(() => service.exchange(code, verifier, 'app-B')).toThrow();
    expect(() => service.exchange(code, 'x'.repeat(64), 'app-A')).toThrow();
    expect(service.exchange(code, verifier, 'app-A').accessToken).toBe('private-token');
  });
  it('cannot redeem a code twice', () => {
    const { service, code } = setup();
    service.exchange(code, verifier, 'app-A');
    expect(() => service.exchange(code, verifier, 'app-A')).toThrow();
  });
  it('expires after one minute', () => {
    vi.useFakeTimers();
    const { service, code } = setup();
    vi.advanceTimersByTime(60001);
    expect(() => service.exchange(code, verifier, 'app-A')).toThrow();
  });
});
