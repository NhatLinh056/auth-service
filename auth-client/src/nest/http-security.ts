import { ForbiddenException } from '@nestjs/common';
import type { NestAuthModuleOptions } from './auth.module.js';

export function extractCookie(request: any, name: string): string | undefined {
  if (request.cookies?.[name]) return request.cookies[name];
  const cookieHeader = request.headers?.cookie;
  if (cookieHeader && typeof cookieHeader === 'string') {
    const parts = cookieHeader.split(';');
    for (const part of parts) {
      const idx = part.indexOf('=');
      if (idx > 0) {
        const key = part.slice(0, idx).trim();
        const val = part.slice(idx + 1).trim();
        if (key === name) {
          try {
            return decodeURIComponent(val);
          } catch {
            return val;
          }
        }
      }
    }
  }
  return undefined;
}

export function extractOriginFromReferer(referer?: string): string | undefined {
  if (!referer || typeof referer !== 'string') return undefined;
  try {
    return new URL(referer).origin;
  } catch {
    return undefined;
  }
}

export function getTrustedOrigins(request: any, options: NestAuthModuleOptions): string[] {
  const trusted: string[] = [];
  if (Array.isArray(options.trustedOrigins)) {
    for (const origin of options.trustedOrigins) {
      try {
        trusted.push(new URL(origin).origin);
      } catch {
        trusted.push(origin);
      }
    }
  }
  if (options.publicAppUrl) {
    try {
      trusted.push(new URL(options.publicAppUrl).origin);
    } catch {
      trusted.push(options.publicAppUrl);
    }
  }
  // Only fall back to request Host when no explicit origin allowlist is configured,
  // and never trust unverified X-Forwarded-Proto headers.
  if (trusted.length === 0) {
    const host = request.headers?.['host'];
    if (host && typeof host === 'string') {
      const proto = request.secure ? 'https' : 'http';
      trusted.push(`${proto}://${host}`);
    }
  }
  return trusted;
}

export function validateCsrfOrigin(request: any, options: NestAuthModuleOptions): void {
  const secFetchSite = request.headers?.['sec-fetch-site'];
  if (secFetchSite === 'cross-site') {
    throw new ForbiddenException('CSRF validation failed: Cross-site request rejected');
  }

  const origin =
    request.headers?.['origin'] || extractOriginFromReferer(request.headers?.['referer']);
  if (!origin) {
    throw new ForbiddenException('CSRF validation failed: Missing Origin and Referer header');
  }

  const trustedOrigins = getTrustedOrigins(request, options);
  const isTrusted = trustedOrigins.some(
    (trusted) => origin.toLowerCase() === trusted.toLowerCase(),
  );
  if (!isTrusted) {
    throw new ForbiddenException(`CSRF validation failed: Untrusted request origin "${origin}"`);
  }
}
