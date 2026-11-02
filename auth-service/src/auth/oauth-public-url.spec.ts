import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAuthPublicUrl, getOAuthCallbackUrl } from './oauth-public-url.js';

describe('Auth public OAuth callback URL', () => {
  afterEach(() => vi.unstubAllEnvs());
  it('uses the externally visible HTTPS domain in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('AUTH_PUBLIC_URL', 'https://auth.example.com');
    expect(getOAuthCallbackUrl('GOOGLE')).toBe('https://auth.example.com/auth/oauth/google/callback');
  });
  it('rejects missing or unsafe production URLs', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('AUTH_PUBLIC_URL', '');
    expect(() => getAuthPublicUrl()).toThrow();
    vi.stubEnv('AUTH_PUBLIC_URL', 'http://auth.example.com');
    expect(() => getAuthPublicUrl()).toThrow();
    vi.stubEnv('AUTH_PUBLIC_URL', 'https://auth.example.com/other');
    expect(() => getAuthPublicUrl()).toThrow();
  });
});
