import {
  Injectable,
  Inject,
  type CanActivate,
  type ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  BadGatewayException,
} from '@nestjs/common';
import type { AuthClient } from '../client.js';
import { AUTH_CLIENT, AUTH_MODULE_OPTIONS } from './constants.js';
import type { NestAuthModuleOptions } from './auth.module.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(AUTH_CLIENT) private readonly authClient: AuthClient,
    @Inject(AUTH_MODULE_OPTIONS) private readonly options: NestAuthModuleOptions,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // 1. Bearer header: Miễn nhiễm CSRF của trình duyệt -> bypass CSRF check
    const authHeader = request.headers?.['authorization'];
    if (authHeader && typeof authHeader === 'string' && authHeader.trim().startsWith('Bearer ')) {
      const token = authHeader.trim().slice(7).trim();
      return this.verifyAndAttach(token, request);
    }

    // 2. Cookie phiên
    const sessionCookieName = this.options.sessionCookieName || 'app_session';
    const token = this.extractCookie(request, sessionCookieName);
    if (!token) {
      throw new UnauthorizedException('Missing authentication credentials');
    }

    // 3. CSRF Verification bắt buộc cho Cookie Auth với Unsafe Methods
    const method = (request.method || '').toUpperCase();
    const unsafeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (unsafeMethods.includes(method)) {
      this.validateCsrf(request);
    }

    return this.verifyAndAttach(token, request);
  }

  private extractCookie(request: any, name: string): string | undefined {
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

  private validateCsrf(request: any): void {
    // 1. Kiểm tra Fetch Metadata
    const secFetchSite = request.headers?.['sec-fetch-site'];
    if (secFetchSite === 'cross-site') {
      throw new ForbiddenException('CSRF validation failed: Cross-site request rejected');
    }

    // 2. Kiểm tra Origin / Referer theo Trusted Origin
    const origin =
      request.headers?.['origin'] || this.extractOriginFromReferer(request.headers?.['referer']);
    if (!origin) {
      throw new ForbiddenException('CSRF validation failed: Missing Origin and Referer header');
    }

    const trustedOrigins = this.getTrustedOrigins(request);
    const isTrusted = trustedOrigins.some(
      (trusted) => origin.toLowerCase() === trusted.toLowerCase(),
    );
    if (!isTrusted) {
      throw new ForbiddenException(`CSRF validation failed: Untrusted request origin "${origin}"`);
    }
  }

  private extractOriginFromReferer(referer?: string): string | undefined {
    if (!referer || typeof referer !== 'string') return undefined;
    try {
      const parsed = new URL(referer);
      return parsed.origin;
    } catch {
      return undefined;
    }
  }

  private getTrustedOrigins(request: any): string[] {
    const trusted: string[] = [];
    if (this.options.trustedOrigins && Array.isArray(this.options.trustedOrigins)) {
      trusted.push(...this.options.trustedOrigins);
    }
    if (this.options.publicAppUrl) {
      try {
        trusted.push(new URL(this.options.publicAppUrl).origin);
      } catch {
        trusted.push(this.options.publicAppUrl);
      }
    }
    const host = request.headers?.['host'];
    if (host) {
      const proto = request.headers?.['x-forwarded-proto'] || (request.secure ? 'https' : 'http');
      trusted.push(`${proto}://${host}`);
    }
    return trusted;
  }

  private async verifyAndAttach(token: string, request: any): Promise<boolean> {
    try {
      const user = await this.authClient.verifyUser(token);
      request.user = user;
      request.authToken = token;
      return true;
    } catch (err: any) {
      if (err.statusCode === 403) throw new ForbiddenException(err.message);
      if (err.statusCode === 502) throw new BadGatewayException(err.message);
      throw new UnauthorizedException(err.message || 'Invalid or expired session');
    }
  }
}
