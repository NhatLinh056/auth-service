import { apiClient } from './api.client';
import type { User } from '../types/auth.types';

export const usersService = {
  async getAll(): Promise<User[]> {
    return apiClient<User[]>('/users');
  },

  async getUserById(id: string): Promise<User> {
    return apiClient<User>(`/users/${id}`);
  },

  async updateUser(id: string, data: { name?: string; password?: string }): Promise<User> {
    return apiClient<User>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteUser(id: string): Promise<{ message: string; user?: User }> {
    return apiClient<{ message: string; user?: User }>(`/users/${id}`, {
      method: 'DELETE',
    });
  },
};
