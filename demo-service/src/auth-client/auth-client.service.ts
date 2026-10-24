import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadGatewayException,
  Logger,
} from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { appConfig } from '../config/app.config.js';

export interface VerifyServiceResult {
  statusCode: number;
  status: string;
  application: {
    id: string;
    name: string;
    appId: string;
    status: string;
    userId: string;
  };
}

export interface AuthUserProfile {
  id: string;
  email: string;
  name?: string;
  role: string;
}

@Injectable()
export class AuthClientService {
  private readonly logger = new Logger(AuthClientService.name);
  private readonly http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: appConfig.authServiceUrl,
      timeout: 5000,
    });
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
   * Handshake with Auth Service to verify credentials and ACTIVE status
   */
  async verifyService(): Promise<VerifyServiceResult> {
    try {
      const response = await this.http.get<VerifyServiceResult>('/auth/verify-service', {
        headers: this.getServiceHeaders(),
      });
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
   * Delegated verification of End-User JWT with Auth Service
   */
  async verifyUserToken(token: string): Promise<AuthUserProfile> {
    if (!token) {
      throw new UnauthorizedException('Missing user Bearer token');
    }

    try {
      const response = await this.http.get<AuthUserProfile>('/auth/profile', {
        headers: {
          Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
          ...this.getServiceHeaders(),
        },
      });
      return response.data;
    } catch (err: any) {
      const status = err.response?.status;
      const message = err.response?.data?.message || err.message;

      if (status === 401) {
        throw new UnauthorizedException(`Invalid or expired user session: ${message}`);
      }
      throw new BadGatewayException(`Auth verification failed: ${message}`);
    }
  }
}
