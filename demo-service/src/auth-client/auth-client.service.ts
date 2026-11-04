import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadGatewayException,
  Logger,
  HttpException,
} from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { appConfig } from '../config/app.config.js';

export interface ApplicationOwnerInfo {
  id: string;
  email: string;
  name?: string;
  role: string;
}

export interface ApplicationInfo {
  id: string;
  name: string;
  appId: string;
  status: string;
  userId: string;
  user?: ApplicationOwnerInfo;
}

export interface VerifyServiceResult {
  statusCode?: number;
  status?: string;
  valid?: boolean;
  message?: string;
  application: ApplicationInfo;
}

export interface AuthUserProfile {
  id: string;
  userId?: string;
  email: string;
  name?: string;
  role: string;
  isAppOwner?: boolean;
  appId?: string;
  appRole?: string;
  provider?: string;
  avatar?: string;
  tenantId?: string | null;
  tenantName?: string | null;
  isTenantOwner?: boolean;
}

export interface OAuthProviderInfo {
  provider: string;
  name: string;
  enabled: boolean;
}

/** TTL cho cache thông tin ứng dụng: 30 giây (ms) để phản hồi nhanh cấu hình từ Developer Console */
const APPLICATION_CACHE_TTL_MS = 30 * 1000;

@Injectable()
export class AuthClientService {
  private readonly logger = new Logger(AuthClientService.name);
  private readonly http: AxiosInstance;
  private cachedApplication: ApplicationInfo | null = null;
  /** Thời điểm cache được ghi lần cuối (null = chưa có cache) */
  private cachedAt: number | null = null;

  constructor() {
    this.http = axios.create({
      baseURL: appConfig.authServiceUrl,
      timeout: 5000,
    });
  }

  /**
   * Kiểm tra cache còn hiệu lực không (chưa hết TTL 30 giây)
   */
  private isCacheValid(): boolean {
    return (
      this.cachedApplication !== null &&
      this.cachedAt !== null &&
      Date.now() - this.cachedAt < APPLICATION_CACHE_TTL_MS
    );
  }

  /**
   * Xoá cache — buộc verifyService() gọi lại Auth Service lần tiếp theo
   */
  invalidateCache(): void {
    this.cachedApplication = null;
    this.cachedAt = null;
    this.logger.log('Application cache invalidated');
  }

  /**
   * Helper to generate required Service-to-Service authentication headers
   */
  getServiceHeaders(): Record<string, string> {
    return {
      'X-App-Id': appConfig.appId,
      'X-App-Token': appConfig.appToken,
    };
  }

  /**
   * Get cached application info (or null if not yet verified / cache expired)
   */
  getCachedApplication(): ApplicationInfo | null {
    if (!this.isCacheValid()) return null;
    return this.cachedApplication;
  }

  /**
   * Handshake with Auth Service to verify credentials and ACTIVE status.
   * Kết quả được cache trong APPLICATION_CACHE_TTL_MS (30 giây).
   * Gọi lại tự động khi cache hết hạn hoặc bị invalidate.
   */
  async verifyService(): Promise<VerifyServiceResult> {
    try {
      const response = await this.http.get<VerifyServiceResult>('/auth/verify-service', {
        baseURL: appConfig.authServiceUrl,
        headers: this.getServiceHeaders(),
      });
      if (response.data?.application) {
        this.cachedApplication = response.data.application;
        this.cachedAt = Date.now();
      }
      return response.data;
    } catch (err: any) {
      this.invalidateCache();
      const status = err.response?.status;
      const message = err.response?.data?.message || err.message;

      this.logger.error(`Handshake failed with Auth Service [${status}]: ${message}`);

      if (status === 401) {
        throw new UnauthorizedException(`Auth Service rejected credentials: ${message}`);
      }
      if (status === 403) {
        throw new ForbiddenException(`Client application is inactive on Auth Service: ${message}`);
      }
      throw new BadGatewayException(`Cannot reach Auth Service at ${appConfig.authServiceUrl}: ${message}`);
    }
  }

