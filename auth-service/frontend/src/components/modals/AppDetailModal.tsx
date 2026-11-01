import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { applicationsService } from '../../services/applications.service';
import type { Application } from '../../types/application.types';

interface AppDetailModalProps {
  app: Application | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateApp: (updated: Application) => void;
}

type SdkTab = 'env' | 'node' | 'curl';

export const AppDetailModal: React.FC<AppDetailModalProps> = ({
  app,
  isOpen,
  onClose,
  onUpdateApp,
}) => {
  const { t, lang } = useLanguage();
  const { showToast } = useToast();

  const [isTokenMasked, setIsTokenMasked] = useState(true);
  const [activeSdkTab, setActiveSdkTab] = useState<SdkTab>('env');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [adminEmailsInput, setAdminEmailsInput] = useState<string>('');
  const [isSavingEmails, setIsSavingEmails] = useState(false);

  React.useEffect(() => {
    if (app) {
      setAdminEmailsInput((app.adminEmails || []).join(', '));
    }
  }, [app]);

  if (!isOpen || !app) return null;

  const origin = window.location.origin || 'http://localhost:3000';
  const tokenValue = app.appToken || '••••••••••••••••••••••••••••';

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

  const generateSnippet = (tab: SdkTab): string => {
    const rawToken = app.appToken || '<APP_TOKEN>';

    if (tab === 'env') {
      return `# .env (Client Microservice Configuration)
AUTH_SERVICE_URL=${origin}
AUTH_SERVICE_APP_ID=${app.appId}
AUTH_SERVICE_APP_TOKEN=${rawToken}

# Shorthand aliases:
APP_ID=${app.appId}
APP_TOKEN=${rawToken}`;
    }

    if (tab === 'node') {
      return `// Node.js (Axios) Client Microservice Example
// 1. Install Axios: npm install axios
import axios from 'axios';

const authClient = axios.create({
  baseURL: '${origin}',
  headers: {
    'X-App-Id': '${app.appId}',
    'X-App-Token': '${rawToken}',
  },
});

// A. Service Handshake (Check if App credentials are valid & ACTIVE)
async function verifyServiceCredentials() {
  const { data } = await authClient.get('/auth/verify-service');
  console.log('Auth Service Handshake:', data.valid, data.application.status); // true, 'ACTIVE'
  return data;
}

// B. Validate User Bearer JWT Token (User Identity Delegation)
async function validateUserToken(userBearerJwt) {
  const { data: userProfile } = await authClient.get('/users/me', {
    headers: {
      Authorization: \`Bearer \${userBearerJwt}\`,
    },
  });
  console.log('Authenticated User:', userProfile.email, userProfile.role);
  return userProfile;
}`;
    }

    if (tab === 'curl') {
      return `# 1. Verify Service Credentials (Handshake)
curl -X GET "${origin}/auth/verify-service" \\
  -H "X-App-Id: ${app.appId}" \\
  -H "X-App-Token: ${rawToken}"

# 2. Validate Delegated User Bearer JWT
curl -X GET "${origin}/users/me" \\
  -H "X-App-Id: ${app.appId}" \\
  -H "X-App-Token: ${rawToken}" \\
  -H "Authorization: Bearer <USER_JWT_TOKEN>"`;
    }

    return '';
  };

  const handleCopySnippet = () => {
    const snippet = generateSnippet(activeSdkTab);
    navigator.clipboard.writeText(snippet).then(() => {
      setCopyFeedback(true);
      showToast(`${t('toasts.copied')} Snippet (${activeSdkTab.toUpperCase()}) ${t('toasts.to_clipboard')}`);
      setTimeout(() => setCopyFeedback(false), 1800);
    });
  };

  const handleRegenerateToken = async () => {
    const confirmMsg = `${t('toasts.confirm_regenerate')} "${app.name}"?`;
    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      const res = await applicationsService.regenerateToken(app.id);
      const updatedApp: Application = { ...app, appToken: res.appToken };
      onUpdateApp(updatedApp);
      setIsTokenMasked(false);
      showToast(t('toasts.token_regenerated'));
    } catch (err: any) {
      showToast(err.message || 'Failed to regenerate token', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    const newStatus = app.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setActionLoading(true);
    try {
      const updated = await applicationsService.update(app.id, { status: newStatus });
      onUpdateApp({ ...app, status: updated.status });
      showToast(
        `${t('toasts.status_updated')} ${
          newStatus === 'ACTIVE' ? t('table.status_active') : t('table.status_inactive')
        }.`,
      );
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle status', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveAdminEmails = async () => {
    if (!app) return;
    setIsSavingEmails(true);
    try {
      const emailList = adminEmailsInput
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

      // Kiểm tra định dạng email hợp lệ
      const invalidEmails = emailList.filter(
        (e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e),
      );
      if (invalidEmails.length > 0) {
        showToast(
          lang === 'vi'
            ? `Email không đúng định dạng: ${invalidEmails.join(', ')}`
            : `Invalid email format: ${invalidEmails.join(', ')}`,
          'error',
        );
        setIsSavingEmails(false);
        return;
      }

      const updated = await applicationsService.update(app.id, {
        adminEmails: emailList,
      });

      onUpdateApp({ ...app, adminEmails: updated.adminEmails || emailList });
      showToast(
        lang === 'vi'
          ? 'Đã cập nhật danh sách email quản trị viên thành công'
          : 'Admin emails updated successfully',
      );
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi cập nhật email quản trị', 'error');
    } finally {
      setIsSavingEmails(false);
    }
  };

  const isActive = app.status === 'ACTIVE';
  const ownerEmail = app.user?.email || '—';
  const createdDate = app.createdAt
    ? new Date(app.createdAt).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US')
    : '—';

  return (
    <div className="modal-backdrop show" id="app-detail-modal">
      <div className="modal-content" style={{ maxWidth: 600 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <div>
            <h3 className="modal-title" id="detail-app-name">
              {app.name}
            </h3>
            <p className="modal-desc" style={{ marginBottom: 0 }}>
              {t('detail.desc')}
            </p>
          </div>
          <span
            id="detail-app-status"
            className={`status-indicator ${isActive ? 'active' : 'inactive'}`}
          >
            {isActive ? t('table.status_active') : t('table.status_inactive')}
          </span>
        </div>

        {/* App ID Field */}
        <div className="detail-field">
          <div className="detail-field-label">{t('detail.appid_label')}</div>
          <div className="credential-row">
            <span id="detail-app-id" className="credential-value">
              {app.appId}
            </span>
            <div className="credential-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => copyToClipboard(app.appId, 'App ID')}
              >
                {t('detail.copy')}
              </button>
            </div>
          </div>
        </div>

        {/* App Token Field */}
        <div className="detail-field">
          <div className="detail-field-label">{t('detail.token_label')}</div>
          <div className="credential-row">
            <span
              id="detail-app-token"
              className="credential-value"
              data-masked={isTokenMasked ? 'true' : 'false'}
            >
              {isTokenMasked ? '••••••••••••••••••••••••••••' : tokenValue}
            </span>
            <div className="credential-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                id="detail-token-reveal-btn"
                onClick={() => setIsTokenMasked(!isTokenMasked)}
              >
                {isTokenMasked ? t('detail.reveal') : t('detail.hide')}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => copyToClipboard(app.appToken || '', 'App Token')}
              >
                {t('detail.copy')}
              </button>
            </div>
          </div>
          <div className="form-hint">
            {t('detail.token_hint').replace('X-App-Token', '')}
            <code>X-App-Token</code>
          </div>
        </div>

        {/* Meta: Owner and Created At */}
        <div
          className="detail-field"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div>
            <div className="detail-field-label">{t('table.owner')}</div>
            <div id="detail-app-owner" className="detail-field-value">
              {ownerEmail}
            </div>
          </div>
          <div>
            <div className="detail-field-label">{t('table.created')}</div>
            <div id="detail-app-created" className="detail-field-value">
              {createdDate}
            </div>
          </div>
        </div>

        {/* Delegated Admin Emails Field */}
        <div className="detail-field" style={{ marginBottom: 16 }}>
          <div
            className="detail-field-label"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>
              {lang === 'vi'
                ? 'Email Quản Trị Viên Ủy Quyền (OAuth Admin)'
                : 'Delegated Admin Emails (OAuth)'}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              {lang === 'vi' ? 'Phân cách bằng dấu phẩy' : 'Comma-separated'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <input
              type="text"
              id="detail-admin-emails-input"
              className="form-control"
              placeholder={
                lang === 'vi'
                  ? 'Ví dụ: admin@gmail.com, manager@gmail.com'
                  : 'e.g. admin@gmail.com, manager@gmail.com'
              }
              value={adminEmailsInput}
              onChange={(e) => setAdminEmailsInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSaveAdminEmails();
                }
              }}
              style={{
                flex: 1,
                fontSize: '0.85rem',
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid #334155',
                background: '#0f172a',
                color: '#e2e8f0',
              }}
            />
            <button
              type="button"
              className="btn btn-primary btn-sm"
              id="btn-save-admin-emails"
              onClick={handleSaveAdminEmails}
              disabled={actionLoading || isSavingEmails}
              style={{ whiteSpace: 'nowrap' }}
            >
              {isSavingEmails
                ? lang === 'vi'
                  ? 'Đang lưu...'
                  : 'Saving...'
                : lang === 'vi'
                  ? 'Lưu'
                  : 'Save'}
            </button>
          </div>
          <div
            className="form-hint"
            style={{ marginTop: 4, fontSize: '0.75rem', color: '#64748b' }}
          >
            {lang === 'vi'
              ? 'Tài khoản Google/Facebook có email trong danh sách này sẽ tự động nhận quyền ADMIN tại Client Microservice.'
              : 'Google/Facebook accounts with these emails will automatically receive ADMIN role in Client Microservices.'}
          </div>
        </div>

        {/* Microservice SDK Setup & Configuration */}
        <div className="sdk-setup-card">
          <div className="sdk-setup-header">
            <span className="sdk-setup-title">
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
                <polyline points="16 18 22 12 16 6"></polyline>
                <polyline points="8 6 2 12 8 18"></polyline>
              </svg>
              <span>{t('detail.sdk_setup')}</span>
            </span>
            <div className="sdk-tabs">
              <button
                type="button"
                className={`sdk-tab ${activeSdkTab === 'env' ? 'active' : ''}`}
                id="sdk-tab-env"
                onClick={() => setActiveSdkTab('env')}
              >
                .env
              </button>
              <button
                type="button"
                className={`sdk-tab ${activeSdkTab === 'node' ? 'active' : ''}`}
                id="sdk-tab-node"
                onClick={() => setActiveSdkTab('node')}
              >
                Node.js / Axios
              </button>
              <button
                type="button"
                className={`sdk-tab ${activeSdkTab === 'curl' ? 'active' : ''}`}
                id="sdk-tab-curl"
                onClick={() => setActiveSdkTab('curl')}
              >
                cURL
              </button>
            </div>
          </div>

          <p className="sdk-setup-desc">{t('detail.sdk_desc')}</p>

          <div className="code-block-wrapper">
            <pre className="code-snippet-box">
              <code id="sdk-snippet-code">{generateSnippet(activeSdkTab)}</code>
            </pre>
            <button
              type="button"
              className="btn-copy-code"
              onClick={handleCopySnippet}
              title={t('detail.copy_snippet')}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>
                {copyFeedback
                  ? lang === 'vi'
                    ? 'Đã chép!'
                    : 'Copied!'
                  : t('detail.copy_snippet')}
              </span>
            </button>
          </div>
        </div>

        {/* Modal Actions */}
        <div
          className="modal-actions"
          style={{ justifyContent: 'space-between', alignItems: 'center' }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleRegenerateToken}
              disabled={actionLoading}
            >
              {t('detail.regenerate')}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleToggleStatus}
              disabled={actionLoading}
            >
              {t('detail.toggle_status')}
            </button>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
          >
            {t('modal.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
