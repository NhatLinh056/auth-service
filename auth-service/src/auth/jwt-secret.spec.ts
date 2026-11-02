import { afterEach, describe, expect, it, vi } from 'vitest';
import { getJwtSecret } from './jwt-secret.js';

describe('Production JWT secret configuration', () => {
  afterEach(() => vi.unstubAllEnvs());
  it.each(['', 'short', 'super_secret_jwt_key_microservice_platform_2026', 'replace_with_a_random_secret_of_at_least_32_characters'])('rejects unsafe configured secret', secret => {
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('JWT_SECRET', secret);
    expect(() => getJwtSecret()).toThrow();
  });
  it('accepts a private deployment value', () => {
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('JWT_SECRET', 'f2c47a83e970bb85adf019a2471bd631b2965390cba89295');
    expect(getJwtSecret()).toHaveLength(48);
  });
});
