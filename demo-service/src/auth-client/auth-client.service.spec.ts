import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  UnauthorizedException,
  ForbiddenException,
  BadGatewayException,
} from '@nestjs/common';
import { AuthClientService } from './auth-client.service.js';
import { appConfig } from '../config/app.config.js';

describe('AuthClientService', () => {
  let service: AuthClientService;

  beforeEach(() => {
    appConfig.appId = 'app_test_123';
    appConfig.appToken = 'apt_test_secret_456';
    appConfig.authServiceUrl = 'http://localhost:3000';
    service = new AuthClientService();
  });

  describe('getServiceHeaders', () => {
    it('should return X-App-Id and X-App-Token headers from appConfig', () => {
      const headers = service.getServiceHeaders();
      expect(headers['X-App-Id']).toBe('app_test_123');
      expect(headers['X-App-Token']).toBe('apt_test_secret_456');
    });
  });

  describe('verifyService', () => {
    it('should return handshake result on successful 200 OK', async () => {
      const mockResult = {
        statusCode: 200,
        status: 'ACTIVE',
        application: {
          id: 'app-uuid',
          name: 'Demo App',
          appId: 'app_test_123',
          status: 'ACTIVE',
          userId: 'user-uuid',
        },
      };

      vi.spyOn((service as any).http, 'get').mockResolvedValueOnce({
        data: mockResult,
      });

      const res = await service.verifyService();
      expect(res).toEqual(mockResult);
    });

    it('should throw UnauthorizedException on 401 rejection', async () => {
      vi.spyOn((service as any).http, 'get').mockRejectedValueOnce({
        response: { status: 401, data: { message: 'Invalid App Token' } },
      });

      await expect(service.verifyService()).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException on 403 inactive app', async () => {
      vi.spyOn((service as any).http, 'get').mockRejectedValueOnce({
        response: { status: 403, data: { message: 'Application is inactive' } },
      });

      await expect(service.verifyService()).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadGatewayException on connection error', async () => {
      vi.spyOn((service as any).http, 'get').mockRejectedValueOnce(
        new Error('ECONNREFUSED'),
      );

      await expect(service.verifyService()).rejects.toThrow(BadGatewayException);
    });
  });

  describe('verifyUserToken', () => {
    it('should throw UnauthorizedException if token is missing', async () => {
      await expect(service.verifyUserToken('')).rejects.toThrow(UnauthorizedException);
    });

    it('should return user profile on valid user JWT', async () => {
      const mockUser = {
        id: 'usr-1',
        email: 'user@example.com',
        role: 'USER',
        name: 'Test User',
      };

      vi.spyOn((service as any).http, 'get').mockResolvedValueOnce({
        data: mockUser,
      });

      const res = await service.verifyUserToken('valid.jwt.token');
      expect(res).toEqual(mockUser);
    });

    it('should throw UnauthorizedException on 401 expired user JWT', async () => {
      vi.spyOn((service as any).http, 'get').mockRejectedValueOnce({
        response: { status: 401, data: { message: 'Token expired' } },
      });

      await expect(service.verifyUserToken('expired.jwt.token')).rejects.toThrow(UnauthorizedException);
    });
  });
});
