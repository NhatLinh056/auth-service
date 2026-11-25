import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Application } from '../../../types/application.types';
import { useToast } from '../../../contexts/ToastContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { providersService } from '../../../services/providers.service';
import {
  IconBox,
  IconCheck,
  IconCopy,
  IconDownload,
  IconGlobe,
  IconKey,
  IconLock,
  IconPlus,
  IconShield,
} from '../../common/Icons';
import './QuickstartPage.css';

export interface QuickstartPageProps {
  applications: Application[];
  onOpenCreateApp?: () => void;
}

interface ProviderStatus {
  provider: string;
  name: string;
  enabled: boolean;
}

export const QuickstartPage: React.FC<QuickstartPageProps> = ({
  applications,
  onOpenCreateApp,
}) => {
  const { showToast } = useToast();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const queryAppId = searchParams.get('appId');
  const [selectedAppId, setSelectedAppId] = useState<string>(() => {
    if (queryAppId && applications.some((a) => a.id === queryAppId || a.appId === queryAppId)) {
      const match = applications.find((a) => a.id === queryAppId || a.appId === queryAppId);
      return match ? match.id : applications[0]?.id || '';
    }
    return applications[0]?.id || '';
  });

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [providersError, setProvidersError] = useState(false);

  useEffect(() => {
    if (queryAppId) {
      const match = applications.find((a) => a.id === queryAppId || a.appId === queryAppId);
      if (match) {
        setSelectedAppId(match.id);
        return;
      }
    }
    if (!selectedAppId && applications.length > 0) {
      setSelectedAppId(applications[0].id);
    }
  }, [applications, queryAppId, selectedAppId]);

  const hasApps = applications.length > 0;
  const selectedApp = hasApps
    ? applications.find((a) => a.id === selectedAppId || a.appId === selectedAppId) || applications[0]
    : null;

  const appIdDisplay = selectedApp ? (selectedApp.appId || selectedApp.id) : 'YOUR_APP_ID';

  const loadProviders = useCallback(async () => {
    if (!selectedApp) {
      setProviders([]);
      setProvidersError(false);
      return;
    }
    setProvidersLoading(true);
    setProvidersError(false);
    try {
      const list = await providersService.getPublicProviders(selectedApp.appId || selectedApp.id);
      setProviders(list || []);
    } catch {
      setProvidersError(true);
      setProviders([]);
    } finally {
      setProvidersLoading(false);
    }
  }, [selectedApp]);

  useEffect(() => {
    void loadProviders();
  }, [loadProviders]);

  const handleSelectApp = (appId: string) => {
    setSelectedAppId(appId);
    const target = applications.find((a) => a.id === appId);
    if (target?.appId) {
      setSearchParams({ appId: target.appId });
    } else if (target?.id) {
      setSearchParams({ appId: target.id });
    } else {
      setSearchParams({});
    }
  };

  const appTokenPlaceholder = 'apt_your_generated_app_token_here';

  const copyToClipboard = (text: string, label: string, key: string) => {
    if (!hasApps && key === 'appid') {
      showToast(
        lang === 'vi' ? 'Vui lòng tạo ứng dụng trước' : 'Please create an application first',
        'info',
      );
      return;
    }

    const markCopied = () => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
      showToast(lang === 'vi' ? `Đã sao chép ${label}` : `Copied ${label}`, 'success');
    };

    const fallbackCopy = () => {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) {
          markCopied();
        } else {
          showToast(lang === 'vi' ? 'Không thể sao chép' : 'Failed to copy', 'error');
        }
      } catch {
        showToast(lang === 'vi' ? 'Không thể sao chép' : 'Failed to copy', 'error');
      }
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(markCopied).catch(fallbackCopy);
    } else {
      fallbackCopy();
    }
  };

  const authServiceOrigin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'http://localhost:3000';

  const sdkInstallCmd = `npm install dotenv ${authServiceOrigin}/sdk/auth-service-client-1.1.0.tgz`;
  const sdkInstallLocal = 'npm install dotenv ./auth-service-client-1.1.0.tgz';

  const envSnippet = `PORT=3001
AUTH_SERVICE_URL=${authServiceOrigin}
APP_ID=${appIdDisplay}
APP_TOKEN=${appTokenPlaceholder}
REDIRECT_URI=http://localhost:3001/auth/callback`;

  const moduleSnippet = `import 'dotenv/config';
import { Module } from '@nestjs/common';
import { AuthModule } from 'auth-service-client/nest';
import { AppController } from './app.controller.js';

@Module({
  imports: [
    AuthModule.forRoot({
      authServiceUrl: process.env.AUTH_SERVICE_URL!,
      appId: process.env.APP_ID!,
      appToken: process.env.APP_TOKEN!,
      redirectUri: process.env.REDIRECT_URI!,
      publicAppUrl: new URL(process.env.REDIRECT_URI!).origin,
      successRedirect: '/profile',
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}`;

  const guardSnippet = `import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser, type AppUserProfile } from 'auth-service-client/nest';

@Controller()
export class AppController {
  @Get('profile')
  @UseGuards(AuthGuard)
  getProfile(@CurrentUser() user: AppUserProfile) {
    return {
      appId: process.env.APP_ID!,
      user,
    };
  }
}`;

  const renderProviderBadge = (
    providerKey: 'google' | 'facebook',
    displayName: string,
    badgeId: string,
  ) => {
    if (!hasApps) {
      return (
        <span id={badgeId} className="quickstart-provider-badge quickstart-provider-badge--disabled">
          <span className="quickstart-provider-dot quickstart-provider-dot--disabled" />
          {displayName}: {lang === 'vi' ? 'Chưa chọn app' : 'No app'}
        </span>
      );
    }
    if (providersLoading) {
      return (
        <span id={badgeId} className="quickstart-provider-badge quickstart-provider-badge--loading">
          <span className="quickstart-provider-dot quickstart-provider-dot--loading" />
          {displayName}: {lang === 'vi' ? 'Đang kiểm tra…' : 'Checking…'}
        </span>
      );
    }
    if (providersError) {
      return (
        <span id={badgeId} className="quickstart-provider-badge quickstart-provider-badge--error">
          <span className="quickstart-provider-dot quickstart-provider-dot--error" />
          {displayName}: {lang === 'vi' ? 'Lỗi tải' : 'Fetch error'}
        </span>
      );
    }
    const status = providers.find((p) => p.provider === providerKey);
    if (!status) {
      return (
        <span id={badgeId} className="quickstart-provider-badge quickstart-provider-badge--disabled">
          <span className="quickstart-provider-dot quickstart-provider-dot--disabled" />
          {displayName}: {lang === 'vi' ? 'Chưa cấu hình' : 'Not configured'}
        </span>
      );
    }
    const isEnabled = Boolean(status.enabled);
    return (
      <span
        id={badgeId}
        className={`quickstart-provider-badge ${
          isEnabled ? 'quickstart-provider-badge--active' : 'quickstart-provider-badge--disabled'
        }`}
      >
        <span
          className={`quickstart-provider-dot ${
            isEnabled ? 'quickstart-provider-dot--active' : 'quickstart-provider-dot--disabled'
          }`}
        />
        {displayName}: {isEnabled ? (lang === 'vi' ? 'Hoạt động' : 'Active') : (lang === 'vi' ? 'Tắt' : 'Disabled')}
      </span>
    );
  };

  return (
    <div className="quickstart-page">
      {/* Compact Header with App Selector */}
      <header className="quickstart-header-card">
        <div className="quickstart-header-top">
          <div className="quickstart-header-main">
            <div className="quickstart-eyebrow-row">
              <span className="quickstart-eyebrow">NestJS SDK</span>
              <span className="quickstart-eyebrow-sub">auth-service-client/nest</span>
            </div>
            <h1 className="quickstart-title">
              {lang === 'vi' ? 'Tích Hợp NestJS SDK' : 'NestJS SDK Quickstart'}
            </h1>
            <p className="quickstart-desc">
              {lang === 'vi'
                ? '4 bước kết nối ứng dụng NestJS với Auth Service qua OAuth 2.0 & cookie phiên an toàn.'
                : '4 steps to connect a NestJS app to Auth Service with OAuth 2.0 and HttpOnly session cookies.'}
            </p>

            <div className="quickstart-provider-chips">
              <span className="quickstart-provider-label">
                {lang === 'vi' ? 'OAuth Providers:' : 'OAuth Providers:'}
              </span>
              {renderProviderBadge('google', 'Google', 'badge-status-google')}
              {renderProviderBadge('facebook', 'Facebook', 'badge-status-facebook')}
            </div>
          </div>

          {hasApps ? (
            <div className="quickstart-selector-box">
              <div className="quickstart-selector-header">
                <span className="quickstart-selector-label">
                  {lang === 'vi' ? 'Ứng dụng tích hợp' : 'Target Application'}
                </span>
                {selectedApp && (
                  <span
                    className={`quickstart-status-tag ${
                      selectedApp.status === 'ACTIVE'
                        ? 'quickstart-status-tag--active'
                        : 'quickstart-status-tag--inactive'
                    }`}
                  >
                    {selectedApp.status || 'ACTIVE'}
                  </span>
                )}
              </div>

              <select
                id="select-quickstart-app"
                value={selectedAppId}
                onChange={(e) => handleSelectApp(e.target.value)}
                className="quickstart-app-select"
                aria-label={lang === 'vi' ? 'Chọn ứng dụng' : 'Select application'}
              >
                {applications.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.name} ({app.appId || app.id.slice(0, 8)})
                  </option>
                ))}
              </select>

              <div className="quickstart-appid-row">
                <span className="quickstart-appid-text" title={appIdDisplay}>
                  {appIdDisplay}
                </span>
                <button
                  type="button"
                  id="btn-copy-quickstart-appid"
                  onClick={() => copyToClipboard(appIdDisplay, 'AppID', 'appid')}
                  className={`quickstart-copy-btn ${copiedKey === 'appid' ? 'quickstart-copy-btn--copied' : ''}`}
                >
                  {copiedKey === 'appid' ? <IconCheck size={13} /> : <IconCopy size={13} />}
                  <span>
                    {copiedKey === 'appid'
                      ? (lang === 'vi' ? 'Đã chép' : 'Copied')
                      : (lang === 'vi' ? 'Sao chép' : 'Copy')}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="quickstart-empty-card" id="quickstart-empty-state">
              <span className="quickstart-empty-icon" aria-hidden="true">
                <IconBox size={24} />
              </span>
              <h3 className="quickstart-empty-title">
                {lang === 'vi' ? 'Chưa có ứng dụng nào' : 'No applications found'}
              </h3>
              <p className="quickstart-empty-desc">
                {lang === 'vi'
                  ? 'Tạo ứng dụng trước để lấy AppID và cấu hình OAuth.'
                  : 'Create an application first to obtain an AppID and configure OAuth.'}
              </p>
              {onOpenCreateApp && (
                <button
                  type="button"
                  id="btn-quickstart-create-app"
                  className="btn btn-primary quickstart-create-btn"
                  onClick={onOpenCreateApp}
                >
                  <IconPlus size={14} />
                  <span>{lang === 'vi' ? 'Tạo Ứng Dụng Mới' : 'Create Application'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      <section id="section-sdk-guide">
        {/* STEP 1: Configure Provider & Redirect URI */}
        <article className="quickstart-card" id="step-configure-provider">
          <div className="quickstart-card-header">
            <div className="quickstart-step-title-area">
              <span className="quickstart-step-num">1</span>
              <div>
                <h2 className="quickstart-step-heading">
                  {lang === 'vi' ? 'Cấu hình OAuth & Redirect URI' : 'Configure OAuth & Redirect URI'}
                </h2>
                <p className="quickstart-step-sub">
                  {lang === 'vi'
                    ? 'Thiết lập một lần trên bảng điều khiển trước khi chạy ứng dụng.'
                    : 'One-time console setup before running your client service.'}
                </p>
              </div>
            </div>
            {selectedApp && (
              <div className="quickstart-actions-group">
                <button
                  type="button"
                  className="btn btn-secondary quickstart-action-btn"
                  onClick={() => navigate(`/console/applications/${selectedApp.id}/settings`)}
                >
                  {lang === 'vi' ? 'Mở Cài đặt' : 'Open Settings'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary quickstart-action-btn"
                  onClick={() => navigate(`/console/applications/${selectedApp.id}/oauth`)}
                >
                  {lang === 'vi' ? 'Mở OAuth' : 'Open OAuth'}
                </button>
              </div>
            )}
          </div>
          <ul className="quickstart-checklist">
            <li>
              {lang === 'vi' ? 'Thêm callback vào Redirect URI allowlist trong Cài đặt: ' : 'Add callback to Redirect URI allowlist in Settings: '}
              <code className="quickstart-inline-code">http://localhost:3001/auth/callback</code>
            </li>
            <li>
              {lang === 'vi'
                ? 'Bật Google hoặc Facebook trong mục Phương thức đăng nhập của ứng dụng.'
                : 'Enable Google or Facebook in Sign-in Methods for this application.'}
            </li>
          </ul>
        </article>

        {/* STEP 2: Install SDK Package 1.1.0 */}
        <article className="quickstart-card" id="step-install-sdk">
          <div className="quickstart-card-header">
            <div className="quickstart-step-title-area">
              <span className="quickstart-step-num">2</span>
              <div>
                <h2 className="quickstart-step-heading">
                  {lang === 'vi' ? 'Cài đặt SDK v1.1.0' : 'Install SDK v1.1.0'}
                </h2>
                <p className="quickstart-step-sub">
                  {lang === 'vi'
                    ? 'Cài gói auth-service-client cùng dotenv vào dự án NestJS.'
                    : 'Install auth-service-client and dotenv in your NestJS project.'}
                </p>
              </div>
            </div>
            <div className="quickstart-actions-group">
              <a
                href="/sdk/auth-service-client-1.1.0.tgz"
                download="auth-service-client-1.1.0.tgz"
                className="btn btn-primary quickstart-action-btn"
                id="btn-download-sdk-tgz"
              >
                <IconDownload size={14} />
                <span>{lang === 'vi' ? 'Tải SDK (.tgz)' : 'Download SDK (.tgz)'}</span>
              </a>
              <button
                type="button"
                id="btn-copy-install-cmd"
                className={`quickstart-copy-btn quickstart-action-btn ${copiedKey === 'install' ? 'quickstart-copy-btn--copied' : ''}`}
                onClick={() => copyToClipboard(sdkInstallCmd, 'npm install', 'install')}
              >
                {copiedKey === 'install' ? <IconCheck size={13} /> : <IconCopy size={13} />}
                <span>
                  {copiedKey === 'install'
                    ? (lang === 'vi' ? 'Đã chép' : 'Copied')
                    : (lang === 'vi' ? 'Sao chép lệnh' : 'Copy command')}
                </span>
              </button>
            </div>
          </div>
          <div className="quickstart-code-section">
            <pre id="snippet-install-sdk" className="quickstart-code-pre">{sdkInstallCmd}</pre>
            <p className="quickstart-fallback-hint">
              {lang === 'vi' ? 'Nếu đã tải file .tgz về máy: ' : 'Or from downloaded tarball: '}
              <code className="quickstart-inline-code">{sdkInstallLocal}</code>
            </p>
            <div className="quickstart-sdk-highlights">
              <div className="quickstart-sdk-highlight">
                <div className="quickstart-sdk-highlight-head">
                  <IconKey size={14} />
                  <span>OAuth 2.0 &amp; PKCE</span>
                </div>
                <p className="quickstart-sdk-highlight-desc">
                  {lang === 'vi'
                    ? 'Tự sinh state, PKCE và đổi mã xác thực dùng một lần với Auth Service.'
                    : 'Handles state, PKCE, and one-time authorization code exchange.'}
                </p>
              </div>
              <div className="quickstart-sdk-highlight">
                <div className="quickstart-sdk-highlight-head">
                  <IconLock size={14} />
                  <span>{lang === 'vi' ? 'Phiên HttpOnly an toàn' : 'HttpOnly Sessions'}</span>
                </div>
                <p className="quickstart-sdk-highlight-desc">
                  {lang === 'vi'
                    ? 'Tự cấp cookie app_session tách biệt theo AppID, kèm chống CSRF khi đăng xuất.'
                    : 'Issues app-scoped HttpOnly cookies with CSRF-protected logout.'}
                </p>
              </div>
              <div className="quickstart-sdk-highlight">
                <div className="quickstart-sdk-highlight-head">
                  <IconShield size={14} />
                  <span>{lang === 'vi' ? 'Sẵn cho NestJS' : 'NestJS Ready'}</span>
                </div>
                <p className="quickstart-sdk-highlight-desc">
                  {lang === 'vi'
                    ? 'Cung cấp sẵn AuthModule, AuthGuard (xác minh fail-closed) và @CurrentUser().'
                    : 'Includes AuthModule, fail-closed AuthGuard, and @CurrentUser().'}
                </p>
              </div>
            </div>
          </div>
        </article>

        {/* STEP 3: Configure .env & AuthModule */}
        <article className="quickstart-card" id="step-configure-env-module">
          <div className="quickstart-card-header">
            <div className="quickstart-step-title-area">
              <span className="quickstart-step-num">3</span>
              <div>
                <h2 className="quickstart-step-heading">
                  {lang === 'vi' ? 'Cấu hình .env & đăng ký AuthModule' : 'Configure .env & AuthModule'}
                </h2>
                <p className="quickstart-step-sub">
                  {lang === 'vi'
                    ? 'Điền thông tin ứng dụng vào backend và khai báo AuthModule.forRoot().'
                    : 'Add backend credentials to .env and register AuthModule.forRoot().'}
                </p>
              </div>
            </div>
          </div>

          <div className="quickstart-code-section quickstart-code-divider">
            <div className="quickstart-code-header">
              <div className="quickstart-code-title">
                <span className="quickstart-code-filename quickstart-code-filename--primary">.env</span>
                <span className="quickstart-secret-pill">
                  {lang === 'vi' ? 'Chỉ lưu AppToken ở backend' : 'Backend only — keep AppToken secret'}
                </span>
              </div>
              <button
                type="button"
                id="btn-copy-sdk-env"
                className={`quickstart-copy-btn ${copiedKey === 'sdkenv' ? 'quickstart-copy-btn--copied' : ''}`}
                onClick={() => copyToClipboard(envSnippet, '.env', 'sdkenv')}
              >
                {copiedKey === 'sdkenv' ? <IconCheck size={13} /> : <IconCopy size={13} />}
                <span>
                  {copiedKey === 'sdkenv'
                    ? (lang === 'vi' ? 'Đã chép' : 'Copied')
                    : (lang === 'vi' ? 'Sao chép .env' : 'Copy .env')}
                </span>
              </button>
            </div>
            <pre id="snippet-sdk-env" className="quickstart-code-pre">{envSnippet}</pre>
          </div>

          <div className="quickstart-code-section quickstart-code-section--dark">
            <div className="quickstart-code-header">
              <div className="quickstart-code-title">
                <span className="quickstart-code-filename">app.module.ts</span>
                <span className="quickstart-code-comment">
                  {lang === 'vi' ? 'Tự động tạo /auth/login/*, /auth/callback, /auth/logout' : 'Auto-registers /auth/* routes'}
                </span>
              </div>
              <button
                type="button"
                id="btn-copy-sdk-init"
                className={`quickstart-copy-btn ${copiedKey === 'sdkinit' ? 'quickstart-copy-btn--copied' : ''}`}
                onClick={() => copyToClipboard(moduleSnippet, 'app.module.ts', 'sdkinit')}
              >
                {copiedKey === 'sdkinit' ? <IconCheck size={13} /> : <IconCopy size={13} />}
                <span>
                  {copiedKey === 'sdkinit'
                    ? (lang === 'vi' ? 'Đã chép' : 'Copied')
                    : (lang === 'vi' ? 'Sao chép' : 'Copy')}
                </span>
              </button>
            </div>
            <pre id="snippet-sdk-init" className="quickstart-code-pre quickstart-code-pre--light">{moduleSnippet}</pre>
          </div>
        </article>

        {/* STEP 4: AuthGuard & SDK Routes */}
        <article className="quickstart-card" id="step-use-auth-guard">
          <div className="quickstart-card-header">
            <div className="quickstart-step-title-area">
              <span className="quickstart-step-num">4</span>
              <div>
                <h2 className="quickstart-step-heading">
                  {lang === 'vi' ? 'Bảo vệ API với AuthGuard & các tuyến SDK' : 'Protect Routes with AuthGuard & SDK Routes'}
                </h2>
                <p className="quickstart-step-sub">
                  {lang === 'vi'
                    ? 'Gắn @UseGuards(AuthGuard) để lấy @CurrentUser(); gọi 4 tuyến /auth/* có sẵn ở frontend.'
                    : 'Attach @UseGuards(AuthGuard) with @CurrentUser() and use the 4 built-in /auth/* routes.'}
                </p>
              </div>
            </div>
          </div>

          <div className="quickstart-code-section quickstart-code-divider">
            <div className="quickstart-code-header">
              <div className="quickstart-code-title">
                <span className="quickstart-code-filename">app.controller.ts</span>
              </div>
              <button
                type="button"
                id="btn-copy-sdk-guard"
                className={`quickstart-copy-btn ${copiedKey === 'sdkguard' ? 'quickstart-copy-btn--copied' : ''}`}
                onClick={() => copyToClipboard(guardSnippet, 'app.controller.ts', 'sdkguard')}
              >
                {copiedKey === 'sdkguard' ? <IconCheck size={13} /> : <IconCopy size={13} />}
                <span>
                  {copiedKey === 'sdkguard'
                    ? (lang === 'vi' ? 'Đã chép' : 'Copied')
                    : (lang === 'vi' ? 'Sao chép' : 'Copy')}
                </span>
              </button>
            </div>
            <pre id="snippet-sdk-guard" className="quickstart-code-pre quickstart-code-pre--light">{guardSnippet}</pre>
          </div>

          <div id="table-adapter-endpoints" className="quickstart-endpoints-container">
            <div className="quickstart-endpoints-header">
              <IconGlobe size={15} />
              <h3 className="quickstart-endpoints-title">
                {lang === 'vi' ? '4 tuyến /auth/* tự động' : '4 Built-in /auth/* Routes'}
              </h3>
            </div>
            <div className="quickstart-table-wrapper">
              <table className="quickstart-table">
                <thead>
                  <tr>
                    <th className="quickstart-table-method-col">Method</th>
                    <th className="quickstart-table-path-col">Endpoint</th>
                    <th>{lang === 'vi' ? 'Chức năng' : 'Purpose'}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><span className="quickstart-method-tag quickstart-method-tag--get">GET</span></td>
                    <td className="quickstart-endpoint-path">/auth/login/google</td>
                    <td>{lang === 'vi' ? 'Bắt đầu đăng nhập Google' : 'Start Google OAuth sign-in'}</td>
                  </tr>
                  <tr>
                    <td><span className="quickstart-method-tag quickstart-method-tag--get">GET</span></td>
                    <td className="quickstart-endpoint-path">/auth/login/facebook</td>
                    <td>{lang === 'vi' ? 'Bắt đầu đăng nhập Facebook' : 'Start Facebook OAuth sign-in'}</td>
                  </tr>
                  <tr>
                    <td><span className="quickstart-method-tag quickstart-method-tag--get">GET</span></td>
                    <td className="quickstart-endpoint-path">/auth/callback</td>
                    <td>{lang === 'vi' ? 'Đổi code lấy cookie phiên & redirect về successRedirect' : 'Exchange code for session cookie & redirect'}</td>
                  </tr>
                  <tr>
                    <td><span className="quickstart-method-tag quickstart-method-tag--post">POST</span></td>
                    <td className="quickstart-endpoint-path">/auth/logout</td>
                    <td>{lang === 'vi' ? 'Đăng xuất (kiểm tra CSRF & xóa cookie)' : 'Sign out (CSRF-protected cookie clear)'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
};

export default QuickstartPage;
