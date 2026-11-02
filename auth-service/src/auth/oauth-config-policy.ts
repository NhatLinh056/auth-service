import { BadRequestException } from '@nestjs/common';

export function hasOAuthCredentials(config: { clientId?: string | null; clientSecret?: string | null }): boolean {
  const usable = (value?: string | null) => Boolean(value?.trim()) &&
    !/^(?:sample[-_]|your[-_]|replace[-_]|<)/i.test(value!.trim());
  return usable(config.clientId) && usable(config.clientSecret);
}

/** Use the same URL rules when saving configuration and when starting a login. */
export function validateOAuthRedirectUri(uri: string): string {
  let url: URL;
  try { url = new URL(uri); } catch { throw new BadRequestException('Invalid redirect URI'); }
  const local = ['localhost', '127.0.0.1'].includes(url.hostname);
  if (uri !== uri.trim() || /[\\\s]/.test(uri) || uri.includes('?') || uri.includes('#') ||
      url.username || url.password ||
      !(url.protocol === 'https:' || (url.protocol === 'http:' && local))) {
    throw new BadRequestException('Redirect URI must use HTTPS (HTTP only for localhost), without credentials, query or fragment');
  }
  return uri;
}
