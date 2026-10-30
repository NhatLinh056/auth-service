import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { providersService } from '../../services/providers.service';
import type { SanitizedOAuthProvider } from '../../types/provider.types';

interface ProviderModalProps {
  applicationId: string | null;
  provider: SanitizedOAuthProvider | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: SanitizedOAuthProvider) => void;
}

export const ProviderModal: React.FC<ProviderModalProps> = ({
  applicationId,
  provider,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t, lang } = useLanguage();
  const { showToast } = useToast();

  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (provider) {
      setClientId(provider.clientId || '');
      setClientSecret('');
      setShowSecret(false);
      setIsEnabled(Boolean(provider.isEnabled));
    }
  }, [provider]);

  if (!isOpen || !provider || !applicationId) return null;

  const isGoogle = provider.provider === 'GOOGLE';
  const providerName = isGoogle ? 'Google' : 'Facebook';
  const callbackUrl =
    provider.callbackUrl ||
    `${window.location.origin}/auth/oauth/${provider.provider.toLowerCase()}/callback`;

  const copyCallback = () => {
    navigator.clipboard
      .writeText(callbackUrl)
      .then(() => {
        showToast(`${t('toasts.copied')} Callback URI ${t('toasts.to_clipboard')}`);
      })
      .catch(() => {
        showToast(t('toasts.copy_fail'), 'error');
      });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: { clientId: string; isEnabled: boolean; clientSecret?: string } = {
        clientId: clientId.trim(),
        isEnabled,
      };
      if (clientSecret.trim()) {
        payload.clientSecret = clientSecret.trim();
      }

      const updated = await providersService.update(
        applicationId,
        provider.provider,
        payload,
      );
      showToast(t('providers.config_saved'));
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to save provider config', 'error');
    } finally {
      setSaving(false);
    }
  };

  const portalHref = isGoogle
    ? 'https://console.cloud.google.com/apis/credentials'
    : 'https://developers.facebook.com/apps/';

  return (
    <div className="modal-backdrop show" id="provider-modal">
      <div className="modal-content" style={{ maxWidth: 600 }}>
        {/* Title & Icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div
            id="modal-provider-icon"
            style={{
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isGoogle ? (
              <svg width="24" height="24" viewBox="0 0 24 24">
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
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            )}
          </div>
          <h3 className="modal-title" id="modal-provider-title" style={{ marginBottom: 0 }}>
            {t('provider_modal.title')}: {providerName}
          </h3>
        </div>
        <p className="modal-desc">{t('provider_modal.desc')}</p>

        {/* Dynamic Provider Developer Portal Link & Concise Instructions */}
        <div
          id="modal-provider-guide-box"
          style={{
            marginBottom: 18,
            padding: '14px 16px',
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <span
              style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-main)' }}
              id="modal-guide-title"
            >
              {isGoogle
                ? lang === 'vi'
                  ? '📋 4 bước lấy Google Client ID & Secret:'
                  : '📋 4 Steps to get Google Client ID & Secret:'
                : lang === 'vi'
                ? '📋 4 bước lấy Facebook App ID & Secret:'
                : '📋 4 Steps to get Facebook App ID & Secret:'}
            </span>
            <a
              href={portalHref}
              target="_blank"
              rel="noreferrer"
              id="modal-provider-portal-link"
              className="btn btn-secondary btn-xs"
              style={{
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontWeight: 600,
                color: '#818cf8',
              }}
            >
              <span>{t('provider_modal.portal_btn')}</span> &nearr;
            </a>
          </div>
          <div
            id="modal-guide-steps"
            style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--text-muted)' }}
          >
            {isGoogle ? (
              lang === 'vi' ? (
                <>
                  1. Mở{' '}
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#818cf8', textDecoration: 'underline' }}
                  >
                    Google Cloud Console &nearr;
                  </a>{' '}
                  &rarr; Chọn hoặc tạo một project.
                  <br />
                  2. Vào{' '}
                  <strong>
                    APIs &amp; Services &rarr; Credentials &rarr; Create Credentials &rarr; OAuth
                    client ID
                  </strong>{' '}
                  (Chọn Application type: <em>Web application</em>).
                  <br />
                  3. Tại mục <strong>Authorized redirect URIs</strong>, bấm Add URI và dán:{' '}
                  <code
                    style={{
                      color: '#cbd5e1',
                      background: 'rgba(0,0,0,0.3)',
                      padding: '1px 4px',
                      borderRadius: 3,
                    }}
                  >
                    {callbackUrl}
                  </code>{' '}
                  (dùng nút Sao Chép bên dưới).
                  <br />
                  4. Sao chép <strong>Client ID</strong> và <strong>Client Secret</strong> dán vào
                  2 ô bên dưới &amp; tích chọn Kích hoạt.
                </>
              ) : (
                <>
                  1. Open{' '}
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#818cf8', textDecoration: 'underline' }}
                  >
                    Google Cloud Console &nearr;
                  </a>{' '}
                  &rarr; Select or create a project.
                  <br />
                  2. Go to{' '}
                  <strong>
                    APIs &amp; Services &rarr; Credentials &rarr; Create Credentials &rarr; OAuth
                    client ID
                  </strong>{' '}
                  (Type: <em>Web application</em>).
                  <br />
                  3. Under <strong>Authorized redirect URIs</strong>, click Add URI and paste:{' '}
                  <code
                    style={{
                      color: '#cbd5e1',
                      background: 'rgba(0,0,0,0.3)',
                      padding: '1px 4px',
                      borderRadius: 3,
                    }}
                  >
                    {callbackUrl}
                  </code>
                  .
                  <br />
                  4. Copy <strong>Client ID</strong> and <strong>Client Secret</strong> into the
                  fields below &amp; check Enable.
                </>
              )
            ) : lang === 'vi' ? (
              <>
                1. Mở{' '}
                <a
                  href="https://developers.facebook.com/apps/"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#818cf8', textDecoration: 'underline' }}
                >
                  Meta for Developers &nearr;
                </a>{' '}
                &rarr; Bấm <strong>Tạo ứng dụng (Create App)</strong>.
                <br />
                2. Thêm sản phẩm{' '}
                <strong>Facebook Login (Đăng nhập bằng Facebook)</strong> &rarr; Cài đặt.
                <br />
                3. Tại ô <strong>Valid OAuth Redirect URIs</strong>, dán đường dẫn:{' '}
                <code
                  style={{
                    color: '#cbd5e1',
                    background: 'rgba(0,0,0,0.3)',
                    padding: '1px 4px',
                    borderRadius: 3,
                  }}
                >
                  {callbackUrl}
                </code>
                .
                <br />
                4. Vào <strong>Cài đặt &rarr; Cơ bản (Settings &rarr; Basic)</strong>, sao chép{' '}
                <strong>App ID</strong> (Client ID) và <strong>App Secret</strong> dán vào bên
                dưới &amp; Bật.
              </>
            ) : (
              <>
                1. Open{' '}
                <a
                  href="https://developers.facebook.com/apps/"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#818cf8', textDecoration: 'underline' }}
                >
                  Meta for Developers &nearr;
                </a>{' '}
                &rarr; Click <strong>Create App</strong>.
                <br />
                2. Add product <strong>Facebook Login</strong> &rarr; Settings.
                <br />
                3. Under <strong>Valid OAuth Redirect URIs</strong>, paste:{' '}
                <code
                  style={{
                    color: '#cbd5e1',
                    background: 'rgba(0,0,0,0.3)',
                    padding: '1px 4px',
                    borderRadius: 3,
                  }}
                >
                  {callbackUrl}
                </code>
                .
                <br />
                4. Go to <strong>App Settings &rarr; Basic</strong>, copy <strong>App ID</strong>{' '}
                (Client ID) and <strong>App Secret</strong> into the fields below &amp; Enable.
              </>
            )}
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">{t('provider_modal.client_id')}</label>
            <input
              type="text"
              className="form-control"
              id="modal-provider-client-id"
              required
              placeholder={t('provider_modal.client_id_placeholder')}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="form-group">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
              }}
            >
              <label className="form-label" style={{ marginBottom: 0 }}>
                {t('provider_modal.client_secret')}
              </label>
              <span
                id="modal-provider-secret-status"
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: provider.hasSecret ? 'var(--success)' : 'var(--text-dim)',
                }}
              >
                {provider.hasSecret
                  ? `✓ ${t('providers.secret_set')}`
                  : `○ ${t('providers.secret_none')}`}
              </span>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showSecret ? 'text' : 'password'}
                className="form-control"
                id="modal-provider-client-secret"
                placeholder={
                  provider.hasSecret
                    ? lang === 'vi'
                      ? '•••••••••••••••• (Để trống nếu giữ nguyên secret cũ)'
                      : '•••••••••••••••• (Leave blank to keep current secret)'
                    : lang === 'vi'
                    ? 'Nhập Client Secret của nhà cung cấp...'
                    : 'Enter client secret from provider...'
                }
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                disabled={saving}
              />
              <button
                type="button"
                id="modal-secret-toggle-btn"
                className="btn-link-action"
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 12,
                }}
                onClick={() => setShowSecret(!showSecret)}
              >
                {showSecret ? t('detail.hide') : t('detail.reveal')}
              </button>
            </div>
            <div className="form-hint">{t('provider_modal.secret_hint')}</div>
          </div>

          <div className="form-group">
            <label className="form-label">{t('provider_modal.callback_label')}</label>
            <div className="credential-row">
              <span
                id="modal-provider-callback"
                className="credential-value"
                style={{ fontSize: 12 }}
              >
                {callbackUrl}
              </span>
              <div className="credential-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={copyCallback}
                >
                  {t('detail.copy')}
                </button>
              </div>
            </div>
          </div>

          <div
            className="form-group"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginTop: 18,
              marginBottom: 0,
            }}
          >
            <input
              type="checkbox"
              id="modal-provider-enabled"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              style={{
                width: 18,
                height: 18,
                accentColor: 'var(--primary)',
                cursor: 'pointer',
              }}
              disabled={saving}
            />
            <label
              htmlFor="modal-provider-enabled"
              style={{ cursor: 'pointer', fontWeight: 500, marginBottom: 0 }}
            >
              {t('provider_modal.enable_label')}
            </label>
          </div>

          <div className="modal-actions" style={{ marginTop: 24 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              {t('modal.cancel')}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              id="modal-provider-save-btn"
              disabled={saving}
            >
              {saving ? '...' : t('modal.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
