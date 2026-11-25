import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { tenantsService, type TenantContext } from '../../../services/tenants.service';
import { usersService } from '../../../services/users.service';
import { apiClient } from '../../../services/api.client';
import type { Application } from '../../../types/application.types';
import type { User } from '../../../types/auth.types';
import { SuperAdminOverview } from './SuperAdminOverview';
import { AppOwnerOverview } from './AppOwnerOverview';
import { TenantOverview } from './TenantOverview';
import { IconPlus } from '../../common/Icons';

interface RoleDashboardProps {
  applications: Application[];
  appsLoading?: boolean;
  onGoToApps: () => void;
  onOpenAppDetail: (app: Application) => void;
  onOpenCreateApp?: () => void;
  onGoToTenants?: () => void;
}

export const RoleDashboard: React.FC<RoleDashboardProps> = ({
  applications,
  appsLoading = false,
  onGoToApps,
  onOpenAppDetail,
  onOpenCreateApp,
  onGoToTenants,
}) => {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const { lang, t } = useLanguage();
  const navigate = useNavigate();

  const [tenantContext, setTenantContext] = useState<TenantContext | null>(null);
  const [globalUsers, setGlobalUsers] = useState<User[]>([]);
  const [globalTenantsCount, setGlobalTenantsCount] = useState<number | null>(null);
  const [healthStatus, setHealthStatus] = useState<{
    status: 'checking' | 'ok' | 'error';
    database: string;
  }>({ status: 'checking', database: 'checking' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);

    const promises: Promise<any>[] = [
      tenantsService.getMe().then((ctx) => setTenantContext(ctx)).catch(() => setTenantContext(null)),
      apiClient<{ status: string; database?: string }>('/health')
        .then((res) => {
          setHealthStatus({
            status: res?.status === 'ok' ? 'ok' : 'error',
            database: res?.database || 'connected',
          });
        })
        .catch(() => {
          setHealthStatus({ status: 'error', database: 'disconnected' });
        }),
    ];

    if (isAdmin) {
      promises.push(
        usersService.getAll().then((data) => setGlobalUsers(data)).catch(() => setGlobalUsers([])),
        tenantsService.list().then((tenants) => setGlobalTenantsCount(tenants.length)).catch(() => setGlobalTenantsCount(null))
      );
    }

    Promise.allSettled(promises).finally(() => setLoading(false));
  }, [isAuthenticated, isAdmin]);

  const activeAppsCount = applications.filter((a) => a.status === 'ACTIVE').length;

  const getTenantStatusNode = () => {
    if (loading && !tenantContext) {
      return <span className="skeleton-bar" style={{ width: 120, height: 14 }} />;
    }
    if (tenantContext?.tenant) {
      const roleStr = tenantContext.tenant.isOwner
        ? (lang === 'vi' ? 'Chủ sở hữu' : 'Owner')
        : (lang === 'vi' ? 'Thành viên' : 'Member');
      return (
        <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>
          {`${tenantContext.tenant.name} (${roleStr})`}
        </span>
      );
    }
    if (tenantContext?.pendingRequest || tenantContext?.joinRequest) {
      return (
        <span style={{ color: 'var(--warning)', fontWeight: 500 }}>
          {lang === 'vi' ? 'Đang chờ duyệt gia nhập' : 'Join request pending'}
        </span>
      );
    }
    return (
      <span>
        {lang === 'vi' ? 'Chưa tham gia doanh nghiệp' : 'No tenant joined'}
      </span>
    );
  };

  const handleNavigateTenants = () => {
    if (onGoToTenants) {
      onGoToTenants();
    } else {
      navigate('/console/my-tenant');
    }
  };

  return (
    <div className="role-dashboard" id="role-dashboard">
      {/* 1. Page Header with Single Primary CTA */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{lang === 'vi' ? 'Bảng Điều Khiển Tổng Quan' : 'Dashboard Overview'}</h1>
          <p className="page-subtitle">
            {lang === 'vi'
              ? 'Trung tâm điều hành danh tính, ứng dụng và tổ chức doanh nghiệp.'
              : 'Command center for identity, applications, and organizations.'}
          </p>
        </div>

        {onOpenCreateApp && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={onOpenCreateApp}
            id="dashboard-cta-create-app"
          >
            <IconPlus size={15} />
            <span>{lang === 'vi' ? 'Tạo Ứng Dụng' : 'New App'}</span>
          </button>
        )}
      </div>

      {/* Identity Context Banner (Compact, no redundant CTAs) */}
      <div className={`identity-banner ${isAdmin ? 'identity-banner--admin' : ''}`}>
        <div className="identity-banner-main">
          <div className="avatar-circle avatar-circle--lg">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <div className="identity-banner-title">
              <span>{user?.email || 'user@example.com'}</span>
              <span className={`badge ${isAdmin ? 'badge-warning' : 'badge-info'}`}>
                {isAdmin ? 'SUPER ADMIN' : 'PLATFORM USER'}
              </span>
            </div>
            <div className="identity-banner-meta">
              <span>{lang === 'vi' ? 'Doanh nghiệp:' : 'Tenant:'}</span>
              {getTenantStatusNode()}
            </div>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => navigate('/console/account')}
        >
          {t('nav.account')}
        </button>
      </div>

      {/* 2. Metric Cards Grid (Scene 1) */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {/* Applications Card */}
        <div className="stat-card stat-card--primary stat-card--clickable" onClick={onGoToApps}>
          <div className="stat-label">{lang === 'vi' ? 'Ứng Dụng Nền Tảng' : 'Platform Applications'}</div>
          <div className="stat-value" id="overview-apps-count">
            {appsLoading && applications.length === 0 ? (
              <span className="skeleton-bar" style={{ width: 44, height: 28 }} />
            ) : (
              applications.length
            )}
          </div>
          <div className="stat-hint" style={{ color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {appsLoading && applications.length === 0 ? (
              <span className="skeleton-bar" style={{ width: 130, height: 14 }} />
            ) : (
              <>
                <span className="status-dot" style={{ backgroundColor: 'var(--success)', width: 6, height: 6 }} />
                <span>{`${activeAppsCount}/${applications.length} ${lang === 'vi' ? 'đang hoạt động (ACTIVE)' : 'active'}`}</span>
              </>
            )}
          </div>
        </div>

        {/* Tenant Card */}
        <div className="stat-card stat-card--teal stat-card--clickable" onClick={handleNavigateTenants}>
          <div className="stat-label">{lang === 'vi' ? 'Doanh Nghiệp Của Tôi' : 'My Tenant'}</div>
          <div
            className="stat-value"
            id="overview-tenant-name"
            style={{ fontSize: 18, wordBreak: 'break-word', color: tenantContext?.tenant ? 'var(--text-main)' : 'var(--text-dim)' }}
          >
            {loading && !tenantContext ? (
              <span className="skeleton-bar" style={{ width: 130, height: 22 }} />
            ) : tenantContext?.tenant ? (
              tenantContext.tenant.name
            ) : (tenantContext?.pendingRequest || tenantContext?.joinRequest
                ? (lang === 'vi' ? 'Chờ Duyệt' : 'Pending')
                : (lang === 'vi' ? 'Chưa Tham Gia' : 'None'))}
          </div>
          <div className="stat-hint">
            {loading && !tenantContext ? (
              <span className="skeleton-bar" style={{ width: 140, height: 14 }} />
            ) : tenantContext?.tenant ? (
              `${tenantContext.tenant._count?.users || 1} ${lang === 'vi' ? 'thành viên' : 'members'} • ${tenantContext.tenant.isOwner ? (lang === 'vi' ? 'Chủ sở hữu' : 'Owner') : (lang === 'vi' ? 'Thành viên' : 'Member')}`
            ) : (tenantContext?.pendingRequest || tenantContext?.joinRequest
                ? (lang === 'vi' ? 'Yêu cầu đang chờ phê duyệt' : 'Join request pending')
                : (lang === 'vi' ? 'Bấm để tạo hoặc xin gia nhập' : 'Create or join tenant'))}
          </div>
        </div>

        {/* Global Users Metric (Admin Only) */}
        {isAdmin && (
          <div className="stat-card stat-card--amber stat-card--clickable" onClick={() => navigate('/console/admin/users')}>
            <div className="stat-label">{lang === 'vi' ? 'Người Dùng Toàn Hệ Thống' : 'System Users'}</div>
            <div className="stat-value" id="overview-system-users-count">
              {loading ? <span className="skeleton-bar" style={{ width: 48, height: 28 }} /> : globalUsers.length}
            </div>
            <div className="stat-hint">
              {loading ? (
                <span className="skeleton-bar" style={{ width: 140, height: 14 }} />
              ) : (
                `${globalUsers.filter((u) => u.role === 'ADMIN').length} Super Admin, ${globalUsers.filter((u) => u.role === 'USER').length} Users`
              )}
            </div>
          </div>
        )}

        {/* Global Tenants Metric (Admin Only) */}
        {isAdmin && (
          <div className="stat-card stat-card--amber stat-card--clickable" onClick={() => navigate('/console/admin/tenants')}>
            <div className="stat-label">{lang === 'vi' ? 'Tất Cả Doanh Nghiệp' : 'All Tenants'}</div>
            <div className="stat-value" id="overview-all-tenants-count">
              {loading || globalTenantsCount === null ? (
                <span className="skeleton-bar" style={{ width: 48, height: 28 }} />
              ) : (
                globalTenantsCount
              )}
            </div>
            <div className="stat-hint" style={{ color: 'var(--info)' }}>
              {lang === 'vi' ? 'Quản lý tập trung toàn hệ thống' : 'Central platform governance'}
            </div>
          </div>
        )}

        {/* Service Status Card */}
        <div
          className={`stat-card ${
            healthStatus.status === 'ok'
              ? 'stat-card--success'
              : healthStatus.status === 'error'
              ? 'stat-card--danger'
              : 'stat-card--amber'
          }`}
        >
          <div className="stat-label">{t('overview.status_label')}</div>
          <div
            className="stat-value"
            style={{
              fontSize: 16,
              color:
                healthStatus.status === 'ok'
                  ? 'var(--success, #10b981)'
                  : healthStatus.status === 'checking'
                  ? 'var(--warning, #f59e0b)'
                  : 'var(--danger, #ef4444)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span
              className="status-dot"
              style={{
                backgroundColor:
                  healthStatus.status === 'ok'
                    ? '#10b981'
                    : healthStatus.status === 'checking'
                    ? '#f59e0b'
                    : '#ef4444',
              }}
            />
            <span>
              {healthStatus.status === 'ok'
                ? (lang === 'vi' ? 'Trực Tuyến' : 'Online')
                : healthStatus.status === 'checking'
                ? (lang === 'vi' ? 'Đang Kiểm Tra...' : 'Verifying...')
                : (lang === 'vi' ? 'Mất Kết Nối' : 'Offline')}
            </span>
          </div>
          <div className="stat-hint">
            {healthStatus.status === 'ok'
              ? (lang === 'vi'
                  ? `Xác thực qua GET /health (DB: ${healthStatus.database})`
                  : `Verified via GET /health (DB: ${healthStatus.database})`)
              : healthStatus.status === 'checking'
              ? (lang === 'vi' ? 'Đang ping xác minh dịch vụ...' : 'Pinging service endpoint...')
              : (lang === 'vi' ? 'Lỗi kết nối máy chủ hoặc cơ sở dữ liệu' : 'Service or database unreachable')}
          </div>
        </div>
      </div>

      {/* 3. Super Admin Governance Strip (Super Admin Only) */}
      {isAdmin && (
        <SuperAdminOverview
          users={globalUsers}
          tenantsCount={globalTenantsCount}
          loading={loading}
        />
      )}

      {/* 4. App Owner Overview (Applications Table) */}
      <AppOwnerOverview
        applications={applications}
        loading={loading || Boolean(appsLoading)}
        onGoToApps={onGoToApps}
        onOpenAppDetail={onOpenAppDetail}
        onOpenCreateApp={onOpenCreateApp}
      />

      {/* 5. Tenant Organization Strip */}
      <TenantOverview
        tenantContext={tenantContext}
        loading={loading}
        onGoToTenants={handleNavigateTenants}
      />
    </div>
  );
};

export default RoleDashboard;
