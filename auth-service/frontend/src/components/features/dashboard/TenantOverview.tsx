import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { IconBuilding, IconClock } from '../../common/Icons';
import type { TenantContext } from '../../../services/tenants.service';

interface TenantOverviewProps {
  tenantContext: TenantContext | null;
  loading: boolean;
  onGoToTenants: () => void;
}

export const TenantOverview: React.FC<TenantOverviewProps> = ({
  tenantContext,
  loading,
  onGoToTenants,
}) => {
  const { lang } = useLanguage();

  const tenant = tenantContext?.tenant;
  const pending = tenantContext?.pendingRequest || tenantContext?.joinRequest;

  return (
    <div className="compact-callout compact-callout--tenant">
      <div className="card-header-left">
        <div className="icon-well icon-well--teal">
          <IconBuilding size={18} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h2 className="card-title">
              {tenant
                ? `${lang === 'vi' ? 'Không gian doanh nghiệp' : 'Tenant Workspace'} — ${tenant.name}`
                : (lang === 'vi' ? 'Không Gian Doanh Nghiệp' : 'Tenant Workspace')}
            </h2>
            {tenant && (
              <span className={`badge ${tenant.isOwner ? 'badge-primary' : 'badge-success'}`}>
                {tenant.isOwner
                  ? (lang === 'vi' ? 'Chủ sở hữu' : 'Owner')
                  : (lang === 'vi' ? 'Thành viên' : 'Member')}
              </span>
            )}
            {!tenant && pending && (
              <span className="badge badge-warning">
                <IconClock size={12} />
                <span>{lang === 'vi' ? 'Chờ duyệt' : 'Pending'}</span>
              </span>
            )}
          </div>
          <p className="card-subtitle">
            {loading && !tenantContext
              ? (lang === 'vi' ? 'Đang tải thông tin doanh nghiệp...' : 'Loading tenant info...')
              : tenant
              ? (lang === 'vi'
                  ? `${tenant._count?.users || 1} thành viên · Mã: ${tenant.id.slice(0, 8)}…`
                  : `${tenant._count?.users || 1} members · ID: ${tenant.id.slice(0, 8)}…`)
              : pending
              ? (lang === 'vi'
                  ? `Đang chờ phê duyệt gia nhập ${pending.tenant?.name || pending.tenantId}.`
                  : `Pending approval for ${pending.tenant?.name || pending.tenantId}.`)
              : (lang === 'vi'
                  ? 'Bạn chưa thuộc doanh nghiệp nào — tạo mới hoặc xin gia nhập theo Tenant ID.'
                  : 'Not affiliated with any tenant — create one or request access by Tenant ID.')}
          </p>
        </div>
      </div>

      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={onGoToTenants}
        id="tenant-btn-manage"
      >
        <span>
          {tenant
            ? (lang === 'vi' ? 'Quản lý doanh nghiệp' : 'Manage Tenant')
            : pending
            ? (lang === 'vi' ? 'Xem yêu cầu' : 'View Request')
            : (lang === 'vi' ? 'Khám phá doanh nghiệp' : 'Open Tenant Workspace')}
        </span>
      </button>
    </div>
  );
};
