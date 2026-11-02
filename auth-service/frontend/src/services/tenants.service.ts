import { apiClient } from './api.client';

export interface TenantSummary {
  id: string;
  name: string;
  description?: string;
  ownerUserId: string;
  owner: { id: string; email: string; name?: string };
  _count: { users: number };
  createdAt: string;
  updatedAt: string;
  canManage?: boolean;
  isOwner?: boolean;
  members?: Array<{ id: string; email: string; name?: string }>;
}

export interface TenantJoinRequest {
  id: string;
  userId: string;
  tenantId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  createdAt?: string;
  updatedAt?: string;
  tenant?: {
    id: string;
    name: string;
    description?: string;
    owner?: { id: string; email: string; name?: string };
  };
  user?: {
    id: string;
    email: string;
    name?: string;
    createdAt?: string;
  };
}

export interface TenantContext {
  tenant: TenantSummary | null;
  isSystemAdmin: boolean;
  canCreate: boolean;
  userId: string;
  pendingRequest?: TenantJoinRequest | null;
  joinRequest?: TenantJoinRequest | null;
}

export interface TenantAuditLog {
  id: string;
  tenantId: string;
  tenantName: string;
  actorUserId: string;
  action: string;
  fromOwnerId?: string;
  toOwnerId?: string;
  reason?: string;
  createdAt: string;
}

export const tenantsService = {
  getMe: () => apiClient<TenantContext>('/tenants/me'),
  list: () => apiClient<TenantSummary[]>('/tenants'),
  getDetail: (id: string) => apiClient<TenantSummary>(`/tenants/${id}`),
  create: (data: { name: string; description?: string }) =>
    apiClient<TenantSummary>('/tenants', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { name?: string; description?: string }) =>
    apiClient<TenantSummary>(`/tenants/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => apiClient<{ message: string }>(`/tenants/${id}`, { method: 'DELETE' }),
  transfer: (id: string, data: { userId: string; reason?: string }) =>
    apiClient<TenantSummary>(`/tenants/${id}/transfer`, { method: 'POST', body: JSON.stringify(data) }),
  applyJoin: (tenantId: string) =>
    apiClient<TenantJoinRequest>('/tenants/join', { method: 'POST', body: JSON.stringify({ tenantId }) }),
  getMyJoinRequest: () => apiClient<TenantJoinRequest | null>('/tenants/join-request/my'),
  cancelJoinRequest: (id: string) =>
    apiClient<TenantJoinRequest>(`/tenants/join-request/${id}/cancel`, { method: 'POST' }),
  listJoinRequests: (tenantId: string) =>
    apiClient<TenantJoinRequest[]>(`/tenants/${tenantId}/join-requests`),
  approveJoinRequest: (requestId: string) =>
    apiClient<TenantJoinRequest>(`/tenants/join-requests/${requestId}/approve`, { method: 'POST' }),
  rejectJoinRequest: (requestId: string, reason?: string) =>
    apiClient<TenantJoinRequest>(`/tenants/join-requests/${requestId}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  removeMember: (tenantId: string, userId: string) =>
    apiClient<{ message: string }>(`/tenants/${tenantId}/members/${userId}`, { method: 'DELETE' }),
  leave: () => apiClient<{ message: string }>('/tenants/leave', { method: 'POST' }),
  getAudit: (id?: string) => apiClient<TenantAuditLog[]>(id ? `/tenants/${id}/audit` : '/tenants/audit'),
};

