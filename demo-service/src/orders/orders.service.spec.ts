import { describe, it, expect, beforeEach } from 'vitest';
import { OrdersService } from './orders.service.js';

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(() => {
    service = new OrdersService();
  });

  it('should return all orders for ADMIN user', () => {
    const adminUser = { id: 'admin-id', email: 'admin@example.com', role: 'ADMIN' };
    const orders = service.findAll(adminUser);
    expect(orders.length).toBeGreaterThanOrEqual(2);
  });

  it('should filter orders for normal USER', () => {
    const normalUser = { id: 'usr-bob', email: 'bob@example.com', role: 'USER' };
    const orders = service.findAll(normalUser);
    expect(orders.length).toBe(0);
  });

  it('should create new order for authenticated user', () => {
    const user = { id: 'usr-bob', email: 'bob@example.com', role: 'USER' };
    const newOrder = service.create(
      { item: 'Keychron Q1 Pro', quantity: 1, price: 199 },
      user,
    );

    expect(newOrder.id).toBeDefined();
    expect(newOrder.item).toBe('Keychron Q1 Pro');
    expect(newOrder.totalPrice).toBe(199);
    expect(newOrder.userEmail).toBe('bob@example.com');

    const userOrders = service.findAll(user);
    expect(userOrders.length).toBe(1);
  });
  it('does not grant ownership by matching email alone', () => {
    const user = { id: 'owner', email: 'same@example.com', role: 'USER' };
    const order = service.create({ item: 'Book', quantity: 1, price: 10 }, user);
    const impostor = { ...user, id: 'different-subject' };
    expect(service.findAll(impostor)).toEqual([]);
    expect(() => service.findById(order.id, impostor)).toThrow();
  });
  it.each([
    { item: '', quantity: 1, price: 10 },
    { item: 'Book', quantity: -1, price: 10 },
    { item: 'Book', quantity: 1.5, price: 10 },
    { item: 'Book', quantity: 1, price: -10 },
    { item: 'Book', quantity: 1, price: Infinity },
  ])('rejects invalid order input %j', data => {
    expect(() => service.create(data, { id: 'u', email: 'u@example.com', role: 'USER' })).toThrow();
  });
  it('preserves zero prices and generates distinct IDs in a rapid batch', () => {
    const orders = Array.from({ length: 100 }, () => service.create({ item: 'Free', quantity: 1, price: 0 }, { id: 'u', email: 'u@example.com', role: 'USER' }));
    expect(new Set(orders.map(o => o.id)).size).toBe(100);
    expect(orders.every(o => o.totalPrice === 0)).toBe(true);
  });

});
