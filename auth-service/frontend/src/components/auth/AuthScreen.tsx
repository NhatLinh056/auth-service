import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { apiClient } from '../../services/api.client';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { StatusPill } from '../common/StatusPill';
import { PasswordInput } from '../common/PasswordInput';
import { IconBrandMark } from '../common/Icons';

export const AuthScreen: React.FC = () => {
  const { login, register } = useAuth();
  const { t, lang } = useLanguage();

  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    let active = true;
    apiClient<{ status: string }>('/health')
      .then((res) => {
        if (active) setApiStatus(res?.status === 'ok' ? 'online' : 'offline');
      })
      .catch(() => {
        if (active) setApiStatus('offline');
      });
    return () => {
      active = false;
    };
  }, []);

  // Form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;

    setLoading(true);
    try {
      await login(loginEmail, loginPassword);
    } catch {
      // Error is handled with toast in AuthContext
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEmail || !regPassword) return;

    setLoading(true);
    try {
      await register(regEmail, regPassword, regName.trim() || undefined);
    } catch {
      // Error is handled with toast in AuthContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-view" className="auth-screen">
      {/* Top-Right Bar: Status & Language Switcher */}
      <div className="auth-topbar">
        <StatusPill
          label={
            apiStatus === 'checking'
              ? (lang === 'vi' ? 'Đang kiểm tra…' : 'Checking…')
              : apiStatus === 'online'
              ? t('nav.api_online')
              : (lang === 'vi' ? 'Mất kết nối' : 'Offline')
          }
          variant={apiStatus === 'online' ? 'success' : apiStatus === 'offline' ? 'danger' : 'warning'}
        />
        <LanguageSwitcher idPrefix="auth" />
      </div>

      {/* Centered Auth Card */}
      <div className="auth-card page-enter">
        {loading && <div className="card-loading-bar" aria-hidden="true" />}
        {/* Brand Header */}
        <div className="auth-header">
          <div className="auth-brand-icon" aria-hidden="true">
            <IconBrandMark size={22} strokeWidth={2} />
          </div>
          <h1 className="auth-title">Auth Service</h1>
          <p className="auth-subtitle">{t('auth_screen.subtitle')}</p>
        </div>

        {/* Segmented Tab: Sign In vs Create Account */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${mode === 'signin' ? 'active' : ''}`}
            id="auth-tab-signin"
            disabled={loading}
            onClick={() => setMode('signin')}
          >
            {t('auth_screen.tab_signin')}
          </button>
          <button
            type="button"
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            id="auth-tab-register"
            disabled={loading}
            onClick={() => setMode('register')}
          >
            {t('auth_screen.tab_register')}
          </button>
        </div>

        {/* Sign In Form */}
        {mode === 'signin' && (
          <form id="auth-signin-form" onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="auth-login-email">{t('login.email')}</label>
              <input
                type="email"
                className="form-control"
                id="auth-login-email"
                required
                placeholder="name@example.com"
                autoComplete="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="auth-login-password">{t('login.password')}</label>
              <PasswordInput
                id="auth-login-password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              id="auth-login-submit"
              className="btn btn-primary btn-block"
              style={{ marginTop: 18 }}
              disabled={loading}
              aria-busy={loading}
            >
              {loading && <span className="btn-spinner" aria-hidden="true" />}
              <span>{loading ? t('auth_screen.signing_in') : t('auth_screen.signin_btn')}</span>
            </button>
          </form>
        )}

        {/* Register Form */}
        {mode === 'register' && (
          <form id="auth-register-form" onSubmit={handleRegisterSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="auth-reg-name">{t('register.name')}</label>
              <input
                type="text"
                className="form-control"
                id="auth-reg-name"
                placeholder={t('register.name_placeholder')}
                autoComplete="name"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="auth-reg-email">{t('login.email')}</label>
              <input
                type="email"
                className="form-control"
                id="auth-reg-email"
                required
                placeholder="name@example.com"
                autoComplete="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="auth-reg-password">{t('register.password')}</label>
              <PasswordInput
                id="auth-reg-password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              id="auth-reg-submit"
              className="btn btn-primary btn-block"
              style={{ marginTop: 18 }}
              disabled={loading}
              aria-busy={loading}
            >
              {loading && <span className="btn-spinner" aria-hidden="true" />}
              <span>{loading ? t('auth_screen.registering') : t('auth_screen.register_btn')}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
