import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { ConfirmDialog } from '../common/ConfirmDialog';
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
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9998,
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && !loading) {
            onClose();
          }
        }}
      >
        <div
          className="modal-content"
          style={{
            maxWidth: 500,
            width: '90%',
            background: 'var(--bg-surface, #111827)',
            border: '1px solid var(--border-medium, #334155)',
            borderRadius: 12,
            padding: 24,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
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
              borderBottom: '1px solid var(--border-subtle, #1e293b)',
              paddingBottom: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: 'rgba(79, 70, 229, 0.15)',
                  border: '1px solid rgba(79, 70, 229, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#818cf8',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a5 5 0 0 1 5 5v3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2V7a5 5 0 0 1 5-5z" />
                </svg>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#fff' }}>
                  {vi ? 'Thay Đổi Quyền Người Dùng' : 'Change User Role'}
                </h3>
                <div style={{ fontSize: 12, color: 'var(--text-dim, #64748b)' }}>
                  {vi ? 'Quản trị vai trò toàn hệ thống' : 'System-wide role management'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted, #94a3b8)',
                fontSize: 18,
                cursor: loading ? 'not-allowed' : 'pointer',
                padding: 4,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>

          {/* User Info Card */}
          <div
            style={{
              background: 'var(--bg-surface-elevated, #1a2234)',
              border: '1px solid var(--border-subtle, #1e293b)',
              borderRadius: 8,
              padding: '12px 14px',
              marginBottom: 18,
              fontSize: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: 'var(--text-dim, #64748b)' }}>{vi ? 'Người dùng:' : 'User:'}</span>
              <strong style={{ color: '#fff' }}>{user.name || (vi ? 'Chưa đặt tên' : 'Unnamed')}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: 'var(--text-dim, #64748b)' }}>Email:</span>
              <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{user.email}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: 'var(--text-dim, #64748b)' }}>User ID:</span>
              <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{user.id}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-dim, #64748b)' }}>{vi ? 'Quyền hiện tại:' : 'Current Role:'}</span>
              <span
                className={`badge ${user.role === 'ADMIN' ? 'badge-warning' : 'badge-neutral'}`}
                style={{ fontWeight: 600, fontSize: 11 }}
              >
                {user.role}
              </span>
            </div>
          </div>

          {/* Role Selection Cards */}
          <div style={{ marginBottom: 18 }}>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: '#fff',
                marginBottom: 8,
              }}
            >
              {vi ? 'Chọn quyền quản trị muốn thay đổi:' : 'Select target role:'}
            </label>
            <div style={{ display: 'flex', gap: 12 }}>
              {/* USER Card */}
              <label
                onClick={() => setSelectedRole('USER')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  background: selectedRole === 'USER' ? 'rgba(79, 70, 229, 0.12)' : 'var(--bg-base, #0b0f19)',
                  border:
                    selectedRole === 'USER'
                      ? '1px solid #4f46e5'
                      : '1px solid var(--border-medium, #334155)',
                  borderRadius: 8,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <input
                  type="radio"
                  name="targetRoleRadio"
                  value="USER"
                  checked={selectedRole === 'USER'}
                  onChange={() => setSelectedRole('USER')}
                  disabled={loading}
                  style={{ accentColor: '#4f46e5' }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>USER</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim, #64748b)' }}>
                    {vi ? 'Người dùng thường' : 'Standard User'}
                  </div>
                </div>
              </label>

              {/* ADMIN Card */}
              <label
                onClick={() => setSelectedRole('ADMIN')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  background: selectedRole === 'ADMIN' ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg-base, #0b0f19)',
                  border:
                    selectedRole === 'ADMIN'
                      ? '1px solid #f59e0b'
                      : '1px solid var(--border-medium, #334155)',
                  borderRadius: 8,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <input
                  type="radio"
                  name="targetRoleRadio"
                  value="ADMIN"
                  checked={selectedRole === 'ADMIN'}
                  onChange={() => setSelectedRole('ADMIN')}
                  disabled={loading}
                  style={{ accentColor: '#f59e0b' }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b' }}>ADMIN</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim, #64748b)' }}>
                    {vi ? 'Super Admin hệ thống' : 'System Super Admin'}
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Dynamic Warning Banner */}
          <div
            id="roleWarningBanner"
            style={{
              borderRadius: 8,
              padding: '12px 14px',
              fontSize: 12,
              lineHeight: 1.5,
              marginBottom: 14,
              border: '1px solid',
              ...(isSelfDemoteBlocked
                ? {
                    background: 'rgba(239, 68, 68, 0.1)',
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                  }
                : isLastAdminDemoteBlocked
                ? {
                    background: 'rgba(239, 68, 68, 0.1)',
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                  }
                : isUnchanged
                ? {
                    background: 'rgba(148, 163, 184, 0.08)',
                    borderColor: 'rgba(148, 163, 184, 0.25)',
                    color: '#94a3b8',
                  }
                : selectedRole === 'ADMIN'
                ? {
                    background: 'rgba(245, 158, 11, 0.1)',
                    borderColor: 'rgba(245, 158, 11, 0.3)',
                    color: '#fbbf24',
                  }
                : {
                    background: 'rgba(239, 68, 68, 0.08)',
                    borderColor: 'rgba(239, 68, 68, 0.25)',
                    color: '#fca5a5',
                  }),
            }}
          >
            {isSelfDemoteBlocked ? (
              <div>
                <strong>⚠️ {vi ? 'Không thể tự hạ quyền:' : 'Self-demotion blocked:'}</strong>{' '}
                {vi
                  ? 'Bạn không thể tự hạ quyền Quản trị viên (ADMIN) của chính mình.'
                  : 'You cannot demote your own administrator privileges.'}
              </div>
            ) : isLastAdminDemoteBlocked ? (
              <div>
                <strong>⚠️ {vi ? 'Không thể hạ quyền:' : 'Demotion blocked:'}</strong>{' '}
                {vi
                  ? 'Đây là Quản trị viên (ADMIN) duy nhất còn lại của hệ thống.'
                  : 'This is the last remaining administrator in the system.'}
              </div>
            ) : isUnchanged ? (
              <div>
                ℹ️ <strong>{vi ? 'Chưa có thay đổi:' : 'No change:'}</strong>{' '}
                {vi
                  ? `Người dùng đang giữ vai trò ${user.role}. Chọn vai trò khác để kích hoạt nút áp dụng.`
                  : `User currently holds the ${user.role} role. Select another role to enable the confirm button.`}
              </div>
            ) : selectedRole === 'ADMIN' ? (
              <div>
                ⚡ <strong>{vi ? 'Cấp quyền Quản trị viên:' : 'Promoting to Administrator:'}</strong>{' '}
                {vi
                  ? 'Tài khoản này sẽ có toàn quyền quản trị hệ thống, quản lý người dùng và doanh nghiệp.'
                  : 'This account will gain full administrative control over the platform, users, and tenants.'}
              </div>
            ) : (
              <div>
                ⚠️ <strong>{vi ? 'Hạ quyền Người dùng thường:' : 'Demoting to Standard User:'}</strong>{' '}
                {vi
                  ? 'Tài khoản này sẽ bị thu hồi toàn bộ quyền quản trị hệ thống.'
                  : 'This account will lose all system administrative privileges.'}
              </div>
            )}
          </div>

          {/* Safety Constraints Footnote */}
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-dim, #64748b)',
              lineHeight: 1.4,
              borderTop: '1px solid var(--border-subtle, #1e293b)',
              paddingTop: 10,
              marginBottom: 20,
            }}
          >
            🛡️ <strong>{vi ? 'Ràng buộc an toàn:' : 'Safety constraints:'}</strong>{' '}
            {vi
              ? 'Không cho phép tự hạ quyền tài khoản đang đăng nhập; Không cho phép hạ quyền Super Admin cuối cùng của hệ thống.'
              : 'Cannot self-demote the current login account; Cannot demote the last Super Admin in the system.'}
          </div>

          {/* Actions */}
          <div
            className="modal-actions"
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
            }}
          >
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
              style={{
                opacity: loading || isUnchanged || isBlocked ? 0.5 : 1,
                cursor: loading || isUnchanged || isBlocked ? 'not-allowed' : 'pointer',
              }}
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
              <p style={{ margin: 0, fontSize: 12, color: '#fbbf24' }}>
                {vi
                  ? '⚡ Tài khoản này sẽ được cấp quyền Quản trị viên (ADMIN) trên toàn hệ thống.'
                  : '⚡ This account will be granted full system administrator privileges.'}
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: 12, color: '#f87171' }}>
                {vi
                  ? '⚠️ Tài khoản này sẽ bị thu hồi toàn bộ quyền Quản trị viên và trở thành Người dùng thường.'
                  : '⚠️ This account will lose all administrator privileges and become a standard user.'}
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
