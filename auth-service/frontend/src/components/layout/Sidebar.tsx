import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { IconBrandMark, IconShield, IconUser, IconX } from '../common/Icons';

interface SidebarProps {
  collapsed: boolean;
  mobileOpen?: boolean;
  onToggleCollapse: () => void;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  mobileOpen = false,
  onToggleCollapse,
  onCloseMobile,
}) => {
  const { user, isAdmin } = useAuth();
  const { t } = useLanguage();
  const isCompactDesktop = collapsed && !mobileOpen;

  return (
    <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`} id="app-sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="sidebar-logo" aria-hidden="true">
          <IconBrandMark size={17} strokeWidth={2} />
        </div>
        {!isCompactDesktop && (
          <div className="sidebar-brand-text">
            <span>Auth Service</span>
            <span className="brand-badge">{t('nav.console')}</span>
          </div>
        )}
        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={onToggleCollapse}
          title={collapsed ? t('nav.expand_sidebar') : t('nav.collapse_sidebar')}
          aria-label={collapsed ? t('nav.expand_sidebar') : t('nav.collapse_sidebar')}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          >
            <polyline points="11 17 6 12 11 7" />
            <polyline points="18 17 13 12 18 7" />
          </svg>
        </button>
        <button
          type="button"
          className="sidebar-mobile-close-btn"
          onClick={onCloseMobile}
          aria-label={t('modal.close')}
        >
          <IconX size={16} />
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="sidebar-menu">
        {/* Group 1: General */}
        <div className="menu-group-label">{t('nav.group_general')}</div>

        <NavLink
          to="/console/dashboard"
          className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
          title={isCompactDesktop ? t('nav.dashboard') : undefined}
          id="nav-link-dashboard"
          onClick={() => onCloseMobile?.()}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          <span>{t('nav.dashboard')}</span>
        </NavLink>

        <NavLink
          to="/console/applications"
          className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
          title={isCompactDesktop ? t('nav.apps') : undefined}
          id="nav-link-applications"
          onClick={() => onCloseMobile?.()}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <span>{t('nav.apps')}</span>
        </NavLink>

        <NavLink
          to="/console/quickstart"
          className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
          title={isCompactDesktop ? t('nav.quickstart') : undefined}
          id="nav-link-quickstart"
          onClick={() => onCloseMobile?.()}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <span>{t('nav.quickstart')}</span>
        </NavLink>

        <NavLink
          to="/console/my-tenant"
          className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
          title={isCompactDesktop ? t('nav.tenants') : undefined}
          id="nav-link-my-tenant"
          onClick={() => onCloseMobile?.()}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>{t('nav.tenants')}</span>
        </NavLink>

        {/* Group 2: System Admin (ADMIN only) */}
        {isAdmin && (
          <>
            <div className="menu-group-label">{t('nav.group_admin')}</div>

            <NavLink
              to="/console/admin/users"
              className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
              title={isCompactDesktop ? t('nav.admin_users') : undefined}
              id="nav-link-admin-users"
              onClick={() => onCloseMobile?.()}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>{t('nav.admin_users')}</span>
            </NavLink>

            <NavLink
              to="/console/admin/tenants"
              className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
              title={isCompactDesktop ? t('nav.admin_tenants') : undefined}
              id="nav-link-admin-tenants"
              onClick={() => onCloseMobile?.()}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              </svg>
              <span>{t('nav.admin_tenants')}</span>
            </NavLink>
          </>
        )}

        {/* Group 3: Account */}
        <div className="menu-group-label">{t('nav.group_account')}</div>

        <NavLink
          to="/console/account"
          className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
          title={isCompactDesktop ? t('nav.account') : undefined}
          id="nav-link-account"
          onClick={() => onCloseMobile?.()}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span>{t('nav.account')}</span>
        </NavLink>
      </nav>

      {/* Bottom User Role Badge */}
      {user && (
        <div className="sidebar-footer">
          <div className={`sidebar-role-badge ${isAdmin ? 'is-admin' : ''}`}>
            {isCompactDesktop ? (
              isAdmin ? <IconShield size={14} ariaLabel="Super Admin" /> : <IconUser size={14} ariaLabel="User" />
            ) : (
              <>
                <span className="role-dot" aria-hidden="true" />
                <span className="role-text">{isAdmin ? 'SUPER ADMIN' : 'USER'}</span>
              </>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
