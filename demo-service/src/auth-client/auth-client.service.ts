import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadGatewayException,
  Logger,
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
  email: string;
  name?: string;
  role: string;
  isAppOwner?: boolean;
  provider?: string;
  avatar?: string;
}

export interface OAuthProviderInfo {
  provider: string;
  name: string;
  enabled: boolean;
}

/** TTL cho cache thông tin ứng dụng: 5 phút (ms) */
const APPLICATION_CACHE_TTL_MS = 5 * 60 * 1000;

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
   * Kiểm tra cache còn hiệu lực không (chưa hết TTL 5 phút)
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
   * Kết quả được cache trong APPLICATION_CACHE_TTL_MS (5 phút).
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

  /**
   * Delegated verification of End-User JWT with Auth Service
   * Maps RBAC:
   * - If the user is the Owner of this Application (User of Project 1 who registered this app)
   *   -> Assigned role 'ADMIN' in Project 2 context
   * - Otherwise (e.g. End-user / Customer signing in via Google/Facebook)
   *   -> Assigned role 'USER' in Project 2 context
   */
  async verifyUserToken(token: string): Promise<AuthUserProfile> {
    if (!token) {
      throw new UnauthorizedException('Missing user Bearer token');
    }

    try {
      const response = await this.http.get<AuthUserProfile>('/users/me', {
        baseURL: appConfig.authServiceUrl,
        headers: {
          Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
          ...this.getServiceHeaders(),
        },
      });

      const user = response.data;

      // Lazy load / refresh application info nếu cache hết hạn hoặc chưa có
      if (!this.isCacheValid()) {
        try {
          await this.verifyService();
        } catch {
          // Nếu handshake thất bại, tiếp tục với role gốc của user
        }
      }

      // Check if user is the Owner of this Application
      if (this.cachedApplication) {
        const ownerUserId = this.cachedApplication.userId || this.cachedApplication.user?.id;
        const ownerEmail = this.cachedApplication.user?.email;
        const adminEmails: string[] = (this.cachedApplication as any).adminEmails || [];

        const isOwner =
          (Boolean(ownerUserId) && user.id === ownerUserId) ||
          (Boolean(ownerEmail) && Boolean(user.email) && user.email.toLowerCase() === ownerEmail!.toLowerCase());

        const isDelegatedAdmin =
          Boolean(user.email) &&
          adminEmails.some((e: string) => e.toLowerCase() === user.email.toLowerCase());

        // Phân quyền tại Project 2:
        // - ADMIN: Phải là Chủ sở hữu ứng dụng (App Owner) hoặc nằm trong danh sách adminEmails được ủy quyền.
        // - Lưu ý: Platform Admin (Project 1) không mặc định là Admin của Project 2 (chỉ quản lý platform).
        const isAdmin = isOwner || isDelegatedAdmin;

        user.isAppOwner = Boolean(isOwner);
        user.role = isAdmin ? 'ADMIN' : 'USER';
      }

      return user;
    } catch (err: any) {
      if (err instanceof UnauthorizedException || err instanceof ForbiddenException) {
        throw err;
      }
      const status = err.response?.status;
      const message = err.response?.data?.message || err.message;

      if (status === 401) {
        throw new UnauthorizedException(`Invalid or expired user session: ${message}`);
      }
      throw new BadGatewayException(`Auth verification failed: ${message}`);
    }
  }
}
