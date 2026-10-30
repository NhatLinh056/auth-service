import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { providersService } from '../../services/providers.service';
import type { Application } from '../../types/application.types';
import type { SanitizedOAuthProvider } from '../../types/provider.types';

interface ProvidersTabProps {
  applications: Application[];
  selectedAppId: string | null;
  onSelectApp: (appId: string) => void;
  providers: SanitizedOAuthProvider[];
  loading: boolean;
  onRefresh: () => void;
  onOpenConfigure: (provider: SanitizedOAuthProvider) => void;
  onOpenAppDetail: (app: Application) => void;
}

export const ProvidersTab: React.FC<ProvidersTabProps> = ({
  applications,
  selectedAppId,
  onSelectApp,
  providers,
  loading,
  onRefresh,
  onOpenConfigure,
  onOpenAppDetail,
}) => {
  const { t } = useLanguage();
  const { showToast } = useToast();

  const [appSearch, setAppSearch] = useState('');
  const [toggleLoading, setToggleLoading] = useState<string | null>(null);

  // Filter applications for the dropdown
  const filteredApps = useMemo(() => {
    const q = appSearch.trim().toLowerCase();
    let list = [...applications];
    if (q) {
      list = list.filter(
        (a) =>
          (a.name || '').toLowerCase().includes(q) ||
          (a.appId || '').toLowerCase().includes(q),
      );
    }
    list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return list;
  }, [applications, appSearch]);

  const currentApp = applications.find((a) => a.id === selectedAppId);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        showToast(`${t('toasts.copied')} ${label} ${t('toasts.to_clipboard')}`);
      })
      .catch(() => {
        showToast(t('toasts.copy_fail'), 'error');
      });
  };

  const handleToggle = async (provider: SanitizedOAuthProvider) => {
    if (!selectedAppId) return;
    setToggleLoading(provider.provider);
    try {
      const updated = await providersService.toggle(selectedAppId, provider.provider);
      showToast(
        `${t('providers.toggle_success')} (${updated.provider}: ${
          updated.isEnabled ? t('providers.status_enabled') : t('providers.status_disabled')
        })`,
      );
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle provider', 'error');
    } finally {
      setToggleLoading(null);
    }
  };

  return (
    <div className="tab-content active" id="tab-providers">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('providers.title')}</h1>
          <p className="page-subtitle">{t('providers.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="status-pill">
            <span className="status-dot"></span>
            <span>{t('providers.oauth_ready')}</span>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onRefresh}
            disabled={loading}
          >
            {t('users.refresh')}
          </button>
        </div>
      </div>

      {/* Application Context Selector Panel */}
      <div className="app-context-panel">
        <div className="app-context-header">
          <div className="app-context-title-group">
            <div className="app-context-icon">
              <svg
                width="18"
                height="18"
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
            <div>
              <div className="app-context-label">{t('providers.target_app_label')}</div>
              <div className="app-context-sublabel">{t('providers.target_app_sublabel')}</div>
            </div>
          </div>
          <span id="providers-app-count-hint" className="app-context-count">
            {applications.length > 0 &&
              `(${filteredApps.length}/${applications.length} ${t('filter.apps_unit')})`}
          </span>
        </div>

        {/* Application Context Controls (Grid: Search + Select Dropdown) */}
        <div className="app-context-controls-grid">
          <div className="search-box app-search-box">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              id="providers-app-search"
              className="search-input"
              placeholder={t('filter.filter_apps_select')}
              value={appSearch}
              onChange={(e) => setAppSearch(e.target.value)}
            />
          </div>
          <div className="app-select-wrapper">
            <select
              id="providers-app-select"
              className="form-control app-select-input"
              value={selectedAppId || ''}
              onChange={(e) => onSelectApp(e.target.value)}
            >
              {applications.length === 0 ? (
                <option value="">-- {t('providers.no_apps')} --</option>
              ) : filteredApps.length === 0 ? (
                <option value="">-- {t('filter.no_matches')} --</option>
              ) : (
                filteredApps.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Dedicated Application Context Meta Bar */}
        {currentApp && (
          <div id="providers-app-meta" className="app-context-meta-bar">
            <div className="app-meta-pill-group">
              <span
                className={`status-indicator ${
                  currentApp.status === 'ACTIVE' ? 'active' : 'inactive'
                }`}
              >
                {currentApp.status === 'ACTIVE'
                  ? t('table.status_active')
                  : t('table.status_inactive')}
              </span>
              <div className="app-id-pill" title={`AppID: ${currentApp.appId}`}>
                <span className="app-id-label">AppID:</span>
                <span className="app-id-code">
                  {currentApp.appId.slice(0, 10)}...{currentApp.appId.slice(-6)}
                </span>
                <button
                  type="button"
                  className="btn-icon-xs"
                  onClick={() => copyToClipboard(currentApp.appId, 'AppID')}
                  title={t('table.copy_appid')}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-xs"
              onClick={() => onOpenAppDetail(currentApp)}
            >
              {t('table.details')}
            </button>
          </div>
        )}
      </div>

      {/* Providers Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('providers.table_provider')}</th>
              <th>{t('table.status')}</th>
              <th>{t('providers.table_client_id')}</th>
              <th>{t('providers.table_secret')}</th>
              <th>{t('providers.table_callback')}</th>
              <th style={{ textAlign: 'right' }}>{t('table.actions')}</th>
            </tr>
          </thead>
          <tbody id="providers-table-body">
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 32 }}
                >
                  {t('providers.loading')}
                </td>
              </tr>
            ) : applications.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 32 }}
                >
                  {t('providers.no_apps')}
                </td>
              </tr>
            ) : providers.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 32 }}
                >
                  {t('providers.not_configured')}
                </td>
              </tr>
            ) : (
              providers.map((p) => {
                const isGoogle = p.provider === 'GOOGLE';
                const providerName = isGoogle ? 'Google' : 'Facebook';
                const callbackUrl =
                  p.callbackUrl ||
                  `${window.location.origin}/auth/oauth/${p.provider.toLowerCase()}/callback`;

                return (
                  <tr key={p.provider}>
                    <td>
                      <div className="provider-row-title">
                        {isGoogle ? (
                          <svg width="20" height="20" viewBox="0 0 24 24">
                            <path
                              fill="#4285F4"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                            />
                          </svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                          </svg>
                        )}
                        <span>{providerName}</span>
                      </div>
                    </td>
                    <td>
                      {p.isEnabled ? (
                        <span className="provider-badge badge-enabled">
                          {t('providers.status_enabled')}
                        </span>
                      ) : (
                        <span className="provider-badge badge-disabled">
                          {t('providers.status_disabled')}
                        </span>
                      )}
                    </td>
                    <td
                      style={{
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {p.clientId ? (
                        <code style={{ fontSize: 12, color: 'var(--text-main)' }}>
                          {p.clientId}
                        </code>
                      ) : (
                        <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>
                          {t('providers.not_configured')}
                        </span>
                      )}
                    </td>
                    <td>
                      {p.hasSecret ? (
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 11,
                            color: 'var(--success)',
                          }}
                        >
                          ●●●●●●●● ({t('providers.secret_set')})
                        </span>
                      ) : (
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 11,
                            color: 'var(--text-dim)',
                          }}
                        >
                          {t('providers.secret_none')}
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <code style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {callbackUrl}
                        </code>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => copyToClipboard(callbackUrl, 'Callback URL')}
                          style={{ padding: '2px 8px', fontSize: 11 }}
                        >
                          {t('detail.copy')}
                        </button>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => onOpenConfigure(p)}
                        >
                          {t('providers.configure')}
                        </button>
                        <button
                          type="button"
                          className={`btn ${
                            p.isEnabled ? 'btn-secondary' : 'btn-primary'
                          } btn-sm`}
                          onClick={() => handleToggle(p)}
                          disabled={toggleLoading === p.provider}
                        >
                          {p.isEnabled ? t('providers.disable') : t('providers.enable')}
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
