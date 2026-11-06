export type ApplicationStatus = 'ACTIVE' | 'INACTIVE';

export interface Application {
  id: string;
  name: string;
  appId: string;
  appToken?: string;
  status: ApplicationStatus;
  adminEmails?: string[];
  allowedRedirectUris?: string[];
  userId: string;
  user?: {
    id: string;
    email: string;
    name?: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppPayload {
  name: string;
  userId?: string;
}

export interface UpdateAppPayload {
  name?: string;
  status?: ApplicationStatus;
  adminEmails?: string[];
  allowedRedirectUris?: string[];
}

export interface AppUserIdentity {
  provider: string;
  email: string;
  createdAt: string;
}

export interface AppUser {
  id: string;
  applicationId: string;
  userId?: string | null;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
  identities?: AppUserIdentity[];
  user?: {
    id: string;
    email: string;
    name?: string | null;
    tenantId?: string | null;
    tenant?: {
      id: string;
      name: string;
    } | null;
  } | null;
}
