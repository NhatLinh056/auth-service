import React, { useEffect, useRef, useState } from 'react';
import { apiClient } from '../../services/api.client';
import { authService } from '../../services/auth.service';
import { useAuth } from '../../contexts/AuthContext';
import type { AuthResponse } from '../../types/auth.types';

type Details = { appName: string; destination: string; providers: { provider: string; name: string; enabled: boolean }[] };
type Result = AuthResponse & { redirectUrl: string };

export const ClientSignIn: React.FC<{ flowId: string }> = ({ flowId }) => {
  const { user, token } = useAuth();
  const [details, setDetails] = useState<Details | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [register, setRegister] = useState(false);
  const [needsProof, setNeedsProof] = useState(false);
  const callbackStarted = useRef(false);
  const pending = useRef<{ code: string; verifier: string } | null>(null);
  const path = `/auth/flows/${encodeURIComponent(flowId)}`;

  const finish = (result: Result) => {
    localStorage.setItem('auth_token', result.accessToken);
    localStorage.setItem('auth_user', JSON.stringify(result.user));
    sessionStorage.removeItem(`signin_${flowId}`);
    window.location.assign(result.redirectUrl);
  };
  const post = <T,>(suffix: string, body: object) => apiClient<T>(`${path}${suffix}`, { method: 'POST', body: JSON.stringify(body) });

  const completeOAuth = async (proof: { password?: string; linkToken?: string } = {}) => {
    if (!pending.current) return;
    setBusy(true); setError('');
    try { finish(await post<Result>('/oauth/complete', { ...pending.current, ...proof })); }
    catch (err: any) {
      if (err.data?.code === 'ACCOUNT_LINK_REQUIRED') setNeedsProof(true);
      setError(err.message || 'Không thể xác nhận tài khoản.');
    } finally { setBusy(false); setPassword(''); }
  };

  useEffect(() => {
    apiClient<Details>(path).then(setDetails).catch(err => setError(err.message));
    const query = new URLSearchParams(window.location.search);
    const code = query.get('oauth_login_code');
    if (callbackStarted.current) return;
    callbackStarted.current = true;
    if (query.has('error')) setError('Đăng nhập chưa hoàn tất. Hãy thử lại hoặc quay về ứng dụng.');
    if (!code) return;
    window.history.replaceState({}, '', `/?signin=${encodeURIComponent(flowId)}`);
    const verifier = sessionStorage.getItem(`signin_${flowId}`);
    if (!verifier) { setError('Phiên đăng nhập không hợp lệ. Hãy quay về ứng dụng và đăng nhập lại.'); return; }
    pending.current = { code, verifier };
    void completeOAuth();
  }, [flowId]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (needsProof) { await completeOAuth({ password }); return; }
    setBusy(true); setError('');
    try {
      if (register) await authService.register({ email, password });
      finish(await post<Result>('/password', { email, password }));
    } catch (err: any) { setError(err.message); } finally { setBusy(false); setPassword(''); }
  };
  const beginOAuth = async (provider: string) => {
    setBusy(true); setError('');
    try {
      const verifier = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
      const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      sessionStorage.setItem(`signin_${flowId}`, verifier);
      const result = await post<{ startUrl: string }>(`/oauth/${provider}/begin`, { codeChallenge });
      window.location.assign(result.startUrl);
    } catch (err: any) { setBusy(false); setError(err.message || 'Không thể mở trang đăng nhập.'); }
  };
  const continueSession = async () => {
    if (needsProof) { await completeOAuth({ linkToken: token! }); return; }
    setBusy(true); setError('');
    try { finish(await post<Result>('/session', {})); }
    catch (err: any) { setError(err.message); setBusy(false); }
  };

  return <div className="auth-screen"><main className="auth-card">
    <div className="auth-header"><h1 className="auth-title">Auth Service</h1>
      <p className="auth-subtitle">Đăng nhập vào {details?.appName || 'ứng dụng'}</p>
      {details && <p className="auth-subtitle">Sau khi xác nhận, bạn sẽ trở về {details.destination}.</p>}
    </div>
    {error && <p className="account-feedback" role="alert">{error}</p>}
    {details && <>
      {needsProof && <p>Email này đã có tài khoản. Nhập mật khẩu hiện tại để xác nhận liên kết, hoặc xác nhận bằng phiên Auth Service của chính bạn. Nếu tài khoản chưa có mật khẩu, đăng nhập bằng phương thức cũ tại Auth Service trước.</p>}
      {user && token && <button type="button" className="btn btn-secondary btn-block" disabled={busy} onClick={continueSession}>
        {needsProof ? 'Xác nhận liên kết với' : 'Tiếp tục với'} {user.email}
      </button>}
      <form onSubmit={submit}>
        {!needsProof && <div className="form-group"><label className="form-label" htmlFor="client-email">Email</label>
          <input className="form-control" id="client-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} disabled={busy} /></div>}
        <div className="form-group"><label className="form-label" htmlFor="client-password">Mật khẩu{register && !needsProof ? ' mới' : ''}</label>
          <input className="form-control" id="client-password" type="password" autoComplete={register && !needsProof ? 'new-password' : 'current-password'} required maxLength={128} minLength={register && !needsProof ? 6 : 1} value={password} onChange={e => setPassword(e.target.value)} disabled={busy} /></div>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Đang xử lý…' : needsProof ? 'Xác nhận liên kết' : register ? 'Tạo tài khoản và tiếp tục' : 'Đăng nhập'}</button>
      </form>
      {!needsProof && <>
        <button className="btn btn-secondary btn-block" type="button" disabled={busy} onClick={() => { setRegister(!register); setPassword(''); }}>{register ? 'Đã có tài khoản? Đăng nhập' : 'Tạo tài khoản mới'}</button>
        {details.providers.filter(p => p.enabled).map(p => <button key={p.provider} type="button" className="btn btn-secondary btn-block" disabled={busy} onClick={() => beginOAuth(p.provider.toLowerCase())}>Tiếp tục với {p.name}</button>)}
      </>}
      <p><a href={details.destination}>Quay về ứng dụng</a> · <a href="/#account" target="_blank" rel="noopener noreferrer">Quản lý tài khoản Auth Service</a></p>
    </>}
    {!details && <a href="/">Về Auth Service</a>}
  </main></div>;
};
