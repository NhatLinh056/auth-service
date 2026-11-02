import { OAuthProviderType } from '../generated/prisma/enums.js';

/** Canonical public origin of Auth Service, independent of the internal listen port. */
export function getAuthPublicUrl(): string {
  const configured = process.env.AUTH_PUBLIC_URL;
  if (process.env.NODE_ENV === 'production' && !configured) {
    throw new Error('AUTH_PUBLIC_URL is required in production');
  }
  const value = configured || `http://localhost:${process.env.PORT || '3000'}`;
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('Invalid AUTH_PUBLIC_URL'); }
  const local = ['localhost', '127.0.0.1'].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
      !(url.protocol === 'https:' || (url.protocol === 'http:' && local && process.env.NODE_ENV !== 'production'))) {
    throw new Error('AUTH_PUBLIC_URL must be an HTTPS origin (HTTP is allowed for local development)');
  }
  return url.origin;
}

export function getOAuthCallbackUrl(provider: OAuthProviderType): string {
  return `${getAuthPublicUrl()}/auth/oauth/${provider.toLowerCase()}/callback`;
}
