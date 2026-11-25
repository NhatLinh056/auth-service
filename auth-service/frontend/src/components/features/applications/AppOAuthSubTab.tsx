import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useToast } from '../../../contexts/ToastContext';
import { providersService } from '../../../services/providers.service';
import { IconAlertTriangle, IconCheck, IconRefresh, IconSettings, IconX } from '../../common/Icons';
import { useModalA11y } from '../../../hooks/useModalA11y';
import type { Application } from '../../../types/application.types';
import type { SanitizedOAuthProvider, UpdateOAuthProviderPayload } from '../../../types/provider.types';

export interface AppOAuthSubTabProps {
  app: Application;
}

// Custom Switch Component with loading state
interface SwitchProps {
  checked: boolean;
  disabled?: boolean;
  loading?: boolean;
  onChange: () => void;
  ariaLabel: string;
  id?: string;
}

const Switch: React.FC<SwitchProps> = ({
  checked,
  disabled = false,
  loading = false,
  onChange,
  ariaLabel,
  id,
}) => {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled || loading}
      onClick={onChange}
      className={`toggle-switch ${checked ? 'toggle-switch--checked' : ''}`}
    >
      <span className="toggle-switch-thumb">
        {loading && <span className="toggle-switch-spinner" aria-hidden="true" />}
      </span>
    </button>
  );
};

