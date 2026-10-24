import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthUserProfile } from '../auth-client/auth-client.service.js';

export interface Order {
  id: string;
  item: string;
  quantity: number;
  totalPrice: number;
  userId: string;
  userEmail: string;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED';
  createdAt: string;
}

@Injectable()
export class OrdersService {
  // In-memory simulated orders
  private orders: Order[] = [
    {
      id: 'ord_101',
      item: 'MacBook Pro M3 Max',
      quantity: 1,
      totalPrice: 3499,
      userId: 'admin-user-id',
      userEmail: 'admin@example.com',
      status: 'CONFIRMED',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'ord_102',
      item: 'Dell UltraSharp 32 4K Monitor',
      quantity: 2,
      totalPrice: 1998,
      userId: 'admin-user-id',
      userEmail: 'admin@example.com',
      status: 'SHIPPED',
      createdAt: new Date(Date.now() - 43200000).toISOString(),
    },
  ];

  findAll(user: AuthUserProfile): Order[] {
    // Return all orders for ADMIN, or filter by user email/id
    if (user.role === 'ADMIN') {
      return this.orders;
    }
    return this.orders.filter(o => o.userEmail === user.email || o.userId === user.id);
  }

  findById(id: string, user: AuthUserProfile): Order {
    const order = this.orders.find(o => o.id === id);
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    if (user.role !== 'ADMIN' && order.userEmail !== user.email && order.userId !== user.id) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return order;
  }

  create(data: { item: string; quantity: number; price: number }, user: AuthUserProfile): Order {
    const newOrder: Order = {
      id: `ord_${Date.now().toString(36)}`,
      item: data.item || 'Generic Item',
      quantity: data.quantity || 1,
      totalPrice: (data.price || 100) * (data.quantity || 1),
      userId: user.id,
      userEmail: user.email,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    this.orders.unshift(newOrder);
    return newOrder;
  }
}
