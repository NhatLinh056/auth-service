import { apiClient } from './api.client';
import type {
  SanitizedOAuthProvider,
  UpdateOAuthProviderPayload,
} from '../types/provider.types';

export const providersService = {
  async findAllByApplication(applicationId: string): Promise<SanitizedOAuthProvider[]> {
    return apiClient<SanitizedOAuthProvider[]>(`/applications/${applicationId}/auth-methods`);
  },

  async findByProvider(
    applicationId: string,
    provider: string,
  ): Promise<SanitizedOAuthProvider> {
    return apiClient<SanitizedOAuthProvider>(
      `/applications/${applicationId}/auth-methods/${provider}`,
    );
  },

  async update(
    applicationId: string,
    provider: string,
    payload: UpdateOAuthProviderPayload,
  ): Promise<SanitizedOAuthProvider> {
    return apiClient<SanitizedOAuthProvider>(
      `/applications/${applicationId}/auth-methods/${provider}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    );
  },

  async toggle(
    applicationId: string,
    provider: string,
  ): Promise<SanitizedOAuthProvider> {
    return apiClient<SanitizedOAuthProvider>(
      `/applications/${applicationId}/auth-methods/${provider}/toggle`,
      {
        method: 'POST',
      },
    );
  },
};
