import { apiClient } from './api.client';
import type { Role, User } from '../types/auth.types';

export const rolesService = {
  async getRoles(): Promise<Role[]> {
    return apiClient<Role[]>('/roles');
  },

  async assignRole(userId: string, role: Role): Promise<{ message: string; user: User }> {
    return apiClient<{ message: string; user: User }>('/roles/assign', {
      method: 'POST',
      body: JSON.stringify({ userId, role }),
    });
  },
};
