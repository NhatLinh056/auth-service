import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useToast } from '../../../contexts/ToastContext';
import { applicationsService } from '../../../services/applications.service';
import type { Application, ApplicationStatus } from '../../../types/application.types';
import { ConfirmDialog } from '../../common/ConfirmDialog';
import { IconAlertTriangle, IconCheck } from '../../common/Icons';

export interface AppSettingsSubTabProps {
  app: Application;
  onUpdateApp: (updated: Application) => void;
  onDeleteApp: (appId: string) => void;
}

export const AppSettingsSubTab: React.FC<AppSettingsSubTabProps> = ({
  app,
  onUpdateApp,
  onDeleteApp,
}) => {
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Form states
  const [nameInput, setNameInput] = useState(app.name);
  const [statusInput, setStatusInput] = useState<ApplicationStatus>(app.status);
  const [redirectUrisInput, setRedirectUrisInput] = useState(
    (app.allowedRedirectUris || []).join('\n')
  );
  const [showToken, setShowToken] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Danger zone / Regenerate dialog states
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync inputs if prop changes
  useEffect(() => {
    setNameInput(app.name);
    setStatusInput(app.status);
    setRedirectUrisInput((app.allowedRedirectUris || []).join('\n'));
  }, [app]);

  // Handle Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      showToast(lang === 'vi' ? 'Tên ứng dụng không được để trống' : 'App name cannot be empty', 'error');
      return;
    }

    const uris = redirectUrisInput
      .split('\n')
      .map((u) => u.trim())
      .filter(Boolean);

    setIsSaving(true);
    try {
      const updated = await applicationsService.update(app.id, {
        name: nameInput.trim(),
        status: statusInput,
        allowedRedirectUris: uris,
      });

      onUpdateApp(updated);
      showToast(
        lang === 'vi' ? 'Đã lưu cấu hình ứng dụng thành công.' : 'Application settings saved successfully.',
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi lưu cấu hình ứng dụng', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Regenerate AppToken
  const handleConfirmRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const res = await applicationsService.regenerateToken(app.id);
      onUpdateApp({
        ...app,
        appToken: res.appToken,
      });
      setShowRegenConfirm(false);
      setShowToken(true);
      showToast(
        lang === 'vi'
          ? 'Đã sinh lại AppToken mới. Vui lòng cập nhật biến môi trường X-App-Token ở backend microservice.'
          : 'AppToken regenerated successfully. Update X-App-Token in your backend microservice.',
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi sinh lại AppToken', 'error');
    } finally {
      setIsRegenerating(false);
    }
  };

  // Handle Delete Application
  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await applicationsService.delete(app.id);
      showToast(
        lang === 'vi' ? `Đã xóa vĩnh viễn ứng dụng "${app.name}".` : `Application "${app.name}" permanently deleted.`,
        'success'
      );
      setShowDeleteConfirm(false);
      onDeleteApp(app.id);
      navigate('/console/applications');
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi xóa ứng dụng', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const copyText = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        showToast(
          lang === 'vi' ? `Đã sao chép ${label} vào clipboard.` : `${label} copied to clipboard.`,
          'success'
        );
      })
      .catch(() => {
        showToast(`Failed to copy ${label}`, 'error');
      });
  };

  return (
    <div id="app-view-settings" className="page-container card-stack" style={{ maxWidth: 780, margin: 0 }}>
      {/* 1. App Credentials Card (AppID + AppToken Unified Block) */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              {lang === 'vi' ? 'Thông Tin Định Danh & Kết Nối (API Credentials)' : 'Application API Credentials'}
            </h2>
            <p className="card-subtitle">
              {lang === 'vi'
                ? 'Thông tin định danh dùng để kết nối và xác thực giữa microservice của bạn và Auth Service.'
                : 'Credentials used to connect and authenticate between your client service and Auth Service.'}
            </p>
          </div>
        </div>

        <div className="card-stack" style={{ gap: 16 }}>
          {/* 1. Application ID (AppID) */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="display-app-id">
              Application ID (AppID)
            </label>
            <div className="field-copy-box">
              <span id="display-app-id" className="field-copy-value field-copy-value--accent">
                {app.appId}
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-xs"
                onClick={() => copyText(app.appId, 'AppID')}
              >
                {lang === 'vi' ? 'Sao chép' : 'Copy'}
              </button>
            </div>
            <div className="form-hint">
              {lang === 'vi'
                ? 'Dùng trong tham số app_id khi bắt đầu luồng đăng nhập OAuth hoặc header X-App-Id.'
                : 'Used in app_id query parameter when initiating OAuth login or X-App-Id header.'}
            </div>
          </div>

          {/* 2. App Token (X-App-Token) */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label className="form-label" htmlFor="app-settings-token" style={{ marginBottom: 0 }}>
                App Token (X-App-Token Header)
              </label>
              <span className={`badge ${app.appToken ? 'badge-success' : 'badge-neutral'}`}>
                {app.appToken && <IconCheck size={11} />}
                <span>
                  {app.appToken
                    ? (lang === 'vi' ? 'Đã cấp token' : 'Token issued')
                    : (lang === 'vi' ? 'Chưa có token' : 'No token')}
                </span>
              </span>
            </div>

            <div className="field-copy-box">
              <span
                id="app-settings-token"
                className={`field-copy-value ${showToken ? '' : 'field-copy-value--muted'}`}
              >
                {showToken ? (app.appToken || '—') : '••••••••••••••••••••••••••••••••••••••••••••••••'}
              </span>

              {app.appToken && (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    onClick={() => setShowToken(!showToken)}
                  >
                    {showToken ? (lang === 'vi' ? 'Ẩn' : 'Hide') : (lang === 'vi' ? 'Hiện' : 'Show')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    onClick={() => copyText(app.appToken || '', 'AppToken')}
                  >
                    {lang === 'vi' ? 'Sao chép' : 'Copy'}
                  </button>
                </>
              )}

              <button
                type="button"
                id="btn-regenerate-token"
                className="btn btn-warning btn-xs"
                onClick={() => setShowRegenConfirm(true)}
                disabled={isRegenerating}
              >
                {isRegenerating
                  ? (lang === 'vi' ? 'Đang tạo…' : 'Generating…')
                  : (lang === 'vi' ? 'Cấp lại Token' : 'Regenerate')}
              </button>
            </div>

            <div className="form-hint">
              {lang === 'vi'
                ? 'Dùng trong header X-App-Token ở backend microservice khi gọi verify token. Tuyệt đối không nhúng token này vào frontend client.'
                : 'Used in X-App-Token header on your backend microservice. Never expose this secret to frontend clients.'}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Settings Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              {lang === 'vi' ? 'Cài Đặt Ứng Dụng' : 'Application Settings'}
            </h2>
            <p className="card-subtitle">
              {lang === 'vi'
                ? 'Cấu hình tên hiển thị, trạng thái hoạt động và danh sách URL được phép chuyển hướng sau xác thực.'
                : 'Configure application name, operational status, and allowed redirect URIs.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="card-stack" style={{ gap: 16 }}>
          {/* App Name */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="app-settings-name">
              {lang === 'vi' ? 'Tên Ứng Dụng' : 'Application Name'}
            </label>
            <input
              type="text"
              id="app-settings-name"
              className="form-control"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              required
              style={{ maxWidth: 420 }}
            />
          </div>

          {/* Status Dropdown */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="app-settings-status">
              {lang === 'vi' ? 'Trạng Thái Hoạt Động' : 'Operational Status'}
            </label>
            <select
              id="app-settings-status"
              className="form-control"
              value={statusInput}
              onChange={(e) => setStatusInput(e.target.value as ApplicationStatus)}
              style={{ maxWidth: 280 }}
            >
              <option value="ACTIVE">{lang === 'vi' ? 'ACTIVE (Đang hoạt động)' : 'ACTIVE (Operational)'}</option>
              <option value="INACTIVE">{lang === 'vi' ? 'INACTIVE (Tạm ngừng kích hoạt)' : 'INACTIVE (Suspended)'}</option>
            </select>
            <div className="form-hint">
              {lang === 'vi'
                ? 'Khi chuyển sang INACTIVE: chặn các lượt đăng nhập mới qua ứng dụng này.'
                : 'When set to INACTIVE: new sign-ins through this application will be blocked.'}
            </div>
          </div>

          {/* Allowed Redirect URIs */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="app-settings-redirect-uris">
              {lang === 'vi' ? 'Allowed Redirect URIs (Mỗi dòng một URL)' : 'Allowed Redirect URIs (One per line)'}
            </label>
            <textarea
              id="app-settings-redirect-uris"
              className="form-control form-control-mono"
              rows={3}
              value={redirectUrisInput}
              onChange={(e) => setRedirectUrisInput(e.target.value)}
              placeholder="http://localhost:3001/"
              style={{ maxWidth: 580 }}
            />
            <div className="form-hint">
              {lang === 'vi'
                ? 'URI đích hợp lệ mà Auth Service cho phép chuyển hướng sau khi hoàn tất xác thực OAuth.'
                : 'Valid destination URLs where Auth Service is permitted to redirect after OAuth authentication.'}
            </div>
          </div>

          <div style={{ paddingTop: 4 }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSaving}
              aria-busy={isSaving}
              id="btn-save-app-settings"
            >
              {isSaving && <span className="btn-spinner" aria-hidden="true" />}
              <span>{isSaving ? (lang === 'vi' ? 'Đang lưu…' : 'Saving…') : (lang === 'vi' ? 'Lưu Cài Đặt' : 'Save Settings')}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 3. Danger Zone Card */}
      <div className="danger-zone">
        <div className="inline-code-row" style={{ gap: 8, marginBottom: 6, color: 'var(--danger)' }}>
          <IconAlertTriangle size={18} />
          <h3 className="card-title" style={{ color: 'var(--danger)' }}>
            {lang === 'vi' ? 'Vùng Nguy Hiểm (Danger Zone)' : 'Danger Zone'}
          </h3>
        </div>

        <p className="card-subtitle" style={{ marginBottom: 16 }}>
          {lang === 'vi'
            ? 'Hành động xóa ứng dụng là vĩnh viễn và không thể hoàn tác. Mọi AppUser và cấu hình OAuth liên kết sẽ bị xóa.'
            : 'Deleting an application is permanent and cannot be undone. All associated AppUsers and OAuth configs will be removed.'}
        </p>

        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={() => setShowDeleteConfirm(true)}
          id="btn-delete-app"
        >
          {lang === 'vi' ? 'Xóa Ứng Dụng Này' : 'Delete Application'}
        </button>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={showRegenConfirm}
        title={lang === 'vi' ? 'Cấp lại AppToken' : 'Regenerate AppToken'}
        message={
          lang === 'vi'
            ? `CẢNH BÁO: Việc tạo lại AppToken sẽ lập tức vô hiệu hóa token cũ, khiến các dịch vụ backend đang kết nối bằng token cũ bị từ chối truy cập (401). Bạn có chắc chắn muốn tạo lại token cho "${app.name}"?`
            : `WARNING: Regenerating the AppToken will immediately invalidate the current token, causing client microservices using the old token to fail with 401. Are you sure you want to proceed for "${app.name}"?`
        }
        confirmText={lang === 'vi' ? 'Tạo lại Token' : 'Regenerate Token'}
        variant="warning"
        isLoading={isRegenerating}
        onConfirm={handleConfirmRegenerate}
        onClose={() => {
          if (!isRegenerating) setShowRegenConfirm(false);
        }}
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title={lang === 'vi' ? 'Xác nhận xóa ứng dụng' : 'Confirm Delete Application'}
        message={
          lang === 'vi'
            ? `CẢNH BÁO: Hành động này là vĩnh viễn! Toàn bộ người dùng liên kết (AppUsers) và cấu hình phương thức đăng nhập của ứng dụng "${app.name}" sẽ bị xóa bỏ hoàn toàn. Bạn có chắc chắn muốn xóa?`
            : `WARNING: This action is permanent! All associated AppUsers and OAuth provider configs for "${app.name}" will be completely deleted. Are you sure you want to delete?`
        }
        confirmText={lang === 'vi' ? 'Xóa Ứng Dụng' : 'Delete Application'}
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => {
          if (!isDeleting) setShowDeleteConfirm(false);
        }}
      />
    </div>
  );
};
