import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPublicUrl } from './app.config.js';

describe('Portal public URL', () => {
  afterEach(() => vi.unstubAllEnvs());
  it('uses the externally visible HTTPS domain in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('PUBLIC_URL', 'https://shop.example.com');
    expect(getPublicUrl()).toBe('https://shop.example.com');
  });
  it('rejects an HTTP production URL or URL with a path', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('PUBLIC_URL', 'http://shop.example.com');
    expect(() => getPublicUrl()).toThrow();
    vi.stubEnv('PUBLIC_URL', 'https://shop.example.com/callback');
    expect(() => getPublicUrl()).toThrow();
  });
});
