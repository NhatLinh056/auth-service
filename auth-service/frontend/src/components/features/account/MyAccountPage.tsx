import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useToast } from '../../../contexts/ToastContext';
import { accountService, type AccountProfile } from '../../../services/account.service';
import { tenantsService, type TenantContext } from '../../../services/tenants.service';
import { ConfirmDialog } from '../../common/ConfirmDialog';
import { IconCopy, IconLock, IconLogOut } from '../../common/Icons';

export const MyAccountPage: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const vi = lang === 'vi';

  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [tenantContext, setTenantContext] = useState<TenantContext | null>(null);
  const [loading, setLoading] = useState(true);

  // Name form state
  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Logout confirm modal
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Initial load
  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);
      try {
        const p = await accountService.profile();
        if (!active) return;
        setProfile(p);
        setName(p.name || user?.name || '');
      } catch (err: any) {
        if (!active) return;
        showToast(err.message || (vi ? 'Không thể tải thông tin tài khoản' : 'Failed to load account profile'), 'error');
      }

      try {
        const ctx = await tenantsService.getMe();
        if (!active) return;
        setTenantContext(ctx);
      } catch {
        // Non-blocking
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadData();
    return () => {
      active = false;
    };
  }, [user?.name, vi, showToast]);

  // Handle Save Name
  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      showToast(vi ? 'Họ và tên không được để trống' : 'Full name cannot be empty', 'error');
      return;
    }

    const userId = profile?.id || user?.id;
    if (!userId) return;

    setSavingName(true);
    try {
      await accountService.updateName(userId, trimmed);
      await refreshUser();
      setProfile((prev) => (prev ? { ...prev, name: trimmed } : null));
      showToast(vi ? 'Cập nhật họ và tên thành công!' : 'Name updated successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || (vi ? 'Lỗi cập nhật tên' : 'Failed to update name'), 'error');
    } finally {
      setSavingName(false);
    }
  };

  // Handle Change / Set Password
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (profile?.hasPassword && !currentPassword) {
      setPasswordError(vi ? 'Vui lòng nhập mật khẩu hiện tại' : 'Please enter your current password');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError(vi ? 'Mật khẩu mới phải có ít nhất 6 ký tự' : 'New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(vi ? 'Mật khẩu xác nhận không khớp với mật khẩu mới' : 'Confirm password does not match new password');
      return;
    }

    setSavingPassword(true);
    try {
      await accountService.password(newPassword, currentPassword || undefined);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Reload profile to reflect hasPassword state
      const updatedProfile = await accountService.profile();
      setProfile(updatedProfile);

      showToast(
        vi
          ? updatedProfile.hasPassword
            ? 'Cập nhật mật khẩu thành công!'
            : 'Đã thiết lập mật khẩu thành công!'
          : 'Password saved successfully!',
        'success'
      );
    } catch (err: any) {
      const msg = err.message || (vi ? 'Lỗi thay đổi mật khẩu' : 'Failed to change password');
      setPasswordError(msg);
      showToast(msg, 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const copyUserId = () => {
    const id = profile?.id || user?.id || '';
    if (!id) return;
    navigator.clipboard
      .writeText(id)
      .then(() => {
        showToast(vi ? 'Đã sao chép User ID vào clipboard' : 'User ID copied to clipboard', 'success');
      })
      .catch(() => {
        showToast(vi ? 'Không thể sao chép' : 'Failed to copy', 'error');
      });
  };

  const tenantAffiliation = tenantContext?.tenant?.name
    ? `${tenantContext.tenant.name} (${tenantContext.tenant.id.slice(0, 8)}…)`
    : user?.tenantId
    ? user.tenantId
    : vi
    ? 'Chưa tham gia doanh nghiệp'
    : 'No tenant affiliation';

  const userInitial = (profile?.name || user?.name || user?.email || 'U')[0].toUpperCase();

  return (
    <div id="view-account" className="page-container page-container--account card-stack">
      {/* 1. Page Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title">
            {vi ? 'Hồ Sơ & Tài Khoản Cá Nhân' : 'Personal Profile & Account'}
          </h1>
          <p className="page-subtitle">
            {vi
              ? 'Quản lý thông tin định danh cá nhân, đổi họ tên và thiết lập mật khẩu đăng nhập.'
              : 'Manage your personal identity, update your display name, and configure your sign-in password.'}
          </p>
        </div>
        <button
          type="button"
          id="btn-account-logout"
          className="btn btn-danger btn-sm"
          onClick={() => setShowLogoutConfirm(true)}
        >
          <IconLogOut size={14} />
          <span>{vi ? 'Đăng Xuất' : 'Sign Out'}</span>
        </button>
      </div>

      {loading ? (
        <div className="card">
          <div className="card-header-left" style={{ marginBottom: 20 }}>
            <div className="skeleton-bar" style={{ width: 52, height: 52, borderRadius: '50%' }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton-bar" style={{ height: 18, width: '40%', marginBottom: 8 }} />
              <div className="skeleton-bar" style={{ height: 13, width: '60%' }} />
            </div>
          </div>
          <div className="skeleton-bar" style={{ height: 38, width: '100%', marginBottom: 12 }} />
          <div className="skeleton-bar" style={{ height: 38, width: '100%' }} />
        </div>
      ) : (
        <>
          {/* 2. Personal Information Card */}
          <div className="card-panel">
            {/* Header with Monogram and Meta Chips */}
            <div className="panel-header">
              <div className="identity-banner-main">
                <div id="account-avatar-monogram" className="avatar-circle avatar-circle--lg">
                  {userInitial}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="identity-banner-title">
                    <h2 className="section-title" style={{ margin: 0 }}>
                      {profile?.name || user?.name || (vi ? 'Tài khoản người dùng' : 'User Account')}
                    </h2>
                    <span
                      id="account-role-badge"
                      className={`badge ${user?.role === 'ADMIN' ? 'badge-warning' : 'badge-neutral'}`}
                    >
                      {user?.role === 'ADMIN'
                        ? (vi ? 'Quản trị viên (ADMIN)' : 'System Admin (ADMIN)')
                        : (vi ? 'Người dùng (USER)' : 'Platform User (USER)')}
                    </span>
                  </div>
                  <div className="card-subtitle">
                    {profile?.email || user?.email}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Meta Stats Row */}
            <div className="meta-strip">
              <div>
                <span className="meta-strip-label">User ID</span>
                <div className="inline-code-row">
                  <code id="account-user-id-chip" className="mono-tag">
                    {(profile?.id || user?.id || '—').slice(0, 14)}…
                  </code>
                  <button
                    type="button"
                    id="btn-copy-user-id"
                    onClick={copyUserId}
                    className="btn btn-secondary btn-xs"
                    title={vi ? 'Sao chép ID đầy đủ' : 'Copy full ID'}
                  >
                    <IconCopy size={12} />
                    <span>{vi ? 'Chép' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div>
                <span className="meta-strip-label">
                  {vi ? 'Doanh nghiệp (Tenant)' : 'Tenant Affiliation'}
                </span>
                <span style={{ fontSize: 13, color: tenantContext?.tenant ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: 500 }}>
                  {tenantAffiliation}
                </span>
              </div>
            </div>

            {/* Name Form */}
            <div className="panel-body">
              <form onSubmit={handleSaveName} className="card-stack" style={{ gap: 16 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="account-name-input" className="form-label">
                    {vi ? 'Họ và Tên' : 'Full Name'} <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    id="account-name-input"
                    className="form-control"
                    required
                    maxLength={100}
                    placeholder={vi ? 'Nhập họ và tên của bạn...' : 'Enter your full name...'}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={savingName}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label htmlFor="account-email-input" className="form-label" style={{ marginBottom: 0 }}>
                      {vi ? 'Địa Chỉ Email' : 'Email Address'}
                    </label>
                    <span className="inline-code-row form-hint" style={{ marginTop: 0 }}>
                      <IconLock size={12} />
                      <span>{vi ? 'Chỉ đọc — Định danh cố định' : 'Readonly — Fixed Identity'}</span>
                    </span>
                  </div>
                  <input
                    type="email"
                    id="account-email-input"
                    className="form-control"
                    readOnly
                    value={profile?.email || user?.email || ''}
                  />
                </div>

                <div>
                  <button
                    type="submit"
                    id="btn-save-account-name"
                    className="btn btn-primary btn-sm"
                    disabled={savingName || !name.trim() || name.trim() === (profile?.name || user?.name || '')}
                    aria-busy={savingName}
                  >
                    {savingName && <span className="btn-spinner" aria-hidden="true" />}
                    <span>{savingName ? (vi ? 'Đang lưu…' : 'Saving…') : vi ? 'Lưu Thay Đổi Tên' : 'Save Name Changes'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* 3. Security & Password Card */}
          <div className="card-panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">
                  {vi ? 'Bảo Mật & Mật Khẩu' : 'Security & Password'}
                </h2>
                <p className="card-subtitle">
                  {profile?.hasPassword
                    ? (vi
                        ? 'Tài khoản của bạn đã có mật khẩu. Nhập mật khẩu hiện tại để đổi mật khẩu mới.'
                        : 'Your account has a password configured. Enter your current password to change it.')
                    : (vi
                        ? 'Tài khoản đăng nhập qua OAuth (Google/Facebook) chưa thiết lập mật khẩu. Bạn có thể tạo mật khẩu mới để đăng nhập trực tiếp bằng email.'
                        : 'Account signed in via OAuth does not have a password yet. You can create a new password for direct email sign-in.')}
                </p>
              </div>
            </div>

            <div className="panel-body">
              {passwordError && (
                <div id="account-password-error-msg" className="account-feedback is-error" role="alert">
                  {passwordError}
                </div>
              )}

              <form onSubmit={handleSavePassword} className="card-stack" style={{ gap: 16 }}>
                {/* Current password */}
                {profile?.hasPassword && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="account-current-password" className="form-label">
                      {vi ? 'Mật Khẩu Hiện Tại' : 'Current Password'} <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <div className="password-inline-field">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        id="account-current-password"
                        className="password-inline-input"
                        autoComplete="current-password"
                        required
                        maxLength={128}
                        placeholder={vi ? 'Nhập mật khẩu hiện tại...' : 'Enter current password...'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        disabled={savingPassword}
                      />
                      <button
                        type="button"
                        id="btn-toggle-show-current-password"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="btn btn-secondary btn-xs"
                      >
                        {showCurrentPassword ? (vi ? 'Ẩn' : 'Hide') : (vi ? 'Hiện' : 'Show')}
                      </button>
                    </div>
                  </div>
                )}

                {/* New password */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="account-new-password" className="form-label">
                    {profile?.hasPassword ? (vi ? 'Mật Khẩu Mới' : 'New Password') : (vi ? 'Thiết Lập Mật Khẩu Mới' : 'Set New Password')}{' '}
                    <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <div className="password-inline-field">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      id="account-new-password"
                      className="password-inline-input"
                      autoComplete="new-password"
                      required
                      minLength={6}
                      maxLength={128}
                      placeholder={vi ? 'Tối thiểu 6 ký tự...' : 'Min 6 characters...'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={savingPassword}
                    />
                    <button
                      type="button"
                      id="btn-toggle-show-new-password"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="btn btn-secondary btn-xs"
                    >
                      {showNewPassword ? (vi ? 'Ẩn' : 'Hide') : (vi ? 'Hiện' : 'Show')}
                    </button>
                  </div>
                </div>

                {/* Confirm new password */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="account-confirm-password" className="form-label">
                    {vi ? 'Xác Nhận Mật Khẩu Mới' : 'Confirm New Password'} <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <div className="password-inline-field">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="account-confirm-password"
                      className="password-inline-input"
                      autoComplete="new-password"
                      required
                      minLength={6}
                      maxLength={128}
                      placeholder={vi ? 'Nhập lại mật khẩu mới...' : 'Re-enter new password...'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={savingPassword}
                    />
                    <button
                      type="button"
                      id="btn-toggle-show-confirm-password"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="btn btn-secondary btn-xs"
                    >
                      {showConfirmPassword ? (vi ? 'Ẩn' : 'Hide') : (vi ? 'Hiện' : 'Show')}
                    </button>
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    id="btn-save-account-password"
                    className="btn btn-primary btn-sm"
                    disabled={savingPassword || !newPassword || !confirmPassword || (Boolean(profile?.hasPassword) && !currentPassword)}
                    aria-busy={savingPassword}
                  >
                    {savingPassword && <span className="btn-spinner" aria-hidden="true" />}
                    <span>
                      {savingPassword
                        ? (vi ? 'Đang lưu…' : 'Saving…')
                        : profile?.hasPassword
                        ? (vi ? 'Đổi Mật Khẩu' : 'Change Password')
                        : (vi ? 'Thiết Lập Mật Khẩu' : 'Set Password')}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title={vi ? 'Xác Nhận Đăng Xuất' : 'Confirm Sign Out'}
        message={
          vi
            ? 'Bạn có chắc chắn muốn đăng xuất khỏi phiên làm việc này không?'
            : 'Are you sure you want to sign out of this session?'
        }
        confirmText={vi ? 'Đăng Xuất' : 'Sign Out'}
        cancelText={vi ? 'Hủy' : 'Cancel'}
        variant="danger"
        onConfirm={() => {
          setShowLogoutConfirm(false);
          logout();
        }}
        onClose={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
};

export default MyAccountPage;