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
import { extractCookie, validateCsrfOrigin } from './http-security.js';

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
    const token = extractCookie(request, sessionCookieName);
    if (!token) {
      throw new UnauthorizedException('Missing authentication credentials');
    }

    // 3. CSRF Verification bắt buộc cho Cookie Auth với Unsafe Methods
    const method = (request.method || '').toUpperCase();
    const unsafeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (unsafeMethods.includes(method)) {
      validateCsrfOrigin(request, this.options);
    }

    return this.verifyAndAttach(token, request);
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
