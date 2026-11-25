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
import { IconAlertTriangle, IconArrowLeft, IconCode, IconCopy } from '../../common/Icons';

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
      <div className="tab-content active page-container">
        <div style={{ marginBottom: 20 }}>
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
      <div className="tab-content active page-container">
        <div
          className="card"
          style={{
            maxWidth: 600,
            margin: '40px auto',
            padding: 32,
            textAlign: 'center',
          }}
        >
          <div className={`icon-well icon-well--lg ${errorStatus === 403 ? 'icon-well--danger' : ''}`}>
            <IconAlertTriangle size={24} />
          </div>

          <h2 className="section-title" style={{ margin: '0 0 8px' }}>
            {errorStatus === 403
              ? (lang === 'vi' ? '403 — Không Có Quyền Truy Cập' : '403 — Access Forbidden')
              : (lang === 'vi' ? '404 — Ứng Dụng Không Tồn Tại' : '404 — Application Not Found')}
          </h2>

          <p className="page-subtitle" style={{ margin: '0 auto 24px' }}>
            {errorMessage}
          </p>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/console/applications')}
          >
            <IconArrowLeft size={15} />
            <span>{lang === 'vi' ? 'Quay lại Danh Sách Ứng Dụng' : 'Back to Applications'}</span>
          </button>
        </div>
      </div>
    );
  }

  const isActive = app.status === 'ACTIVE';
  const ownerEmail = app.user?.email || '—';

  return (
    <div className="tab-content active page-container" id="app-detail-page">
      {/* 1. Header Navigation Bar */}
      <div className="page-header" style={{ alignItems: 'center', marginBottom: 16 }}>
        <div className="breadcrumbs">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/console/applications')}
            id="btn-back-to-app-list"
          >
            <IconArrowLeft size={14} />
            <span>{lang === 'vi' ? 'Danh Sách Ứng Dụng' : 'Applications List'}</span>
          </button>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-item current">
            {lang === 'vi' ? 'Chi Tiết Ứng Dụng' : 'App Details'}
          </span>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => navigate(`/console/quickstart?appId=${app.appId || app.id}`)}
          id="btn-go-to-quickstart"
        >
          <IconCode size={14} />
          <span>{lang === 'vi' ? 'Hướng Dẫn Tích Hợp' : 'Integration Quickstart'}</span>
        </button>
      </div>

      {/* 2. App Header Card */}
      <div className="tenant-summary-bar">
        <div style={{ minWidth: 0 }}>
          <div className="identity-banner-title">
            <h1 className="page-title">{app.name}</h1>

            <span
              id="header-app-status-badge"
              className={`badge ${isActive ? 'badge-success' : 'badge-danger'}`}
            >
              {isActive
                ? (lang === 'vi' ? 'Đang Hoạt Động' : 'Active')
                : (lang === 'vi' ? 'Tạm Ngưng' : 'Inactive')}
            </span>
          </div>

          <div className="tenant-meta-list">
            <div className="inline-code-row">
              <span>AppID:</span>
              <code className="mono-tag">{app.appId}</code>
              <button
                type="button"
                id="btn-copy-header-appid"
                className="btn btn-secondary btn-xs"
                onClick={copyAppId}
                title={lang === 'vi' ? 'Sao chép AppID' : 'Copy AppID'}
              >
                <IconCopy size={12} />
                <span>{lang === 'vi' ? 'Sao chép' : 'Copy'}</span>
              </button>
            </div>

            <div className="inline-code-row">
              <span>{lang === 'vi' ? 'Chủ sở hữu:' : 'Owner:'}</span>
              <strong style={{ color: 'var(--text-main)' }}>{ownerEmail}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Sub-tabs Navigation Bar */}
      <div className="sub-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'users'}
          id="subtab-btn-users"
          className={`sub-tab-item ${activeSubTab === 'users' ? 'active' : ''}`}
          onClick={() => handleSwitchTab('users')}
        >
          {lang === 'vi' ? 'Khách Hàng (AppUsers)' : 'Users (AppUsers)'}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'oauth'}
          id="subtab-btn-oauth"
          className={`sub-tab-item ${activeSubTab === 'oauth' ? 'active' : ''}`}
          onClick={() => handleSwitchTab('oauth')}
        >
          {lang === 'vi' ? 'Phương Thức OAuth (Google / Facebook)' : 'OAuth Providers'}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'settings'}
          id="subtab-btn-settings"
          className={`sub-tab-item ${activeSubTab === 'settings' ? 'active' : ''}`}
          onClick={() => handleSwitchTab('settings')}
        >
          {lang === 'vi' ? 'Cài Đặt & Vùng Nguy Hiểm' : 'Settings & Danger Zone'}
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
