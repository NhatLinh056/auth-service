export type ProviderType = 'GOOGLE' | 'FACEBOOK';

export interface SanitizedOAuthProvider {
  id: string;
  provider: ProviderType;
  name?: string;
  clientId: string | null;
  clientSecret?: string | null;
  hasSecret: boolean;
  isConfigured?: boolean;
  callbackUrl: string;
  isEnabled: boolean;
  applicationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateOAuthProviderPayload {
  clientId?: string;
  clientSecret?: string;
  isEnabled?: boolean;
}
