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

interface RoleDashboardProps {
  applications: Application[];
  onGoToApps: () => void;
  onOpenAppDetail: (app: Application) => void;
  onOpenCreateApp?: () => void;
  onGoToTenants?: () => void;
}

export const RoleDashboard: React.FC<RoleDashboardProps> = ({
  applications,
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

  const getTenantBadgeText = () => {
    if (loading) return '...';
    if (tenantContext?.tenant) {
      const roleStr = tenantContext.tenant.isOwner
        ? (lang === 'vi' ? 'Chủ sở hữu' : 'Owner')
        : (lang === 'vi' ? 'Thành viên' : 'Member');
      return `${tenantContext.tenant.name} (${roleStr})`;
    }
    if (tenantContext?.pendingRequest || tenantContext?.joinRequest) {
      return lang === 'vi' ? 'Đang chờ duyệt gia nhập' : 'Join request pending';
    }
    return lang === 'vi' ? 'Chưa tham gia doanh nghiệp' : 'No tenant joined';
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
      {/* 1. Header & Identity Context Banner */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">{lang === 'vi' ? 'Bảng Điều Khiển Tổng Quan' : 'Dashboard Overview'}</h1>
          <p className="page-subtitle">
            {lang === 'vi'
              ? 'Trung tâm điều hành danh tính, ứng dụng và tổ chức doanh nghiệp thích ứng theo vai trò.'
              : 'Role-adaptive command center for identity, applications, and organizations.'}
          </p>
        </div>
      </div>

      <div
        className="card"
        style={{
          padding: '18px 24px',
          marginBottom: 24,
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.85) 100%)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), #818cf8)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 18,
            }}
          >
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{user?.email || 'user@example.com'}</span>
              <span
                className={`badge ${isAdmin ? 'badge-warning' : 'badge-info'}`}
                style={{ fontSize: 11, padding: '2px 8px' }}
              >
                {isAdmin ? 'SUPER ADMIN' : 'PLATFORM USER'}
              </span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{lang === 'vi' ? 'Trạng thái Doanh nghiệp:' : 'Tenant Status:'}</span>
              <span style={{ color: tenantContext?.tenant ? '#fff' : 'var(--text-dim)', fontWeight: 500 }}>
                {getTenantBadgeText()}
              </span>
            </div>
          </div>
        </div>

        {/* Action CTAs in Banner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {onOpenCreateApp && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onOpenCreateApp}
              id="dashboard-cta-create-app"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 6 }}>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>{lang === 'vi' ? 'Tạo Ứng Dụng' : 'New App'}</span>
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onGoToApps}
            id="dashboard-cta-apps"
          >
            <span>{lang === 'vi' ? 'Ứng Dụng' : 'Applications'}</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleNavigateTenants}
            id="dashboard-cta-my-tenant"
          >
            <span>{lang === 'vi' ? 'Doanh nghiệp của tôi' : 'My Tenant'}</span>
          </button>
        </div>
      </div>

      {/* 2. Metric Cards Grid (Scene 1) */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {/* Applications Card */}
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={onGoToApps}>
          <div className="stat-label">{lang === 'vi' ? 'Ứng Dụng Nền Tảng' : 'Platform Applications'}</div>
          <div className="stat-value" id="overview-apps-count">
            {applications.length}
          </div>
          <div className="stat-hint" style={{ color: 'var(--success)' }}>
            ● {activeAppsCount}/{applications.length} {lang === 'vi' ? 'đang hoạt động (ACTIVE)' : 'active'}
          </div>
        </div>

        {/* Tenant Card */}
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={handleNavigateTenants}>
          <div className="stat-label">{lang === 'vi' ? 'Doanh Nghiệp Của Tôi' : 'My Tenant'}</div>
          <div
            className="stat-value"
            id="overview-tenant-name"
            style={{ fontSize: 18, wordBreak: 'break-word', color: tenantContext?.tenant ? '#fff' : 'var(--text-dim)' }}
          >
            {tenantContext?.tenant
              ? tenantContext.tenant.name
              : (tenantContext?.pendingRequest || tenantContext?.joinRequest
                  ? (lang === 'vi' ? 'Chờ Duyệt' : 'Pending')
                  : (lang === 'vi' ? 'Chưa Tham Gia' : 'None'))}
          </div>
          <div className="stat-hint">
            {tenantContext?.tenant
              ? `${tenantContext.tenant._count?.users || 1} ${lang === 'vi' ? 'thành viên' : 'members'} • ${tenantContext.tenant.isOwner ? (lang === 'vi' ? 'Chủ sở hữu' : 'Owner') : (lang === 'vi' ? 'Thành viên' : 'Member')}`
              : (tenantContext?.pendingRequest || tenantContext?.joinRequest
                  ? (lang === 'vi' ? 'Yêu cầu đang chờ phê duyệt' : 'Join request pending')
                  : (lang === 'vi' ? 'Bấm để tạo hoặc xin gia nhập' : 'Create or join tenant'))}
          </div>
        </div>

        {/* Global Users Metric (Admin Only) */}
        {isAdmin && (
          <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/console/admin/users')}>
            <div className="stat-label">{lang === 'vi' ? 'Người Dùng Toàn Hệ Thống' : 'System Users'}</div>
            <div className="stat-value" id="overview-system-users-count">
              {loading ? '...' : globalUsers.length}
            </div>
            <div className="stat-hint">
              {loading
                ? '...'
                : `${globalUsers.filter((u) => u.role === 'ADMIN').length} Super Admin, ${globalUsers.filter((u) => u.role === 'USER').length} Users`}
            </div>
          </div>
        )}

        {/* Global Tenants Metric (Admin Only) */}
        {isAdmin && (
          <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/console/admin/tenants')}>
            <div className="stat-label">{lang === 'vi' ? 'Tất Cả Doanh Nghiệp' : 'All Tenants'}</div>
            <div className="stat-value" id="overview-all-tenants-count">
              {loading ? '...' : (globalTenantsCount !== null ? globalTenantsCount : '...')}
            </div>
            <div className="stat-hint" style={{ color: 'var(--info)' }}>
              {lang === 'vi' ? 'Quản lý tập trung toàn hệ thống' : 'Central platform governance'}
            </div>
          </div>
        )}

        {/* Service Status Card */}
        <div className="stat-card">
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

      {/* 3. Quick Action Shortcuts (Lối Tắt Thao Tác Nhanh - Scene 1) */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 className="card-title" style={{ margin: 0, fontSize: 15 }}>
            {lang === 'vi' ? 'Lối Tắt Thao Tác Nhanh' : 'Quick Actions'}
          </h2>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onGoToApps}
            id="quick-action-apps"
          >
            + {lang === 'vi' ? 'Quản Lý Ứng Dụng' : 'Manage Applications'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/console/quickstart')}
            id="quick-action-quickstart"
          >
            {lang === 'vi' ? 'Hướng Dẫn Tích Hợp Microservice' : 'Integration Quickstart'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleNavigateTenants}
            id="quick-action-tenant"
          >
            {lang === 'vi' ? 'Không Gian Doanh Nghiệp Của Tôi' : 'My Tenant'}
          </button>
          {isAdmin && (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate('/console/admin/users')}
                id="quick-action-admin-users"
              >
                {lang === 'vi' ? 'Người Dùng Toàn Hệ Thống' : 'System Users'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate('/console/admin/tenants')}
                id="quick-action-admin-tenants"
              >
                {lang === 'vi' ? 'Tất Cả Doanh Nghiệp' : 'All Tenants'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* 4. Super Admin Governance Hub (Super Admin Only) */}
      {isAdmin && (
        <SuperAdminOverview
          users={globalUsers}
          tenantsCount={globalTenantsCount}
          loading={loading}
        />
      )}

      {/* 5. App Owner Overview (Applications Table) */}
      <AppOwnerOverview
        applications={applications}
        loading={loading}
        onGoToApps={onGoToApps}
        onOpenAppDetail={onOpenAppDetail}
        onOpenCreateApp={onOpenCreateApp}
      />

      {/* 6. Tenant Organization Hub */}
      <TenantOverview
        tenantContext={tenantContext}
        loading={loading}
        onGoToTenants={handleNavigateTenants}
      />
    </div>
  );
};

export default RoleDashboard;
