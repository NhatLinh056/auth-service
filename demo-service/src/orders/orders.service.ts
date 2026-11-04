import { randomUUID } from 'node:crypto';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthUserProfile } from '../auth-client/auth-client.service.js';

export interface Order {
  id: string;
  item: string;
  quantity: number;
  totalPrice: number;
  userId: string;
  userEmail: string;
  tenantId: string;
  tenantName?: string;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED';
  createdAt: string;
}

@Injectable()
export class OrdersService {
  // In-memory simulated orders isolated by tenant
  private orders: Order[] = [
    {
      id: 'ord_101',
      item: 'MacBook Pro M3 Max',
      quantity: 1,
      totalPrice: 3499,
      userId: '44ace1e1-37c3-4a14-a5db-3aa92d90c6fe',
      userEmail: 'user@example.com',
      tenantId: 'tenant-alpha',
      tenantName: 'Doanh nghiệp Alpha',
      status: 'CONFIRMED',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'ord_102',
      item: 'Dell UltraSharp 32 4K Monitor',
      quantity: 2,
      totalPrice: 1998,
      userId: 'customer-uuid-001',
      userEmail: 'customer@example.com',
      tenantId: 'tenant-alpha',
      tenantName: 'Doanh nghiệp Alpha',
      status: 'SHIPPED',
      createdAt: new Date(Date.now() - 43200000).toISOString(),
    },
    {
      id: 'ord_103',
      item: 'Bàn phím cơ Keychron Q1 Pro',
      quantity: 1,
      totalPrice: 219,
      userId: 'customer-uuid-002',
      userEmail: 'customer2@example.com',
      tenantId: 'tenant-beta',
      tenantName: 'Doanh nghiệp Beta',
      status: 'PENDING',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
  ];

  findAll(user: AuthUserProfile): Order[] {
    if (!user.tenantId) {
      throw new ForbiddenException('Người dùng chưa thuộc doanh nghiệp nào');
    }
    // Tenant Owner sees all orders of their tenant; regular members only see their own orders within the tenant
    if (user.isTenantOwner) {
      return this.orders.filter(o => o.tenantId === user.tenantId);
    }
    return this.orders.filter(o => o.tenantId === user.tenantId && (o.userId === user.id || (Boolean(user.userId) && o.userId === user.userId)));
  }

  findById(id: string, user: AuthUserProfile): Order {
    if (!user.tenantId) {
      throw new ForbiddenException('Người dùng chưa thuộc doanh nghiệp nào');
    }
    const order = this.orders.find(o => o.id === id);
    if (!order || order.tenantId !== user.tenantId) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    if (!user.isTenantOwner && order.userId !== user.id && (!user.userId || order.userId !== user.userId)) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return order;
  }

  create(data: { item: string; quantity: number; price: number }, user: AuthUserProfile): Order {
    if (!user.tenantId) {
      throw new ForbiddenException('Người dùng chưa thuộc doanh nghiệp nào');
    }
    if (!data || typeof data.item !== 'string' || !data.item.trim() || data.item.length > 200 ||
        !Number.isSafeInteger(data.quantity) || data.quantity < 1 || data.quantity > 10000 ||
        typeof data.price !== 'number' || !Number.isFinite(data.price) || data.price < 0 || data.price > 100000000) {
      throw new BadRequestException('Invalid order: item, positive integer quantity and non-negative price required');
    }
    const newOrder: Order = {
      id: `ord_${randomUUID()}`,
      item: data.item.trim(),
      quantity: data.quantity,
      totalPrice: data.price * data.quantity,
      userId: user.id,
      userEmail: user.email,
      tenantId: user.tenantId,
      tenantName: user.tenantName || undefined,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    this.orders.unshift(newOrder);
    return newOrder;
  }
}
