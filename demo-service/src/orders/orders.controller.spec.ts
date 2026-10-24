import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { AuthClientService } from '../auth-client/auth-client.service.js';

describe('OrdersController', () => {
  let controller: OrdersController;
  let ordersService: OrdersService;
  let authClientService: AuthClientService;

  beforeEach(() => {
    ordersService = new OrdersService();
    authClientService = {
      verifyService: vi.fn(),
      verifyUserToken: vi.fn(),
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
