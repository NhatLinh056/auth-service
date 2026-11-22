import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { tenantsService, type TenantSummary } from '../../services/tenants.service';

interface DeleteTenantModalProps {
  tenant: TenantSummary;
  isSuperAdmin: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DeleteTenantModal: React.FC<DeleteTenantModalProps> = ({
  tenant,
  isSuperAdmin,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { lang } = useLanguage();
  const vi = lang === 'vi';
  const { showToast } = useToast();

  const [reason, setReason] = useState('');
  const [confirmName, setConfirmName] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmName.trim().toLowerCase() !== tenant.name.trim().toLowerCase()) {
      showToast(
        vi ? 'Tên doanh nghiệp xác nhận không khớp' : 'Tenant name confirmation does not match',
        'error',
      );
      return;
    }

    if (isSuperAdmin && !reason.trim()) {
      showToast(
        vi ? 'Super Admin bắt buộc nhập lý do xóa doanh nghiệp' : 'Super Admin must provide a reason to delete tenant',
        'error',
      );
      return;
    }

    setLoading(true);
    try {
      await tenantsService.delete(tenant.id, reason.trim() || undefined);
      showToast(
        vi ? `Đã xóa doanh nghiệp "${tenant.name}" thành công!` : `Deleted tenant "${tenant.name}" successfully!`,
        'success',
      );
      onSuccess();
    } catch (err: any) {
      showToast(err.message || (vi ? 'Không thể xóa doanh nghiệp' : 'Failed to delete tenant'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop show" id="delete-tenant-modal">
      <div className="modal-content" style={{ maxWidth: 540 }}>
        <h3 className="modal-title" style={{ color: 'var(--danger)' }}>
          {vi ? 'Xác Nhận Giải Tán & Xóa Doanh Nghiệp' : 'Confirm Delete Tenant'}
        </h3>

        <p className="modal-desc">
          {vi
            ? `Bạn đang thực hiện xóa vĩnh viễn doanh nghiệp "${tenant.name}".`
            : `You are permanently deleting the tenant "${tenant.name}".`}
        </p>

        {/* Safety & Invariant Banner (R-04) */}
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 20,
            fontSize: 13,
            color: '#f87171',
            lineHeight: 1.5,
          }}
        >
          <strong>⚠️ {vi ? 'Bảo toàn dữ liệu theo Hiến pháp v2.0 (R-04):' : 'Data Integrity Policy (R-04):'}</strong>
          <ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>
            <li>
              {vi
                ? 'Toàn bộ thành viên sẽ được tách khỏi doanh nghiệp (User.tenantId = null).'
                : 'All members will be detached from this tenant (User.tenantId = null).'}
            </li>
            <li>
              {vi
                ? 'Tài khoản User, Application và AppUser KHÔNG bị xóa.'
                : 'User accounts, Applications, and AppUsers are NOT deleted.'}
            </li>
            <li>
              {vi
                ? 'Các yêu cầu gia nhập PENDING sẽ bị hủy bỏ tự động.'
                : 'Pending join requests will be automatically cancelled.'}
            </li>
            <li>
              {vi
                ? 'Nhật ký can thiệp (Audit Log) được lưu trữ vĩnh viễn.'
                : 'Audit log records are permanently preserved.'}
            </li>
          </ul>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Reason (required for Super Admin) */}
          {isSuperAdmin && (
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" htmlFor="delete-reason">
                {vi ? 'Lý Do Xóa Doanh Nghiệp' : 'Reason for Deletion'}{' '}
                <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <textarea
                id="delete-reason"
                className="form-control"
                rows={2}
                maxLength={500}
                required
                placeholder={vi ? 'Bắt buộc nhập lý do quản trị xóa doanh nghiệp này...' : 'Required reason for deleting this tenant...'}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={loading}
                style={{ resize: 'vertical' }}
              />
            </div>
          )}

          {/* Confirm Name Input */}
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label" htmlFor="confirm-tenant-name">
              {vi ? 'Nhập tên doanh nghiệp để xác nhận:' : 'Type tenant name to confirm:'}{' '}
              <strong style={{ color: '#fff' }}>{tenant.name}</strong>
            </label>
            <input
              type="text"
              id="confirm-tenant-name"
              className="form-control"
              required
              placeholder={tenant.name}
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              {vi ? 'Hủy' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="btn btn-danger"
              disabled={
                loading ||
                confirmName.trim().toLowerCase() !== tenant.name.trim().toLowerCase() ||
                (isSuperAdmin && !reason.trim())
              }
              id="btn-confirm-delete-tenant"
            >
              {loading ? (vi ? 'Đang xóa...' : 'Deleting...') : (vi ? 'Xác Nhận Xóa' : 'Delete Tenant')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
