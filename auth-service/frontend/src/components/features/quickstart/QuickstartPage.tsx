import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Application } from '../../../types/application.types';
import { useToast } from '../../../contexts/ToastContext';
import { useLanguage } from '../../../contexts/LanguageContext';

export interface QuickstartPageProps {
  applications: Application[];
  onOpenCreateApp?: () => void;
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

  const handleSelectApp = (appId: string) => {
    setSelectedAppId(appId);
    const target = applications.find((a) => a.id === appId);
    if (target?.appId) {
      setSearchParams({ appId: target.appId });
    } else {
      setSearchParams({});
    }
  };

  const selectedApp = applications.find((a) => a.id === selectedAppId) || applications[0];
  const appIdDisplay = selectedApp?.appId || selectedApp?.id || 'app_22c57454b00eb44a55c66bf4';
  
  // Security standard: Never expose real AppToken on frontend quickstart page
  const appTokenPlaceholder = 'apt_your_generated_app_token_here';

  const copyToClipboard = (text: string, label: string, key: string) => {
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

  const envSnippet = `# .env (Cấu hình Client Microservice)
PORT=3001
PUBLIC_URL=http://localhost:3001
AUTH_SERVICE_URL=http://localhost:3000

# Thông tin xác thực ứng dụng (Lấy App Token từ Cài Đặt ứng dụng)
APP_ID=${appIdDisplay}
APP_TOKEN=${appTokenPlaceholder}`;

  const curlSnippet = `# 1. Gọi trực tiếp API xác thực End-User JWT từ client microservice
curl -X GET http://localhost:3000/users/verify-app-user \\
  -H "Authorization: Bearer <USER_SESSION_JWT>" \\
  -H "X-App-Id: ${appIdDisplay}" \\
  -H "X-App-Token: \${APP_TOKEN}"`;

  const guardSnippet = `import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  BadGatewayException,
} from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class UserAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Thiếu hoặc sai định dạng Bearer token');
    }

    try {
      // Gọi Auth Service xác minh token người dùng và thẩm quyền ứng dụng
      const response = await axios.get(\`\${process.env.AUTH_SERVICE_URL}/users/verify-app-user\`, {
        headers: {
          Authorization: authHeader,
          'X-App-Id': process.env.APP_ID,
          'X-App-Token': process.env.APP_TOKEN,
        },
        timeout: 5000,
      });

      const user = response.data;

      // 1. Kiểm tra phạm vi Application của token
      if (!user || user.appId !== process.env.APP_ID) {
        throw new ForbiddenException('Token không thuộc phạm vi ứng dụng này');
      }

      // 2. Kiểm tra tính hợp lệ của người dùng và vai trò ứng dụng
      if (!['ADMIN', 'USER'].includes(user.appRole || user.role || '')) {
        throw new ForbiddenException('Quyền truy cập ứng dụng không hợp lệ');
      }

      req.user = user; // Gắn hồ sơ đã xác minh vào request context
      return true;
    } catch (err: any) {
      if (err instanceof ForbiddenException || err instanceof UnauthorizedException) {
        throw err;
      }
      const status = err.response?.status;
      const message = err.response?.data?.message || err.message;

      if (status === 401) {
        throw new UnauthorizedException(message || 'Token hết hạn hoặc không hợp lệ');
      }
      if (status === 403) {
        throw new ForbiddenException(message || 'Ứng dụng hoặc người dùng bị từ chối truy cập');
      }
      throw new BadGatewayException('Không thể kết nối hoặc xác thực với Auth Service');
    }
  }
}`;

  const controllerSnippet = `import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { UserAuthGuard } from './guards/user-auth.guard.js';

@Controller('auth')
export class ProtectedController {
  /**
   * Endpoint minh họa tài nguyên bảo vệ
   * Chỉ cho phép truy cập khi Bearer token và AppToken hợp lệ
   */
  @Get('protected')
  @UseGuards(UserAuthGuard)
  getProtectedResource(@Req() req: any) {
    return {
      message: 'Token xác thực thành công qua Auth Service',
      authenticated: true,
      service: 'demo-service',
      appId: process.env.APP_ID,
      user: {
        id: req.user.id || req.user.userId,
        email: req.user.email,
        name: req.user.name,
        role: req.user.appRole || req.user.role,
      },
      timestamp: new Date().toISOString(),
    };
  }
}`;

  return (
    <div className="quickstart-page" style={{ maxWidth: 960, margin: '0 auto', paddingBottom: 48 }}>
      {/* 1. Header Card with App Selector (Firebase Console Style) */}
      <div
        className="card"
        style={{
          background: 'var(--bg-surface, #111827)',
          border: '1px solid var(--border-subtle, #1e293b)',
          borderRadius: 8,
          padding: '24px',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ flex: 1, minWidth: 320 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: 'rgba(99, 102, 241, 0.15)',
                  color: 'var(--primary, #6366f1)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                }}
              >
                Microservice Quickstart
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-dim, #64748b)' }}>• 4 Bước Tích Hợp</span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px', color: '#fff' }}>
              {lang === 'vi' ? 'Hướng Dẫn Tích Hợp API Microservice' : 'Microservice Integration Quickstart'}
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted, #94a3b8)', lineHeight: 1.5, maxWidth: 620 }}>
              {lang === 'vi'
                ? 'Tài liệu kỹ thuật và mã mẫu chuẩn giúp client microservice kết nối an toàn với Auth Service thông qua cặp khóa X-App-Id / X-App-Token và xác minh Bearer JWT tập trung.'
                : 'Standard code templates and documentation for microservices to integrate securely with Auth Service via X-App-Id, X-App-Token and Bearer JWT token verification.'}
            </p>
          </div>

          {/* Application Selector Box */}
          <div
            style={{
              background: 'var(--bg-card, #1e293b)',
              border: '1px solid var(--border-medium, #334155)',
              padding: '14px 18px',
              borderRadius: 8,
              minWidth: 280,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {lang === 'vi' ? 'Ứng Dụng Đang Chọn:' : 'Selected Application:'}
              </span>
              {selectedApp && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '1px 6px',
                    borderRadius: 4,
                    background: selectedApp.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: selectedApp.status === 'ACTIVE' ? 'var(--success, #10b981)' : 'var(--danger, #ef4444)',
                    border: selectedApp.status === 'ACTIVE' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                  }}
                >
                  {selectedApp.status || 'ACTIVE'}
                </span>
              )}
            </div>

            {applications.length > 0 ? (
              <select
                id="select-quickstart-app"
                value={selectedAppId}
                onChange={(e) => handleSelectApp(e.target.value)}
                className="form-control"
                style={{
                  background: 'var(--bg-input, #0f172a)',
                  border: '1px solid var(--border-medium, #334155)',
                  color: '#fff',
                  padding: '7px 10px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none',
                  width: '100%',
                }}
              >
                {applications.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.name} ({app.appId || app.id.slice(0, 8)})
                  </option>
                ))}
              </select>
            ) : (
              <div>
                {onOpenCreateApp && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={onOpenCreateApp}
                    style={{ width: '100%' }}
                  >
                    {lang === 'vi' ? '+ Tạo Ứng Dụng Mới' : '+ Create Application'}
                  </button>
                )}
              </div>
            )}

            {/* AppID Quick Copy Pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--border-subtle, #334155)',
                borderRadius: 5,
                fontSize: 12,
              }}
            >
              <span style={{ fontFamily: 'monospace', color: '#38bdf8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 190 }}>
                {appIdDisplay}
              </span>
              <button
                type="button"
                id="btn-copy-quickstart-appid"
                onClick={() => copyToClipboard(appIdDisplay, 'AppID', 'appid')}
                className="btn btn-secondary btn-sm"
                style={{ height: 22, fontSize: 11, padding: '0 6px', flexShrink: 0 }}
              >
                {copiedKey === 'appid' ? (lang === 'vi' ? '✓ Đã chép' : '✓ Copied') : (lang === 'vi' ? 'Sao chép' : 'Copy')}
              </button>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim, #64748b)', lineHeight: 1.3 }}>
              {lang === 'vi'
                ? '* AppToken được bảo mật và quản lý trong tab Cài Đặt ứng dụng.'
                : '* AppToken is secured and managed in Application Settings.'}
            </div>
          </div>
        </div>
      </div>

      {/* Step 1: .env config */}
      <div
        className="card"
        style={{
          background: 'var(--bg-surface, #111827)',
          border: '1px solid var(--border-subtle, #1e293b)',
          borderRadius: 8,
          overflow: 'hidden',
          marginBottom: 20,
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle, #1e293b)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: 'rgba(99, 102, 241, 0.15)',
                color: 'var(--primary, #6366f1)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              1
            </span>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 2px', color: '#fff' }}>
                {lang === 'vi' ? 'Cấu Hình Biến Môi Trường (.env Microservice)' : 'Environment Configuration (.env)'}
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)', margin: 0 }}>
                {lang === 'vi'
                  ? 'Khai báo thông tin định danh ứng dụng vào file .env của client service'
                  : 'Declare application credentials in the client microservice .env'}
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-copy-quickstart-env"
            className="btn btn-secondary btn-sm"
            onClick={() => copyToClipboard(envSnippet, '.env', 'env')}
            style={{ fontSize: 12, height: 30, padding: '0 12px', flexShrink: 0 }}
          >
            {copiedKey === 'env' ? (lang === 'vi' ? '✓ Đã sao chép' : '✓ Copied') : (lang === 'vi' ? 'Sao chép .env' : 'Copy .env')}
          </button>
        </div>
        <div style={{ padding: '16px 20px', background: '#0b1120' }}>
          <pre
            id="snippet-quickstart-env"
            style={{
              background: '#060911',
              padding: 16,
              borderRadius: 6,
              fontFamily: 'monospace',
              fontSize: 12,
              color: '#38bdf8',
              overflowX: 'auto',
              margin: 0,
              lineHeight: 1.6,
              border: '1px solid #1e293b',
            }}
          >
            {envSnippet}
          </pre>
        </div>
      </div>

      {/* Step 2: cURL Example */}
      <div
        className="card"
        style={{
          background: 'var(--bg-surface, #111827)',
          border: '1px solid var(--border-subtle, #1e293b)',
          borderRadius: 8,
          overflow: 'hidden',
          marginBottom: 20,
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle, #1e293b)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--success, #10b981)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              2
            </span>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 2px', color: '#fff' }}>
                {lang === 'vi' ? 'Ví Dụ Gọi API Với X-App-Id, X-App-Token & Bearer JWT' : 'API Call with App Headers & Bearer JWT'}
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)', margin: 0 }}>
                {lang === 'vi'
                  ? 'Client gửi token người dùng kèm định danh ứng dụng để xác thực tập trung'
                  : 'Send Bearer JWT with X-App-Id and X-App-Token headers'}
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-copy-quickstart-curl"
            className="btn btn-secondary btn-sm"
            onClick={() => copyToClipboard(curlSnippet, 'cURL', 'curl')}
            style={{ fontSize: 12, height: 30, padding: '0 12px', flexShrink: 0 }}
          >
            {copiedKey === 'curl' ? (lang === 'vi' ? '✓ Đã sao chép' : '✓ Copied') : (lang === 'vi' ? 'Sao chép cURL' : 'Copy cURL')}
          </button>
        </div>
        <div style={{ padding: '16px 20px', background: '#0b1120' }}>
          <pre
            id="snippet-quickstart-curl"
            style={{
              background: '#060911',
              padding: 16,
              borderRadius: 6,
              fontFamily: 'monospace',
              fontSize: 12,
              color: '#10b981',
              overflowX: 'auto',
              margin: 0,
              lineHeight: 1.6,
              border: '1px solid #1e293b',
            }}
          >
            {curlSnippet}
          </pre>
        </div>
      </div>

      {/* Step 3: NestJS UserAuthGuard */}
      <div
        className="card"
        style={{
          background: 'var(--bg-surface, #111827)',
          border: '1px solid var(--border-subtle, #1e293b)',
          borderRadius: 8,
          overflow: 'hidden',
          marginBottom: 20,
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle, #1e293b)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: 'rgba(245, 158, 11, 0.15)',
                color: 'var(--warning, #f59e0b)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              3
            </span>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 2px', color: '#fff' }}>
                {lang === 'vi' ? 'Ví Dụ UserAuthGuard NestJS (Xác Minh Qua GET /users/verify-app-user)' : 'NestJS UserAuthGuard Implementation'}
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)', margin: 0 }}>
                {lang === 'vi'
                  ? 'Guard tự động trích xuất token, kiểm tra phạm vi appId và gắn req.user vào request'
                  : 'Guard verifies token, enforces appId scope, and sets req.user'}
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-copy-quickstart-guard"
            className="btn btn-secondary btn-sm"
            onClick={() => copyToClipboard(guardSnippet, 'Guard code', 'guard')}
            style={{ fontSize: 12, height: 30, padding: '0 12px', flexShrink: 0 }}
          >
            {copiedKey === 'guard' ? (lang === 'vi' ? '✓ Đã sao chép' : '✓ Copied') : (lang === 'vi' ? 'Sao chép Guard' : 'Copy Guard')}
          </button>
        </div>
        <div style={{ padding: '16px 20px', background: '#0b1120' }}>
          <pre
            id="snippet-quickstart-guard"
            style={{
              background: '#060911',
              padding: 16,
              borderRadius: 6,
              fontFamily: 'monospace',
              fontSize: 12,
              color: '#cbd5e1',
              overflowX: 'auto',
              margin: 0,
              maxHeight: 400,
              lineHeight: 1.5,
              border: '1px solid #1e293b',
            }}
          >
            {guardSnippet}
          </pre>
        </div>
      </div>

      {/* Step 4: Protected Controller & HTTP Status Code Reference */}
      <div
        className="card"
        style={{
          background: 'var(--bg-surface, #111827)',
          border: '1px solid var(--border-subtle, #1e293b)',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle, #1e293b)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: 'rgba(14, 165, 233, 0.15)',
                color: '#38bdf8',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              4
            </span>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 2px', color: '#fff' }}>
                {lang === 'vi' ? 'Ví Dụ Controller Bảo Vệ & Bảng Giải Thích Mã Lỗi HTTP' : 'Protected Controller & HTTP Status Codes'}
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)', margin: 0 }}>
                {lang === 'vi'
                  ? 'Khai báo @UseGuards(UserAuthGuard) và giải thích ý nghĩa các mã HTTP trả về'
                  : 'Using @UseGuards(UserAuthGuard) and status code interpretations'}
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-copy-quickstart-controller"
            className="btn btn-secondary btn-sm"
            onClick={() => copyToClipboard(controllerSnippet, 'Controller code', 'controller')}
            style={{ fontSize: 12, height: 30, padding: '0 12px', flexShrink: 0 }}
          >
            {copiedKey === 'controller' ? (lang === 'vi' ? '✓ Đã sao chép' : '✓ Copied') : (lang === 'vi' ? 'Sao chép Controller' : 'Copy Controller')}
          </button>
        </div>
        <div style={{ padding: '16px 20px', background: '#0b1120' }}>
          <pre
            id="snippet-quickstart-controller"
            style={{
              background: '#060911',
              padding: 16,
              borderRadius: 6,
              fontFamily: 'monospace',
              fontSize: 12,
              color: '#f8fafc',
              overflowX: 'auto',
              margin: 0,
              lineHeight: 1.5,
              border: '1px solid #1e293b',
            }}
          >
            {controllerSnippet}
          </pre>

          {/* Status Code Reference Table */}
          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: '0 0 12px' }}>
              {lang === 'vi' ? 'Bảng giải thích mã HTTP phản hồi (200 / 401 / 403 / 502):' : 'HTTP Status Code Reference (200 / 401 / 403 / 502):'}
            </h3>
            <div style={{ overflowX: 'auto', borderRadius: 6, border: '1px solid #1e293b' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 12,
                  textAlign: 'left',
                  background: '#060911',
                }}
              >
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', background: 'rgba(30, 41, 59, 0.5)' }}>
                    <th style={{ padding: '10px 14px', width: 140 }}>{lang === 'vi' ? 'Mã HTTP' : 'Status'}</th>
                    <th style={{ padding: '10px 14px', width: 150 }}>{lang === 'vi' ? 'Tình trạng' : 'State'}</th>
                    <th style={{ padding: '10px 14px' }}>{lang === 'vi' ? 'Ý nghĩa & Nguyên nhân trong Microservice' : 'Meaning & Cause in Microservice'}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success, #10b981)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                        200 OK
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#fff', fontWeight: 600 }}>
                      {lang === 'vi' ? 'Hợp lệ' : 'Success'}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#94a3b8', lineHeight: 1.4 }}>
                      {lang === 'vi'
                        ? 'Token người dùng và AppToken đều chính xác. Cho phép truy cập tài nguyên bảo vệ.'
                        : 'User token and AppToken are valid. Access to protected resource is granted.'}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning, #f59e0b)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                        401 Unauthorized
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#fff', fontWeight: 600 }}>
                      {lang === 'vi' ? 'Lỗi xác thực' : 'Unauthorized'}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#94a3b8', lineHeight: 1.4 }}>
                      {lang === 'vi'
                        ? 'Thiếu Bearer token, token người dùng hết hạn/bị thu hồi, hoặc AppToken không đúng.'
                        : 'Missing Bearer token, expired/revoked user token, or invalid AppToken.'}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger, #ef4444)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                        403 Forbidden
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#fff', fontWeight: 600 }}>
                      {lang === 'vi' ? 'Bị từ chối' : 'Forbidden'}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#94a3b8', lineHeight: 1.4 }}>
                      {lang === 'vi'
                        ? 'Token thuộc Application khác, hoặc ứng dụng bị vô hiệu hóa (INACTIVE), hoặc AppUser bị từ chối truy cập.'
                        : 'Token belongs to another application, or application is INACTIVE, or AppUser is denied access.'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: 'rgba(148, 163, 184, 0.15)', color: 'var(--text-dim, #94a3b8)', border: '1px solid rgba(148, 163, 184, 0.3)' }}>
                        502 Bad Gateway
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#fff', fontWeight: 600 }}>
                      {lang === 'vi' ? 'Lỗi kết nối' : 'Gateway Error'}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#94a3b8', lineHeight: 1.4 }}>
                      {lang === 'vi'
                        ? 'Client service không thể kết nối hoặc không nhận được phản hồi từ máy chủ Auth Service.'
                        : 'Client microservice cannot reach or connect to Auth Service.'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickstartPage;