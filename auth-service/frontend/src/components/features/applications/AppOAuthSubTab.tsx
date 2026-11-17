import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useToast } from '../../../contexts/ToastContext';
import { providersService } from '../../../services/providers.service';
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
      style={{
        position: 'relative',
        width: 44,
        height: 24,
        borderRadius: 12,
        background: checked ? 'var(--primary, #4f46e5)' : 'var(--border-subtle, #334155)',
        border: 'none',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        transition: 'background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        padding: 0,
        outline: 'none',
        opacity: disabled ? 0.6 : 1,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: checked ? 22 : 2,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#ffffff',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
          transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {loading && (
          <span
            style={{
              width: 10,
              height: 10,
              border: '2px solid rgba(79, 70, 229, 0.4)',
              borderTopColor: 'var(--primary, #4f46e5)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
        )}
      </span>
    </button>
  );
};

export const AppOAuthSubTab: React.FC<AppOAuthSubTabProps> = ({ app }) => {
  const { lang } = useLanguage();
  const { showToast } = useToast();

  const [providers, setProviders] = useState<SanitizedOAuthProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingProvider, setTogglingProvider] = useState<string | null>(null);

  // Configure modal states
  const [configuringProvider, setConfiguringProvider] = useState<SanitizedOAuthProvider | null>(null);
  const [modalClientId, setModalClientId] = useState('');
  const [modalClientSecret, setModalClientSecret] = useState('');
  const [modalShowSecret, setModalShowSecret] = useState(false);
  const [modalIsEnabled, setModalIsEnabled] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Load OAuth providers
  const loadProviders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await providersService.findAllByApplication(app.id);
      setProviders(data);
    } catch (err: any) {
      showToast(err.message || 'Lỗi tải danh sách phương thức xác thực', 'error');
    } finally {
      setLoading(false);
    }
  }, [app.id, showToast]);

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
    <div id="app-view-oauth" style={{ width: '100%', maxWidth: 840 }}>
      {/* Unified OAuth Card Panel */}
      <div
        className="card"
        style={{
          background: 'var(--bg-surface, #111827)',
          border: '1px solid var(--border-subtle, #1e293b)',
          borderRadius: 8,
          overflow: 'hidden',
          marginBottom: 24,
        }}
      >
        {/* Card Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-subtle, #1e293b)',
          }}
        >
          <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#fff' }}>
            {lang === 'vi' ? 'Phương Thức Đăng Nhập OAuth 2.0' : 'OAuth 2.0 Sign-in Providers'}
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted, #94a3b8)', lineHeight: 1.4 }}>
            {lang === 'vi'
              ? 'Bật hoặc tắt từng phương thức đăng nhập và cấu hình Client ID / Client Secret riêng cho ứng dụng này.'
              : 'Enable, disable, and configure independent Client ID / Secret credentials for this application.'}
          </p>
        </div>

        {loading ? (
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div className="skeleton-bar" style={{ width: 38, height: 38, borderRadius: 8 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton-bar" style={{ height: 16, width: '35%', marginBottom: 8 }} />
                  <div className="skeleton-bar" style={{ height: 12, width: '60%' }} />
                </div>
                <div className="skeleton-bar" style={{ width: 80, height: 30, borderRadius: 6 }} />
                <div className="skeleton-bar" style={{ width: 44, height: 24, borderRadius: 12 }} />
              </div>
              <div style={{ height: 1, background: 'var(--border-subtle, #1e293b)' }} />
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
          </div>
        ) : (
          <div>
            {/* 1. Google Row */}
            <div
              style={{
                padding: '18px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
              }}
            >
              {/* Left: Brand Icon + Title + Description */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 8,
                    background: 'rgba(234, 67, 53, 0.08)',
                    border: '1px solid rgba(234, 67, 53, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                    <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z" />
                    <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z" />
                  </svg>
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>Google</span>
                    <span
                      className="badge"
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        padding: '2px 7px',
                        borderRadius: 4,
                        background: 'var(--bg-card, #1e293b)',
                        color: 'var(--text-dim, #94a3b8)',
                        border: '1px solid var(--border-subtle, #334155)',
                      }}
                    >
                      OAuth 2.0 PKCE
                    </span>
                    {googleProvider?.hasSecret && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          padding: '1px 6px',
                          borderRadius: 4,
                          background: 'rgba(16, 185, 129, 0.1)',
                          color: 'var(--success, #10b981)',
                          border: '1px solid rgba(16, 185, 129, 0.25)',
                        }}
                      >
                        ✓ Secret
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted, #94a3b8)', lineHeight: 1.4 }}>
                    {lang === 'vi'
                      ? 'Đăng nhập bảo mật qua Google với luồng xác thực PKCE chuẩn.'
                      : 'Secure sign-in via Google account with standard PKCE authentication flow.'}
                  </p>
                </div>
              </div>

              {/* Right: Balanced Action Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                {/* 1. Configure button */}
                <button
                  type="button"
                  id="btn-config-google"
                  className="btn btn-secondary btn-sm"
                  onClick={() => googleProvider && handleOpenConfigure(googleProvider)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 12,
                    padding: '0 12px',
                    height: 30,
                    boxSizing: 'border-box',
                    borderRadius: 6,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                  <span>{lang === 'vi' ? 'Cấu hình' : 'Configure'}</span>
                </button>

                {/* Divider */}
                <div style={{ width: 1, height: 18, background: 'var(--border-subtle, #334155)' }} />

                {/* 2. Toggle Switch + Status Label */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                  <Switch
                    id="toggle-oauth-google"
                    checked={isGoogleEnabled}
                    disabled={togglingProvider !== null}
                    loading={isGoogleToggling}
                    onChange={() => handleToggle('GOOGLE')}
                    ariaLabel={lang === 'vi' ? 'Bật hoặc tắt Google OAuth' : 'Toggle Google OAuth'}
                  />

                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      height: 30,
                      boxSizing: 'border-box',
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '0 10px',
                      borderRadius: 15,
                      background: isGoogleEnabled ? 'rgba(16, 185, 129, 0.12)' : 'rgba(100, 116, 139, 0.15)',
                      color: isGoogleEnabled ? 'var(--success, #10b981)' : 'var(--text-dim, #94a3b8)',
                      border: isGoogleEnabled ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(100, 116, 139, 0.25)',
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: isGoogleEnabled ? 'var(--success, #10b981)' : 'var(--text-dim, #64748b)',
                      }}
                    />
                    {isGoogleEnabled
                      ? (lang === 'vi' ? 'Đang bật' : 'Enabled')
                      : (lang === 'vi' ? 'Đã tắt' : 'Disabled')}
                  </span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'var(--border-subtle, #1e293b)' }} />

            {/* 2. Facebook Row */}
            <div
              style={{
                padding: '18px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
              }}
            >
              {/* Left: Brand Icon + Title + Description */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 8,
                    background: 'rgba(24, 119, 242, 0.08)',
                    border: '1px solid rgba(24, 119, 242, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>Facebook</span>
                    <span
                      className="badge"
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        padding: '2px 7px',
                        borderRadius: 4,
                        background: 'var(--bg-card, #1e293b)',
                        color: 'var(--text-dim, #94a3b8)',
                        border: '1px solid var(--border-subtle, #334155)',
                      }}
                    >
                      Graph API
                    </span>
                    {facebookProvider?.hasSecret && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          padding: '1px 6px',
                          borderRadius: 4,
                          background: 'rgba(16, 185, 129, 0.1)',
                          color: 'var(--success, #10b981)',
                          border: '1px solid rgba(16, 185, 129, 0.25)',
                        }}
                      >
                        ✓ Secret
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted, #94a3b8)', lineHeight: 1.4 }}>
                    {lang === 'vi'
                      ? 'Đăng nhập qua Meta Facebook với quyền xác thực email tin cậy.'
                      : 'Sign in via Facebook Meta account with verified email permission.'}
                  </p>
                </div>
              </div>

              {/* Right: Balanced Action Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                {/* 1. Configure button */}
                <button
                  type="button"
                  id="btn-config-facebook"
                  className="btn btn-secondary btn-sm"
                  onClick={() => facebookProvider && handleOpenConfigure(facebookProvider)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 12,
                    padding: '0 12px',
                    height: 30,
                    boxSizing: 'border-box',
                    borderRadius: 6,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                  <span>{lang === 'vi' ? 'Cấu hình' : 'Configure'}</span>
                </button>

                {/* Divider */}
                <div style={{ width: 1, height: 18, background: 'var(--border-subtle, #334155)' }} />

                {/* 2. Toggle Switch + Status Label */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                  <Switch
                    id="toggle-oauth-facebook"
                    checked={isFacebookEnabled}
                    disabled={togglingProvider !== null}
                    loading={isFacebookToggling}
                    onChange={() => handleToggle('FACEBOOK')}
                    ariaLabel={lang === 'vi' ? 'Bật hoặc tắt Facebook Login' : 'Toggle Facebook Login'}
                  />

                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      height: 30,
                      boxSizing: 'border-box',
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '0 10px',
                      borderRadius: 15,
                      background: isFacebookEnabled ? 'rgba(16, 185, 129, 0.12)' : 'rgba(100, 116, 139, 0.15)',
                      color: isFacebookEnabled ? 'var(--success, #10b981)' : 'var(--text-dim, #94a3b8)',
                      border: isFacebookEnabled ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(100, 116, 139, 0.25)',
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: isFacebookEnabled ? 'var(--success, #10b981)' : 'var(--text-dim, #64748b)',
                      }}
                    />
                    {isFacebookEnabled
                      ? (lang === 'vi' ? 'Đang bật' : 'Enabled')
                      : (lang === 'vi' ? 'Đã tắt' : 'Disabled')}
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
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: 16,
          }}
        >
          <div
            className="modal-content"
            style={{
              background: 'var(--bg-surface, #111827)',
              border: '1px solid var(--border-subtle, #1e293b)',
              borderRadius: 10,
              width: '100%',
              maxWidth: 540,
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 18,
                paddingBottom: 14,
                borderBottom: '1px solid var(--border-subtle, #1e293b)',
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
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff' }}>
                    {lang === 'vi'
                      ? `Cấu hình ${configuringProvider.name || configuringProvider.provider}`
                      : `Configure ${configuringProvider.name || configuringProvider.provider}`}
                  </h3>
                  <div style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)', marginTop: 2 }}>
                    {lang === 'vi' ? 'Thông tin định danh OAuth riêng của ứng dụng' : 'Application-specific OAuth credentials'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                id="btn-close-modal"
                onClick={() => setConfiguringProvider(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted, #94a3b8)',
                  fontSize: 18,
                  cursor: 'pointer',
                  padding: 4,
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModal} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Developer Console Link banner */}
              <div
                style={{
                  padding: '10px 14px',
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.2)',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 12, color: '#38bdf8', lineHeight: 1.4 }}>
                  {lang === 'vi'
                    ? `Lấy Client ID & Secret từ trang quản trị developer:`
                    : `Get Client ID & Secret from the developer portal:`}
                </span>
                <a
                  href={portalHref}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#38bdf8',
                    textDecoration: 'underline',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {configuringProvider.provider === 'GOOGLE' ? 'Google Cloud' : 'Meta Developers'} ↗
                </a>
              </div>

              {/* Client ID field */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 6, display: 'block' }}>
                  Client ID <span style={{ color: 'var(--danger, #ef4444)' }}>*</span>
                </label>
                <input
                  type="text"
                  id="modal-provider-client-id"
                  className="form-control"
                  required
                  placeholder={
                    configuringProvider.provider === 'GOOGLE'
                      ? 'xxx-yyy.apps.googleusercontent.com'
                      : 'App ID từ Meta Developer Dashboard'
                  }
                  value={modalClientId}
                  onChange={(e) => setModalClientId(e.target.value)}
                  disabled={isSavingConfig}
                  style={{
                    width: '100%',
                    height: 36,
                    fontSize: 13,
                    fontFamily: 'monospace',
                    background: 'var(--bg-input, #0f172a)',
                    border: '1px solid var(--border-medium, #334155)',
                    color: '#fff',
                    borderRadius: 6,
                    padding: '0 12px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Client Secret field */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="form-label" style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: 0 }}>
                    Client Secret <span style={{ color: 'var(--danger, #ef4444)' }}>*</span>
                  </label>
                  {modalClientSecret ? (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--success, #10b981)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      ✓ {lang === 'vi' ? 'Đã thiết lập secret' : 'Secret configured'}
                    </span>
                  ) : null}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'var(--bg-input, #0f172a)',
                    border: '1px solid var(--border-medium, #334155)',
                    borderRadius: 6,
                    padding: '0 8px 0 12px',
                    height: 36,
                    boxSizing: 'border-box',
                  }}
                >
                  <input
                    type={modalShowSecret ? 'text' : 'password'}
                    id="modal-provider-client-secret"
                    placeholder={
                      lang === 'vi'
                        ? 'Nhập Client Secret của nhà cung cấp...'
                        : 'Enter client secret from provider...'
                    }
                    value={modalClientSecret}
                    onChange={(e) => setModalClientSecret(e.target.value)}
                    disabled={isSavingConfig}
                    style={{
                      flex: 1,
                      height: '100%',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      fontSize: 13,
                      fontFamily: 'monospace',
                      color: '#fff',
                      padding: 0,
                    }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <button
                      type="button"
                      id="modal-secret-toggle-btn"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setModalShowSecret(!modalShowSecret)}
                      style={{ height: 26, fontSize: 11, padding: '0 8px', whiteSpace: 'nowrap' }}
                    >
                      {modalShowSecret ? (lang === 'vi' ? 'Ẩn' : 'Hide') : (lang === 'vi' ? 'Hiện' : 'Show')}
                    </button>
                    {modalClientSecret && (
                      <button
                        type="button"
                        id="modal-secret-copy-btn"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          navigator.clipboard.writeText(modalClientSecret);
                          showToast(
                            lang === 'vi'
                              ? 'Đã sao chép Client Secret vào clipboard'
                              : 'Client Secret copied to clipboard',
                            'success'
                          );
                        }}
                        style={{ height: 26, fontSize: 11, padding: '0 8px', whiteSpace: 'nowrap' }}
                      >
                        {lang === 'vi' ? 'Sao chép' : 'Copy'}
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim, #64748b)', marginTop: 4 }}>
                  {lang === 'vi'
                    ? 'Dùng để xác thực an toàn giữa Auth Service và nhà cung cấp OAuth.'
                    : 'Used to securely authenticate between Auth Service and the OAuth provider.'}
                </div>
              </div>

              {/* Callback URL */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 6, display: 'block' }}>
                  Callback / Redirect URI
                </label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: 'var(--bg-input, #0f172a)',
                    border: '1px solid var(--border-subtle, #1e293b)',
                    borderRadius: 6,
                    padding: '6px 10px',
                    gap: 8,
                  }}
                >
                  <span
                    id="modal-provider-callback"
                    style={{
                      flex: 1,
                      fontSize: 12,
                      fontFamily: 'monospace',
                      color: '#38bdf8',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {modalCallbackUrl}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => copyCallbackUrl(modalCallbackUrl)}
                    style={{ height: 26, fontSize: 11, padding: '0 8px', flexShrink: 0 }}
                  >
                    {lang === 'vi' ? 'Sao chép' : 'Copy'}
                  </button>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim, #64748b)', marginTop: 4 }}>
                  {lang === 'vi'
                    ? 'Thêm chính xác URL này vào mục Authorized redirect URIs trên developer console của provider.'
                    : 'Add this exact URL to Authorized redirect URIs in the provider console.'}
                </div>
              </div>

              {/* Checkbox enable provider */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  background: 'rgba(15, 23, 42, 0.4)',
                  borderRadius: 6,
                  border: '1px solid var(--border-subtle, #1e293b)',
                }}
              >
                <input
                  type="checkbox"
                  id="modal-provider-enabled"
                  checked={modalIsEnabled}
                  onChange={(e) => setModalIsEnabled(e.target.checked)}
                  disabled={isSavingConfig}
                  style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--primary, #4f46e5)' }}
                />
                <label htmlFor="modal-provider-enabled" style={{ fontSize: 13, fontWeight: 500, color: '#fff', cursor: 'pointer', margin: 0 }}>
                  {lang === 'vi' ? 'Kích hoạt phương thức đăng nhập này cho ứng dụng' : 'Enable this sign-in method for application'}
                </label>
              </div>

              {/* Modal Actions */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 10,
                  marginTop: 10,
                  paddingTop: 14,
                  borderTop: '1px solid var(--border-subtle, #1e293b)',
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setConfiguringProvider(null)}
                  disabled={isSavingConfig}
                  style={{ height: 34, fontSize: 13 }}
                >
                  {lang === 'vi' ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  id="modal-provider-save-btn"
                  className="btn btn-primary"
                  disabled={isSavingConfig}
                  style={{ height: 34, fontSize: 13, minWidth: 110 }}
                >
                  {isSavingConfig ? '...' : (lang === 'vi' ? 'Lưu Cấu Hình' : 'Save Config')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
