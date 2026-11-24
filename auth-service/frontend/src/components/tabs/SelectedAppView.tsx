import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { applicationsService } from '../../services/applications.service';
import { providersService } from '../../services/providers.service';
import type { Application, AppUser } from '../../types/application.types';
import type { SanitizedOAuthProvider } from '../../types/provider.types';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface SelectedAppViewProps {
  app: Application;
  onBack: () => void;
  onUpdateApp: (updated: Application) => void;
  onDeleteApp: (id: string) => void;
  onOpenConfigureProvider: (provider: SanitizedOAuthProvider) => void;
}

type SubTab = 'users' | 'settings' | 'providers' | 'integration';

export const SelectedAppView: React.FC<SelectedAppViewProps> = ({
  app,
  onBack,
  onUpdateApp,
  onDeleteApp,
  onOpenConfigureProvider,
}) => {
  const { t, lang } = useLanguage();
  const { showToast } = useToast();

  const [activeSubTab, setActiveSubTab] = useState<SubTab>('users');

  // --- App Users State ---
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');

  // --- Settings State ---
  const [nameInput, setNameInput] = useState(app.name);
  const [redirectUrisInput, setRedirectUrisInput] = useState((app.allowedRedirectUris || []).join('\n'));
  const [isTokenMasked, setIsTokenMasked] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isRegeneratingToken, setIsRegeneratingToken] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingApp, setIsDeletingApp] = useState(false);

  // --- Providers State ---
  const [providers, setProviders] = useState<SanitizedOAuthProvider[]>([]);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [togglingProvider, setTogglingProvider] = useState<string | null>(null);
  const [codeSnippetLang, setCodeSnippetLang] = useState<'nodejs' | 'python' | 'curl'>('nodejs');

  // Sync settings inputs when app prop changes
  useEffect(() => {
    setNameInput(app.name);
    setRedirectUrisInput((app.allowedRedirectUris || []).join('\n'));
  }, [app]);

  // Load App Users
  const loadAppUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const users = await applicationsService.getAppUsers(app.id);
      setAppUsers(users);
    } catch (err: any) {
      const errMsg = err?.message || 'Không thể tải danh sách người dùng của ứng dụng';
      setUsersError(errMsg);
      setAppUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, [app.id]);

  // Load Providers
  const loadProviders = useCallback(async () => {
    setProvidersLoading(true);
    try {
      const data = await providersService.findAllByApplication(app.id);
      setProviders(data);
    } catch {
      setProviders([]);
    } finally {
      setProvidersLoading(false);
    }
  }, [app.id]);

  // Initial load on mount or sub-tab switch
  useEffect(() => {
    if (activeSubTab === 'users') {
      loadAppUsers();
    } else if (activeSubTab === 'providers') {
      loadProviders();
    }
  }, [activeSubTab, loadAppUsers, loadProviders]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return appUsers;
    return appUsers.filter((u) => {
      const name = (u.name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const provider = (u.provider || u.identities?.[0]?.provider || '').toLowerCase();
      return name.includes(q) || email.includes(q) || provider.includes(q);
    });
  }, [appUsers, userSearch]);

  // Copy helper
  const copyText = (text: string, label: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => showToast(`${t('toasts.copied')} ${label} ${t('toasts.to_clipboard')}`))
      .catch(() => showToast(t('toasts.copy_fail'), 'error'));
  };

  // Toggle app status
  const handleToggleStatus = async () => {
    const newStatus = app.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const updated = await applicationsService.update(app.id, { status: newStatus });
      onUpdateApp(updated);
      showToast(
        `${t('toasts.status_updated')} ${newStatus === 'ACTIVE' ? t('table.status_active') : t('table.status_inactive')}.`
      );
    } catch (err: any) {
      showToast(err.message || 'Lỗi cập nhật trạng thái', 'error');
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const uris = redirectUrisInput
        .split('\n')
        .map((u) => u.trim())
        .filter(Boolean);

      const updated = await applicationsService.update(app.id, {
        name: nameInput.trim(),
        allowedRedirectUris: uris,
      });

      onUpdateApp(updated);
      showToast(lang === 'vi' ? 'Cập nhật cài đặt ứng dụng thành công' : 'Application settings updated');
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi lưu cài đặt', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Regenerate AppToken
  const handleConfirmRegenerateToken = async () => {
    setIsRegeneratingToken(true);
    try {
      const res = await applicationsService.regenerateToken(app.id);
      const updated = { ...app, appToken: res.appToken };
      onUpdateApp(updated);
      showToast(t('toasts.token_regenerated'));
      setIsTokenMasked(false);
      setShowRegenerateConfirm(false);
    } catch (err: any) {
      showToast(err.message || 'Lỗi tạo lại token', 'error');
    } finally {
      setIsRegeneratingToken(false);
    }
  };

  // Delete App
  const handleConfirmDeleteApp = async () => {
    setIsDeletingApp(true);
    try {
      await applicationsService.delete(app.id);
      showToast(`"${app.name}" ${t('toasts.app_deleted')}`);
      setShowDeleteConfirm(false);
      onDeleteApp(app.id);
      onBack();
    } catch (err: any) {
      showToast(err.message || 'Lỗi xóa ứng dụng', 'error');
    } finally {
      setIsDeletingApp(false);
    }
  };

  // Toggle Provider
  const handleToggleProvider = async (providerName: string) => {
    setTogglingProvider(providerName);
    try {
      const updated = await providersService.toggle(app.id, providerName);
      setProviders((prev) => prev.map((p) => (p.provider === updated.provider ? updated : p)));
      showToast(
        lang === 'vi'
          ? `Đã ${updated.isEnabled ? 'bật' : 'tắt'} ${providerName.toUpperCase()}`
          : `${providerName.toUpperCase()} ${updated.isEnabled ? 'enabled' : 'disabled'}`
      );
    } catch (err: any) {
      showToast(err.message || 'Lỗi cập nhật provider', 'error');
    } finally {
      setTogglingProvider(null);
    }
  };

  const isActive = app.status === 'ACTIVE';
  const authOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const googleCallbackUrl = `${authOrigin}/auth/oauth/google/callback`;
  const facebookCallbackUrl = `${authOrigin}/auth/oauth/facebook/callback`;
  const envSnippet = `# Biến môi trường kết nối Auth Service
AUTH_SERVICE_URL=${authOrigin}
APP_ID=${app.appId}
APP_TOKEN=${app.appToken || '<Xem_trong_tab_Cai_Dat>'}`;

  const nodeSnippet = `// middleware/auth.js - Node.js / Express
export async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Missing Bearer token' });

  try {
    const response = await fetch(\`${authOrigin}/users/verify-app-user\`, {
      headers: {
        'Authorization': \`Bearer \${token}\`,
        'X-App-Id': '${app.appId}',
        'X-App-Token': '${app.appToken || '<YOUR_APP_TOKEN>'}',
      },
    });

    if (!response.ok) throw new Error('Unauthorized');
    req.user = await response.json(); // { id, email, name, role }
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// Áp dụng bảo vệ route trong Express:
// app.get('/api/protected', authMiddleware, (req, res) => res.json(req.user));`;

  const pythonSnippet = `# dependencies/auth.py - Python / FastAPI
import httpx
from fastapi import Security, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    headers = {
        "Authorization": f"Bearer {credentials.credentials}",
        "X-App-Id": "${app.appId}",
        "X-App-Token": "${app.appToken || '<YOUR_APP_TOKEN>'}",
    }
    async with httpx.AsyncClient() as client:
        res = await client.get("${authOrigin}/users/verify-app-user", headers=headers)
        if res.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        return res.json()

# Áp dụng bảo vệ route trong FastAPI:
# @app.get("/api/protected")
# async def protected_route(user = Depends(get_current_user)):
#     return user`;

  const curlSnippet = `# Kiểm tra tính hợp lệ của Token qua cURL
curl -X GET "${authOrigin}/users/verify-app-user" \\
  -H "Authorization: Bearer <USER_ACCESS_TOKEN>" \\
  -H "X-App-Id: ${app.appId}" \\
  -H "X-App-Token: ${app.appToken || '<YOUR_APP_TOKEN>'}"`;

  return (
    <div className="tab-content active" id="selected-app-view">
      {/* Breadcrumb Header & Back Navigation */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onBack}
            id="btn-back-to-apps"
            style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>{lang === 'vi' ? 'Quay lại danh sách' : 'Back to Applications'}</span>
          </button>
          <span style={{ color: 'var(--border-subtle, #334155)' }}>/</span>
          <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>App</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 className="page-title" style={{ margin: 0, fontSize: 24 }}>
              {app.name}
            </h1>
            <span className={`status-indicator ${isActive ? 'active' : 'inactive'}`} style={{ fontSize: 12, padding: '4px 10px' }}>
              {isActive ? t('table.status_active') : t('table.status_inactive')}
            </span>
            <span className="mono-tag" style={{ fontSize: 12 }}>
              {app.appId}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              className={`btn ${isActive ? 'btn-secondary' : 'btn-success-subtle'} btn-sm`}
              onClick={handleToggleStatus}
            >
              {isActive ? t('table.deactivate') : t('table.activate')}
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div style={{ borderBottom: '1px solid var(--border-subtle, #334155)', marginBottom: 24, display: 'flex', gap: 4 }}>
        <button
          type="button"
          className={`nav-tab ${activeSubTab === 'users' ? 'active' : ''}`}
          id="subtab-btn-users"
          onClick={() => setActiveSubTab('users')}
          style={{ padding: '10px 16px', borderBottom: activeSubTab === 'users' ? '2px solid var(--primary, #3b82f6)' : 'none' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span>{lang === 'vi' ? 'Người dùng (Authentication Users)' : 'Authentication Users'}</span>
            <span className="results-count-badge" style={{ fontSize: 11, padding: '1px 6px' }}>
              {appUsers.length}
            </span>
          </span>
        </button>

        <button
          type="button"
          className={`nav-tab ${activeSubTab === 'settings' ? 'active' : ''}`}
          id="subtab-btn-settings"
          onClick={() => setActiveSubTab('settings')}
          style={{ padding: '10px 16px', borderBottom: activeSubTab === 'settings' ? '2px solid var(--primary, #3b82f6)' : 'none' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            <span>{lang === 'vi' ? 'Cài đặt (Settings)' : 'Settings'}</span>
          </span>
        </button>

        <button
          type="button"
          className={`nav-tab ${activeSubTab === 'providers' ? 'active' : ''}`}
          id="subtab-btn-providers"
          onClick={() => setActiveSubTab('providers')}
          style={{ padding: '10px 16px', borderBottom: activeSubTab === 'providers' ? '2px solid var(--primary, #3b82f6)' : 'none' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            <span>{lang === 'vi' ? 'Sign-in Providers (Google/Facebook)' : 'Sign-in Providers'}</span>
          </span>
        </button>

        <button
          type="button"
          className={`nav-tab ${activeSubTab === 'integration' ? 'active' : ''}`}
          id="subtab-btn-integration"
          onClick={() => setActiveSubTab('integration')}
          style={{ padding: '10px 16px', borderBottom: activeSubTab === 'integration' ? '2px solid var(--primary, #3b82f6)' : 'none' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="16 18 22 12 16 6"></polyline>
              <polyline points="8 6 2 12 8 18"></polyline>
            </svg>
            <span>{lang === 'vi' ? 'Hướng Dẫn Tích Hợp (Quickstart)' : 'Integration Guide'}</span>
          </span>
        </button>
      </div>

      {/* ==================== SUB-TAB 1: USERS ==================== */}
      {activeSubTab === 'users' && (
        <div>
          {/* Toolbar */}
          <div className="table-toolbar" style={{ marginBottom: 16 }}>
            <div className="table-toolbar-left" style={{ flex: 1, maxWidth: 360 }}>
              <div className="search-input-wrapper" style={{ width: '100%' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  type="text"
                  className="search-input"
                  placeholder={lang === 'vi' ? 'Tìm theo email, tên, provider...' : 'Search by email, name, provider...'}
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  id="app-users-search"
                />
              </div>
            </div>

            <div className="table-toolbar-right" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={loadAppUsers} disabled={usersLoading}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}>
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <polyline points="1 20 1 14 7 14"></polyline>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
                <span>{lang === 'vi' ? 'Làm mới' : 'Refresh'}</span>
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {usersError && (
            <div className="card" style={{ padding: 16, marginBottom: 16, borderLeft: '4px solid var(--danger, #ef4444)', background: 'rgba(239, 68, 68, 0.1)' }}>
              <div style={{ color: 'var(--danger, #ef4444)', fontWeight: 600 }}>{usersError}</div>
              {(usersError.toLowerCase().includes('quyền') || usersError.includes('403')) && (
                <p style={{ margin: '4px 0 0 0', fontSize: 13, color: 'var(--text-dim)' }}>
                  {lang === 'vi'
                    ? 'Bạn chỉ có quyền xem danh sách người dùng của các ứng dụng do bạn sở hữu hoặc khi là System Admin.'
                    : 'You only have permission to view users of applications you own or as System Admin.'}
                </p>
              )}
            </div>
          )}

          {/* Table */}
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{lang === 'vi' ? 'Người dùng / Email' : 'User / Email'}</th>
                  <th>{lang === 'vi' ? 'Phương thức đăng nhập gần nhất' : 'Last Login Method'}</th>
                  <th>{lang === 'vi' ? 'AppUser ID' : 'AppUser ID'}</th>
                  <th>{lang === 'vi' ? 'Vai trò App' : 'App Role'}</th>
                  <th>{lang === 'vi' ? 'Ngày tham gia' : 'Joined App At'}</th>
                </tr>
              </thead>
              <tbody id="app-users-table-body">
                {usersLoading ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 36 }}>
                      {lang === 'vi' ? 'Đang tải người dùng ứng dụng...' : 'Loading application users...'}
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 48 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6, color: 'var(--text-main, #e2e8f0)' }}>
                        {lang === 'vi' ? 'Chưa có người dùng nào thuộc ứng dụng này' : 'No users found for this application'}
                      </div>
                      <p style={{ margin: 0, fontSize: 13, maxWidth: 460, marginInline: 'auto' }}>
                        {lang === 'vi'
                          ? 'Khi người dùng đăng nhập vào ứng dụng qua OAuth (Google/Facebook) hoặc tài khoản nền tảng, họ sẽ xuất hiện tại đây.'
                          : 'When users sign in to this application via OAuth or centralized login, their AppUser profile will appear here.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const rawMethod = u.lastLoginMethod || u.provider || u.identities?.[0]?.provider || null;
                    const isGoogle = rawMethod ? rawMethod.toUpperCase().includes('GOOGLE') : false;
                    const isFacebook = rawMethod ? rawMethod.toUpperCase().includes('FACEBOOK') : false;
                    const isPassword = rawMethod ? rawMethod.toUpperCase().includes('PASSWORD') : false;
                    const isPlatformSession = rawMethod ? rawMethod.toUpperCase().includes('PLATFORM_SESSION') : false;

                    let displayMethod = lang === 'vi' ? 'Chưa xác định' : 'UNKNOWN';
                    let badgeBg = 'rgba(148, 163, 184, 0.15)';
                    let badgeColor = '#94a3b8';

                    if (isGoogle) {
                      displayMethod = 'Google';
                      badgeBg = 'rgba(234, 67, 53, 0.15)';
                      badgeColor = '#ea4335';
                    } else if (isFacebook) {
                      displayMethod = 'Facebook';
                      badgeBg = 'rgba(24, 119, 242, 0.15)';
                      badgeColor = '#1877f2';
                    } else if (isPassword) {
                      displayMethod = lang === 'vi' ? 'Mật khẩu' : 'Password';
                      badgeBg = 'rgba(168, 85, 247, 0.15)';
                      badgeColor = '#c084fc';
                    } else if (isPlatformSession) {
                      displayMethod = lang === 'vi' ? 'Phiên nền tảng' : 'Platform Session';
                      badgeBg = 'rgba(56, 189, 248, 0.15)';
                      badgeColor = '#38bdf8';
                    }

                    const joinedDate = u.createdAt ? new Date(u.createdAt).toLocaleString() : '—';
                    return (
                      <tr key={u.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: '#fff' }}>{u.name || (lang === 'vi' ? 'Khách hàng' : 'User')}</div>
                          <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{u.email}</div>
                        </td>
                        <td>
                          <span
                            className="status-pill status-pill-primary"
                            style={{
                              textTransform: isGoogle || isFacebook ? 'none' : 'none',
                              fontSize: 11,
                              fontWeight: 600,
                              background: badgeBg,
                              color: badgeColor,
                            }}
                          >
                            {displayMethod}
                          </span>
                        </td>
                        <td>
                          <span className="mono-tag" style={{ fontSize: 12 }}>
                            {u.id}
                          </span>
                        </td>
                        <td>
                          <span className="status-pill status-pill-neutral" style={{ fontSize: 11 }}>
                            {u.role || 'USER'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-dim)', fontSize: 13 }}>{joinedDate}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== SUB-TAB 2: SETTINGS ==================== */}
      {activeSubTab === 'settings' && (
        <div style={{ maxWidth: 760 }}>
          <form onSubmit={handleSaveSettings} className="card" style={{ padding: 24, marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 18, color: '#fff' }}>
              {lang === 'vi' ? 'Thông Tin Cơ Bản Ứng Dụng' : 'Application Settings'}
            </h3>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">{lang === 'vi' ? 'Tên Ứng Dụng' : 'Application Name'}</label>
              <input
                type="text"
                className="form-control"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                required
                id="input-app-name-settings"
              />
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Application ID (AppID)</label>
              <div className="credential-row">
                <span className="credential-value" id="display-app-id">{app.appId}</span>
                <div className="credential-actions">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => copyText(app.appId, 'AppID')}>
                    {lang === 'vi' ? 'Sao chép' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            {/* App Token Section */}
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">
                AppToken ({lang === 'vi' ? 'Mã bí mật kết nối Microservice' : 'Backend Microservice Secret Token'})
              </label>
              <div className="credential-row" style={{ marginBottom: 8 }}>
                <span className="credential-value" id="display-app-token">
                  {isTokenMasked ? '••••••••••••••••••••••••••••••••' : (app.appToken || '—')}
                </span>
                <div className="credential-actions">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsTokenMasked(!isTokenMasked)}>
                    {isTokenMasked ? (lang === 'vi' ? 'Hiện' : 'Show') : (lang === 'vi' ? 'Ẩn' : 'Hide')}
                  </button>
                  {app.appToken && (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => copyText(app.appToken!, 'AppToken')}>
                      {lang === 'vi' ? 'Sao chép' : 'Copy'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowRegenerateConfirm(true)}
                    disabled={isRegeneratingToken}
                    style={{ color: 'var(--warning, #f59e0b)', borderColor: 'rgba(245, 158, 11, 0.3)' }}
                    id="btn-regenerate-token"
                  >
                    {isRegeneratingToken
                      ? (lang === 'vi' ? 'Đang tạo...' : 'Generating...')
                      : (lang === 'vi' ? 'Tạo lại AppToken' : 'Regenerate AppToken')}
                  </button>
                </div>
              </div>
              <div className="form-hint">
                {lang === 'vi'
                  ? 'Gắn vào header X-App-Id và X-App-Token khi gọi Auth Service.'
                  : 'Attach to X-App-Id and X-App-Token headers when calling Auth Service.'}
              </div>
              <div
                style={{
                  marginTop: 10,
                  padding: '10px 14px',
                  background: 'rgba(59, 130, 246, 0.08)',
                  borderRadius: 6,
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--text-main, #e2e8f0)' }}>
                  💡 {lang === 'vi' ? 'Cần mẫu kết nối cho ứng dụng ngoài?' : 'Need connection guide for client app?'}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={() => setActiveSubTab('integration')}
                  style={{ color: '#60a5fa' }}
                >
                  {lang === 'vi' ? 'Xem Hướng Dẫn Tích Hợp →' : 'View Quickstart Guide →'}
                </button>
              </div>
            </div>

            {/* Allowed Redirect URIs */}
            <div className="form-group" style={{ marginBottom: 24 }}>
              <label className="form-label">
                {lang === 'vi' ? 'Allowed Redirect URIs (Mỗi dòng một URI)' : 'Allowed Redirect URIs (One per line)'}
              </label>
              <textarea
                className="form-control form-control-mono"
                rows={4}
                placeholder="https://example.com/callback&#10;http://localhost:3001/"
                value={redirectUrisInput}
                onChange={(e) => setRedirectUrisInput(e.target.value)}
                id="input-redirect-uris-settings"
                style={{ resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
              />
              <div className="form-hint">
                {lang === 'vi'
                  ? 'Các URL chuyển hướng OAuth hợp lệ sau khi người dùng đăng nhập thành công.'
                  : 'Valid OAuth redirection URLs allowed for this application.'}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 16 }}>
              <button type="submit" className="btn btn-primary" disabled={isSavingSettings} id="btn-save-app-settings">
                {isSavingSettings ? (lang === 'vi' ? 'Đang lưu...' : 'Saving...') : (lang === 'vi' ? 'Lưu Cài Đặt' : 'Save Settings')}
              </button>
            </div>
          </form>

          {/* Danger Zone */}
          <div className="card" style={{ padding: 24, border: '1px solid var(--danger, #ef4444)', background: 'rgba(239, 68, 68, 0.05)', marginTop: 24 }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 16, color: 'var(--danger, #ef4444)' }}>
              {lang === 'vi' ? 'Vùng Nguy Hiểm (Danger Zone)' : 'Danger Zone'}
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: 13, color: 'var(--text-dim)' }}>
              {lang === 'vi'
                ? 'Hành động xóa ứng dụng là vĩnh viễn và không thể hoàn tác. Mọi AppUser và cấu hình OAuth liên kết sẽ bị xóa.'
                : 'Deleting an application is permanent and cannot be undone. All associated AppUsers and OAuth configs will be removed.'}
            </p>
            <button type="button" className="btn btn-danger btn-sm" onClick={() => setShowDeleteConfirm(true)} id="btn-delete-app">
              {lang === 'vi' ? 'Xóa Ứng Dụng Này' : 'Delete Application'}
            </button>
          </div>
        </div>
      )}

      {/* ==================== SUB-TAB 3: PROVIDERS ==================== */}
      {activeSubTab === 'providers' && (
        <div>
          <div className="page-header" style={{ marginBottom: 20 }}>
            <div>
              <h2 className="card-title" style={{ margin: 0, fontSize: 18 }}>
                {lang === 'vi' ? 'Cấu Hình OAuth Sign-in Methods' : 'OAuth Sign-in Methods'}
              </h2>
              <p className="card-subtitle" style={{ fontSize: 13, color: 'var(--text-dim)', margin: '4px 0 0 0' }}>
                {lang === 'vi'
                  ? 'Bật/tắt và cài đặt Client ID, Client Secret độc lập cho từng nhà cung cấp của ứng dụng này.'
                  : 'Configure and toggle Google / Facebook OAuth credentials independently for this app.'}
              </p>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={loadProviders} disabled={providersLoading}>
              <span>{lang === 'vi' ? 'Làm mới' : 'Refresh'}</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            {['google', 'facebook'].map((providerKey) => {
              const p = providers.find((item) => item.provider.toLowerCase() === providerKey);
              const isEnabled = p?.isEnabled || false;
              const hasClientId = Boolean(p?.clientId);
              const hasSecret = Boolean(p?.hasSecret);

              return (
                <div key={providerKey} className="card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 16,
                          textTransform: 'uppercase',
                          color: providerKey === 'google' ? '#ea4335' : '#1877f2',
                        }}
                      >
                        {providerKey.toUpperCase()}
                      </span>
                      <span className={`status-indicator ${isEnabled ? 'active' : 'inactive'}`}>
                        {isEnabled ? 'ENABLED' : 'DISABLED'}
                      </span>
                    </div>

                    <button
                      type="button"
                      className={`btn ${isEnabled ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                      onClick={() => handleToggleProvider(providerKey)}
                      disabled={togglingProvider === providerKey}
                    >
                      {togglingProvider === providerKey
                        ? '...'
                        : isEnabled
                        ? (lang === 'vi' ? 'Tắt' : 'Disable')
                        : (lang === 'vi' ? 'Bật' : 'Enable')}
                    </button>
                  </div>

                  <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 16 }}>
                    <div style={{ marginBottom: 4 }}>
                      <strong style={{ color: 'var(--text-main, #e2e8f0)' }}>Client ID: </strong>
                      {hasClientId ? <span className="mono-tag">{p?.clientId}</span> : <em>(Chưa cấu hình)</em>}
                    </div>
                    <div>
                      <strong style={{ color: 'var(--text-main, #e2e8f0)' }}>Client Secret: </strong>
                      {hasSecret ? <span style={{ color: 'var(--success, #10b981)' }}>✓ Đã bảo mật</span> : <em>(Chưa nhập)</em>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() =>
                        onOpenConfigureProvider(
                          p || {
                            id: '',
                            applicationId: app.id,
                            provider: providerKey.toUpperCase() as any,
                            clientId: '',
                            hasSecret: false,
                            callbackUrl: '',
                            isEnabled: false,
                            createdAt: '',
                            updatedAt: '',
                          }
                        )
                      }
                    >
                      {lang === 'vi' ? 'Cấu Hình Provider' : 'Configure Provider'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================== SUB-TAB 4: INTEGRATION GUIDE ==================== */}
      {activeSubTab === 'integration' && (
        <div style={{ maxWidth: 840 }}>
          {/* Header */}
          <div className="page-header" style={{ marginBottom: 20 }}>
            <div>
              <h2 className="card-title" style={{ margin: 0, fontSize: 18, color: '#fff' }}>
                {lang === 'vi' ? 'Hướng Dẫn Tích Hợp Ứng Dụng Khách' : 'Client Application Integration Guide'}
              </h2>
              <p className="card-subtitle" style={{ fontSize: 13, color: 'var(--text-dim)', margin: '4px 0 0 0' }}>
                {lang === 'vi'
                  ? 'Hướng dẫn từng bước kết nối backend hoặc frontend ứng dụng của bạn với Auth Service.'
                  : 'Step-by-step instructions to connect your backend or frontend with Auth Service.'}
              </p>
            </div>
            <a
              href="/api"
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
              id="btn-open-swagger-docs"
            >
              <span>Swagger API Docs</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </a>
          </div>

          {/* Step 1: .env config */}
          <div className="card" style={{ padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="status-pill status-pill-primary" style={{ fontSize: 11 }}>BƯỚC 1</span>
                <strong style={{ fontSize: 15, color: '#fff' }}>
                  {lang === 'vi' ? 'Cấu Hình Môi Trường (.env)' : 'Environment Variables (.env)'}
                </strong>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-xs"
                onClick={() => copyText(envSnippet, '.env configuration')}
                id="btn-copy-env-snippet"
              >
                {lang === 'vi' ? 'Sao chép .env' : 'Copy .env'}
              </button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 12px 0' }}>
              {lang === 'vi'
                ? 'Thêm các biến sau vào file .env của dịch vụ backend ứng dụng (ví dụ: Express, NestJS, FastAPI):'
                : 'Add the following variables to your client backend service .env file:'}
            </p>
            <pre
              style={{
                margin: 0,
                padding: '12px 16px',
                background: 'var(--bg-input, #0f172a)',
                borderRadius: 6,
                border: '1px solid var(--border-subtle, #334155)',
                color: '#38bdf8',
                fontSize: 13,
                fontFamily: 'monospace',
                lineHeight: 1.6,
                overflowX: 'auto',
              }}
            >
              {envSnippet}
            </pre>
          </div>

          {/* Step 2: OAuth Provider Redirect Callback */}
          <div className="card" style={{ padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span className="status-pill status-pill-primary" style={{ fontSize: 11 }}>BƯỚC 2</span>
              <strong style={{ fontSize: 15, color: '#fff' }}>
                {lang === 'vi' ? 'Đăng Ký OAuth Callback URL Trên Google / Facebook' : 'Register OAuth Callback URLs'}
              </strong>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 16px 0' }}>
              {lang === 'vi'
                ? 'Khi tạo Client ID trên Google Cloud hoặc Meta for Developers, hãy dán chính xác các URL chuyển hướng sau:'
                : 'When creating OAuth Client IDs on Google Cloud or Meta, set these exact Authorized Redirect URIs:'}
            </p>

            {/* Google Callback */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#ea4335', marginBottom: 4 }}>
                GOOGLE CLOUD CONSOLE (Authorized redirect URIs):
              </div>
              <div className="credential-row">
                <span className="credential-value" style={{ fontSize: 12 }}>{googleCallbackUrl}</span>
                <div className="credential-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => copyText(googleCallbackUrl, 'Google Callback URI')}
                  >
                    {lang === 'vi' ? 'Sao chép' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            {/* Facebook Callback */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1877f2', marginBottom: 4 }}>
                META / FACEBOOK DEVELOPERS (Valid OAuth Redirect URIs):
              </div>
              <div className="credential-row">
                <span className="credential-value" style={{ fontSize: 12 }}>{facebookCallbackUrl}</span>
                <div className="credential-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => copyText(facebookCallbackUrl, 'Facebook Callback URI')}
                  >
                    {lang === 'vi' ? 'Sao chép' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Backend Token Verification */}
          <div className="card" style={{ padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="status-pill status-pill-primary" style={{ fontSize: 11 }}>BƯỚC 3</span>
                <strong style={{ fontSize: 15, color: '#fff' }}>
                  {lang === 'vi' ? 'Xác Thực Token Phía Backend (Middleware / Guard)' : 'Backend Token Verification (Middleware / Guard)'}
                </strong>
              </div>

              {/* Language Selector Tabs */}
              <div style={{ display: 'flex', gap: 4, background: 'rgba(255, 255, 255, 0.05)', padding: 3, borderRadius: 6 }}>
                <button
                  type="button"
                  className={`btn btn-xs ${codeSnippetLang === 'nodejs' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setCodeSnippetLang('nodejs')}
                  style={{ fontSize: 12, padding: '3px 8px' }}
                >
                  Node.js (Express)
                </button>
                <button
                  type="button"
                  className={`btn btn-xs ${codeSnippetLang === 'python' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setCodeSnippetLang('python')}
                  style={{ fontSize: 12, padding: '3px 8px' }}
                >
                  Python (FastAPI)
                </button>
                <button
                  type="button"
                  className={`btn btn-xs ${codeSnippetLang === 'curl' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setCodeSnippetLang('curl')}
                  style={{ fontSize: 12, padding: '3px 8px' }}
                >
                  cURL / HTTP
                </button>
              </div>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 12px 0' }}>
              {lang === 'vi'
                ? 'Sử dụng Middleware hoặc Dependency sau để chặn và bảo vệ các API trên backend ứng dụng của bạn:'
                : 'Use the following Middleware or Dependency to intercept and protect your backend APIs:'}
            </p>

            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="btn btn-secondary btn-xs"
                onClick={() => {
                  const currentSnippet =
                    codeSnippetLang === 'nodejs'
                      ? nodeSnippet
                      : codeSnippetLang === 'python'
                      ? pythonSnippet
                      : curlSnippet;
                  copyText(currentSnippet, `${codeSnippetLang.toUpperCase()} snippet`);
                }}
                style={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}
                id="btn-copy-code-snippet"
              >
                {lang === 'vi' ? 'Sao chép code' : 'Copy code'}
              </button>
              <pre
                style={{
                  margin: 0,
                  padding: '16px 16px',
                  background: 'var(--bg-input, #0f172a)',
                  borderRadius: 6,
                  border: '1px solid var(--border-subtle, #334155)',
                  color: '#38bdf8',
                  fontSize: 12,
                  fontFamily: 'monospace',
                  lineHeight: 1.5,
                  overflowX: 'auto',
                }}
              >
                {codeSnippetLang === 'nodejs'
                  ? nodeSnippet
                  : codeSnippetLang === 'python'
                  ? pythonSnippet
                  : curlSnippet}
              </pre>
            </div>
          </div>

          {/* Step 4: End-to-End Authentication Flow */}
          <div className="card" style={{ padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span className="status-pill status-pill-primary" style={{ fontSize: 11 }}>TỔNG QUAN</span>
              <strong style={{ fontSize: 15, color: '#fff' }}>
                {lang === 'vi' ? 'Quy Trình Đăng Nhập Hoàn Chỉnh (3 Bước)' : 'Complete Authentication Flow (3 Steps)'}
              </strong>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
              {/* Flow 1 */}
              <div style={{ padding: 14, background: 'rgba(255, 255, 255, 0.02)', borderRadius: 6, border: '1px solid var(--border-subtle, #334155)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span className="mono-tag" style={{ background: '#0284c7', color: '#fff', fontWeight: 700 }}>BƯỚC 1</span>
                  <strong style={{ fontSize: 13, color: 'var(--text-main, #e2e8f0)' }}>
                    {lang === 'vi' ? 'Khởi tạo đăng nhập' : 'Initialize Sign-in'}
                  </strong>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>
                  {lang === 'vi' ? 'Chuyển hướng người dùng đến:' : 'Redirect user to:'}
                  <div style={{ fontFamily: 'monospace', color: '#38bdf8', marginTop: 4, wordBreak: 'break-all' }}>
                    /auth/flows/:provider?app_id={app.appId}
                  </div>
                </div>
              </div>

              {/* Flow 2 */}
              <div style={{ padding: 14, background: 'rgba(255, 255, 255, 0.02)', borderRadius: 6, border: '1px solid var(--border-subtle, #334155)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span className="mono-tag" style={{ background: '#16a34a', color: '#fff', fontWeight: 700 }}>BƯỚC 2</span>
                  <strong style={{ fontSize: 13, color: 'var(--text-main, #e2e8f0)' }}>
                    {lang === 'vi' ? 'Đổi mã lấy Token' : 'Exchange Code for JWT'}
                  </strong>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>
                  {lang === 'vi' ? 'Backend đổi mã dùng một lần lấy App JWT:' : 'Backend exchanges code for JWT:'}
                  <div style={{ fontFamily: 'monospace', color: '#38bdf8', marginTop: 4 }}>
                    POST /auth/oauth/exchange
                  </div>
                </div>
              </div>

              {/* Flow 3 */}
              <div style={{ padding: 14, background: 'rgba(255, 255, 255, 0.02)', borderRadius: 6, border: '1px solid var(--border-subtle, #334155)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span className="mono-tag" style={{ background: '#8b5cf6', color: '#fff', fontWeight: 700 }}>BƯỚC 3</span>
                  <strong style={{ fontSize: 13, color: 'var(--text-main, #e2e8f0)' }}>
                    {lang === 'vi' ? 'Bảo vệ API' : 'Protect APIs'}
                  </strong>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>
                  {lang === 'vi' ? 'Xác thực Bearer Token qua Middleware:' : 'Verify Bearer token via middleware:'}
                  <div style={{ fontFamily: 'monospace', color: '#38bdf8', marginTop: 4 }}>
                    GET /users/verify-app-user
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={showRegenerateConfirm}
        title={lang === 'vi' ? 'Tạo lại AppToken' : 'Regenerate AppToken'}
        message={
          lang === 'vi'
            ? `CẢNH BÁO: Việc tạo lại AppToken sẽ lập tức vô hiệu hóa token cũ, khiến các dịch vụ backend đang kết nối bằng token cũ bị từ chối truy cập (401). Bạn có chắc chắn muốn tạo lại token cho "${app.name}"?`
            : `WARNING: Regenerating the AppToken will immediately invalidate the current token, causing client microservices using the old token to fail with 401. Are you sure you want to proceed for "${app.name}"?`
        }
        confirmText={lang === 'vi' ? 'Tạo lại Token' : 'Regenerate Token'}
        variant="warning"
        isLoading={isRegeneratingToken}
        onConfirm={handleConfirmRegenerateToken}
        onClose={() => {
          if (!isRegeneratingToken) setShowRegenerateConfirm(false);
        }}
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title={lang === 'vi' ? 'Xác nhận xóa ứng dụng' : 'Delete Application'}
        message={
          lang === 'vi'
            ? `XÁC NHẬN XÓA: Bạn có chắc chắn muốn xóa vĩnh viễn ứng dụng "${app.name}"? Mọi người dùng liên kết (AppUser) và cấu hình OAuth sẽ bị xóa vĩnh viễn.`
            : `CONFIRM DELETE: Are you sure you want to permanently delete application "${app.name}"? All associated AppUsers and OAuth configs will be deleted.`
        }
        confirmText={lang === 'vi' ? 'Xóa Ứng Dụng' : 'Delete App'}
        variant="danger"
        isLoading={isDeletingApp}
        onConfirm={handleConfirmDeleteApp}
        onClose={() => {
          if (!isDeletingApp) setShowDeleteConfirm(false);
        }}
      />
    </div>
  );
};

export default SelectedAppView;