  /**
   * Lấy danh sách các phương thức đăng nhập OAuth khả dụng từ Auth Service
   */
  async getAvailableProviders(): Promise<OAuthProviderInfo[]> {
    try {
      const response = await this.http.get<OAuthProviderInfo[]>('/auth/providers', {
        baseURL: appConfig.authServiceUrl,
        headers: this.getServiceHeaders(),
      });
      return response.data;
    } catch (err: any) {
      this.logger.warn(`Failed to fetch OAuth providers from Auth Service: ${err.message}`);
      return [];
    }
  }

  async createLoginFlow(redirectUri: string, codeChallenge: string, state: string, provider?: string) {
    if (provider) {
      const authUrl = new URL(`${appConfig.authServiceUrl}/auth/oauth/${encodeURIComponent(provider)}`);
      authUrl.searchParams.set('app_id', appConfig.appId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('code_challenge', codeChallenge);
      authUrl.searchParams.set('state', state);
      return { authorizeUrl: authUrl.toString() };
    }
    try {
      const response = await this.http.post('/auth/flows', { redirectUri, codeChallenge, state }, { headers: this.getServiceHeaders() });
      return response.data;
    } catch (error: any) {
      const status = error.response?.status;
      if ([400, 401, 403].includes(status)) throw new HttpException({ message: error.response.data?.message || 'Sign-in unavailable' }, status);
      throw new BadGatewayException('Cannot start sign-in with Auth Service');
    }
  }

  /**
   * Delegated verification of End-User JWT with Auth Service
   * Maps RBAC:
   * - If the user is the Owner of this Application (User of Project 1 who registered this app)
   *   -> Assigned role 'ADMIN' in Project 2 context
   * - Otherwise (e.g. End-user / Customer signing in via Google/Facebook)
   *   -> Assigned role 'USER' in Project 2 context
   */
  async exchangeOAuthCode(code: string, verifier: string) {
    try {
      const response = await this.http.post('/auth/oauth/exchange', { code, verifier }, {
        headers: this.getServiceHeaders(),
      });
      return response.data;
    } catch (error: any) {
      if ([400, 401, 409].includes(error.response?.status)) {
        const data = error.response.data;
        throw new HttpException({
          message: typeof data?.message === 'string' ? data.message : 'Account confirmation failed',
          ...(data?.code === 'ACCOUNT_LINK_REQUIRED' ? { code: data.code } : {}),
        }, error.response.status);
      }
      throw new UnauthorizedException('Invalid or expired login exchange');
    }
  }

  async verifyUserToken(token: string): Promise<AuthUserProfile> {
    if (!token) {
      throw new UnauthorizedException('Missing user Bearer token');
    }

    try {
      const response = await this.http.get<AuthUserProfile>('/users/verify-app-user', {
        baseURL: appConfig.authServiceUrl,
        headers: {
          Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
          ...this.getServiceHeaders(),
        },
      });

      const user = response.data;

      if (user.appId !== appConfig.appId || !['ADMIN', 'USER'].includes(user.appRole || '')) {
        throw new ForbiddenException('Invalid application-scoped verification response');
      }
      user.role = user.appRole!;

      return user;
    } catch (err: any) {
      if (err instanceof UnauthorizedException || err instanceof ForbiddenException) {
        throw err;
      }
      const status = err.response?.status;
      const message = err.response?.data?.message || err.message;

      if (status === 403) throw new ForbiddenException('Application access denied');
      if (status === 401) {
        throw new UnauthorizedException(`Invalid or expired user session: ${message}`);
      }
      throw new BadGatewayException(`Auth verification failed: ${message}`);
    }
  }

  async tenantRequest(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, token: string, data?: unknown) {
    try {
      const response = await this.http.request({ method, url: `/tenants${path}`, data,
        headers: { Authorization: token, ...this.getServiceHeaders() } });
      return response.data;
    } catch (error: any) {
      const status = error.response?.status;
      if ([400, 401, 403, 404, 409].includes(status)) {
        throw new HttpException({ message: error.response.data?.message || 'Không thể thực hiện thao tác doanh nghiệp' }, status);
      }
      throw new BadGatewayException('Không thể kết nối dịch vụ quản lý doanh nghiệp');
    }
  }
}
