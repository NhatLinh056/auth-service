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
