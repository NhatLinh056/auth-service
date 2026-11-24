import { apiClient } from './api.client';

export interface AccountProfile {
  id: string;
  email: string;
  name: string | null;
  hasPassword: boolean;
}

export const accountService = {
  profile: () => apiClient<AccountProfile>('/auth/account'),
  updateName: (userId: string, name: string) =>
    apiClient<{ id: string; email: string; name: string }>(`/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),
  password: (password: string, currentPassword?: string) => apiClient<{ message: string }>('/auth/account/password', {
    method: 'POST', body: JSON.stringify({ password, ...(currentPassword ? { currentPassword } : {}) }),
  }),
};
