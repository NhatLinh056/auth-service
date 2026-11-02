import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { AuthClientService } from '../auth-client/auth-client.service.js';
import { appConfig } from '../config/app.config.js';

describe('OrdersController', () => {
  let controller: OrdersController;
  let ordersService: OrdersService;
  let authClientService: AuthClientService;

  beforeEach(() => {
    ordersService = new OrdersService();
    authClientService = {
      verifyService: vi.fn(),
      verifyUserToken: vi.fn(),
      checkOAuthProvider: vi.fn(),
      getAvailableProviders: vi.fn().mockResolvedValue([
        { provider: 'google', name: 'Google', enabled: true },
      ]),
    } as any;

    controller = new OrdersController(ordersService, authClientService);
  });

  describe('getStatus', () => {
    it('should return service handshake info from Auth Service', async () => {
      vi.spyOn(authClientService, 'verifyService').mockResolvedValueOnce({
        statusCode: 200,
        status: 'ACTIVE',
        application: {
          id: 'app-uuid',
          name: 'Demo App',
          appId: 'app_123',
          status: 'ACTIVE',
          userId: 'user-uuid',
        },
      });

      const res = await controller.getStatus();

      expect(res.service).toBe('demo-service');
      expect(res.port).toBe(3001);
      expect(res.handshake.authService).toBe('CONNECTED');
      expect(res.handshake.applicationStatus).toBe('ACTIVE');
      expect(res.handshake.appId).toBe('app_123');
      expect(res.availableOAuthProviders).toBeDefined();
    });
  });

  describe('getAuthProviders', () => {
    it('should return available OAuth providers from Auth Service', async () => {
      const res = await controller.getAuthProviders();
      expect(Array.isArray(res)).toBe(true);
      expect(res[0].provider).toBe('google');
    });
  });

  describe('startOAuth', () => {
    const challenge = 'a'.repeat(43);
    const response = () => ({ redirect: vi.fn() }) as any;
    it('returns to the portal if app OAuth configuration is incomplete', async () => {
      vi.spyOn(authClientService, 'checkOAuthProvider').mockRejectedValue(new Error('Redirect URI not registered'));
      const res = response();
      await controller.startOAuth('google', challenge, res);
      expect(res.redirect).toHaveBeenCalledWith('/?error=oauth_not_ready');
    });
    it('redirects to Auth only after preflight succeeds', async () => {
      vi.spyOn(authClientService, 'checkOAuthProvider').mockResolvedValue();
      const res = response();
      await controller.startOAuth('google', challenge, res);
      expect(res.redirect.mock.calls[0][0]).toContain('/auth/oauth/google?');
    });
    it('sends the configured public Portal URL to Auth in production', async () => {
      const previous = appConfig.publicUrl;
      appConfig.publicUrl = 'https://shop.example.com';
      try {
        vi.spyOn(authClientService, 'checkOAuthProvider').mockResolvedValue();
        const res = response();
        await controller.startOAuth('google', challenge, res);
        expect(authClientService.checkOAuthProvider).toHaveBeenCalledWith('google', 'https://shop.example.com/');
        expect(new URL(res.redirect.mock.calls[0][0]).searchParams.get('redirect_uri'))
          .toBe('https://shop.example.com/');
      } finally {
        appConfig.publicUrl = previous;
      }
    });
  });

  describe('getOrders', () => {
    it('should return user profile and orders list', () => {
      const user = { id: 'admin-id', email: 'admin@example.com', role: 'ADMIN' };
      const res = controller.getOrders(user);

      expect(res.user).toEqual(user);
      expect(Array.isArray(res.orders)).toBe(true);
    });
  });

  describe('createOrder', () => {
    it('should create order and return confirmation', () => {
      const user = { id: 'usr-1', email: 'user@test.com', role: 'USER' };
      const res = controller.createOrder(
        { item: 'Ergonomic Chair', quantity: 1, price: 350 },
        user,
      );

      expect(res.message).toContain('Order created successfully');
      expect(res.order.item).toBe('Ergonomic Chair');
    });
  });
});
