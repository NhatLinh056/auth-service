import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { SkeletonTable } from '../../common/SkeletonTable';
import { NoTenantView } from './NoTenantView';
import { PendingRequestCard } from './PendingRequestCard';
import { TenantMemberView } from './TenantMemberView';
import { TenantOwnerView } from './TenantOwnerView';
import { tenantsService, type TenantContext } from '../../../services/tenants.service';

export const MyTenantPage: React.FC = () => {
  const { lang } = useLanguage();
  const vi = lang === 'vi';

  const [context, setContext] = useState<TenantContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await tenantsService.getMe();
      setContext(data);
    } catch (err: any) {
      setError(err.message || (vi ? 'Không thể tải thông tin doanh nghiệp' : 'Failed to load tenant info'));
    } finally {
      setLoading(false);
    }
  }, [vi]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div style={{ maxWidth: 1100, margin: '20px auto' }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ height: 32, width: 260, background: 'var(--bg-surface)', borderRadius: 6, marginBottom: 8 }} />
          <div style={{ height: 16, width: 400, background: 'var(--bg-surface)', borderRadius: 4 }} />
        </div>
        <SkeletonTable rows={4} columns={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 840, margin: '40px auto' }}>
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 8,
            padding: 24,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
          <h3 style={{ color: 'var(--danger)', margin: '0 0 8px' }}>
            {vi ? 'Lỗi Tải Dữ Liệu Doanh Nghiệp' : 'Failed to Load Tenant'}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 16px' }}>
            {error}
          </p>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={loadData}
          >
            {vi ? 'Thử Lại' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  // 1. If user is in a tenant
  if (context?.tenant) {
    if (context.tenant.isOwner) {
      return (
        <TenantOwnerView
          tenant={context.tenant}
          onUpdated={loadData}
          onDeleted={loadData}
        />
      );
    }
    return (
      <TenantMemberView
        tenant={context.tenant}
        onLeft={loadData}
      />
    );
  }

  // 2. If user has a pending join request
  if (context?.pendingRequest && context.pendingRequest.status === 'PENDING') {
    return (
      <PendingRequestCard
        request={context.pendingRequest}
        onCancelled={loadData}
      />
    );
  }

  // 3. User has no tenant and no pending request
  return (
    <NoTenantView
      onCreated={loadData}
      onApplied={loadData}
    />
  );
};
