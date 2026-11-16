import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { StatusPill } from '../common/StatusPill';
import { apiClient } from '../../services/api.client';

interface TopbarProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ sidebarCollapsed, onToggleSidebar }) => {
  const { user, isAdmin, logout } = useAuth();
  const { t, lang } = useLanguage();
  const location = useLocation();

  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    apiClient<{ status: string }>('/health')
      .then((res) => setIsOnline(res?.status === 'ok'))
      .catch(() => setIsOnline(false));
  }, []);

  // Helper to resolve breadcrumb crumbs from pathname
  const getBreadcrumbs = () => {
    const path = location.pathname;
    const crumbs: Array<{ label: string; to?: string }> = [
      { label: 'Console', to: '/console/dashboard' },
    ];

    if (path.startsWith('/console/dashboard')) {
      crumbs.push({ label: t('nav.dashboard') });
    } else if (path.startsWith('/console/applications')) {
      crumbs.push({ label: t('nav.apps'), to: '/console/applications' });
      if (path.includes('/users')) {
        crumbs.push({ label: 'Users' });
      } else if (path.includes('/oauth')) {
        crumbs.push({ label: 'OAuth' });
      } else if (path.includes('/settings')) {
        crumbs.push({ label: 'Settings' });
      }
    } else if (path.startsWith('/console/quickstart')) {
      crumbs.push({ label: t('nav.quickstart') });
    } else if (path.startsWith('/console/my-tenant')) {
      crumbs.push({ label: t('nav.tenants') });
    } else if (path.startsWith('/console/admin/users')) {
      crumbs.push({ label: t('nav.group_admin') });
      crumbs.push({ label: t('nav.admin_users') });
    } else if (path.startsWith('/console/admin/tenants')) {
      crumbs.push({ label: t('nav.group_admin') });
      crumbs.push({ label: t('nav.admin_tenants') });
    } else if (path.startsWith('/console/account')) {
      crumbs.push({ label: t('nav.account') });
    }

    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="app-topbar" id="app-topbar">
      {/* Left: Sidebar Toggle + Dynamic Breadcrumbs */}
      <div className="topbar-left">
        <button
          type="button"
          className="topbar-sidebar-toggle"
          onClick={onToggleSidebar}
          title={sidebarCollapsed ? t('nav.expand_sidebar') : t('nav.collapse_sidebar')}
          aria-label={sidebarCollapsed ? t('nav.expand_sidebar') : t('nav.collapse_sidebar')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <nav className="breadcrumbs" aria-label="Breadcrumbs">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={`${crumb.label}-${idx}`}>
                {idx > 0 && <span className="breadcrumb-separator">/</span>}
                {isLast || !crumb.to ? (
                  <span className={`breadcrumb-item ${isLast ? 'current' : ''}`}>
                    {crumb.label}
                  </span>
                ) : (
                  <Link to={crumb.to} className="breadcrumb-item link">
                    {crumb.label}
                  </Link>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* Right: API status, Language, User profile, Logout */}
      <div className="topbar-right">
        <StatusPill
          label={
            isOnline === null
              ? (lang === 'vi' ? 'Đang kiểm tra...' : 'Checking...')
              : isOnline
              ? t('nav.api_online')
              : (lang === 'vi' ? 'Mất kết nối' : 'Offline')
          }
          variant={isOnline ? 'success' : 'default'}
        />
        <LanguageSwitcher idPrefix="topbar" />

        {user && (
          <div className="topbar-user" id="topbar-user-badge">
            <div className="topbar-user-info">
              <span className="topbar-user-email" id="topbar-user-email">
                {user.email}
              </span>
              <span className={`topbar-user-role ${isAdmin ? 'role-admin' : ''}`}>
                {isAdmin ? 'ADMIN' : 'USER'}
              </span>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={logout}
              id="btn-logout"
            >
              {t('nav.logout')}
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