export const AppOAuthSubTab: React.FC<AppOAuthSubTabProps> = ({ app }) => {
  const { lang } = useLanguage();
  const { showToast } = useToast();

  const [providers, setProviders] = useState<SanitizedOAuthProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingProvider, setTogglingProvider] = useState<string | null>(null);

  // Configure modal states
  const [configuringProvider, setConfiguringProvider] = useState<SanitizedOAuthProvider | null>(null);
  const [modalClientId, setModalClientId] = useState('');
  const [modalClientSecret, setModalClientSecret] = useState('');
  const [modalShowSecret, setModalShowSecret] = useState(false);
  const [modalIsEnabled, setModalIsEnabled] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const { handleBackdropClick } = useModalA11y(
    Boolean(configuringProvider),
    () => setConfiguringProvider(null),
    isSavingConfig,
  );

  // Load OAuth providers
  const loadProviders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await providersService.findAllByApplication(app.id);
      setProviders(data);
    } catch (err: any) {
      const msg = err?.message || (lang === 'vi' ? 'Lỗi tải danh sách phương thức xác thực' : 'Failed to load sign-in providers');
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [app.id, lang, showToast]);

  useEffect(() => {
    void loadProviders();
  }, [loadProviders]);

  // Handle quick toggle provider from row
  const handleToggle = async (providerKey: string) => {
    if (togglingProvider) return;
    const current = providers.find((p) => p.provider.toUpperCase() === providerKey.toUpperCase());
    const displayName = current?.name || providerKey;

    setTogglingProvider(providerKey);
    try {
      const updated = await providersService.toggle(app.id, providerKey);
      setProviders((prev) =>
        prev.map((p) =>
          p.provider.toUpperCase() === providerKey.toUpperCase() ? updated : p
        )
      );

      showToast(
        lang === 'vi'
          ? `Đã ${updated.isEnabled ? 'bật' : 'tắt'} thành công phương thức ${displayName}.`
          : `Successfully ${updated.isEnabled ? 'enabled' : 'disabled'} ${displayName}.`,
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Lỗi thay đổi trạng thái phương thức OAuth', 'error');
    } finally {
      setTogglingProvider(null);
    }
  };

  // Open Configure Modal and populate form values
  const handleOpenConfigure = (p: SanitizedOAuthProvider) => {
    setConfiguringProvider(p);
    setModalClientId(p.clientId || '');
    setModalClientSecret(p.clientSecret || '');
    setModalShowSecret(false);
    setModalIsEnabled(Boolean(p.isEnabled));
  };

  // Save Provider Configuration from Modal
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configuringProvider) return;

    if (modalIsEnabled && !modalClientId.trim()) {
      showToast(
        lang === 'vi' ? 'Vui lòng nhập Client ID trước khi kích hoạt' : 'Please provide Client ID before enabling',
        'error'
      );
      return;
    }

    if (modalIsEnabled && !modalClientSecret.trim()) {
      showToast(
        lang === 'vi' ? 'Vui lòng nhập Client Secret trước khi kích hoạt' : 'Please provide Client Secret before enabling',
        'error'
      );
      return;
    }

    setIsSavingConfig(true);
    try {
      const payload: UpdateOAuthProviderPayload = {
        clientId: modalClientId.trim(),
        isEnabled: modalIsEnabled,
      };

      if (modalClientSecret.trim()) {
        payload.clientSecret = modalClientSecret.trim();
      }

      const updated = await providersService.update(
        app.id,
        configuringProvider.provider,
        payload
      );

      setProviders((prev) =>
        prev.map((p) =>
          p.provider.toUpperCase() === configuringProvider.provider.toUpperCase() ? updated : p
        )
      );

      showToast(
        lang === 'vi'
          ? `Đã lưu cấu hình ${configuringProvider.name || configuringProvider.provider} thành công.`
          : `Configuration for ${configuringProvider.name || configuringProvider.provider} saved successfully.`,
        'success'
      );

      setConfiguringProvider(null);
    } catch (err: any) {
      showToast(err.message || 'Lỗi lưu cấu hình OAuth Provider', 'error');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const copyCallbackUrl = (url: string) => {
    navigator.clipboard
      .writeText(url)
      .then(() => {
        showToast(lang === 'vi' ? 'Đã sao chép Callback URL vào clipboard' : 'Callback URL copied to clipboard', 'success');
      })
      .catch(() => {
        showToast('Failed to copy Callback URL', 'error');
      });
  };

  const googleProvider = providers.find((p) => p.provider.toUpperCase() === 'GOOGLE');
  const facebookProvider = providers.find((p) => p.provider.toUpperCase() === 'FACEBOOK');

  const isGoogleEnabled = googleProvider ? googleProvider.isEnabled : false;
  const isFacebookEnabled = facebookProvider ? facebookProvider.isEnabled : false;

  const isGoogleToggling = togglingProvider === 'GOOGLE';
  const isFacebookToggling = togglingProvider === 'FACEBOOK';

  const authOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const modalCallbackUrl = configuringProvider?.callbackUrl ||
    `${authOrigin}/auth/oauth/${configuringProvider?.provider.toLowerCase()}/callback`;

  const portalHref = configuringProvider?.provider === 'GOOGLE'
    ? 'https://console.cloud.google.com/apis/credentials'
    : 'https://developers.facebook.com/apps/';

  return (
    <div id="app-view-oauth" className="page-container page-container--narrow" style={{ margin: 0 }}>
      {/* Unified OAuth Card Panel */}
      <div className="card-panel">
        {/* Card Header */}
        <div className="panel-header">
          <div>
            <h2 className="panel-title">
              {lang === 'vi' ? 'Phương Thức Đăng Nhập OAuth 2.0' : 'OAuth 2.0 Sign-in Providers'}
            </h2>
            <p className="card-subtitle">
              {lang === 'vi'
                ? 'Bật hoặc tắt từng phương thức đăng nhập và cấu hình Client ID / Client Secret riêng cho ứng dụng này.'
                : 'Enable, disable, and configure independent Client ID / Secret credentials for this application.'}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="panel-body card-stack">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div className="skeleton-bar" style={{ width: 38, height: 38, borderRadius: 8 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton-bar" style={{ height: 16, width: '35%', marginBottom: 8 }} />
                <div className="skeleton-bar" style={{ height: 12, width: '60%' }} />
              </div>
              <div className="skeleton-bar" style={{ width: 80, height: 30, borderRadius: 6 }} />
              <div className="skeleton-bar" style={{ width: 44, height: 24, borderRadius: 12 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div className="skeleton-bar" style={{ width: 38, height: 38, borderRadius: 8 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton-bar" style={{ height: 16, width: '35%', marginBottom: 8 }} />
                <div className="skeleton-bar" style={{ height: 12, width: '60%' }} />
              </div>
              <div className="skeleton-bar" style={{ width: 80, height: 30, borderRadius: 6 }} />
              <div className="skeleton-bar" style={{ width: 44, height: 24, borderRadius: 12 }} />
            </div>
          </div>
        ) : error ? (
          <div className="panel-body">
            <div className="error-alert" role="alert" id="oauth-providers-error" style={{ marginBottom: 0 }}>
              <div className="error-alert-content">
                <IconAlertTriangle size={16} />
                <span>{error}</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => void loadProviders()}
              >
                <IconRefresh size={13} />
                <span>{lang === 'vi' ? 'Thử lại' : 'Retry'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* 1. Google Row */}
            <div className="provider-row">
              <div className="provider-row-main">
                <div className="provider-brand-box provider-brand-box--google">
                  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                    <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z" />
                    <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z" />
                  </svg>
                </div>

                <div style={{ minWidth: 0 }}>
                  <div className="inline-code-row" style={{ flexWrap: 'wrap', marginBottom: 2 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-main)' }}>Google</span>
                    <span className="badge badge-neutral">OAuth 2.0 PKCE</span>
                    {googleProvider?.hasSecret && (
                      <span className="badge badge-success">
                        <IconCheck size={11} />
                        <span>Secret</span>
                      </span>
                    )}
                  </div>
                  <p className="card-subtitle">
                    {lang === 'vi'
                      ? 'Đăng nhập bảo mật qua Google với luồng xác thực PKCE chuẩn.'
                      : 'Secure sign-in via Google account with standard PKCE authentication flow.'}
                  </p>
                </div>
              </div>

              <div className="provider-row-controls">
                <button
                  type="button"
                  id="btn-config-google"
                  className="btn btn-secondary btn-sm"
                  onClick={() => googleProvider && handleOpenConfigure(googleProvider)}
                >
                  <IconSettings size={13} />
                  <span>{lang === 'vi' ? 'Cấu hình' : 'Configure'}</span>
                </button>

                <div className="provider-divider-v" aria-hidden="true" />

                <div className="inline-code-row" style={{ gap: 10 }}>
                  <Switch
                    id="toggle-oauth-google"
                    checked={isGoogleEnabled}
                    disabled={togglingProvider !== null}
                    loading={isGoogleToggling}
                    onChange={() => handleToggle('GOOGLE')}
                    ariaLabel={lang === 'vi' ? 'Bật hoặc tắt Google OAuth' : 'Toggle Google OAuth'}
                  />

                  <span className={`status-pill ${isGoogleEnabled ? 'status-pill-success' : ''}`}>
                    <span className="status-dot" aria-hidden="true" />
                    <span>
                      {isGoogleEnabled
                        ? (lang === 'vi' ? 'Đang bật' : 'Enabled')
                        : (lang === 'vi' ? 'Đã tắt' : 'Disabled')}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Facebook Row */}
            <div className="provider-row">
              <div className="provider-row-main">
                <div className="provider-brand-box provider-brand-box--facebook">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </div>

                <div style={{ minWidth: 0 }}>
                  <div className="inline-code-row" style={{ flexWrap: 'wrap', marginBottom: 2 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-main)' }}>Facebook</span>
                    <span className="badge badge-neutral">Graph API</span>
                    {facebookProvider?.hasSecret && (
                      <span className="badge badge-success">
                        <IconCheck size={11} />
                        <span>Secret</span>
                      </span>
                    )}
                  </div>
                  <p className="card-subtitle">
                    {lang === 'vi'
                      ? 'Đăng nhập qua Meta Facebook với quyền xác thực email tin cậy.'
                      : 'Sign in via Facebook Meta account with verified email permission.'}
                  </p>
                </div>
              </div>

              <div className="provider-row-controls">
                <button
                  type="button"
                  id="btn-config-facebook"
                  className="btn btn-secondary btn-sm"
                  onClick={() => facebookProvider && handleOpenConfigure(facebookProvider)}
                >
                  <IconSettings size={13} />
                  <span>{lang === 'vi' ? 'Cấu hình' : 'Configure'}</span>
                </button>

                <div className="provider-divider-v" aria-hidden="true" />

                <div className="inline-code-row" style={{ gap: 10 }}>
                  <Switch
                    id="toggle-oauth-facebook"
                    checked={isFacebookEnabled}
                    disabled={togglingProvider !== null}
                    loading={isFacebookToggling}
                    onChange={() => handleToggle('FACEBOOK')}
                    ariaLabel={lang === 'vi' ? 'Bật hoặc tắt Facebook Login' : 'Toggle Facebook Login'}
                  />

                  <span className={`status-pill ${isFacebookEnabled ? 'status-pill-success' : ''}`}>
                    <span className="status-dot" aria-hidden="true" />
                    <span>
                      {isFacebookEnabled
                        ? (lang === 'vi' ? 'Đang bật' : 'Enabled')
                        : (lang === 'vi' ? 'Đã tắt' : 'Disabled')}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Provider Configuration Modal */}
      {configuringProvider && (
        <div
          className="modal-backdrop show"
          id="configure-provider-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="configure-provider-modal-title"
          onClick={handleBackdropClick}
          style={{ zIndex: 1050 }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 540 }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 18,
                paddingBottom: 14,
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {configuringProvider.provider === 'GOOGLE' ? (
                  <svg width="24" height="24" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                    <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z" />
                    <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z" />
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="#1877F2">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                )}
                <div>
                  <h3 id="configure-provider-modal-title" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>
                    {lang === 'vi'
                      ? `Cấu hình ${configuringProvider.name || configuringProvider.provider}`
                      : `Configure ${configuringProvider.name || configuringProvider.provider}`}
                  </h3>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {lang === 'vi' ? 'Thông tin định danh OAuth riêng của ứng dụng' : 'Application-specific OAuth credentials'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                id="btn-close-modal"
                className="btn-icon"
                onClick={() => setConfiguringProvider(null)}
                disabled={isSavingConfig}
                aria-label={lang === 'vi' ? 'Đóng' : 'Close'}
              >
                <IconX size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="card-stack" style={{ gap: 16 }}>
              {/* Developer Console Link banner */}
              <div className="info-banner info-banner--primary" style={{ marginBottom: 0, justifyContent: 'space-between', alignItems: 'center' }}>
                <span>
                  {lang === 'vi'
                    ? 'Lấy Client ID & Secret từ trang quản trị developer:'
                    : 'Get Client ID & Secret from the developer portal:'}
                </span>
                <a
                  href={portalHref}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-link-action"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {configuringProvider.provider === 'GOOGLE' ? 'Google Cloud' : 'Meta Developers'} ↗
                </a>
              </div>

              {/* Client ID field */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="modal-provider-client-id">
                  Client ID <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  id="modal-provider-client-id"
                  className="form-control form-control-mono"
                  required
                  placeholder={
                    configuringProvider.provider === 'GOOGLE'
                      ? 'xxx-yyy.apps.googleusercontent.com'
                      : 'App ID từ Meta Developer Dashboard'
                  }
                  value={modalClientId}
                  onChange={(e) => setModalClientId(e.target.value)}
                  disabled={isSavingConfig}
                />
              </div>

              {/* Client Secret field */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="form-label" htmlFor="modal-provider-client-secret" style={{ marginBottom: 0 }}>
                    Client Secret <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  {modalClientSecret && (
                    <span className="badge badge-success">
                      <IconCheck size={11} />
                      <span>{lang === 'vi' ? 'Đã thiết lập secret' : 'Secret configured'}</span>
                    </span>
                  )}
                </div>

                <div className="password-inline-field">
                  <input
                    type={modalShowSecret ? 'text' : 'password'}
                    id="modal-provider-client-secret"
                    className="password-inline-input password-inline-input--mono"
                    placeholder={
                      lang === 'vi'
                        ? 'Nhập Client Secret của nhà cung cấp...'
                        : 'Enter client secret from provider...'
                    }
                    value={modalClientSecret}
                    onChange={(e) => setModalClientSecret(e.target.value)}
                    disabled={isSavingConfig}
                  />
                  <div className="inline-code-row">
                    <button
                      type="button"
                      id="modal-secret-toggle-btn"
                      className="btn btn-secondary btn-xs"
                      onClick={() => setModalShowSecret(!modalShowSecret)}
                    >
                      {modalShowSecret ? (lang === 'vi' ? 'Ẩn' : 'Hide') : (lang === 'vi' ? 'Hiện' : 'Show')}
                    </button>
                    {modalClientSecret && (
                      <button
                        type="button"
                        id="modal-secret-copy-btn"
                        className="btn btn-secondary btn-xs"
                        onClick={() => {
                          navigator.clipboard.writeText(modalClientSecret);
                          showToast(
                            lang === 'vi'
                              ? 'Đã sao chép Client Secret vào clipboard'
                              : 'Client Secret copied to clipboard',
                            'success'
                          );
                        }}
                      >
                        {lang === 'vi' ? 'Sao chép' : 'Copy'}
                      </button>
                    )}
                  </div>
                </div>
                <div className="form-hint">
                  {lang === 'vi'
                    ? 'Dùng để xác thực an toàn giữa Auth Service và nhà cung cấp OAuth.'
                    : 'Used to securely authenticate between Auth Service and the OAuth provider.'}
                </div>
              </div>

              {/* Callback URL */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="modal-provider-callback">
                  Callback / Redirect URI
                </label>
                <div className="field-copy-box">
                  <span id="modal-provider-callback" className="field-copy-value field-copy-value--accent">
                    {modalCallbackUrl}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    onClick={() => copyCallbackUrl(modalCallbackUrl)}
                  >
                    {lang === 'vi' ? 'Sao chép' : 'Copy'}
                  </button>
                </div>
                <div className="form-hint">
                  {lang === 'vi'
                    ? 'Thêm chính xác URL này vào mục Authorized redirect URIs trên developer console của provider.'
                    : 'Add this exact URL to Authorized redirect URIs in the provider console.'}
                </div>
              </div>

              {/* Checkbox enable provider */}
              <label
                htmlFor="modal-provider-enabled"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  background: 'var(--bg-surface-elevated)',
                  borderRadius: 6,
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                <input
                  type="checkbox"
                  id="modal-provider-enabled"
                  checked={modalIsEnabled}
                  onChange={(e) => setModalIsEnabled(e.target.checked)}
                  disabled={isSavingConfig}
                  style={{ width: 16, height: 16, accentColor: 'var(--primary)' }}
                />
                <span>
                  {lang === 'vi' ? 'Kích hoạt phương thức đăng nhập này cho ứng dụng' : 'Enable this sign-in method for application'}
                </span>
              </label>

              {/* Modal Actions */}
              <div className="modal-actions" style={{ marginTop: 6, paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setConfiguringProvider(null)}
                  disabled={isSavingConfig}
                >
                  {lang === 'vi' ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  id="modal-provider-save-btn"
                  className="btn btn-primary"
                  disabled={isSavingConfig}
                  aria-busy={isSavingConfig}
                >
                  {isSavingConfig && <span className="btn-spinner" aria-hidden="true" />}
                  <span>{isSavingConfig ? (lang === 'vi' ? 'Đang lưu…' : 'Saving…') : (lang === 'vi' ? 'Lưu Cấu Hình' : 'Save Config')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
