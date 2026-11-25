import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  Inject,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { AuthClient } from '../client.js';
import { AUTH_CLIENT, AUTH_MODULE_OPTIONS } from './constants.js';
import type { NestAuthModuleOptions } from './auth.module.js';
import { extractCookie, validateCsrfOrigin } from './http-security.js';

@Controller('auth')
export class AuthCallbackController {
  constructor(
    @Inject(AUTH_CLIENT) private readonly authClient: AuthClient,
    @Inject(AUTH_MODULE_OPTIONS) private readonly options: NestAuthModuleOptions,
  ) {}

  @Get('login/google')
  async loginGoogle(@Req() req: any, @Res() res: any) {
    return this.handleLogin('google', req, res);
  }

  @Get('login/facebook')
  async loginFacebook(@Req() req: any, @Res() res: any) {
    return this.handleLogin('facebook', req, res);
  }

  @Get('callback')
  async handleCallback(@Req() req: any, @Res() res: any) {
    const code = req.query?.code;
    const state = req.query?.state;
    const error = req.query?.error;

    const failureRedirect = this.options.failureRedirect || '/login?error=';
    const successRedirect = this.options.successRedirect || '/profile';
    const transactionCookieName = this.options.transactionCookieName || 'auth_tx';
    const sessionCookieName = this.options.sessionCookieName || 'app_session';
    const isProduction = process.env.NODE_ENV === 'production';

    const fail = (msg: string) => {
      this.clearCookie(res, transactionCookieName);
      if (typeof res.redirect === 'function') {
        res.redirect(`${failureRedirect}${encodeURIComponent(msg)}`);
      } else {
        res.writeHead(302, { Location: `${failureRedirect}${encodeURIComponent(msg)}` }).end();
      }
    };

    if (error) {
      return fail(`OAuth provider error: ${error}`);
    }

    if (!code || typeof code !== 'string') {
      return fail('Missing authorization code in callback');
    }

    const rawTxCookie = extractCookie(req, transactionCookieName);
    if (!rawTxCookie) {
      return fail('No login transaction found in browser session');
    }

    const transaction = this.authClient.verifyTransaction(rawTxCookie);
    if (!transaction) {
      return fail('Invalid or tampered login transaction');
    }

    if (!state || transaction.state !== state) {
      return fail('State mismatch: callback state does not match transaction');
    }

    // Xóa transaction ngay lập tức (single-use transaction)
    this.clearCookie(res, transactionCookieName);

    try {
      const result = await this.authClient.completeLogin({
        code: code.trim(),
        state,
        transaction,
      });

      this.setCookie(res, sessionCookieName, result.accessToken, {
        httpOnly: true,
        sameSite: this.options.cookieOptions?.sameSite || 'lax',
        secure:
          this.options.cookieOptions?.secure !== undefined
            ? this.options.cookieOptions.secure
            : isProduction,
        maxAge: this.options.cookieOptions?.maxAge ?? 7 * 24 * 3600 * 1000,
        domain: this.options.cookieOptions?.domain,
        path: this.options.cookieOptions?.path || '/',
      });

      if (typeof res.redirect === 'function') {
        res.redirect(successRedirect);
      } else {
        res.writeHead(302, { Location: successRedirect }).end();
      }
    } catch (err: any) {
      return fail(err.message || 'Login exchange failed');
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async handleLogout(@Req() req: any, @Res() res: any) {
    validateCsrfOrigin(req, this.options);

    const sessionCookieName = this.options.sessionCookieName || 'app_session';
    const transactionCookieName = this.options.transactionCookieName || 'auth_tx';

    this.clearCookie(res, sessionCookieName);
    this.clearCookie(res, transactionCookieName);

    if (typeof res.json === 'function') {
      return res.json({ success: true, message: 'Logged out successfully' });
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Logged out successfully' }));
  }

  async handleLogin(provider: 'google' | 'facebook', _req: any, res: any) {
    const redirectUri =
      this.options.redirectUri ||
      `${this.options.publicAppUrl || 'http://localhost:3001'}/auth/callback`;
    const { url, transaction } = this.authClient.getAuthorizationUrl(provider, redirectUri);

    const isProduction = process.env.NODE_ENV === 'production';
    const transactionCookieName = this.options.transactionCookieName || 'auth_tx';
    const signedCookie = this.authClient.signTransaction(transaction);

    this.setCookie(res, transactionCookieName, signedCookie, {
      httpOnly: true,
      sameSite: 'lax',
      secure:
        this.options.cookieOptions?.secure !== undefined
          ? this.options.cookieOptions.secure
          : isProduction,
      maxAge: 10 * 60 * 1000, // 10 minutes
      path: '/',
      domain: this.options.cookieOptions?.domain,
    });

    if (typeof res.redirect === 'function') {
      res.redirect(url);
    } else {
      res.writeHead(302, { Location: url }).end();
    }
  }

  private setCookie(res: any, name: string, value: string, opts: any) {
    if (typeof res.cookie === 'function') {
      res.cookie(name, value, opts);
      return;
    }
    const directives: string[] = [`${name}=${encodeURIComponent(value)}`];
    directives.push(`Path=${opts.path || '/'}`);
    if (opts.domain) directives.push(`Domain=${opts.domain}`);
    if (opts.maxAge !== undefined) directives.push(`Max-Age=${Math.floor(opts.maxAge / 1000)}`);
    if (opts.httpOnly) directives.push('HttpOnly');
    if (opts.secure) directives.push('Secure');
    if (opts.sameSite) directives.push(`SameSite=${opts.sameSite}`);

    const cookieStr = directives.join('; ');
    const existing = res.getHeader?.('Set-Cookie');
    if (!existing) {
      res.setHeader?.('Set-Cookie', cookieStr);
    } else if (Array.isArray(existing)) {
      res.setHeader?.('Set-Cookie', [...existing, cookieStr]);
    } else {
      res.setHeader?.('Set-Cookie', [existing as string, cookieStr]);
    }
  }

  private clearCookie(res: any, name: string) {
    const isProduction = process.env.NODE_ENV === 'production';
    const isSessionCookie = name === (this.options.sessionCookieName || 'app_session');
    const path = isSessionCookie ? (this.options.cookieOptions?.path || '/') : '/';
    const secure =
      this.options.cookieOptions?.secure !== undefined
        ? this.options.cookieOptions.secure
        : isProduction;

    const cookieOpts: any = {
      path,
      httpOnly: true,
      sameSite: this.options.cookieOptions?.sameSite || 'lax',
      secure,
      maxAge: 0,
    };
    if (this.options.cookieOptions?.domain) {
      cookieOpts.domain = this.options.cookieOptions.domain;
    }

    if (typeof res.clearCookie === 'function') {
      res.clearCookie(name, cookieOpts);
      return;
    }
    this.setCookie(res, name, '', cookieOpts);
  }
}
