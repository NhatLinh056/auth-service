import React, { useState } from 'react';
import type { Application } from '../../types/application.types';
import { useToast } from '../../contexts/ToastContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface QuickstartTabProps {
  applications: Application[];
}

export const QuickstartTab: React.FC<QuickstartTabProps> = ({ applications }) => {
  const { showToast } = useToast();
  const { lang } = useLanguage();
  const [selectedAppId, setSelectedAppId] = useState<string>(
    applications[0]?.id || ''
  );

  const selectedApp = applications.find(a => a.id === selectedAppId) || applications[0];
  const appIdDisplay = selectedApp?.id || 'app_22c57454b00eb44a55c66bf4';
  const appTokenDisplay = selectedApp?.appToken || 'apt_replace_with_your_generated_token';

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      showToast(lang === 'vi' ? `Đã sao chép ${label}` : `Copied ${label}`, 'success');
    }).catch(() => {
      showToast(lang === 'vi' ? 'Không thể sao chép' : 'Failed to copy', 'error');
    });
  };

  const envSnippet = `# .env (Client Microservice Configuration)
PORT=3001
PUBLIC_URL=http://localhost:3001
AUTH_SERVICE_URL=http://localhost:3000
APP_ID=${appIdDisplay}
APP_TOKEN=${appTokenDisplay}`;

  const curlSnippet = `curl -X GET http://localhost:3000/users/verify-app-user \\
  -H "Authorization: Bearer <USER_SESSION_JWT>" \\
  -H "X-App-Id: ${appIdDisplay}" \\
  -H "X-App-Token: ${appTokenDisplay}"`;

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

      req.user = user; // Gắn hồ sơ đã xác minh vào request
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
export class AuthProtectedController {
  @Get('protected')
  @UseGuards(UserAuthGuard)
  getProtectedResource(@Req() req: any) {
    return {
      success: true,
      message: 'Truy cập tài nguyên thành công với tư cách AppUser',
      appUser: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        appRole: req.user.appRole,
      },
    };
  }
}`;

  return (
    <div className="quickstart-page" style={{ maxWidth: 960, margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">{lang === 'vi' ? 'Hướng Dẫn Tích Hợp Microservice' : 'Microservice Integration Quickstart'}</h1>
          <p className="page-subtitle">
            {lang === 'vi'
              ? 'Tài liệu kỹ thuật và mẫu code chuẩn để microservice kết nối an toàn với Auth Service.'
              : 'Technical documentation and standard code templates to integrate microservices with Auth Service.'}
          </p>
        </div>

        {applications.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {lang === 'vi' ? 'Chọn Ứng Dụng:' : 'Select Application:'}
            </span>
            <select
              value={selectedAppId}
              onChange={(e) => setSelectedAppId(e.target.value)}
              className="form-control"
              style={{ width: 220, fontSize: 13 }}
            >
              {applications.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Part 1: .env config */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="section-title">1. {lang === 'vi' ? 'Cấu Hình Biến Môi Trường (.env Microservice)' : 'Environment Variables (.env)'}</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>
              {lang === 'vi'
                ? 'Khai báo thông tin định danh của ứng dụng client trong file .env'
                : 'Configure client application credentials in your client .env file'}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => copyToClipboard(envSnippet, '.env snippet')}
          >
            {lang === 'vi' ? 'Sao chép .env' : 'Copy .env'}
          </button>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <pre style={{ background: '#060911', padding: 14, borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: 12, color: '#38bdf8', overflowX: 'auto', margin: 0 }}>
            {envSnippet}
          </pre>
        </div>
      </div>

      {/* Part 2: cURL */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="section-title">2. {lang === 'vi' ? 'Gọi API Xác Minh AppUser Bằng cURL' : 'Verify AppUser via cURL'}</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>
              {lang === 'vi'
                ? 'Gửi kèm Bearer token của User cùng cặp định danh X-App-Id và X-App-Token'
                : 'Send Bearer token with X-App-Id and X-App-Token headers'}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => copyToClipboard(curlSnippet, 'cURL snippet')}
          >
            {lang === 'vi' ? 'Sao chép cURL' : 'Copy cURL'}
          </button>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <pre style={{ background: '#060911', padding: 14, borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: 12, color: '#10b981', overflowX: 'auto', margin: 0 }}>
            {curlSnippet}
          </pre>
        </div>
      </div>

      {/* Part 3: UserAuthGuard */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="section-title">3. {lang === 'vi' ? 'UserAuthGuard Mẫu Chuẩn Cho NestJS' : 'Standard NestJS UserAuthGuard'}</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>
              {lang === 'vi'
                ? 'Guard tự động xác minh token, kiểm tra phạm vi appId, và gắn req.user vào request'
                : 'Guard verifies token, enforces appId scope, and sets req.user'}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => copyToClipboard(guardSnippet, 'Guard code')}
          >
            {lang === 'vi' ? 'Sao chép Guard' : 'Copy Guard'}
          </button>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <pre style={{ background: '#060911', padding: 14, borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: 12, color: '#cbd5e1', overflowX: 'auto', margin: 0, maxHeight: 400 }}>
            {guardSnippet}
          </pre>
        </div>
      </div>

      {/* Part 4: Protected API */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="section-title">4. {lang === 'vi' ? 'Ví Dụ Controller Bảo Vệ & Mã Lỗi' : 'Protected Controller Example & Status Codes'}</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>
              {lang === 'vi'
                ? 'Cách sử dụng @UseGuards(UserAuthGuard) và xử lý mã lỗi 200, 401, 403, 502'
                : 'Using @UseGuards(UserAuthGuard) and handling 200, 401, 403, 502'}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => copyToClipboard(controllerSnippet, 'Controller code')}
          >
            {lang === 'vi' ? 'Sao chép Controller' : 'Copy Controller'}
          </button>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <pre style={{ background: '#060911', padding: 14, borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: 12, color: '#f8fafc', overflowX: 'auto', margin: 0 }}>
            {controllerSnippet}
          </pre>
        </div>
      </div>
    </div>
  );
};
