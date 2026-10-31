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
      // Sau khi verifyService thành công, cache phải được ghi
      expect((service as any).cachedApplication).toEqual(mockResult.application);
      expect((service as any).cachedAt).toBeTypeOf('number');
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

    it('should assign ADMIN role in Project 2 if user is the Application Owner (User of Project 1)', async () => {
      (service as any).cachedApplication = {
        id: 'app-uuid',
        name: 'Demo App',
        appId: 'app_test_123',
        status: 'ACTIVE',
        userId: 'developer-user-id',
        user: {
          id: 'developer-user-id',
          email: 'developer@example.com',
          name: 'App Developer',
          role: 'USER', // In Project 1, developer is a normal USER
        },
      };
      (service as any).cachedAt = Date.now(); // cache còn hạn

      const mockUser = {
        id: 'developer-user-id',
        email: 'developer@example.com',
        role: 'USER', // Platform role
        name: 'App Developer',
      };

      vi.spyOn((service as any).http, 'get').mockResolvedValueOnce({
        data: mockUser,
      });

      const res = await service.verifyUserToken('dev.jwt.token');
      expect(res.role).toBe('ADMIN');
      expect(res.isAppOwner).toBe(true);
    });

    it('should assign USER role in Project 2 if user is an end-user / customer', async () => {
      (service as any).cachedApplication = {
        id: 'app-uuid',
        name: 'Demo App',
        appId: 'app_test_123',
        status: 'ACTIVE',
        userId: 'developer-user-id',
        user: {
          id: 'developer-user-id',
          email: 'developer@example.com',
          name: 'App Developer',
          role: 'USER',
        },
      };
      (service as any).cachedAt = Date.now(); // cache còn hạn

      const mockCustomer = {
        id: 'customer-123',
        email: 'customer@gmail.com',
        role: 'USER',
        name: 'Regular Customer',
      };

      vi.spyOn((service as any).http, 'get').mockResolvedValueOnce({
        data: mockCustomer,
      });

      const res = await service.verifyUserToken('customer.jwt.token');
      expect(res.role).toBe('USER');
      expect(res.isAppOwner).toBe(false);
    });

    it('should assign USER role in Project 2 if user is Platform Admin but not App Owner or delegated admin', async () => {
      (service as any).cachedApplication = {
        id: 'app-uuid',
        name: 'Demo App',
        appId: 'app_test_123',
        status: 'ACTIVE',
        userId: 'developer-user-id',
        user: {
          id: 'developer-user-id',
          email: 'developer@example.com',
          name: 'App Developer',
          role: 'USER',
        },
        adminEmails: ['manager@example.com'],
      };
      (service as any).cachedAt = Date.now();

      const mockPlatformAdmin = {
        id: 'platform-admin-id',
        email: 'admin@example.com',
        role: 'ADMIN', // ADMIN of Project 1 (Platform)
        name: 'Platform Administrator',
      };

      vi.spyOn((service as any).http, 'get').mockResolvedValueOnce({
        data: mockPlatformAdmin,
      });

      const res = await service.verifyUserToken('admin.jwt.token');
      expect(res.role).toBe('USER');
      expect(res.isAppOwner).toBe(false);
    });
  });

  describe('getCachedApplication & TTL', () => {
    it('should return null when cache is empty', () => {
      expect(service.getCachedApplication()).toBeNull();
    });

    it('should return application when cache is fresh', () => {
      const mockApp = { id: 'app-uuid', name: 'Demo', appId: 'app_test_123', status: 'ACTIVE', userId: 'u1' };
      (service as any).cachedApplication = mockApp;
      (service as any).cachedAt = Date.now(); // fresh
      expect(service.getCachedApplication()).toEqual(mockApp);
    });

    it('should return null when cache has expired (TTL > 5 minutes)', () => {
      const mockApp = { id: 'app-uuid', name: 'Demo', appId: 'app_test_123', status: 'ACTIVE', userId: 'u1' };
      (service as any).cachedApplication = mockApp;
      (service as any).cachedAt = Date.now() - 6 * 60 * 1000; // 6 phút trước → hết hạn
      expect(service.getCachedApplication()).toBeNull();
    });

    it('should invalidate cache correctly', () => {
      (service as any).cachedApplication = { id: 'app-uuid' };
      (service as any).cachedAt = Date.now();
      service.invalidateCache();
      expect((service as any).cachedApplication).toBeNull();
      expect((service as any).cachedAt).toBeNull();
    });
  });

  describe('getAvailableProviders', () => {
    it('should return providers list on success', async () => {
      const mockProviders = [
        { provider: 'google', name: 'Google', enabled: true },
        { provider: 'facebook', name: 'Facebook', enabled: false },
      ];
      vi.spyOn((service as any).http, 'get').mockResolvedValueOnce({
        data: mockProviders,
      });

      const res = await service.getAvailableProviders();
      expect(res).toEqual(mockProviders);
    });

    it('should return empty array gracefully on error', async () => {
      vi.spyOn((service as any).http, 'get').mockRejectedValueOnce(new Error('Network error'));
      const res = await service.getAvailableProviders();
      expect(res).toEqual([]);
    });
  });
});
