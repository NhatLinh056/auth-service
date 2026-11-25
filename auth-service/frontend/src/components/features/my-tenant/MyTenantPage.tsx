import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { SkeletonTable } from '../../common/SkeletonTable';
import { IconAlertTriangle } from '../../common/Icons';
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
      <div className="page-container page-container--tenant">
        <div style={{ marginBottom: 20 }}>
          <div className="skeleton-bar" style={{ height: 32, width: 260, marginBottom: 8 }} />
          <div className="skeleton-bar" style={{ height: 16, width: 400 }} />
        </div>
        <SkeletonTable rows={4} columns={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container page-container--narrow">
        <div className="card" style={{ padding: 28, textAlign: 'center', marginTop: 24 }}>
          <div className="icon-well icon-well--lg icon-well--danger">
            <IconAlertTriangle size={22} />
          </div>
          <h3 className="section-title" style={{ color: 'var(--danger)', margin: '0 0 8px' }}>
            {vi ? 'Lỗi Tải Dữ Liệu Doanh Nghiệp' : 'Failed to Load Tenant'}
          </h3>
          <p className="page-subtitle" style={{ margin: '0 auto 16px' }}>
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
