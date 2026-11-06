import React, { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { applicationsService } from '../../services/applications.service';
import type { Application, ApplicationStatus } from '../../types/application.types';
import type { SanitizedOAuthProvider } from '../../types/provider.types';
import { SelectedAppView } from './SelectedAppView';

interface ApplicationsTabProps {
  applications: Application[];
  loading: boolean;
  onRefresh: () => void;
  onOpenCreateModal: () => void;
  onOpenDetailModal: (app: Application) => void;
  selectedApp?: Application | null;
  onSelectApp?: (app: Application | null) => void;
  onUpdateApp?: (app: Application) => void;
  onOpenConfigureProvider?: (provider: SanitizedOAuthProvider) => void;
}

export const ApplicationsTab: React.FC<ApplicationsTabProps> = ({
  applications,
  loading,
  onRefresh,
  onOpenCreateModal,
  onOpenDetailModal,
  selectedApp,
  onSelectApp,
  onUpdateApp,
  onOpenConfigureProvider,
}) => {
  const { isAuthenticated, user } = useAuth();
  const { t, lang } = useLanguage();
  const { showToast } = useToast();

  const [internalSelectedApp, setInternalSelectedApp] = useState<Application | null>(null);
  const currentSelectedApp = selectedApp !== undefined ? selectedApp : internalSelectedApp;

  const handleSelectApp = (app: Application | null) => {
    if (onSelectApp) onSelectApp(app);
    setInternalSelectedApp(app);
  };

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ApplicationStatus>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name_asc' | 'name_desc'>('newest');

  const filteredApplications = useMemo(() => {
    let list = [...applications];

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((app) => {
        const name = (app.name || '').toLowerCase();
        const appId = (app.appId || '').toLowerCase();
        const owner = (app.user?.email || '').toLowerCase();
        return name.includes(q) || appId.includes(q) || owner.includes(q);
      });
    }

    if (statusFilter !== 'ALL') {
      list = list.filter((app) => app.status === statusFilter);
    }

    list.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'name_desc') return (b.name || '').localeCompare(a.name || '');
      return 0;
    });

    return list;
  }, [applications, search, statusFilter, sortBy]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setSortBy('newest');
  };

  const copyAppId = (appId: string) => {
    navigator.clipboard
      .writeText(appId)
      .then(() => {
        showToast(`${t('toasts.copied')} AppID ${t('toasts.to_clipboard')}`);
      })
      .catch(() => {
        showToast(t('toasts.copy_fail'), 'error');
      });
  };

  const handleToggleStatus = async (app: Application) => {
    const newStatus = app.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await applicationsService.update(app.id, { status: newStatus });
      showToast(
        `${t('toasts.status_updated')} ${
          newStatus === 'ACTIVE' ? t('table.status_active') : t('table.status_inactive')
        }.`,
      );
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to update application status', 'error');
    }
  };

  const handleDelete = async (app: Application) => {
    const confirmMsg = `${t('toasts.confirm_delete')} "${app.name}"?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await applicationsService.delete(app.id);
      showToast(`"${app.name}" ${t('toasts.app_deleted')}`);
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete application', 'error');
    }
  };

  const countBadgeText = t('filter.showing_apps')
    .replace('{count}', String(filteredApplications.length))
    .replace('{total}', String(applications.length));

  if (currentSelectedApp) {
    return (
      <SelectedAppView
        app={currentSelectedApp}
        onBack={() => handleSelectApp(null)}
        onUpdateApp={(updated) => {
          handleSelectApp(updated);
          if (onUpdateApp) onUpdateApp(updated);
          onRefresh();
        }}
        onDeleteApp={(_id) => {
          handleSelectApp(null);
          onRefresh();
        }}
        onOpenConfigureProvider={onOpenConfigureProvider || (() => {})}
      />
    );
  }

  return (
    <div className="tab-content active" id="tab-apps">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('apps.title')}</h1>
          <p className="page-subtitle">{t('apps.subtitle')}</p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onOpenCreateModal}
        >
          {t('apps.create_btn')}
        </button>
      </div>

      {/* Applications Search & Filter Toolbar */}
      <div className="table-toolbar">
        <div className="table-toolbar-left">
          <div className="search-box">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              id="apps-search-input"
              className="search-input"
              placeholder={t('filter.search_apps')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            id="apps-status-filter"
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="ALL">{t('filter.all_statuses')}</option>
            <option value="ACTIVE">{t('filter.status_active')}</option>
            <option value="INACTIVE">{t('filter.status_inactive')}</option>
          </select>

          <select
            id="apps-sort-by"
            className="filter-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="newest">{t('filter.sort_newest')}</option>
            <option value="oldest">{t('filter.sort_oldest')}</option>
            <option value="name_asc">{t('filter.sort_name_asc')}</option>
            <option value="name_desc">{t('filter.sort_name_desc')}</option>
          </select>
        </div>

        <div className="table-toolbar-right">
          <span id="apps-count-badge" className="results-count-badge">
            {countBadgeText}
          </span>
        </div>
      </div>

      {/* Applications Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('table.app_name')}</th>
              <th>{t('table.appid')}</th>
              <th>{t('table.status')}</th>
              <th>{t('table.owner')}</th>
              <th>{t('table.created')}</th>
              <th style={{ textAlign: 'right' }}>{t('table.actions')}</th>
            </tr>
          </thead>
          <tbody id="apps-table-body">
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 32 }}
                >
                  {t('apps.loading')}
                </td>
              </tr>
            ) : !isAuthenticated ? (
              <tr>
                <td
                  colSpan={6}
                  style={{ textAlign: 'center', padding: 36, color: 'var(--text-muted)' }}
                >
                  <p style={{ marginBottom: 12 }}>{t('apps.empty_unauth')}</p>
                </td>
              </tr>
            ) : applications.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  style={{ textAlign: 'center', padding: 36, color: 'var(--text-muted)' }}
                >
                  <p style={{ marginBottom: 12 }}>{t('apps.empty')}</p>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={onOpenCreateModal}
                  >
                    {t('apps.create_btn')}
                  </button>
                </td>
              </tr>
            ) : filteredApplications.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  style={{ textAlign: 'center', padding: 36, color: 'var(--text-muted)' }}
                >
                  <p style={{ marginBottom: 12 }}>{t('filter.no_matches')}</p>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={clearFilters}
                  >
                    {t('filter.clear_filter')}
                  </button>
                </td>
              </tr>
            ) : (
              filteredApplications.map((app) => {
                const isActive = app.status === 'ACTIVE';
                const createdDate = app.createdAt
                  ? new Date(app.createdAt).toISOString().split('T')[0]
                  : '—';
                const ownerEmail = app.user?.email || user?.email || '—';

                return (
                  <tr
                    key={app.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleSelectApp(app)}
                  >
                    <td style={{ fontWeight: 600, color: '#fff' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{app.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--primary, #3b82f6)' }}>
                          {lang === 'vi' ? '(Mở)' : '(Open)'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="mono-tag">
                        <span>{app.appId}</span>
                        <button
                          type="button"
                          className="btn-icon"
                          style={{ width: 20, height: 20 }}
                          title={t('table.copy_appid')}
                          onClick={(e) => {
                            e.stopPropagation();
                            copyAppId(app.appId);
                          }}
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        </button>
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-indicator ${isActive ? 'active' : 'inactive'}`}
                      >
                        {isActive ? t('table.status_active') : t('table.status_inactive')}
                      </span>
                    </td>
                    <td
                      style={{
                        color: 'var(--text-muted)',
                        maxWidth: 170,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={ownerEmail}
                    >
                      {ownerEmail}
                    </td>
                    <td
                      style={{
                        color: 'var(--text-dim)',
                        fontSize: 12,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {createdDate}
                    </td>
                    <td
                      style={{ textAlign: 'right', whiteSpace: 'nowrap' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="app-actions-group">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handleSelectApp(app)}
                          id={`btn-open-app-${app.id}`}
                        >
                          {lang === 'vi' ? 'Quản lý' : 'Manage'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => onOpenDetailModal(app)}
                        >
                          {t('table.details')}
                        </button>
                        <button
                          type="button"
                          className={`btn ${
                            isActive ? 'btn-secondary' : 'btn-success-subtle'
                          } btn-sm`}
                          onClick={() => handleToggleStatus(app)}
                          title={isActive ? t('table.deactivate') : t('table.activate')}
                        >
                          {isActive ? t('table.deactivate') : t('table.activate')}
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(app)}
                        >
                          {t('table.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
