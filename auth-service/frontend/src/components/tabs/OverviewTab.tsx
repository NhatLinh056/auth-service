import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { tenantsService, type TenantContext } from '../../services/tenants.service';
import { usersService } from '../../services/users.service';
import type { Application } from '../../types/application.types';

interface OverviewTabProps {
  applications: Application[];
  onGoToApps: () => void;
  onOpenAppDetail: (app: Application) => void;
  onOpenCreateApp?: () => void;
  onGoToTenants?: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  applications,
  onGoToApps,
  onOpenAppDetail,
  onOpenCreateApp,
  onGoToTenants,
}) => {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const { t, lang } = useLanguage();

  const [tenantContext, setTenantContext] = useState<TenantContext | null>(null);
  const [globalUsersCount, setGlobalUsersCount] = useState<number | null>(null);
  const [loadingContext, setLoadingContext] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoadingContext(true);

    const promises: Promise<any>[] = [
      tenantsService.getMe().then((ctx) => setTenantContext(ctx)).catch(() => setTenantContext(null)),
    ];

    if (isAdmin) {
      promises.push(
        usersService.getAll().then((users) => setGlobalUsersCount(users.length)).catch(() => setGlobalUsersCount(null))
      );
    }

    Promise.allSettled(promises).finally(() => setLoadingContext(false));
  }, [isAuthenticated, isAdmin]);

  const recentApps = applications.slice(0, 5);

  const getTenantBadgeText = () => {
    if (loadingContext) return '...';
    if (tenantContext?.tenant) {
      const roleStr = tenantContext.tenant.isOwner
        ? (lang === 'vi' ? 'Chủ sở hữu' : 'Owner')
        : (lang === 'vi' ? 'Thành viên' : 'Member');
      return `${tenantContext.tenant.name} (${roleStr})`;
    }
    if (tenantContext?.pendingRequest) {
      return lang === 'vi' ? 'Đang chờ duyệt gia nhập' : 'Pending join request';
    }
    return lang === 'vi' ? 'Chưa tham gia doanh nghiệp' : 'No tenant joined';
  };

  return (
    <div className="tab-content active" id="tab-overview">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">{lang === 'vi' ? 'Dashboard Tổng Quan' : 'Dashboard Overview'}</h1>
          <p className="page-subtitle">
            {lang === 'vi'
              ? 'Trung tâm điều hành danh tính, ứng dụng và tổ chức doanh nghiệp.'
              : 'Central hub for identity, applications, and multi-tenant organization.'}
          </p>
        </div>
      </div>

      {/* User Context & Identity Banner */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          marginBottom: 20,
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)',
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
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'var(--primary-subtle, rgba(59, 130, 246, 0.2))',
              color: 'var(--primary, #3b82f6)',
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
              <span>{user?.email || (lang === 'vi' ? 'Chưa xác thực' : 'Not Authenticated')}</span>
              <span className={`status-pill ${isAdmin ? 'status-pill-primary' : 'status-pill-neutral'}`} style={{ fontSize: 11, padding: '2px 8px' }}>
                {isAdmin ? (lang === 'vi' ? 'System Admin' : 'System Admin') : (lang === 'vi' ? 'Platform User' : 'Platform User')}
              </span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{lang === 'vi' ? 'Doanh nghiệp:' : 'Tenant:'}</span>
              <span style={{ color: tenantContext?.tenant ? 'var(--text-main, #e2e8f0)' : 'var(--text-dim)' }}>
                {getTenantBadgeText()}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Action CTAs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {onOpenCreateApp && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onOpenCreateApp}
              id="dashboard-cta-create-app"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 6 }}>
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>{lang === 'vi' ? 'Tạo Ứng Dụng' : 'New App'}</span>
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onGoToApps}
            id="dashboard-cta-manage-apps"
          >
            <span>{lang === 'vi' ? 'Quản lý Ứng dụng' : 'Applications'}</span>
          </button>
          {onGoToTenants && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onGoToTenants}
              id="dashboard-cta-tenants"
            >
              <span>{lang === 'vi' ? 'Doanh nghiệp' : 'Tenants'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Real Metrics Grid */}
      <div className="stats-grid">
        {/* Applications Card */}
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={onGoToApps}>
          <div className="stat-label">{lang === 'vi' ? 'Ứng Dụng Của Bạn' : 'My Applications'}</div>
          <div className="stat-value" id="overview-apps-count">
            {applications.length}
          </div>
          <div className="stat-hint">
            {lang === 'vi' ? 'Ứng dụng bạn có quyền quản trị' : 'Applications you can manage'}
          </div>
        </div>

        {/* Tenant Card */}
        <div className="stat-card" style={{ cursor: onGoToTenants ? 'pointer' : 'default' }} onClick={onGoToTenants}>
          <div className="stat-label">{lang === 'vi' ? 'Doanh Nghiệp (Tenant)' : 'Tenant Organization'}</div>
          <div
            className="stat-value"
            id="overview-tenant-name"
            style={{ fontSize: 18, wordBreak: 'break-word', color: tenantContext?.tenant ? '#fff' : 'var(--text-dim)' }}
          >
            {tenantContext?.tenant ? tenantContext.tenant.name : (tenantContext?.pendingRequest ? (lang === 'vi' ? 'Chờ Duyệt' : 'Pending') : (lang === 'vi' ? 'Chưa Tham Gia' : 'None'))}
          </div>
          <div className="stat-hint">
            {tenantContext?.tenant
              ? `${tenantContext.tenant._count?.users || 1} ${lang === 'vi' ? 'thành viên' : 'members'} • ${tenantContext.tenant.isOwner ? (lang === 'vi' ? 'Chủ sở hữu' : 'Owner') : (lang === 'vi' ? 'Thành viên' : 'Member')}`
              : (tenantContext?.pendingRequest ? (lang === 'vi' ? 'Yêu cầu gia nhập đang chờ xử lý' : 'Join request pending') : (lang === 'vi' ? 'Bấm để tạo hoặc xin gia nhập' : 'Join or create tenant'))}
          </div>
        </div>

        {/* System Users Card (Admin Only) */}
        {isAdmin && (
          <div className="stat-card">
            <div className="stat-label">{lang === 'vi' ? 'Người Dùng Hệ Thống' : 'System Users (Global)'}</div>
            <div className="stat-value" id="overview-system-users-count">
              {globalUsersCount !== null ? globalUsersCount : '...'}
            </div>
            <div className="stat-hint">
              {lang === 'vi' ? 'Tài khoản canonical toàn platform (Chỉ Admin)' : 'Platform canonical accounts (Admin only)'}
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
              color: 'var(--success, #10b981)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span className="status-dot"></span> <span>{t('overview.online')}</span>
          </div>
          <div className="stat-hint">{t('overview.status_hint')}</div>
        </div>
      </div>

      {/* Recent Applications Section */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="card-title" style={{ margin: 0 }}>{t('overview.recent_title')}</h2>
            <p className="card-subtitle" style={{ fontSize: 13, color: 'var(--text-dim)', margin: '4px 0 0 0' }}>
              {lang === 'vi'
                ? 'Các ứng dụng được quản lý gần đây. Bấm vào ứng dụng để xem App Users hoặc Cài đặt.'
                : 'Recently managed applications. Click to open App Users or Settings.'}
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onGoToApps}>
            <span>{t('overview.view_all')}</span>
          </button>
        </div>

        <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('table.app_name')}</th>
                <th>{t('table.appid')}</th>
                <th>{t('table.status')}</th>
                <th>{t('table.created')}</th>
                <th style={{ textAlign: 'right' }}>{lang === 'vi' ? 'Hành động' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody id="overview-recent-apps">
              {recentApps.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 32 }}
                  >
                    <div style={{ marginBottom: 12 }}>
                      {lang === 'vi'
                        ? 'Bạn chưa có ứng dụng nào được đăng ký.'
                        : 'No applications found under your account.'}
                    </div>
                    {onOpenCreateApp && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={onOpenCreateApp}
                      >
                        {lang === 'vi' ? '+ Tạo Ứng Dụng Đầu Tiên' : '+ Create Your First App'}
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                recentApps.map((app) => {
                  const isActive = app.status === 'ACTIVE';
                  const createdDate = app.createdAt
                    ? new Date(app.createdAt).toISOString().split('T')[0]
                    : '—';
                  return (
                    <tr
                      key={app.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => onOpenAppDetail(app)}
                    >
                      <td style={{ fontWeight: 500, color: '#fff' }}>{app.name}</td>
                      <td>
                        <span className="mono-tag">{app.appId}</span>
                      </td>
                      <td>
                        <span className={`status-indicator ${isActive ? 'active' : 'inactive'}`}>
                          {isActive ? t('table.status_active') : t('table.status_inactive')}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-dim)', fontSize: 13 }}>
                        {createdDate}
                      </td>
                      <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => onOpenAppDetail(app)}
                        >
                          {lang === 'vi' ? 'Chi tiết' : 'Details'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
