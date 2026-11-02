import { apiClient } from './api.client';

export interface AccountProfile {
  id: string;
  email: string;
  name: string | null;
  hasPassword: boolean;
  providers: {
    provider: 'google' | 'facebook';
    configured: boolean;
    callbackUrl: string;
    accounts: { email: string | null }[];
  }[];
}

export const accountService = {
  profile: () => apiClient<AccountProfile>('/auth/account'),
  begin: (provider: string, codeChallenge: string) => apiClient<{ startUrl: string }>(`/auth/account/oauth/${provider}/begin`, {
    method: 'POST', body: JSON.stringify({ codeChallenge }),
  }),
  complete: (code: string, verifier: string) => apiClient<AccountProfile>('/auth/account/oauth/complete', {
    method: 'POST', body: JSON.stringify({ code, verifier }),
  }),
  password: (password: string, currentPassword?: string) => apiClient<{ message: string }>('/auth/account/password', {
    method: 'POST', body: JSON.stringify({ password, ...(currentPassword ? { currentPassword } : {}) }),
  }),
};
