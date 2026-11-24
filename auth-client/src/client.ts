import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export interface CookieOptions {
  domain?: string;
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
  path?: string;
  httpOnly?: boolean;
  maxAge?: number;
}

export interface AuthClientOptions {
  authServiceUrl: string;
  appId: string;
  appToken: string;
  timeoutMs?: number;
}

export interface VerifyServiceResult {
  valid: boolean;
  message: string;
  application: {
    id: string;
    name: string;
    appId: string;
    status: string;
    userId: string;
    user?: {
      id: string;
      email: string;
      name?: string;
      role: string;
    };
  };
}

export interface LoginTransaction {
  state: string;
  verifier: string;
  redirectUri: string;
  provider?: 'google' | 'facebook' | string;
  createdAt: number;
}

export interface BeginLoginOptions {
  provider?: 'google' | 'facebook' | string;
}

export interface AppUserProfile {
  id: string;
  userId?: string;
  email: string;
  name?: string;
  role: string;
  appRole: string;
  appId: string;
  isAppOwner: boolean;
  tenantId: string | null;
  tenantName: string | null;
  isTenantOwner: boolean;
  avatar?: string;
  [key: string]: any;
}

export interface OAuthProviderInfo {
  provider: string;
  name: string;
  enabled: boolean;
}

export class AuthClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthClientError';
  }
}

export class AuthClientConfigError extends AuthClientError {
  constructor(message: string) {
    super(message);
    this.name = 'AuthClientConfigError';
  }
}

export class AuthClientSecurityError extends AuthClientError {
  constructor(message: string) {
    super(message);
    this.name = 'AuthClientSecurityError';
  }
}

export class AuthClientHttpError extends AuthClientError {
  public statusCode: number;
  public responseBody?: any;

