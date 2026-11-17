import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useToast } from '../../../contexts/ToastContext';
import { applicationsService } from '../../../services/applications.service';
import type { Application, AppUser } from '../../../types/application.types';
import { AppUsersSubTab } from './AppUsersSubTab';
import { AppOAuthSubTab } from './AppOAuthSubTab';
import { AppSettingsSubTab } from './AppSettingsSubTab';
import { SkeletonTable } from '../../common/SkeletonTable';

export type AppSubTabType = 'users' | 'oauth' | 'settings';

export interface AppDetailPageProps {
  onUpdateAppList?: (updated: Application) => void;
  onRemoveFromAppList?: (appId: string) => void;
}

export const AppDetailPage: React.FC<AppDetailPageProps> = ({
  onUpdateAppList,
  onRemoveFromAppList,
}) => {
  const { appId, tab } = useParams<{ appId: string; tab?: string }>();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { showToast } = useToast();

  const [app, setApp] = useState<Application | null>(null);
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active subtab resolution
  const activeSubTab: AppSubTabType =
    tab === 'oauth' ? 'oauth' : tab === 'settings' ? 'settings' : 'users';

  // Load App detail
  const loadApp = useCallback(async () => {
    if (!appId) return;
    setLoading(true);
    setErrorStatus(null);
    setErrorMessage(null);

    try {
      const data = await applicationsService.findById(appId);
      setApp(data);
    } catch (err: any) {
      const status = err.status || (err.message?.includes('403') ? 403 : err.message?.includes('404') ? 404 : 500);
      setErrorStatus(status);
      setErrorMessage(
        status === 403
          ? (lang === 'vi' ? 'Bạn không có quyền truy cập ứng dụng này.' : 'You do not have permission to access this application.')
          : status === 404
          ? (lang === 'vi' ? 'Không tìm thấy ứng dụng với mã định danh này.' : 'Application not found with this identifier.')
          : (err.message || 'Lỗi tải thông tin ứng dụng')
      );
    } finally {
      setLoading(false);
    }
  }, [appId, lang]);

  // Load AppUsers
  const loadAppUsers = useCallback(async () => {
    if (!appId) return;
    setUsersLoading(true);
    try {
      const users = await applicationsService.getAppUsers(appId);
      setAppUsers(users);
    } catch (err: any) {
      showToast(err.message || 'Lỗi tải danh sách người dùng ứng dụng', 'error');
    } finally {
      setUsersLoading(false);
    }
  }, [appId, showToast]);

  useEffect(() => {
    void loadApp();
  }, [loadApp]);

  useEffect(() => {
    if (activeSubTab === 'users' && app) {
      void loadAppUsers();
    }
  }, [activeSubTab, app, loadAppUsers]);

  const handleSwitchTab = (newTab: AppSubTabType) => {
    if (!appId) return;
    navigate(`/console/applications/${appId}/${newTab}`);
  };

  const handleUpdateApp = (updated: Application) => {
    setApp(updated);
    if (onUpdateAppList) onUpdateAppList(updated);
  };

  const handleDeleteAppUser = async (appUserId: string) => {
    if (!appId) return;
    await applicationsService.deleteAppUser(appId, appUserId);
    setAppUsers((prev) => prev.filter((u) => u.id !== appUserId));
  };

  const copyAppId = () => {
    if (!app?.appId) return;
    navigator.clipboard
      .writeText(app.appId)
      .then(() => {
        showToast(lang === 'vi' ? 'Đã sao chép AppID vào clipboard' : 'AppID copied to clipboard', 'success');
      })
      .catch(() => {
        showToast('Failed to copy AppID', 'error');
      });
  };

  // 1. Loading Skeleton
  if (loading) {
    return (
      <div className="tab-content active" style={{ width: '100%', padding: 24 }}>
        <div style={{ height: 60, marginBottom: 20 }}>
          <div className="skeleton-bar" style={{ height: 28, width: '40%', marginBottom: 8 }} />
          <div className="skeleton-bar" style={{ height: 16, width: '25%' }} />
        </div>
        <SkeletonTable rows={4} columns={4} />
      </div>
    );
  }

  // 2. Error / Forbidden State (Protects against IDOR)
  if (errorStatus || !app) {
    return (
      <div className="tab-content active" style={{ width: '100%', padding: 24 }}>
        <div
          className="card"
          style={{
            maxWidth: 640,
            margin: '40px auto',
            padding: 32,
            textAlign: 'center',
            border: `1px solid ${errorStatus === 403 ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-subtle)'}`,
            background: 'var(--bg-surface, #111827)',
            borderRadius: 12,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: errorStatus === 403 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(148, 163, 184, 0.15)',
              color: errorStatus === 403 ? '#ef4444' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>
            {errorStatus === 403
              ? (lang === 'vi' ? '403 — Không Có Quyền Truy Cập' : '403 — Access Forbidden')
              : (lang === 'vi' ? '404 — Ứng Dụng Không Tồn Tại' : '404 — Application Not Found')}
          </h2>

          <p style={{ fontSize: 14, color: 'var(--text-muted, #94a3b8)', margin: '0 0 24px', lineHeight: 1.5 }}>
            {errorMessage}
          </p>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/console/applications')}
          >
            ← {lang === 'vi' ? 'Quay lại Danh Sách Ứng Dụng' : 'Back to Applications'}
          </button>
        </div>
      </div>
    );
  }

  const isActive = app.status === 'ACTIVE';
  const ownerEmail = app.user?.email || '—';

  return (
    <div className="tab-content active" id="app-detail-page" style={{ width: '100%' }}>
      {/* 1. Header Navigation Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/console/applications')}
            id="btn-back-to-app-list"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32 }}
          >
            <span>←</span>
            <span>{lang === 'vi' ? 'Danh Sách Ứng Dụng' : 'Applications List'}</span>
          </button>
          <span style={{ color: 'var(--border-subtle, #334155)' }}>/</span>
          <span style={{ color: 'var(--text-dim, #64748b)', fontSize: 13, fontWeight: 500 }}>
            {lang === 'vi' ? 'Chi Tiết Ứng Dụng' : 'App Details'}
          </span>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => navigate(`/console/quickstart?appId=${app.id}`)}
          id="btn-go-to-quickstart"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32 }}
        >
          <span>{lang === 'vi' ? 'Xem Hướng Dẫn Tích Hợp →' : 'View Quickstart Guide →'}</span>
        </button>
      </div>

      {/* 2. App Header Card: Polished SaaS Layout with Status Badge */}
      <div
        className="card"
        style={{
          background: 'var(--bg-surface, #111827)',
          border: '1px solid var(--border-subtle, #1e293b)',
          borderRadius: 8,
          padding: '20px 24px',
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
              {app.name}
            </h1>

            {/* Clear Status Badge with Dot indicator */}
            <span
              id="header-app-status-badge"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: 12,
                background: isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                color: isActive ? 'var(--success, #10b981)' : 'var(--danger, #ef4444)',
                border: isActive ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: isActive ? 'var(--success, #10b981)' : 'var(--danger, #ef4444)',
                }}
              />
              {isActive
                ? (lang === 'vi' ? 'Đang Hoạt Động' : 'Active')
                : (lang === 'vi' ? 'Tạm Ngưng' : 'Inactive')}
            </span>
          </div>

          <div
            style={{
              fontSize: 13,
              color: 'var(--text-muted, #94a3b8)',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--text-dim, #64748b)' }}>AppID:</span>
              <code
                style={{
                  color: '#fff',
                  background: 'rgba(255, 255, 255, 0.06)',
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontFamily: 'monospace',
                  fontSize: 12,
                }}
              >
                {app.appId}
              </code>
              <button
                type="button"
                id="btn-copy-header-appid"
                className="btn btn-secondary btn-xs"
                onClick={copyAppId}
                style={{ padding: '2px 8px', fontSize: 11, height: 22, lineHeight: 1 }}
                title={lang === 'vi' ? 'Sao chép AppID' : 'Copy AppID'}
              >
                {lang === 'vi' ? 'Sao chép' : 'Copy'}
              </button>
            </div>

            <span style={{ color: 'var(--border-subtle, #334155)' }}>•</span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--text-dim, #64748b)' }}>{lang === 'vi' ? 'Chủ sở hữu:' : 'Owner:'}</span>
              <span style={{ color: '#fff', fontWeight: 500 }}>{ownerEmail}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Sub-tabs Navigation Bar: Sleek and Modern */}
      <div
        className="sub-tabs"
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle, #1e293b)',
          marginBottom: 20,
          gap: 6,
        }}
      >
        <button
          type="button"
          id="subtab-btn-users"
          className={`sub-tab-item ${activeSubTab === 'users' ? 'active' : ''}`}
          onClick={() => handleSwitchTab('users')}
          style={{
            padding: '10px 18px',
            fontSize: 13,
            fontWeight: 600,
            background: activeSubTab === 'users' ? 'rgba(79, 70, 229, 0.08)' : 'transparent',
            border: 'none',
            borderBottom: activeSubTab === 'users' ? '2px solid var(--primary, #4f46e5)' : '2px solid transparent',
            borderRadius: '6px 6px 0 0',
            color: activeSubTab === 'users' ? '#a5b4fc' : 'var(--text-muted, #94a3b8)',
            cursor: 'pointer',
            transition: 'all 0.15s ease-in-out',
          }}
        >
          {lang === 'vi' ? '1. Khách Hàng (AppUsers)' : '1. Users (AppUsers)'}
        </button>

        <button
          type="button"
          id="subtab-btn-oauth"
          className={`sub-tab-item ${activeSubTab === 'oauth' ? 'active' : ''}`}
          onClick={() => handleSwitchTab('oauth')}
          style={{
            padding: '10px 18px',
            fontSize: 13,
            fontWeight: 600,
            background: activeSubTab === 'oauth' ? 'rgba(79, 70, 229, 0.08)' : 'transparent',
            border: 'none',
            borderBottom: activeSubTab === 'oauth' ? '2px solid var(--primary, #4f46e5)' : '2px solid transparent',
            borderRadius: '6px 6px 0 0',
            color: activeSubTab === 'oauth' ? '#a5b4fc' : 'var(--text-muted, #94a3b8)',
            cursor: 'pointer',
            transition: 'all 0.15s ease-in-out',
          }}
        >
          {lang === 'vi' ? '2. Phương Thức OAuth (Google / Facebook)' : '2. OAuth Providers'}
        </button>

        <button
          type="button"
          id="subtab-btn-settings"
          className={`sub-tab-item ${activeSubTab === 'settings' ? 'active' : ''}`}
          onClick={() => handleSwitchTab('settings')}
          style={{
            padding: '10px 18px',
            fontSize: 13,
            fontWeight: 600,
            background: activeSubTab === 'settings' ? 'rgba(79, 70, 229, 0.08)' : 'transparent',
            border: 'none',
            borderBottom: activeSubTab === 'settings' ? '2px solid var(--primary, #4f46e5)' : '2px solid transparent',
            borderRadius: '6px 6px 0 0',
            color: activeSubTab === 'settings' ? '#a5b4fc' : 'var(--text-muted, #94a3b8)',
            cursor: 'pointer',
            transition: 'all 0.15s ease-in-out',
          }}
        >
          {lang === 'vi' ? '3. Cài Đặt & Danger Zone' : '3. Settings & Danger Zone'}
        </button>
      </div>

      {/* 4. Active Sub-tab View */}
      {activeSubTab === 'users' && (
        <AppUsersSubTab
          app={app}
          appUsers={appUsers}
          loading={usersLoading}
          onRefresh={loadAppUsers}
          onDeleteAppUser={handleDeleteAppUser}
        />
      )}

      {activeSubTab === 'oauth' && <AppOAuthSubTab app={app} />}

      {activeSubTab === 'settings' && (
        <AppSettingsSubTab
          app={app}
          onUpdateApp={handleUpdateApp}
          onDeleteApp={() => {
            if (onRemoveFromAppList) onRemoveFromAppList(app.id);
            navigate('/console/applications');
          }}
        />
      )}
    </div>
  );
};

export default AppDetailPage;
