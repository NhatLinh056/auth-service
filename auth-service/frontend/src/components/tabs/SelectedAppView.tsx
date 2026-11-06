import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { applicationsService } from '../../services/applications.service';
import { providersService } from '../../services/providers.service';
import type { Application, AppUser } from '../../types/application.types';
import type { SanitizedOAuthProvider } from '../../types/provider.types';

interface SelectedAppViewProps {
  app: Application;
  onBack: () => void;
  onUpdateApp: (updated: Application) => void;
  onDeleteApp: (id: string) => void;
  onOpenConfigureProvider: (provider: SanitizedOAuthProvider) => void;
}

type SubTab = 'users' | 'settings' | 'providers';

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

  // --- Providers State ---
  const [providers, setProviders] = useState<SanitizedOAuthProvider[]>([]);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [togglingProvider, setTogglingProvider] = useState<string | null>(null);

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
      const provider = (u.identities?.[0]?.provider || '').toLowerCase();
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
  const handleRegenerateToken = async () => {
    const confirmMsg =
      lang === 'vi'
        ? `CẢNH BÁO: Việc tạo lại AppToken sẽ lập tức vô hiệu hóa token cũ, khiến các dịch vụ backend đang kết nối bằng token cũ bị từ chối truy cập (401). Bạn có chắc chắn muốn tạo lại token cho "${app.name}"?`
        : `WARNING: Regenerating the AppToken will immediately invalidate the current token, causing client microservices using the old token to fail with 401. Are you sure you want to proceed for "${app.name}"?`;

    if (!window.confirm(confirmMsg)) return;

    setIsRegeneratingToken(true);
    try {
      const res = await applicationsService.regenerateToken(app.id);
      const updated = { ...app, appToken: res.appToken };
      onUpdateApp(updated);
      showToast(t('toasts.token_regenerated'));
      setIsTokenMasked(false);
    } catch (err: any) {
      showToast(err.message || 'Lỗi tạo lại token', 'error');
    } finally {
      setIsRegeneratingToken(false);
    }
  };

  // Delete App
  const handleDeleteApp = async () => {
    const confirmMsg =
      lang === 'vi'
        ? `XÁC NHẬN XÓA: Bạn có chắc chắn muốn xóa vĩnh viễn ứng dụng "${app.name}"? Mọi người dùng liên kết (AppUser) và cấu hình OAuth sẽ bị xóa.`
        : `CONFIRM DELETE: Are you sure you want to permanently delete application "${app.name}"? All associated AppUsers and OAuth configs will be deleted.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await applicationsService.delete(app.id);
      showToast(`"${app.name}" ${t('toasts.app_deleted')}`);
      onDeleteApp(app.id);
      onBack();
    } catch (err: any) {
      showToast(err.message || 'Lỗi xóa ứng dụng', 'error');
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
              <p style={{ margin: '4px 0 0 0', fontSize: 13, color: 'var(--text-dim)' }}>
                {lang === 'vi'
                  ? 'Bạn chỉ có quyền xem danh sách người dùng của các ứng dụng do bạn sở hữu hoặc khi là System Admin.'
                  : 'You only have permission to view users of applications you own or as System Admin.'}
              </p>
            </div>
          )}

          {/* Table */}
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{lang === 'vi' ? 'Người dùng / Email' : 'User / Email'}</th>
                  <th>{lang === 'vi' ? 'Provider Đăng Nhập' : 'Sign-in Provider'}</th>
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
                    const primaryProvider = u.identities?.[0]?.provider || 'LOCAL_EMAIL';
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
                              textTransform: 'uppercase',
                              fontSize: 11,
                              background: primaryProvider.includes('GOOGLE')
                                ? 'rgba(234, 67, 53, 0.15)'
                                : primaryProvider.includes('FACEBOOK')
                                ? 'rgba(24, 119, 242, 0.15)'
                                : 'rgba(59, 130, 246, 0.15)',
                              color: primaryProvider.includes('GOOGLE')
                                ? '#ea4335'
                                : primaryProvider.includes('FACEBOOK')
                                ? '#1877f2'
                                : '#3b82f6',
                            }}
                          >
                            {primaryProvider}
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
                    onClick={handleRegenerateToken}
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
            <button type="button" className="btn btn-danger btn-sm" onClick={handleDeleteApp} id="btn-delete-app">
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
    </div>
  );
};

export default SelectedAppView;
