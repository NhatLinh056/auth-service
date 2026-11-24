import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Application } from '../../../types/application.types';
import { useToast } from '../../../contexts/ToastContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { providersService } from '../../../services/providers.service';
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
  const [searchParams, setSearchParams] = useSearchParams();

  // Selected application: prioritize URL query param ?appId=... if present
  const queryAppId = searchParams.get('appId');
  const [selectedAppId, setSelectedAppId] = useState<string>(() => {
    if (queryAppId && applications.some((a) => a.id === queryAppId || a.appId === queryAppId)) {
      const match = applications.find((a) => a.id === queryAppId || a.appId === queryAppId);
      return match ? match.id : applications[0]?.id || '';
    }
    return applications[0]?.id || '';
  });

  // Track copied state for individual buttons for instant visual feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Provider status state
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [providersError, setProvidersError] = useState(false);

  // Sync state if applications load or queryParam changes
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

  // Never present fake AppID as real when no applications exist
  const appIdDisplay = selectedApp
    ? (selectedApp.appId || selectedApp.id)
    : 'YOUR_APP_ID';

  // Fetch public providers for selected application
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
      // Fix misleading state: record error so we do NOT falsely display "Disabled"
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

  // Security standard: Never expose real AppToken on frontend quickstart page
  const appTokenPlaceholder = 'apt_your_generated_app_token_here';

  const copyToClipboard = (text: string, label: string, key: string) => {
    if (!hasApps && key === 'appid') {
      showToast(
        lang === 'vi' ? 'Vui lòng tạo ứng dụng trước' : 'Please create an application first',
        'info'
      );
      return;
    }

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
          setCopiedKey(key);
          setTimeout(() => setCopiedKey(null), 2000);
          showToast(
            lang === 'vi' ? `Đã sao chép ${label}` : `Copied ${label}`,
            'success'
          );
        } else {
          showToast(lang === 'vi' ? 'Không thể sao chép' : 'Failed to copy', 'error');
        }
      } catch {
        showToast(lang === 'vi' ? 'Không thể sao chép' : 'Failed to copy', 'error');
      }
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setCopiedKey(key);
          setTimeout(() => setCopiedKey(null), 2000);
          showToast(
            lang === 'vi' ? `Đã sao chép ${label}` : `Copied ${label}`,
            'success'
          );
        })
        .catch(() => {
          fallbackCopy();
        });
    } else {
      fallbackCopy();
    }
  };

  // Dynamic Auth Service origin calculation based on current browser window
  const authServiceOrigin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'http://localhost:3000';

  // Snippets definition (Strictly aligned with smoke tests & actual SDK implementation)
  const sdkInstallNestCmd = `npm install dotenv ${authServiceOrigin}/sdk/auth-service-client-1.1.0.tgz`;
  const sdkInstallLocal = `npm install dotenv ./auth-service-client-1.1.0.tgz`;

  const envSnippet = `# .env (Backend Microservice Configuration)
PORT=3001
AUTH_SERVICE_URL=${authServiceOrigin}
APP_ID=${appIdDisplay}
# LƯU Ý BẢO MẬT: Chỉ lưu AppToken ở Backend .env, tuyệt đối không đưa vào client!
APP_TOKEN=${appTokenPlaceholder}
REDIRECT_URI=http://localhost:3001/auth/callback`;

  // Primary NestJS Adapter Setup (TypeScript / NestJS Microservice)
  const nestJsSetupSnippet = `// 1. app.module.ts - Đăng ký AuthModule (tự động cung cấp route /auth/login/google, /auth/login/facebook, /auth/callback, POST /auth/logout)
import 'dotenv/config';
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
      successRedirect: '/profile', // Tự động chuyển hướng về đây sau khi đăng nhập thành công
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}

// 2. app.controller.ts - Bảo vệ endpoint bằng AuthGuard và nhận profile qua @CurrentUser()
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser, type AppUserProfile } from 'auth-service-client/nest';

@Controller()
export class AppController {
  // Tuyến /profile được bảo vệ bởi AuthGuard (chuyển hướng về đây sau khi đăng nhập thành công)
  @Get('profile')
  @UseGuards(AuthGuard)
  getProfile(@CurrentUser() user: AppUserProfile) {
    return {
      message: 'Đăng nhập thành công!',
      appId: process.env.APP_ID!,
      user,
    };
  }

  // Tuyến API nội bộ được bảo vệ bởi AuthGuard (tự động xác minh trực tuyến fail-closed)
  @Get('api/protected')
  @UseGuards(AuthGuard)
  getProtectedResource(@CurrentUser() user: AppUserProfile) {
    return {
      message: 'Xác thực thành công!',
      appId: process.env.APP_ID!,
      user,
    };
  }
}`;

  // Helper to render accurate provider status badge without misleading "Disabled" on error
  const renderProviderBadge = (providerKey: 'google' | 'facebook', displayName: string, badgeId: string) => {
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
          {displayName}: {lang === 'vi' ? 'Đang kiểm tra...' : 'Checking...'}
        </span>
      );
    }
    if (providersError) {
      return (
        <span id={badgeId} className="quickstart-provider-badge quickstart-provider-badge--error">
          <span className="quickstart-provider-dot quickstart-provider-dot--error" />
          {displayName}: {lang === 'vi' ? 'Không xác định (Lỗi tải)' : 'Unknown (Fetch error)'}
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
        className={`quickstart-provider-badge ${isEnabled ? 'quickstart-provider-badge--active' : 'quickstart-provider-badge--disabled'}`}
      >
        <span className={`quickstart-provider-dot ${isEnabled ? 'quickstart-provider-dot--active' : 'quickstart-provider-dot--disabled'}`} />
        {displayName}: {isEnabled ? (lang === 'vi' ? 'Hoạt động' : 'Active') : (lang === 'vi' ? 'Tắt' : 'Disabled')}
      </span>
    );
  };

  return (
    <div className="quickstart-page">
      {/* 1. Header Card with App Selector & Security Guidelines */}
      <header className="quickstart-header-card">
        <div className="quickstart-header-top">
          <div className="quickstart-header-main">
            <div className="quickstart-eyebrow-row">
              <span className="quickstart-eyebrow">NestJS Integration</span>
              <span className="quickstart-eyebrow-sub">• auth-service-client/nest</span>
            </div>
            <h1 className="quickstart-title">
              {lang === 'vi' ? 'Hướng Dẫn Tích Hợp NestJS SDK' : 'NestJS SDK Integration Quickstart'}
            </h1>
            <p className="quickstart-desc">
              {lang === 'vi'
                ? 'Hướng dẫn tối giản tích hợp Auth Service SDK cho ứng dụng NestJS: tạo app, cài SDK, cấu hình AuthModule và dùng AuthGuard.'
                : 'Minimal NestJS SDK integration guide: create app, install SDK, configure AuthModule, and use AuthGuard.'}
            </p>

            {/* Provider Status Chips */}
            <div className="quickstart-provider-chips">
              <span className="quickstart-provider-label">
                {lang === 'vi' ? 'Trạng thái OAuth của ứng dụng:' : 'App OAuth Providers:'}
              </span>
              {renderProviderBadge('google', 'Google', 'badge-status-google')}
              {renderProviderBadge('facebook', 'Facebook', 'badge-status-facebook')}
            </div>
          </div>

          {/* Application Selector or Empty State Box */}
          {hasApps ? (
            <div className="quickstart-selector-box">
              <div className="quickstart-selector-header">
                <span className="quickstart-selector-label">
                  {lang === 'vi' ? 'Ứng Dụng Đang Chọn:' : 'Selected Application:'}
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

              {/* AppID Quick Copy Pill */}
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
                  {copiedKey === 'appid'
                    ? (lang === 'vi' ? '✓ Đã chép' : '✓ Copied')
                    : (lang === 'vi' ? 'Sao chép' : 'Copy')}
                </button>
              </div>
            </div>
          ) : (
            <div className="quickstart-empty-card" id="quickstart-empty-state">
              <span className="quickstart-empty-icon" aria-hidden="true">📦</span>
              <h3 className="quickstart-empty-title">
                {lang === 'vi' ? 'Chưa có ứng dụng nào' : 'No applications found'}
              </h3>
              <p className="quickstart-empty-desc">
                {lang === 'vi'
                  ? 'Tạo một ứng dụng trước để lấy AppID và cấu hình tích hợp OAuth.'
                  : 'Create an application first to obtain an AppID and configure OAuth integration.'}
              </p>
              {onOpenCreateApp && (
                <button
                  type="button"
                  id="btn-quickstart-create-app"
                  className="btn btn-primary quickstart-create-btn"
                  onClick={onOpenCreateApp}
                >
                  {lang === 'vi' ? '+ Tạo Ứng Dụng Mới' : '+ Create Application'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Short Security Warning & Allowlist Notice */}
        <div className="quickstart-notices-grid">
          <div className="quickstart-notice quickstart-notice--security">
            <span className="quickstart-notice-icon" aria-hidden="true">⚠️</span>
            <div>
              <strong>{lang === 'vi' ? 'Bảo mật AppToken:' : 'AppToken Security:'}</strong>{' '}
              {lang === 'vi'
                ? 'AppToken là khóa bí mật cấp máy chủ, CHỈ lưu tại file .env backend. Tuyệt đối không đưa vào client/frontend hoặc commit lên git.'
                : 'AppToken is a server-side secret key; keep it ONLY in your backend .env. Never expose it in browser or commit to git.'}
            </div>
          </div>

          <div className="quickstart-notice quickstart-notice--allowlist">
            <span className="quickstart-notice-icon" aria-hidden="true">🔗</span>
            <div>
              <strong>{lang === 'vi' ? 'Khai báo Callback Allowlist:' : 'Callback Allowlist Required:'}</strong>{' '}
              {lang === 'vi'
                ? 'Đăng ký Redirect URI (ví dụ: http://localhost:3001/auth/callback) vào danh sách cho phép trong Cài Đặt ứng dụng để tránh lỗi REDIRECT_URI_NOT_ALLOWED.'
                : 'Register your callback URL in Application Settings -> Redirect URIs Allowlist to prevent REDIRECT_URI_NOT_ALLOWED errors.'}
            </div>
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* SINGLE MINIMAL NESTJS INTEGRATION FLOW                         */}
      {/* ============================================================== */}
      <section id="section-sdk-guide">
        {/* STEP 1: Cấu hình Provider và Callback */}
        <article className="quickstart-card" id="step-configure-provider">
          <div className="quickstart-card-header">
            <div className="quickstart-step-title-area">
              <span className="quickstart-step-num">1</span>
              <div>
                <h2 className="quickstart-step-heading">
                  {lang === 'vi' ? '1. Cấu Hình Provider & Callback Redirect URI' : '1. Configure Provider & Callback Redirect URI'}
                </h2>
                <p className="quickstart-step-sub">
                  {lang === 'vi'
                    ? 'Khai báo Redirect URI và bật nhà cung cấp OAuth (Google / Facebook) trong Cài Đặt Ứng Dụng'
                    : 'Register Redirect URI and enable OAuth providers (Google / Facebook) in Application Settings'}
                </p>
              </div>
            </div>
          </div>
          <div className="quickstart-callout-banner">
            <span className="quickstart-callout-icon" aria-hidden="true">📋</span>
            <div>
              <strong>{lang === 'vi' ? 'Yêu cầu cấu hình ứng dụng:' : 'Application configuration requirements:'}</strong>
              <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                <li>
                  {lang === 'vi'
                    ? 'Thêm URL callback backend vào tab Cài Đặt -> Danh sách Redirect URI cho phép (ví dụ: http://localhost:3001/auth/callback).'
                    : 'Add backend callback URL to Settings -> Allowed Redirect URIs (e.g. http://localhost:3001/auth/callback).'}
                </li>
                <li>
                  {lang === 'vi'
                    ? 'Bật trạng thái hoạt động cho Google hoặc Facebook trong Cài Đặt nhà cung cấp.'
                    : 'Enable Google or Facebook provider in Application Provider Settings.'}
                </li>
              </ul>
            </div>
          </div>
        </article>

        {/* STEP 2: Install SDK Package 1.1.0 */}
        <article className="quickstart-card" id="step-install-sdk">
          <div className="quickstart-card-header">
            <div className="quickstart-step-title-area">
              <span className="quickstart-step-num">2</span>
              <div>
                <h2 className="quickstart-step-heading">
                  {lang === 'vi' ? '2. Cài Đặt Gói SDK v1.1.0 (NestJS)' : '2. Install SDK Package v1.1.0 (NestJS)'}
                </h2>
                <p className="quickstart-step-sub">
                  {lang === 'vi'
                    ? 'Cài đặt gói SDK chính thức auth-service-client v1.1.0 hỗ trợ trực tiếp NestJS (auth-service-client/nest)'
                    : 'Install official auth-service-client v1.1.0 with direct NestJS support (auth-service-client/nest)'}
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
                <span aria-hidden="true">⬇</span>
                <span>{lang === 'vi' ? 'Tải Gói SDK v1.1.0 (.tgz)' : 'Download SDK v1.1.0 (.tgz)'}</span>
              </a>
              <button
                type="button"
                id="btn-copy-install-cmd"
                className={`quickstart-copy-btn quickstart-action-btn ${copiedKey === 'install' ? 'quickstart-copy-btn--copied' : ''}`}
                onClick={() => copyToClipboard(sdkInstallNestCmd, 'lệnh npm install NestJS', 'install')}
              >
                {copiedKey === 'install'
                  ? (lang === 'vi' ? '✓ Đã sao chép' : '✓ Copied')
                  : (lang === 'vi' ? 'Sao chép lệnh cài đặt' : 'Copy install cmd')}
              </button>
            </div>
          </div>
          <div className="quickstart-code-section quickstart-code-section--dark">
            <pre id="snippet-install-sdk" className="quickstart-code-pre">
{`# Cài đặt trực tiếp từ Auth Service (kèm dotenv):
${sdkInstallNestCmd}

# Hoặc cài đặt từ file tarball đã tải về (đặt tại thư mục dự án):
${sdkInstallLocal}`}
            </pre>
          </div>
        </article>

        {/* STEP 3: Configure .env & Runnable NestJS Setup */}
        <article className="quickstart-card" id="step-configure-env-module">
          <div className="quickstart-card-header">
            <div className="quickstart-step-title-area">
              <span className="quickstart-step-num">3</span>
              <div>
                <h2 className="quickstart-step-heading">
                  {lang === 'vi' ? '3. Cấu Hình Biến Môi Trường (.env) & Đăng Ký AuthModule' : '3. Configure Environment (.env) & Register AuthModule'}
                </h2>
                <p className="quickstart-step-sub">
                  {lang === 'vi'
                    ? 'Khai báo thông tin xác thực tại .env và đăng ký AuthModule trong app.module.ts; SDK tự động xử lý route đăng nhập, callback và logout'
                    : 'Configure credentials in .env and register AuthModule in app.module.ts; SDK automatically manages login, callback, and logout'}
                </p>
              </div>
            </div>
          </div>

          {/* Explanation Callout Banner */}
          <div className="quickstart-callout-banner">
            <span className="quickstart-callout-icon" aria-hidden="true">✨</span>
            <div>
              <strong>{lang === 'vi' ? 'Cơ chế tự động của NestJS Adapter (auth-service-client/nest):' : 'Automatic NestJS Adapter Mechanisms (auth-service-client/nest):'}</strong>{' '}
              {lang === 'vi'
                ? 'AuthModule tự động đăng ký AuthCallbackController cung cấp các route: GET /auth/login/google và GET /auth/login/facebook (chuyển hướng sang OAuth Broker), GET /auth/callback (đổi authorization code lấy cookie phiên app_session HttpOnly và chuyển hướng về /profile), và POST /auth/logout (chống Forced-Logout CSRF qua Origin/Fetch Metadata và xóa sạch cookie phiên).'
                : 'AuthModule automatically registers AuthCallbackController providing: GET /auth/login/google and GET /auth/login/facebook (OAuth broker redirects), GET /auth/callback (exchanges code for HttpOnly app_session cookie and redirects to /profile), and POST /auth/logout (CSRF-defended session logout clearing cookies).'}
            </div>
          </div>

          {/* 3.1 File .env */}
          <div className="quickstart-code-section" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="quickstart-code-header">
              <div className="quickstart-code-title">
                <span className="quickstart-code-filename" style={{ color: '#38bdf8' }}>.env</span>
                <span className="quickstart-code-comment">
                  ({lang === 'vi' ? 'Cấu hình backend - Tuyệt đối không đưa AppToken vào client' : 'Backend configuration - Keep AppToken secret'})
                </span>
              </div>
              <button
                type="button"
                id="btn-copy-sdk-env"
                className={`quickstart-copy-btn ${copiedKey === 'sdkenv' ? 'quickstart-copy-btn--copied' : ''}`}
                onClick={() => copyToClipboard(envSnippet, 'cấu hình .env', 'sdkenv')}
              >
                {copiedKey === 'sdkenv'
                  ? (lang === 'vi' ? '✓ Đã sao chép' : '✓ Copied')
                  : (lang === 'vi' ? 'Sao chép .env' : 'Copy .env')}
              </button>
            </div>
            <pre id="snippet-sdk-env" className="quickstart-code-pre">
{envSnippet}
            </pre>
          </div>

          {/* 3.2 File NestJS Integration */}
          <div className="quickstart-code-section quickstart-code-section--dark">
            <div className="quickstart-code-header">
              <div className="quickstart-code-title">
                <span className="quickstart-code-filename" style={{ color: 'var(--success)' }}>NestJS Integration (app.module.ts & app.controller.ts)</span>
                <span className="quickstart-code-comment">
                  ({lang === 'vi' ? 'Sử dụng AuthModule & AuthGuard từ auth-service-client/nest' : 'Using AuthModule & AuthGuard from auth-service-client/nest'})
                </span>
              </div>
              <button
                type="button"
                id="btn-copy-sdk-init"
                className={`quickstart-copy-btn ${copiedKey === 'sdkinit' ? 'quickstart-copy-btn--copied' : ''}`}
                onClick={() => copyToClipboard(nestJsSetupSnippet, 'mã NestJS setup', 'sdkinit')}
              >
                {copiedKey === 'sdkinit'
                  ? (lang === 'vi' ? '✓ Đã sao chép' : '✓ Copied')
                  : (lang === 'vi' ? 'Sao chép mã NestJS' : 'Copy NestJS code')}
              </button>
            </div>
            <pre id="snippet-sdk-init" className="quickstart-code-pre quickstart-code-pre--light">
{nestJsSetupSnippet}
            </pre>
          </div>
        </article>

        {/* STEP 4: Protect Routes & Route Lookup Table */}
        <article className="quickstart-card" id="step-use-auth-guard">
          <div className="quickstart-card-header">
            <div className="quickstart-step-title-area">
              <span className="quickstart-step-num">4</span>
              <div>
                <h2 className="quickstart-step-heading">
                  {lang === 'vi' ? '4. Dùng AuthGuard & Bảng Tuyến Đường do SDK Quản Lý' : '4. Use AuthGuard & SDK Managed Routes'}
                </h2>
                <p className="quickstart-step-sub">
                  {lang === 'vi'
                    ? 'Bảo vệ endpoint bằng @UseGuards(AuthGuard), tiêm thông tin người dùng qua @CurrentUser(); các tuyến đăng nhập, callback và logout hoạt động tự động'
                    : 'Protect endpoints with @UseGuards(AuthGuard), inject user profile via @CurrentUser(); login, callback, and logout routes are handled automatically'}
                </p>
              </div>
            </div>
          </div>

          <div id="table-adapter-endpoints" className="quickstart-endpoints-container" style={{ margin: '16px 20px 20px' }}>
            <div className="quickstart-endpoints-header">
              <span aria-hidden="true">🌐</span>
              <h3 className="quickstart-endpoints-title">
                {lang === 'vi' ? 'Bảng Tra Cứu 4 Tuyến Đường do SDK Tự Động Cung Cấp (/auth/*)' : 'SDK-Provided Authentication Routes Reference (/auth/*)'}
              </h3>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 12px' }}>
              {lang === 'vi'
                ? 'Lưu ý: Các tuyến /profile hoặc API nghiệp vụ do ứng dụng tự khai báo và gắn @UseGuards(AuthGuard). AuthModule chỉ tự động cung cấp 4 tuyến /auth/* dưới đây:'
                : 'Note: Application controllers define their own protected routes (e.g. /profile, /api/*) with @UseGuards(AuthGuard). AuthModule automatically provides only the 4 /auth/* routes below:'}
            </p>
            <div className="quickstart-table-wrapper">
              <table className="quickstart-table">
                <thead>
                  <tr>
                    <th style={{ width: 90 }}>Method</th>
                    <th style={{ width: 230 }}>Endpoint</th>
                    <th>{lang === 'vi' ? 'Mô tả & Chức năng' : 'Description & Function'}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><span className="quickstart-method-tag quickstart-method-tag--get">GET</span></td>
                    <td className="quickstart-endpoint-path">/auth/login/google</td>
                    <td>
                      {lang === 'vi' ? 'Khởi tạo đăng nhập Google (trình duyệt truy cập để chuyển hướng sang Google Broker)' : 'Initiate Google sign-in (browser navigates here to redirect to Google Broker)'}
                    </td>
                  </tr>
                  <tr>
                    <td><span className="quickstart-method-tag quickstart-method-tag--get">GET</span></td>
                    <td className="quickstart-endpoint-path">/auth/login/facebook</td>
                    <td>
                      {lang === 'vi' ? 'Khởi tạo đăng nhập Facebook (trình duyệt truy cập để chuyển hướng sang Facebook Broker)' : 'Initiate Facebook sign-in (browser navigates here to redirect to Facebook Broker)'}
                    </td>
                  </tr>
                  <tr>
                    <td><span className="quickstart-method-tag quickstart-method-tag--get">GET</span></td>
                    <td className="quickstart-endpoint-path">/auth/callback</td>
                    <td>
                      {lang === 'vi' ? 'Callback nhận code và state, tự động đổi token và chuyển hướng tới successRedirect' : 'Callback receives code & state, exchanges token and redirects to successRedirect'}
                    </td>
                  </tr>
                  <tr>
                    <td><span className="quickstart-method-tag quickstart-method-tag--post">POST</span></td>
                    <td className="quickstart-endpoint-path">/auth/logout</td>
                    <td>
                      {lang === 'vi' ? 'Đăng xuất phiên người dùng (tự động kiểm tra Origin/Fetch Metadata chống Forced-Logout CSRF và xóa cookies)' : 'User session logout (auto CSRF defense via Origin/Fetch Metadata, clears cookies)'}
                    </td>
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
