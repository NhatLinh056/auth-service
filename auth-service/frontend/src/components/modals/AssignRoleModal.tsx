import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { IconAlertTriangle, IconInfo, IconLock, IconShield, IconX, IconZap } from '../common/Icons';
import { useModalA11y } from '../../hooks/useModalA11y';
import { rolesService } from '../../services/roles.service';
import type { User, Role } from '../../types/auth.types';

interface AssignRoleModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedUser: User) => void;
  adminCount?: number;
}

export const AssignRoleModal: React.FC<AssignRoleModalProps> = ({
  user,
  isOpen,
  onClose,
  onSuccess,
  adminCount = 1,
}) => {
  const { lang } = useLanguage();
  const vi = lang === 'vi';
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [selectedRole, setSelectedRole] = useState<Role>('USER');
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { handleBackdropClick } = useModalA11y(
    isOpen && Boolean(user),
    onClose,
    loading || showConfirm,
  );

  useEffect(() => {
    if (user) {
      setSelectedRole(user.role);
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const isSelf = Boolean(currentUser && user && currentUser.id === user.id);
  const isLastAdmin = Boolean(user && user.role === 'ADMIN' && adminCount <= 1);

  // Safety checks
  const isSelfDemoteBlocked = isSelf && selectedRole !== 'ADMIN';
  const isLastAdminDemoteBlocked = isLastAdmin && selectedRole !== 'ADMIN';
  const isBlocked = isSelfDemoteBlocked || isLastAdminDemoteBlocked;
  const isUnchanged = selectedRole === user.role;

  const handleOpenConfirm = () => {
    if (isBlocked || isUnchanged) return;
    setShowConfirm(true);
  };

  const handleConfirmExecute = async () => {
    setLoading(true);
    try {
      await rolesService.assignRole(user.id, selectedRole);
      const roleText = selectedRole === 'ADMIN' ? 'ADMIN (Quản trị viên)' : 'USER (Người dùng thường)';
      showToast(
        vi
          ? `Đã cập nhật vai trò ${roleText} cho ${user.email}.`
          : `Role successfully updated to ${roleText} for ${user.email}.`,
      );
      onSuccess({ ...user, role: selectedRole });
      setShowConfirm(false);
      onClose();
    } catch (err: any) {
      showToast(err.message || (vi ? 'Cập nhật vai trò thất bại' : 'Failed to update role'), 'error');
      setShowConfirm(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        className="modal-backdrop show"
        id="assign-role-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-role-modal-title"
        style={{ zIndex: 9998 }}
        onClick={handleBackdropClick}
      >
        <div
          className="modal-content"
          style={{
            maxWidth: 500,
            width: '90%',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-medium)',
            borderRadius: 12,
            padding: 24,
            boxShadow: 'var(--shadow-lg)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 18,
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: 14,
            }}
          >
            <div className="card-header-left" style={{ gap: 10 }}>
              <div className="icon-well">
                <IconLock size={17} />
              </div>
              <div>
                <h3 id="assign-role-modal-title" className="modal-title">
                  {vi ? 'Thay Đổi Quyền Người Dùng' : 'Change User Role'}
                </h3>
                <div className="card-subtitle">
                  {vi ? 'Quản trị vai trò toàn hệ thống' : 'System-wide role management'}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="btn-icon"
              onClick={onClose}
              disabled={loading}
              aria-label={vi ? 'Đóng' : 'Close'}
            >
              <IconX size={16} />
            </button>
          </div>

          {/* User Info Card */}
          <div className="meta-strip" style={{ borderRadius: 8, border: '1px solid var(--border-subtle)', marginBottom: 18, gridTemplateColumns: '1fr' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span className="form-hint" style={{ marginTop: 0 }}>{vi ? 'Người dùng:' : 'User:'}</span>
              <strong style={{ color: 'var(--text-main)' }}>{user.name || (vi ? 'Chưa đặt tên' : 'Unnamed')}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span className="form-hint" style={{ marginTop: 0 }}>Email:</span>
              <span className="mono-tag">{user.email}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span className="form-hint" style={{ marginTop: 0 }}>User ID:</span>
              <span className="mono-tag">{user.id}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="form-hint" style={{ marginTop: 0 }}>{vi ? 'Quyền hiện tại:' : 'Current Role:'}</span>
              <span className={`badge ${user.role === 'ADMIN' ? 'badge-warning' : 'badge-neutral'}`}>
                {user.role}
              </span>
            </div>
          </div>

          {/* Role Selection Cards */}
          <div className="form-group">
            <label className="form-label">
              {vi ? 'Chọn quyền quản trị muốn thay đổi:' : 'Select target role:'}
            </label>
            <div className="role-choice-grid">
              {/* USER Card */}
              <label
                onClick={() => setSelectedRole('USER')}
                className={`role-choice-card ${selectedRole === 'USER' ? 'role-choice-card--user-selected' : ''}`}
              >
                <input
                  type="radio"
                  name="targetRoleRadio"
                  value="USER"
                  checked={selectedRole === 'USER'}
                  onChange={() => setSelectedRole('USER')}
                  disabled={loading}
                  style={{ accentColor: 'var(--primary)' }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>USER</div>
                  <div className="form-hint" style={{ marginTop: 0 }}>
                    {vi ? 'Người dùng thường' : 'Standard User'}
                  </div>
                </div>
              </label>

              {/* ADMIN Card */}
              <label
                onClick={() => setSelectedRole('ADMIN')}
                className={`role-choice-card ${selectedRole === 'ADMIN' ? 'role-choice-card--admin-selected' : ''}`}
              >
                <input
                  type="radio"
                  name="targetRoleRadio"
                  value="ADMIN"
                  checked={selectedRole === 'ADMIN'}
                  onChange={() => setSelectedRole('ADMIN')}
                  disabled={loading}
                  style={{ accentColor: 'var(--warning)' }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--warning)' }}>ADMIN</div>
                  <div className="form-hint" style={{ marginTop: 0 }}>
                    {vi ? 'Super Admin hệ thống' : 'System Super Admin'}
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Dynamic Warning Banner */}
          <div
            id="roleWarningBanner"
            className={`info-banner ${
              isSelfDemoteBlocked || isLastAdminDemoteBlocked
                ? 'info-banner--danger'
                : isUnchanged
                ? 'info-banner--neutral'
                : selectedRole === 'ADMIN'
                ? 'info-banner--warning'
                : 'info-banner--danger'
            }`}
          >
            {isSelfDemoteBlocked ? (
              <div className="inline-code-row" style={{ alignItems: 'flex-start' }}>
                <IconAlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  <strong>{vi ? 'Không thể tự hạ quyền:' : 'Self-demotion blocked:'}</strong>{' '}
                  {vi
                    ? 'Bạn không thể tự hạ quyền Quản trị viên (ADMIN) của chính mình.'
                    : 'You cannot demote your own administrator privileges.'}
                </span>
              </div>
            ) : isLastAdminDemoteBlocked ? (
              <div className="inline-code-row" style={{ alignItems: 'flex-start' }}>
                <IconAlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  <strong>{vi ? 'Không thể hạ quyền:' : 'Demotion blocked:'}</strong>{' '}
                  {vi
                    ? 'Đây là Quản trị viên (ADMIN) duy nhất còn lại của hệ thống.'
                    : 'This is the last remaining administrator in the system.'}
                </span>
              </div>
            ) : isUnchanged ? (
              <div className="inline-code-row" style={{ alignItems: 'flex-start' }}>
                <IconInfo size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  <strong>{vi ? 'Chưa có thay đổi:' : 'No change:'}</strong>{' '}
                  {vi
                    ? `Người dùng đang giữ vai trò ${user.role}. Chọn vai trò khác để kích hoạt nút áp dụng.`
                    : `User currently holds the ${user.role} role. Select another role to enable the confirm button.`}
                </span>
              </div>
            ) : selectedRole === 'ADMIN' ? (
              <div className="inline-code-row" style={{ alignItems: 'flex-start' }}>
                <IconZap size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  <strong>{vi ? 'Cấp quyền Quản trị viên:' : 'Promoting to Administrator:'}</strong>{' '}
                  {vi
                    ? 'Tài khoản này sẽ có toàn quyền quản trị hệ thống, quản lý người dùng và doanh nghiệp.'
                    : 'This account will gain full administrative control over the platform, users, and tenants.'}
                </span>
              </div>
            ) : (
              <div className="inline-code-row" style={{ alignItems: 'flex-start' }}>
                <IconAlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  <strong>{vi ? 'Hạ quyền Người dùng thường:' : 'Demoting to Standard User:'}</strong>{' '}
                  {vi
                    ? 'Tài khoản này sẽ bị thu hồi toàn bộ quyền quản trị hệ thống.'
                    : 'This account will lose all system administrative privileges.'}
                </span>
              </div>
            )}
          </div>

          {/* Safety Constraints Footnote */}
          <div className="form-hint inline-code-row" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 10, marginBottom: 16, alignItems: 'flex-start' }}>
            <IconShield size={14} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              <strong>{vi ? 'Ràng buộc an toàn:' : 'Safety constraints:'}</strong>{' '}
              {vi
                ? 'Không cho phép tự hạ quyền tài khoản đang đăng nhập; Không cho phép hạ quyền Super Admin cuối cùng của hệ thống.'
                : 'Cannot self-demote the current login account; Cannot demote the last Super Admin in the system.'}
            </span>
          </div>

          {/* Actions */}
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
              disabled={loading}
            >
              {vi ? 'Hủy' : 'Cancel'}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              id="roleModalConfirmBtn"
              onClick={handleOpenConfirm}
              disabled={loading || isUnchanged || isBlocked}
            >
              {vi ? 'Xác Nhận Thay Đổi' : 'Confirm Change'}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog from P2 */}
      <ConfirmDialog
        isOpen={showConfirm}
        title={vi ? 'Xác nhận thay đổi vai trò người dùng' : 'Confirm User Role Change'}
        message={
          <div>
            <p style={{ margin: '0 0 10px 0' }}>
              {vi
                ? `Bạn có chắc chắn muốn thay đổi quyền của người dùng ${user.email} từ ${user.role} sang ${selectedRole}?`
                : `Are you sure you want to change the role for ${user.email} from ${user.role} to ${selectedRole}?`}
            </p>
            {selectedRole === 'ADMIN' ? (
              <p className="inline-code-row" style={{ margin: 0, fontSize: 12, color: 'var(--warning)' }}>
                <IconZap size={13} />
                <span>
                  {vi
                    ? 'Tài khoản này sẽ được cấp quyền Quản trị viên (ADMIN) trên toàn hệ thống.'
                    : 'This account will be granted full system administrator privileges.'}
                </span>
              </p>
            ) : (
              <p className="inline-code-row" style={{ margin: 0, fontSize: 12, color: 'var(--danger)' }}>
                <IconAlertTriangle size={13} />
                <span>
                  {vi
                    ? 'Tài khoản này sẽ bị thu hồi toàn bộ quyền Quản trị viên và trở thành Người dùng thường.'
                    : 'This account will lose all administrator privileges and become a standard user.'}
                </span>
              </p>
            )}
          </div>
        }
        confirmText={vi ? 'Xác nhận đổi quyền' : 'Confirm Change'}
        cancelText={vi ? 'Hủy bỏ' : 'Cancel'}
        variant={selectedRole === 'ADMIN' ? 'warning' : 'danger'}
        isLoading={loading}
        onConfirm={handleConfirmExecute}
        onClose={() => setShowConfirm(false)}
      />
    </>
  );
};
