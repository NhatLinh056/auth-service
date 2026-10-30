import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import type { Application } from '../../types/application.types';

interface OverviewTabProps {
  applications: Application[];
  onGoToApps: () => void;
  onOpenAppDetail: (app: Application) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  applications,
  onGoToApps,
  onOpenAppDetail,
}) => {
  const { user, isAuthenticated } = useAuth();
  const { t, lang } = useLanguage();
  const { showToast } = useToast();

  const [copiedSnippet, setCopiedSnippet] = useState<number | null>(null);

  const handleCopyCode = (snippetText: string, stepIndex: number) => {
    navigator.clipboard.writeText(snippetText.trim()).then(() => {
      setCopiedSnippet(stepIndex);
      showToast(`${t('toasts.copied')} Snippet ${t('toasts.to_clipboard')}`);
      setTimeout(() => setCopiedSnippet(null), 1800);
    });
  };

  const recentApps = applications.slice(0, 5);

  const snippet1 = `AUTH_SERVICE_URL=http://localhost:3000
AUTH_SERVICE_APP_ID=app_22c57454b00eb44a...
AUTH_SERVICE_APP_TOKEN=apt_789f2a41d0bc8...`;

  const snippet2 = `X-App-Id: app_22c57454b00eb44a...
X-App-Token: apt_789f2a41d0bc8...
Content-Type: application/json`;

  const snippet3 = `HTTP/1.1 200 OK
{
  "valid": true,
  "appId": "app_22c57454...",
  "status": "ACTIVE"
}`;

  return (
    <div className="tab-content active" id="tab-overview">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('overview.title')}</h1>
          <p className="page-subtitle">{t('overview.subtitle')}</p>
        </div>
      </div>

      {/* Quick Metrics Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">{t('overview.apps_label')}</div>
          <div className="stat-value" id="overview-apps-count">
            {applications.length}
          </div>
          <div className="stat-hint">{t('overview.apps_hint')}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">{t('overview.identity_label')}</div>
          <div
            className="stat-value"
            id="overview-user-identity"
            style={{ fontSize: 16, wordBreak: 'break-all' }}
          >
            {isAuthenticated && user ? user.email : t('overview.not_auth')}
          </div>
          <div className="stat-hint" id="overview-user-role">
            {isAuthenticated && user
              ? `${t('overview.role_prefix')}${
                  user.role === 'ADMIN' ? t('table.role_admin') : t('table.role_user')
                }`
              : t('overview.signin_hint')}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">{t('overview.status_label')}</div>
          <div
            className="stat-value"
            style={{
              fontSize: 16,
              color: 'var(--success)',
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

      {/* Service Integration Guide */}
      <div className="integration-card">
        <div className="integration-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span className="guide-badge">Architecture Guide</span>
              <h2 className="section-title" style={{ margin: 0 }}>
                {t('guide.title')}
              </h2>
            </div>
            <p className="section-subtitle">{t('guide.subtitle')}</p>
          </div>
          <div className="status-pill status-pill-success">
            <span className="status-dot"></span>
            <span>{t('guide.ready_pill')}</span>
          </div>
        </div>

        {/* Visual Architectural Flow Diagram */}
        <div className="arch-flow-bar">
          <div className="arch-node">
            <div className="arch-node-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
            </div>
            <div className="arch-node-content">
              <div className="arch-node-title">1. Microservice Client</div>
              <div className="arch-node-desc">Đọc AppID &amp; AppToken từ .env</div>
            </div>
          </div>

          <div className="arch-arrow">
            <span className="arch-arrow-label">HTTP Request + Headers</span>
            <div className="arch-arrow-line">
              <span className="arch-arrow-code">X-App-Id / X-App-Token</span>
              <span className="arch-arrow-tip">&rarr;</span>
            </div>
          </div>

          <div className="arch-node arch-node-center">
            <div className="arch-node-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
            </div>
            <div className="arch-node-content">
              <div className="arch-node-title">2. Auth Service (Port 3000)</div>
              <div className="arch-node-desc">AppAuthGuard đối soát DB PostgreSQL</div>
            </div>
          </div>

          <div className="arch-arrow">
            <span className="arch-arrow-label">Phản Hồi Xác Thực</span>
            <div className="arch-arrow-line">
              <span className="arch-arrow-code" style={{ color: 'var(--success)' }}>
                200 OK (ACTIVE)
              </span>
              <span className="arch-arrow-tip">&rarr;</span>
            </div>
          </div>

          <div className="arch-node arch-node-success">
            <div className="arch-node-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <div className="arch-node-content">
              <div className="arch-node-title">3. Truy Cập Thành Công</div>
              <div className="arch-node-desc">Xử lý nghiệp vụ &amp; dữ liệu</div>
            </div>
          </div>
        </div>

        {/* 3 Step Detailed Cards */}
        <div className="guide-container">
          {/* Step 1 */}
          <div className="guide-step">
            <div className="guide-step-header">
              <span className="guide-step-num">1</span>
              <div>
                <span className="guide-step-title">{t('guide.step1_title')}</span>
                <span className="guide-step-tag">Cấu hình .env</span>
              </div>
            </div>
            <p className="guide-step-desc">{t('guide.step1_desc')}</p>
            <div className="code-snippet-box">
              <div className="code-header">
                <span>.env (Microservice)</span>
                <button
                  type="button"
                  className="btn-copy-code"
                  onClick={() => handleCopyCode(snippet1, 1)}
                >
                  {copiedSnippet === 1 ? (lang === 'vi' ? 'Đã chép!' : 'Copied!') : 'Copy'}
                </button>
              </div>
              <pre className="code-snippet">{snippet1}</pre>
            </div>
          </div>

          {/* Step 2 */}
          <div className="guide-step">
            <div className="guide-step-header">
              <span className="guide-step-num">2</span>
              <div>
                <span className="guide-step-title">{t('guide.step2_title')}</span>
                <span className="guide-step-tag">X-App-Id &amp; X-App-Token</span>
              </div>
            </div>
            <p className="guide-step-desc">{t('guide.step2_desc')}</p>
            <div className="code-snippet-box">
              <div className="code-header">
                <span>HTTP Headers</span>
                <button
                  type="button"
                  className="btn-copy-code"
                  onClick={() => handleCopyCode(snippet2, 2)}
                >
                  {copiedSnippet === 2 ? (lang === 'vi' ? 'Đã chép!' : 'Copied!') : 'Copy'}
                </button>
              </div>
              <pre className="code-snippet">{snippet2}</pre>
            </div>
          </div>

          {/* Step 3 */}
          <div className="guide-step">
            <div className="guide-step-header">
              <span className="guide-step-num">3</span>
              <div>
                <span className="guide-step-title">{t('guide.step3_title')}</span>
                <span className="guide-step-tag">AppAuthGuard</span>
              </div>
            </div>
            <p className="guide-step-desc">{t('guide.step3_desc')}</p>
            <div className="code-snippet-box">
              <div className="code-header">
                <span>Response (200 OK)</span>
                <button
                  type="button"
                  className="btn-copy-code"
                  onClick={() => handleCopyCode(snippet3, 3)}
                >
                  {copiedSnippet === 3 ? (lang === 'vi' ? 'Đã chép!' : 'Copied!') : 'Copy'}
                </button>
              </div>
              <pre className="code-snippet">{snippet3}</pre>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Applications Section */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">{t('overview.recent_title')}</h2>
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
              </tr>
            </thead>
            <tbody id="overview-recent-apps">
              {recentApps.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 24 }}
                  >
                    {t('overview.empty_recent')}
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
                        <span
                          className={`status-indicator ${isActive ? 'active' : 'inactive'}`}
                        >
                          {isActive ? t('table.status_active') : t('table.status_inactive')}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-dim)', fontSize: 12 }}>
                        {createdDate}
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