  constructor(message: string, statusCode: number, responseBody?: any) {
    super(message);
    this.name = 'AuthClientHttpError';
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

export class AuthClientVerificationError extends AuthClientError {
  public statusCode: number;
  public causeError?: any;

  constructor(message: string, causeError?: any, statusCode: number = 401) {
    super(message);
    this.name = 'AuthClientVerificationError';
    this.causeError = causeError;
    this.statusCode = statusCode;
  }
}

export class AuthClient {
  readonly authServiceUrl: string;
  readonly appId: string;
  readonly appToken: string;
  readonly timeoutMs: number;

  constructor(options: AuthClientOptions) {
    if (!options?.authServiceUrl || typeof options.authServiceUrl !== 'string' || !options.authServiceUrl.trim()) {
      throw new AuthClientConfigError('Missing or empty required option: authServiceUrl');
    }
    if (!options?.appId || typeof options.appId !== 'string' || !options.appId.trim()) {
      throw new AuthClientConfigError('Missing or empty required option: appId');
    }
    if (!options?.appToken || typeof options.appToken !== 'string' || !options.appToken.trim()) {
      throw new AuthClientConfigError('Missing or empty required option: appToken');
    }

    this.authServiceUrl = options.authServiceUrl.trim().replace(/\/+$/, '');
    this.appId = options.appId.trim();
    this.appToken = options.appToken.trim();
    this.timeoutMs = options.timeoutMs && options.timeoutMs > 0 ? options.timeoutMs : 5000;
  }

  private getServiceHeaders(): Record<string, string> {
    return {
      'X-App-Id': this.appId,
      'X-App-Token': this.appToken,
    };
  }

  private async parseBody(response: any): Promise<any> {
    if (typeof response?.clone === 'function') {
      try {
        return await response.clone().json();
      } catch {
        try {
          return await response.text();
        } catch {
          return null;
        }
      }
    }
    if (typeof response?.json === 'function' && typeof response?.text !== 'function') {
      return await response.json();
    }
    if (typeof response?.text === 'function') {
      try {
        const text = await response.text();
        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      } catch {
        if (typeof response.json === 'function') {
          return await response.json();
        }
      }
    }
    if (typeof response?.json === 'function') {
      return await response.json();
    }
    return null;
  }

  /**
   * Bắt đầu phiên đăng nhập:
   * - Nếu truyền `options.provider` ('google' | 'facebook'): Tạo PKCE và state, điều hướng thẳng tới Auth Service broker
   *   tại GET /auth/oauth/:provider?app_id=...&redirect_uri=...&code_challenge=...&state=...
   * - Nếu không truyền provider: Tạo PKCE và state, gọi POST /auth/flows tới Auth Service để hiển thị trang đăng nhập tập trung.
   * Trả về authorizeUrl và transaction tạm thời. Ứng dụng phải lưu transaction trong session trình duyệt.
   */
  async beginLogin(
    redirectUri: string,
    options?: BeginLoginOptions,
  ): Promise<{ authorizeUrl: string; transaction: LoginTransaction }> {
    if (!redirectUri || typeof redirectUri !== 'string' || !redirectUri.trim()) {
      throw new AuthClientSecurityError('Missing or invalid redirectUri');
    }

    const trimmedRedirectUri = redirectUri.trim();

    // PKCE verifier (32 bytes base64url = 43 chars) & SHA-256 challenge (43 chars)
    const verifier = randomBytes(32).toString('base64url');
    const codeChallenge = createHash('sha256').update(verifier).digest('base64url');
    // Browser state (32 bytes base64url = 43 chars)
    const state = randomBytes(32).toString('base64url');

    if (options?.provider) {
      const provider = options.provider.trim().toLowerCase();
      if (provider !== 'google' && provider !== 'facebook') {
        throw new AuthClientConfigError(
          `Unsupported OAuth provider: "${options.provider}". Only "google" or "facebook" are supported.`,
        );
      }

      const params = new URLSearchParams({
        app_id: this.appId,
        redirect_uri: trimmedRedirectUri,
        code_challenge: codeChallenge,
        state: state,
      });

      const authorizeUrl = `${this.authServiceUrl}/auth/oauth/${provider}?${params.toString()}`;

      return {
        authorizeUrl,
        transaction: {
          state,
          verifier,
          redirectUri: trimmedRedirectUri,
          createdAt: Date.now(),
        },
      };
    }

    let response: Response;
    try {
      response = await fetch(`${this.authServiceUrl}/auth/flows`, {
        method: 'POST',
        headers: {
          ...this.getServiceHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          redirectUri: trimmedRedirectUri,
          codeChallenge,
          state,
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err: any) {
      throw new AuthClientHttpError(`Cannot reach Auth Service at ${this.authServiceUrl}: ${err.message}`, 0, err);
    }

    if (!response.ok) {
      const errBody = await this.parseBody(response);
      const message = typeof errBody?.message === 'string' ? errBody.message : `Auth flow creation failed with status ${response.status}`;
      throw new AuthClientHttpError(message, response.status, errBody);
    }

    const data: any = await this.parseBody(response);
    return {
      authorizeUrl: data.authorizeUrl,
      transaction: {
        state,
        verifier,
        redirectUri: trimmedRedirectUri,
        createdAt: Date.now(),
      },
    };
  }

  /**
   * Hoàn tất phiên đăng nhập từ callback: kiểm tra state và thời hạn transaction, sau đó đổi code lấy access token.
   * Giao dịch (transaction) phải được ứng dụng xóa sau khi gọi.
   */
  async completeLogin(input: {
    code: string;
    state: string;
    transaction: LoginTransaction;
  }): Promise<{ accessToken: string; user: any }> {
    if (!input?.code || typeof input.code !== 'string' || !input.code.trim()) {
      throw new AuthClientSecurityError('Missing authorization code in callback');
    }
    if (!input?.transaction) {
      throw new AuthClientSecurityError('Missing login transaction from session');
    }
    if (input.state !== input.transaction.state) {
      throw new AuthClientSecurityError('State mismatch: callback state does not match browser session');
    }

    const maxAgeMs = 10 * 60 * 1000; // 10 minutes
    if (Date.now() - input.transaction.createdAt > maxAgeMs) {
      throw new AuthClientSecurityError('Transaction expired: sign-in session exceeded 10 minutes');
    }

    let response: Response;
    try {
      response = await fetch(`${this.authServiceUrl}/auth/oauth/exchange`, {
        method: 'POST',
        headers: {
          ...this.getServiceHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: input.code.trim(),
          verifier: input.transaction.verifier,
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err: any) {
      throw new AuthClientHttpError(`Cannot reach Auth Service during exchange: ${err.message}`, 0, err);
    }

    if (!response.ok) {
      const errBody = await this.parseBody(response);
      const message = typeof errBody?.message === 'string' ? errBody.message : `Exchange failed with status ${response.status}`;
      throw new AuthClientHttpError(message, response.status, errBody);
    }

    const data: any = await this.parseBody(response);
    return {
      accessToken: data.accessToken,
      user: data.user,
    };
  }

  /**
   * Xác thực token người dùng khi bảo vệ API: gọi GET /users/verify-app-user với Bearer token và service headers.
   * Luôn từ chối nếu Auth Service không sẵn sàng (Fail closed) hoặc token không thuộc appId của client.
   */
  async verifyUser(token: string): Promise<AppUserProfile> {
    if (!token || typeof token !== 'string' || !token.trim()) {
      throw new AuthClientVerificationError('Missing user Bearer token', undefined, 401);
    }

    const bearerToken = token.startsWith('Bearer ') ? token : `Bearer ${token.trim()}`;

    let response: Response;
    try {
      response = await fetch(`${this.authServiceUrl}/users/verify-app-user`, {
        method: 'GET',
        headers: {
          ...this.getServiceHeaders(),
          Authorization: bearerToken,
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err: any) {
      throw new AuthClientVerificationError(`Auth Service verification unreachable: ${err.message}`, err, 502);
    }

    if (!response.ok) {
      const errBody = await this.parseBody(response);
      const message = typeof errBody?.message === 'string' ? errBody.message : `Verification rejected with status ${response.status}`;
      throw new AuthClientVerificationError(message, { statusCode: response.status, body: errBody }, response.status);
    }

    const profile: AppUserProfile = await this.parseBody(response);
    if (profile.appId !== this.appId) {
      throw new AuthClientVerificationError(
        `Cross-application token mismatch: token appId (${profile.appId}) does not match configured client (${this.appId})`,
        undefined,
        403,
      );
    }

    return profile;
  }

  /**
   * Tạo Direct OAuth Broker URL và transaction tương ứng cho Google hoặc Facebook (đồng bộ).
   * Format: ${authServiceUrl}/auth/oauth/${provider}?app_id=...&redirect_uri=...&code_challenge=...&state=...
   */
  getAuthorizationUrl(
    provider: 'google' | 'facebook',
    redirectUri: string,
  ): { url: string; transaction: LoginTransaction } {
    if (!redirectUri || typeof redirectUri !== 'string' || !redirectUri.trim()) {
      throw new AuthClientSecurityError('Missing or invalid redirectUri');
    }

    const normalizedProvider = (provider || '').trim().toLowerCase();
    if (normalizedProvider !== 'google' && normalizedProvider !== 'facebook') {
      throw new AuthClientConfigError(
        `Unsupported OAuth provider: "${provider}". Only "google" or "facebook" are supported.`,
      );
    }

    const trimmedRedirectUri = redirectUri.trim();
    const verifier = randomBytes(32).toString('base64url');
    const codeChallenge = createHash('sha256').update(verifier).digest('base64url');
    const state = randomBytes(32).toString('base64url');

    const params = new URLSearchParams({
      app_id: this.appId,
      redirect_uri: trimmedRedirectUri,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state: state,
    });

    const url = `${this.authServiceUrl}/auth/oauth/${normalizedProvider}?${params.toString()}`;

    return {
      url,
      transaction: {
        state,
        verifier,
        redirectUri: trimmedRedirectUri,
        provider: normalizedProvider as 'google' | 'facebook',
        createdAt: Date.now(),
      },
    };
  }

  /**
   * Ký HMAC-SHA256 transaction bằng appToken để lưu vào cookie trình duyệt.
   */
  signTransaction(transaction: LoginTransaction): string {
    return signTransaction(transaction, this.appToken);
  }

  /**
   * Xác thực và giải mã transaction cookie (timingSafeEqual chống timing attacks).
   */
  verifyTransaction(signedCookie: string): LoginTransaction | null {
    return verifyTransaction(signedCookie, this.appToken);
  }

  /**
   * Handshake kiểm tra kết nối và trạng thái application qua GET /auth/verify-service.
   */
  async verifyService(): Promise<VerifyServiceResult> {
    let response: Response;
    try {
      response = await fetch(`${this.authServiceUrl}/auth/verify-service`, {
        method: 'GET',
        headers: this.getServiceHeaders(),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err: any) {
      throw new AuthClientHttpError(`Cannot reach Auth Service at ${this.authServiceUrl}: ${err.message}`, 0, err);
    }

    if (!response.ok) {
      const errBody = await this.parseBody(response);
      const message = typeof errBody?.message === 'string' ? errBody.message : `Verify service failed with status ${response.status}`;
      throw new AuthClientHttpError(message, response.status, errBody);
    }

    return await this.parseBody(response);
  }

  /**
   * Lấy danh sách provider OAuth đang cấu hình cho Application.
   */
  async getProviders(): Promise<OAuthProviderInfo[]> {
    try {
      const response = await fetch(`${this.authServiceUrl}/auth/providers`, {
        method: 'GET',
        headers: {
          'X-App-Id': this.appId,
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (!response.ok) return [];
      return await response.json();
    } catch {
      return [];
    }
  }
}

export function createAuthClient(options: AuthClientOptions): AuthClient {
  return new AuthClient(options);
}

export function signTransaction(transaction: LoginTransaction, secret: string): string {
  const payloadStr = JSON.stringify(transaction);
  const payloadB64 = Buffer.from(payloadStr, 'utf8').toString('base64url');
  const signature = createHmac('sha256', secret).update(payloadB64).digest('base64url');
  return `${payloadB64}.${signature}`;
}

export function verifyTransaction(cookieVal: string, secret: string): LoginTransaction | null {
  if (!cookieVal || typeof cookieVal !== 'string') return null;
  const dotIndex = cookieVal.lastIndexOf('.');
  if (dotIndex <= 0) return null;

  const payloadB64 = cookieVal.slice(0, dotIndex);
  const signature = cookieVal.slice(dotIndex + 1);

  const expectedSig = createHmac('sha256', secret).update(payloadB64).digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSig);

  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const jsonStr = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const parsed = JSON.parse(jsonStr);
    if (!parsed?.state || !parsed?.verifier || typeof parsed?.createdAt !== 'number') {
      return null;
    }
    return parsed as LoginTransaction;
  } catch {
    return null;
  }
}
