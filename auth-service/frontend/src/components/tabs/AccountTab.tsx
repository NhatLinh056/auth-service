import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { accountService, type AccountProfile } from '../../services/account.service';
import { tenantsService, type TenantContext } from '../../services/tenants.service';

export function AccountTab() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const vi = lang === 'vi';
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [tenantContext, setTenantContext] = useState<TenantContext | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean } | null>(null);
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    const load = async () => {
      try {
        const p = await accountService.profile();
        setProfile(p);
      } catch (error) {
        setFeedback({ text: error instanceof Error ? error.message : 'Unable to load account', error: true });
      }

      // Fetch tenant context to display tenant information
      try {
        const ctx = await tenantsService.getMe();
        setTenantContext(ctx);
      } catch {
        // Non-blocking if tenant service fails
      }
    };

    void load();
  }, []);

  const savePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== repeat) {
      setFeedback({ text: vi ? 'Hai mật khẩu mới chưa khớp.' : 'New passwords do not match.', error: true });
      return;
    }
    setBusy('password');
    try {
      await accountService.password(password, current || undefined);
      setCurrent('');
      setPassword('');
      setRepeat('');
      setProfile(await accountService.profile());
      setFeedback({ text: vi ? 'Đã lưu mật khẩu.' : 'Password saved.' });
    } catch (error) {
      setFeedback({ text: error instanceof Error ? error.message : 'Unable to save password', error: true });
    } finally {
      setBusy(null);
    }
  };

  const tenantAffiliation = tenantContext?.tenant?.name
    ? `${tenantContext.tenant.name} (${tenantContext.tenant.id.slice(0, 8)}…)`
    : user?.tenantId
    ? user.tenantId
    : vi
    ? 'Chưa tham gia doanh nghiệp'
    : 'No tenant affiliation';

  return (
    <div className="tab-content active account-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{vi ? 'Tài khoản' : 'Account'}</h1>
          <p className="page-subtitle">
            {vi
              ? 'Quản lý thông tin cá nhân, định danh người dùng và mật khẩu.'
              : 'Manage your personal profile, identities, and password.'}
          </p>
        </div>
      </div>

      {feedback && (
        <div className={`account-feedback ${feedback.error ? 'is-error' : ''}`} role="status">
          {feedback.text}
        </div>
      )}

      {/* Profile Overview */}
      <section className="account-section">
        <div className="account-section-title">
          <span className="account-monogram">
            {(profile?.name || user?.name || user?.email || 'U')[0].toUpperCase()}
          </span>
          <div>
            <h2>{profile?.name || user?.name || (vi ? 'Tài khoản của bạn' : 'Your account')}</h2>
            <p>{profile?.email || user?.email}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
              User ID
            </span>
            <code className="mono-tag" style={{ fontSize: '12px', userSelect: 'all' }}>
              {user?.id || profile?.id || '—'}
            </code>
          </div>

          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
              {vi ? 'Vai trò hệ thống' : 'System Role'}
            </span>
            <span className={`nav-user-role ${user?.role === 'ADMIN' ? 'role-admin' : ''}`}>
              {user?.role === 'ADMIN'
                ? vi
                  ? 'Quản trị viên (ADMIN)'
                  : 'System Admin (ADMIN)'
                : vi
                ? 'Người dùng (USER)'
                : 'Platform User (USER)'}
            </span>
          </div>

          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
              {vi ? 'Doanh nghiệp (Tenant)' : 'Tenant Context'}
            </span>
            <span style={{ fontSize: '13px', color: tenantContext?.tenant ? '#fff' : 'var(--text-muted)', fontWeight: 500 }}>
              {tenantAffiliation}
            </span>
          </div>
        </div>
      </section>

      {/* Password Management */}
      <section className="account-section">
        <h2>{vi ? 'Mật khẩu' : 'Password'}</h2>
        <p className="account-help">
          {profile?.hasPassword
            ? vi
              ? 'Nhập mật khẩu hiện tại trước khi đổi mật khẩu mới.'
              : 'Enter your current password before setting a new one.'
            : vi
            ? 'Tạo mật khẩu cho tài khoản đã được xác minh qua OAuth để đăng nhập trực tiếp.'
            : 'Create a password for your verified OAuth account for direct sign-in.'}
        </p>
        <form className="account-password-form" onSubmit={savePassword}>
          {profile?.hasPassword && (
            <label>
              {vi ? 'Mật khẩu hiện tại' : 'Current password'}
              <input
                type="password"
                autoComplete="current-password"
                required
                maxLength={128}
                value={current}
                onChange={(event) => setCurrent(event.target.value)}
              />
            </label>
          )}
          <label>
            {vi ? 'Mật khẩu mới' : 'New password'}
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label>
            {vi ? 'Nhập lại mật khẩu mới' : 'Confirm new password'}
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              maxLength={128}
              value={repeat}
              onChange={(event) => setRepeat(event.target.value)}
            />
          </label>
          <button className="btn btn-primary" disabled={!profile || Boolean(busy)}>
            {busy === 'password' ? (vi ? 'Đang lưu…' : 'Saving…') : vi ? 'Lưu mật khẩu' : 'Save password'}
          </button>
        </form>
      </section>
    </div>
  );
}
