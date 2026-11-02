import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { accountService, type AccountProfile } from '../../services/account.service';

export function AccountTab() {
  const { user, refreshUser } = useAuth();
  const { lang } = useLanguage();
  const vi = lang === 'vi';
  const [profile, setProfile] = useState<AccountProfile | null>(null);
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
      const params = new URLSearchParams(window.location.search);
      const code = params.get('account_code');
      const failure = params.get('account_link_error');
      if (code || failure) window.history.replaceState({}, '', `${window.location.pathname}#account`);
      try {
        if (code) {
          const pending = JSON.parse(sessionStorage.getItem('auth_account_link') || 'null');
          sessionStorage.removeItem('auth_account_link');
          if (!pending?.verifier || pending.userId !== user?.id) {
            throw new Error(vi ? 'Phiên xác nhận không khớp. Hãy liên kết lại từ tài khoản này.' : 'Confirmation session mismatch. Please start linking again.');
          }
          const result = await accountService.complete(code, pending.verifier);
          setProfile(result);
          setFeedback({ text: vi ? 'Đã liên kết tài khoản thành công.' : 'Account linked successfully.' });
          await refreshUser();
        } else {
          if (failure) {
            sessionStorage.removeItem('auth_account_link');
            setFeedback({ text: failure === 'cancelled'
              ? (vi ? 'Bạn đã hủy liên kết tài khoản.' : 'Account linking was cancelled.')
              : (vi ? 'Chưa thể liên kết. Hãy kiểm tra cấu hình OAuth và thử lại.' : 'Unable to link. Check OAuth configuration and try again.'), error: true });
          }
          setProfile(await accountService.profile());
        }
      } catch (error) {
        setFeedback({ text: error instanceof Error ? error.message : 'Unable to load account', error: true });
        try { setProfile(await accountService.profile()); } catch { /* The first error remains visible. */ }
      }
    };
    void load();
  }, []);

  const link = async (provider: string) => {
    if (busy) return;
    setBusy(provider);
    setFeedback({ text: vi ? 'Đang mở trang xác nhận tài khoản…' : 'Opening account confirmation…' });
    try {
      if (!window.crypto?.subtle) throw new Error(vi ? 'Cần dùng HTTPS hoặc localhost để liên kết an toàn.' : 'HTTPS or localhost is required.');
      const verifier = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
      const challenge = btoa(String.fromCharCode(...new Uint8Array(hash))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const result = await accountService.begin(provider, challenge);
      sessionStorage.setItem('auth_account_link', JSON.stringify({ verifier, userId: user?.id }));
      window.location.assign(result.startUrl);
    } catch (error) {
      setFeedback({ text: error instanceof Error ? error.message : 'Unable to link', error: true });
      setBusy(null);
    }
  };

  const savePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== repeat) {
      setFeedback({ text: vi ? 'Hai mật khẩu mới chưa khớp.' : 'New passwords do not match.', error: true });
      return;
    }
    setBusy('password');
    try {
      await accountService.password(password, current || undefined);
      setCurrent(''); setPassword(''); setRepeat('');
      setProfile(await accountService.profile());
      setFeedback({ text: vi ? 'Đã lưu mật khẩu.' : 'Password saved.' });
    } catch (error) { setFeedback({ text: error instanceof Error ? error.message : 'Unable to save password', error: true }); }
    finally { setBusy(null); }
  };

  return <div className="tab-content active account-page">
    <div className="page-header"><div><h1 className="page-title">{vi ? 'Tài khoản' : 'Account'}</h1><p className="page-subtitle">{vi ? 'Quản lý danh tính và các cách đăng nhập của bạn.' : 'Manage your identity and sign-in methods.'}</p></div></div>
    {feedback && <div className={`account-feedback ${feedback.error ? 'is-error' : ''}`} role="status">{feedback.text}</div>}
    <section className="account-section"><div className="account-section-title"><span className="account-monogram">{(profile?.name || user?.email || 'U')[0].toUpperCase()}</span><div><h2>{profile?.name || user?.name || (vi ? 'Tài khoản của bạn' : 'Your account')}</h2><p>{profile?.email || user?.email}</p></div></div></section>
    <section className="account-section"><h2>{vi ? 'Tài khoản đã liên kết' : 'Linked accounts'}</h2><p className="account-help">{vi ? 'Liên kết để dùng cùng một danh tính khi đăng nhập bằng Google hoặc Facebook.' : 'Use the same identity when signing in with Google or Facebook.'}</p>
      {!profile ? <p>{vi ? 'Đang tải…' : 'Loading…'}</p> : <div className="account-providers">{profile.providers.map(item => <div className="account-provider" key={item.provider}>
        <span className={`account-provider-icon ${item.provider}`}>{item.provider === 'google' ? 'G' : 'f'}</span>
        <div className="account-provider-info"><strong>{item.provider === 'google' ? 'Google' : 'Facebook'}</strong><p>{item.accounts.length ? item.accounts.map(account => account.email || (vi ? 'Tài khoản đã xác nhận' : 'Verified account')).join(', ') : vi ? 'Chưa liên kết' : 'Not linked'}</p>
        {!item.configured && !item.accounts.length && <span className="account-help">{vi ? 'Auth Service chưa cấu hình phương thức này.' : 'This method is not configured on Auth Service.'}</span>}</div>
        {item.accounts.length ? <span className="account-linked">{vi ? 'Đã liên kết' : 'Linked'}</span> : <button className="btn btn-secondary btn-sm" disabled={Boolean(busy) || !item.configured} onClick={() => void link(item.provider)}>{busy === item.provider ? (vi ? 'Đang mở…' : 'Opening…') : vi ? 'Liên kết' : 'Link'}</button>}
      </div>)}</div>}
    </section>
    <section className="account-section"><h2>{vi ? 'Mật khẩu' : 'Password'}</h2><p className="account-help">{profile?.hasPassword ? (vi ? 'Nhập mật khẩu hiện tại trước khi đổi mật khẩu.' : 'Enter your current password before setting a new one.') : (vi ? 'Tạo mật khẩu cho tài khoản đã được xác minh qua OAuth.' : 'Create a password for your verified OAuth account.')}</p>
      <form className="account-password-form" onSubmit={savePassword}>
        {profile?.hasPassword && <label>{vi ? 'Mật khẩu hiện tại' : 'Current password'}<input type="password" autoComplete="current-password" required maxLength={128} value={current} onChange={event => setCurrent(event.target.value)} /></label>}
        <label>{vi ? 'Mật khẩu mới' : 'New password'}<input type="password" autoComplete="new-password" required minLength={6} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} /></label>
        <label>{vi ? 'Nhập lại mật khẩu mới' : 'Confirm new password'}<input type="password" autoComplete="new-password" required minLength={6} maxLength={128} value={repeat} onChange={event => setRepeat(event.target.value)} /></label>
        <button className="btn btn-primary" disabled={!profile || Boolean(busy)}>{busy === 'password' ? (vi ? 'Đang lưu…' : 'Saving…') : vi ? 'Lưu mật khẩu' : 'Save password'}</button>
      </form>
    </section>
  </div>;
}
