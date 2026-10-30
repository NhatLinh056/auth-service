import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { StatusPill } from '../common/StatusPill';

export type TabType = 'overview' | 'apps' | 'users' | 'providers';

interface NavbarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange }) => {
  const { user, isAdmin, logout } = useAuth();
  const { t } = useLanguage();

  return (
    <header className="navbar">
      <div className="nav-container">
        <a
          href="#overview"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            onTabChange('overview');
          }}
        >
          <div className="brand-icon">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <span>Auth Service</span>
          <span className="brand-badge">{t('nav.console')}</span>
        </a>

        {/* Navigation Tabs */}
        <nav className="nav-center">
          <button
            type="button"
            className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
            id="tab-btn-overview"
            onClick={() => onTabChange('overview')}
          >
            {t('nav.overview')}
          </button>
          <button
            type="button"
            className={`nav-tab ${activeTab === 'apps' ? 'active' : ''}`}
            id="tab-btn-apps"
            onClick={() => onTabChange('apps')}
          >
            {t('nav.apps')}
          </button>
          {isAdmin && (
            <button
              type="button"
              className={`nav-tab ${activeTab === 'users' ? 'active' : ''}`}
              id="tab-btn-users"
              onClick={() => onTabChange('users')}
            >
              {t('nav.users')}
            </button>
          )}
          <button
            type="button"
            className={`nav-tab ${activeTab === 'providers' ? 'active' : ''}`}
            id="tab-btn-providers"
            onClick={() => onTabChange('providers')}
          >
            {t('nav.providers')}
          </button>
        </nav>

        {/* Right Header Actions */}
        <div className="nav-right">
          <LanguageSwitcher idPrefix="nav" />
          <StatusPill label={t('nav.api_online')} />

          {user && (
            <div id="user-badge" className="nav-user">
              <div>
                <div id="user-email-display" className="nav-user-email">
                  {user.email}
                </div>
                <span
                  id="user-role-display"
                  className={`nav-user-role ${user.role === 'ADMIN' ? 'role-admin' : ''}`}
                >
                  {user.role === 'ADMIN' ? t('table.role_admin') : t('table.role_user')}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={logout}
              >
                {t('nav.logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
