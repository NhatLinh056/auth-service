import { apiClient } from './api.client';
import type { AuthResponse, LoginDto, RegisterDto, User } from '../types/auth.types';

export const authService = {
  async login(dto: LoginDto): Promise<AuthResponse> {
    return apiClient<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async register(dto: RegisterDto): Promise<User> {
    return apiClient<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async logout(): Promise<{ message: string }> {
    return apiClient<{ message: string }>('/auth/logout', {
      method: 'POST',
    });
  },

  async getMe(): Promise<User> {
    return apiClient<User>('/users/me');
  },
};
