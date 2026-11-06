import { apiClient } from './api.client';
import type {
  Application,
  AppUser,
  CreateAppPayload,
  UpdateAppPayload,
} from '../types/application.types';

export const applicationsService = {
  async findAll(): Promise<Application[]> {
    return apiClient<Application[]>('/applications');
  },

  async findById(id: string): Promise<Application> {
    return apiClient<Application>(`/applications/${id}`);
  },

  async create(payload: CreateAppPayload): Promise<Application> {
    return apiClient<Application>('/applications', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async update(id: string, payload: UpdateAppPayload): Promise<Application> {
    return apiClient<Application>(`/applications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async delete(id: string): Promise<{ message: string; application?: Application }> {
    return apiClient<{ message: string; application?: Application }>(`/applications/${id}`, {
      method: 'DELETE',
    });
  },

  async regenerateToken(id: string): Promise<{ message: string; appToken: string }> {
    return apiClient<{ message: string; appToken: string }>(`/applications/${id}/regenerate-token`, {
      method: 'POST',
    });
  },

  async getAppUsers(id: string): Promise<AppUser[]> {
    return apiClient<AppUser[]>(`/applications/${id}/users`);
  },
};
