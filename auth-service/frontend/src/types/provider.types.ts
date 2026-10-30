export type ProviderType = 'GOOGLE' | 'FACEBOOK';

export interface SanitizedOAuthProvider {
  id: string;
  provider: ProviderType;
  clientId: string | null;
  hasSecret: boolean;
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
