import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { StatusPill } from '../common/StatusPill';
import { PasswordInput } from '../common/PasswordInput';

export const AuthScreen: React.FC = () => {
  const { login, register } = useAuth();
  const { t } = useLanguage();

  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [loading, setLoading] = useState(false);

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
        <StatusPill label={t('nav.api_online')} />
        <LanguageSwitcher idPrefix="auth" />
      </div>

      {/* Centered Auth Card */}
      <div className="auth-card">
        {/* Brand Header */}
        <div className="auth-header">
          <div className="auth-brand-icon">
            <svg
              width="22"
              height="22"
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
          <h1 className="auth-title">Auth Service</h1>
          <p className="auth-subtitle">{t('auth_screen.subtitle')}</p>
        </div>

        {/* Segmented Tab: Sign In vs Create Account */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${mode === 'signin' ? 'active' : ''}`}
            id="auth-tab-signin"
            onClick={() => setMode('signin')}
          >
            {t('auth_screen.tab_signin')}
          </button>
          <button
            type="button"
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            id="auth-tab-register"
            onClick={() => setMode('register')}
          >
            {t('auth_screen.tab_register')}
          </button>
        </div>

        {/* Sign In Form */}
        {mode === 'signin' && (
          <form id="auth-signin-form" onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label className="form-label">{t('login.email')}</label>
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
              <label className="form-label">{t('login.password')}</label>
              <PasswordInput
                id="auth-login-password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              id="auth-login-submit"
              className="btn btn-primary btn-block"
              style={{ marginTop: 18 }}
              disabled={loading}
            >
              <span>{loading ? '...' : t('auth_screen.signin_btn')}</span>
            </button>
          </form>
        )}

        {/* Register Form */}
        {mode === 'register' && (
          <form id="auth-register-form" onSubmit={handleRegisterSubmit}>
            <div className="form-group">
              <label className="form-label">{t('register.name')}</label>
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
              <label className="form-label">{t('login.email')}</label>
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
              <label className="form-label">{t('register.password')}</label>
              <PasswordInput
                id="auth-reg-password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <button
              type="submit"
              id="auth-reg-submit"
              className="btn btn-primary btn-block"
              style={{ marginTop: 18 }}
              disabled={loading}
            >
              <span>{loading ? '...' : t('auth_screen.register_btn')}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
