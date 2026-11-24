import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useToast } from '../../../contexts/ToastContext';
import { accountService, type AccountProfile } from '../../../services/account.service';
import { tenantsService, type TenantContext } from '../../../services/tenants.service';
import { ConfirmDialog } from '../../common/ConfirmDialog';

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
    <div id="view-account" style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 48 }}>
      {/* 1. Page Header */}
      <div
        className="card"
        style={{
          background: 'var(--bg-surface, #111827)',
          border: '1px solid var(--border-subtle, #1e293b)',
          borderRadius: 8,
          padding: '20px 24px',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', color: '#fff' }}>
              {vi ? 'Hồ Sơ & Tài Khoản Cá Nhân' : 'Personal Profile & Account'}
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted, #94a3b8)', lineHeight: 1.4 }}>
              {vi
                ? 'Quản lý thông tin định danh cá nhân, đổi họ tên và thiết lập mật khẩu đăng nhập.'
                : 'Manage your personal identity, update your display name, and configure your sign-in password.'}
            </p>
          </div>
          <button
            type="button"
            id="btn-account-logout"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowLogoutConfirm(true)}
            style={{
              color: 'var(--danger, #ef4444)',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              height: 32,
              padding: '0 12px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>{vi ? 'Đăng Xuất' : 'Sign Out'}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ background: 'var(--bg-surface, #111827)', border: '1px solid var(--border-subtle, #1e293b)', borderRadius: 8, padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div className="skeleton-bar" style={{ width: 56, height: 56, borderRadius: '50%' }} />
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
            {/* Header with Monogram and Meta Chips */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid var(--border-subtle, #1e293b)',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <div
                id="account-avatar-monogram"
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary, #6366f1) 0%, #4338ca 100%)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  fontWeight: 700,
                  flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
                }}
              >
                {userInitial}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                  <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: '#fff' }}>
                    {profile?.name || user?.name || (vi ? 'Tài khoản người dùng' : 'User Account')}
                  </h2>
                  <span
                    id="account-role-badge"
                    className={`badge ${user?.role === 'ADMIN' ? 'badge-primary' : 'badge-neutral'}`}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: user?.role === 'ADMIN' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                      color: user?.role === 'ADMIN' ? 'var(--primary, #6366f1)' : 'var(--text-dim, #94a3b8)',
                      border: user?.role === 'ADMIN' ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(100, 116, 139, 0.25)',
                    }}
                  >
                    {user?.role === 'ADMIN'
                      ? (vi ? 'Quản trị viên (ADMIN)' : 'System Admin (ADMIN)')
                      : (vi ? 'Người dùng (USER)' : 'Platform User (USER)')}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted, #94a3b8)' }}>
                  {profile?.email || user?.email}
                </div>
              </div>
            </div>

            {/* Quick Meta Stats Row */}
            <div
              style={{
                padding: '12px 24px',
                background: 'rgba(15, 23, 42, 0.4)',
                borderBottom: '1px solid var(--border-subtle, #1e293b)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12,
              }}
            >
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-dim, #64748b)', display: 'block', marginBottom: 2 }}>
                  User ID
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <code id="account-user-id-chip" style={{ fontSize: 12, color: '#38bdf8', fontFamily: 'monospace' }}>
                    {(profile?.id || user?.id || '—').slice(0, 14)}…
                  </code>
                  <button
                    type="button"
                    id="btn-copy-user-id"
                    onClick={copyUserId}
                    className="btn btn-secondary btn-sm"
                    style={{ height: 20, fontSize: 10, padding: '0 5px' }}
                    title={vi ? 'Sao chép ID đầy đủ' : 'Copy full ID'}
                  >
                    {vi ? 'Chép' : 'Copy'}
                  </button>
                </div>
              </div>

              <div>
                <span style={{ fontSize: 11, color: 'var(--text-dim, #64748b)', display: 'block', marginBottom: 2 }}>
                  {vi ? 'Doanh nghiệp (Tenant)' : 'Tenant Affiliation'}
                </span>
                <span style={{ fontSize: 12, color: tenantContext?.tenant ? '#fff' : 'var(--text-muted, #94a3b8)', fontWeight: 500 }}>
                  {tenantAffiliation}
                </span>
              </div>
            </div>

            {/* Name Form */}
            <div style={{ padding: '20px 24px' }}>
              <form onSubmit={handleSaveName} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label
                    htmlFor="account-name-input"
                    style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 6 }}
                  >
                    {vi ? 'Họ và Tên' : 'Full Name'} <span style={{ color: 'var(--danger, #ef4444)' }}>*</span>
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
                    style={{
                      width: '100%',
                      height: 38,
                      fontSize: 13,
                      background: 'var(--bg-input, #0f172a)',
                      border: '1px solid var(--border-medium, #334155)',
                      color: '#fff',
                      borderRadius: 6,
                      padding: '0 12px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label
                      htmlFor="account-email-input"
                      style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: 0 }}
                    >
                      {vi ? 'Địa Chỉ Email' : 'Email Address'}
                    </label>
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--text-dim, #64748b)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      🔒 {vi ? 'Chỉ Đọc — Định Danh Cố Định' : 'Readonly — Fixed Identity'}
                    </span>
                  </div>
                  <input
                    type="email"
                    id="account-email-input"
                    className="form-control"
                    readOnly
                    value={profile?.email || user?.email || ''}
                    style={{
                      width: '100%',
                      height: 38,
                      fontSize: 13,
                      background: 'rgba(15, 23, 42, 0.5)',
                      border: '1px solid var(--border-subtle, #1e293b)',
                      color: 'var(--text-dim, #94a3b8)',
                      borderRadius: 6,
                      padding: '0 12px',
                      boxSizing: 'border-box',
                      cursor: 'not-allowed',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-start', paddingTop: 4 }}>
                  <button
                    type="submit"
                    id="btn-save-account-name"
                    className="btn btn-primary"
                    disabled={savingName || !name.trim() || name.trim() === (profile?.name || user?.name || '')}
                    style={{
                      height: 34,
                      fontSize: 13,
                      padding: '0 16px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {savingName ? (vi ? 'Đang lưu…' : 'Saving…') : vi ? 'Lưu Thay Đổi Tên' : 'Save Name Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* 3. Security & Password Card */}
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
                padding: '18px 24px',
                borderBottom: '1px solid var(--border-subtle, #1e293b)',
              }}
            >
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px', color: '#fff' }}>
                {vi ? 'Bảo Mật & Mật Khẩu' : 'Security & Password'}
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted, #94a3b8)', lineHeight: 1.4 }}>
                {profile?.hasPassword
                  ? (vi
                      ? 'Tài khoản của bạn đã có mật khẩu. Nhập mật khẩu hiện tại để đổi mật khẩu mới.'
                      : 'Your account has a password configured. Enter your current password to change it.')
                  : (vi
                      ? 'Tài khoản đăng nhập qua OAuth (Google/Facebook) chưa thiết lập mật khẩu. Bạn có thể tạo mật khẩu mới để đăng nhập trực tiếp bằng email.'
                      : 'Account signed in via OAuth does not have a password yet. You can create a new password for direct email sign-in.')}
              </p>
            </div>

            <div style={{ padding: '20px 24px' }}>
              {passwordError && (
                <div
                  id="account-password-error-msg"
                  style={{
                    padding: '10px 14px',
                    borderRadius: 6,
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: 'var(--danger, #ef4444)',
                    fontSize: 13,
                    marginBottom: 16,
                  }}
                >
                  {passwordError}
                </div>
              )}

              <form onSubmit={handleSavePassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Current password (Only required if user already has a password) */}
                {profile?.hasPassword && (
                  <div>
                    <label
                      htmlFor="account-current-password"
                      style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 6 }}
                    >
                      {vi ? 'Mật Khẩu Hiện Tại' : 'Current Password'} <span style={{ color: 'var(--danger, #ef4444)' }}>*</span>
                    </label>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: 'var(--bg-input, #0f172a)',
                        border: '1px solid var(--border-medium, #334155)',
                        borderRadius: 6,
                        height: 38,
                        padding: '0 8px 0 12px',
                        boxSizing: 'border-box',
                      }}
                    >
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        id="account-current-password"
                        autoComplete="current-password"
                        required
                        maxLength={128}
                        placeholder={vi ? 'Nhập mật khẩu hiện tại...' : 'Enter current password...'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        disabled={savingPassword}
                        style={{
                          flex: 1,
                          height: '100%',
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          fontSize: 13,
                          color: '#fff',
                          padding: 0,
                        }}
                      />
                      <button
                        type="button"
                        id="btn-toggle-show-current-password"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="btn btn-secondary btn-sm"
                        style={{ height: 26, fontSize: 11, padding: '0 8px', flexShrink: 0 }}
                      >
                        {showCurrentPassword ? (vi ? 'Ẩn' : 'Hide') : (vi ? 'Hiện' : 'Show')}
                      </button>
                    </div>
                  </div>
                )}

                {/* New password */}
                <div>
                  <label
                    htmlFor="account-new-password"
                    style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 6 }}
                  >
                    {profile?.hasPassword ? (vi ? 'Mật Khẩu Mới' : 'New Password') : (vi ? 'Thiết Lập Mật Khẩu Mới' : 'Set New Password')}{' '}
                    <span style={{ color: 'var(--danger, #ef4444)' }}>*</span>
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: 'var(--bg-input, #0f172a)',
                      border: '1px solid var(--border-medium, #334155)',
                      borderRadius: 6,
                      height: 38,
                      padding: '0 8px 0 12px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      id="account-new-password"
                      autoComplete="new-password"
                      required
                      minLength={6}
                      maxLength={128}
                      placeholder={vi ? 'Tối thiểu 6 ký tự...' : 'Min 6 characters...'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={savingPassword}
                      style={{
                        flex: 1,
                        height: '100%',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        fontSize: 13,
                        color: '#fff',
                        padding: 0,
                      }}
                    />
                    <button
                      type="button"
                      id="btn-toggle-show-new-password"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="btn btn-secondary btn-sm"
                      style={{ height: 26, fontSize: 11, padding: '0 8px', flexShrink: 0 }}
                    >
                      {showNewPassword ? (vi ? 'Ẩn' : 'Hide') : (vi ? 'Hiện' : 'Show')}
                    </button>
                  </div>
                </div>

                {/* Confirm new password */}
                <div>
                  <label
                    htmlFor="account-confirm-password"
                    style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 6 }}
                  >
                    {vi ? 'Xác Nhận Mật Khẩu Mới' : 'Confirm New Password'} <span style={{ color: 'var(--danger, #ef4444)' }}>*</span>
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: 'var(--bg-input, #0f172a)',
                      border: '1px solid var(--border-medium, #334155)',
                      borderRadius: 6,
                      height: 38,
                      padding: '0 8px 0 12px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="account-confirm-password"
                      autoComplete="new-password"
                      required
                      minLength={6}
                      maxLength={128}
                      placeholder={vi ? 'Nhập lại mật khẩu mới...' : 'Re-enter new password...'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={savingPassword}
                      style={{
                        flex: 1,
                        height: '100%',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        fontSize: 13,
                        color: '#fff',
                        padding: 0,
                      }}
                    />
                    <button
                      type="button"
                      id="btn-toggle-show-confirm-password"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="btn btn-secondary btn-sm"
                      style={{ height: 26, fontSize: 11, padding: '0 8px', flexShrink: 0 }}
                    >
                      {showConfirmPassword ? (vi ? 'Ẩn' : 'Hide') : (vi ? 'Hiện' : 'Show')}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-start', paddingTop: 4 }}>
                  <button
                    type="submit"
                    id="btn-save-account-password"
                    className="btn btn-primary"
                    disabled={savingPassword || !newPassword || !confirmPassword || (Boolean(profile?.hasPassword) && !currentPassword)}
                    style={{
                      height: 34,
                      fontSize: 13,
                      padding: '0 16px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {savingPassword
                      ? (vi ? 'Đang lưu…' : 'Saving…')
                      : profile?.hasPassword
                      ? (vi ? 'Đổi Mật Khẩu' : 'Change Password')
                      : (vi ? 'Thiết Lập Mật Khẩu' : 'Set Password')}
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