/** Explicitly reject published examples in production. Never log secret values. */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production' &&
      (!secret || secret.length < 32 || /super.?secret|replace_with|your_jwt_secret/i.test(secret))) {
    throw new Error('JWT_SECRET must be a private random value of at least 32 characters');
  }
  return secret || 'unit-and-local-development-only-secret';
}
