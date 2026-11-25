import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { useModalA11y } from '../../hooks/useModalA11y';
import { IconAlertTriangle } from '../common/Icons';
import { tenantsService, type TenantSummary, type TenantMember } from '../../services/tenants.service';

interface TransferOwnerModalProps {
  tenant: TenantSummary;
  members: TenantMember[];
  isSuperAdminIntervention: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: TenantSummary) => void;
}

export const TransferOwnerModal: React.FC<TransferOwnerModalProps> = ({
  tenant,
  members,
  isSuperAdminIntervention,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { lang } = useLanguage();
  const vi = lang === 'vi';
  const { showToast } = useToast();

  // Eligible targets: members excluding current owner
  const eligibleMembers = members.filter((m) => m.id !== tenant.ownerUserId);

  const [selectedUserId, setSelectedUserId] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const { handleBackdropClick } = useModalA11y(isOpen, onClose, loading);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      showToast(
        vi ? 'Vui lòng chọn thành viên tiếp nhận quyền sở hữu' : 'Please select a member to receive ownership',
        'error',
      );
      return;
    }

    if (isSuperAdminIntervention && !reason.trim()) {
      showToast(
        vi ? 'Super Admin bắt buộc nhập lý do chuyển quyền sở hữu' : 'Super Admin must provide a reason for ownership transfer',
        'error',
      );
      return;
    }

    setLoading(true);
    try {
      const updated = await tenantsService.transfer(tenant.id, {
        userId: selectedUserId,
        reason: reason.trim() || undefined,
      });
      showToast(
        vi
          ? 'Đã chuyển giao quyền chủ sở hữu thành công!'
          : 'Tenant ownership transferred successfully!',
        'success',
      );
      onSuccess(updated);
    } catch (err: any) {
      showToast(err.message || (vi ? 'Không thể chuyển quyền sở hữu' : 'Failed to transfer ownership'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-backdrop show"
      id="transfer-owner-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="transfer-owner-modal-title"
      onClick={handleBackdropClick}
    >
      <div className="modal-content" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
        <h3 id="transfer-owner-modal-title" className="modal-title" style={{ color: 'var(--warning)' }}>
          {isSuperAdminIntervention
            ? (vi ? 'Can Thiệp: Chuyển Quyền Chủ Sở Hữu (Admin)' : 'Admin Intervention: Transfer Ownership')
            : (vi ? 'Chuyển Giao Quyền Chủ Sở Hữu' : 'Transfer Tenant Ownership')}
        </h3>

        <p className="modal-desc">
          {vi
            ? `Chuyển giao quyền quản trị cao nhất của doanh nghiệp "${tenant.name}" cho một thành viên hiện tại.`
            : `Transfer the primary ownership of "${tenant.name}" to an existing member.`}
        </p>

        {/* Warning Banner */}
        <div className="info-banner info-banner--warning" style={{ flexDirection: 'column', gap: 6 }}>
          <strong className="inline-code-row">
            <IconAlertTriangle size={15} />
            <span>{vi ? 'Lưu ý quan trọng:' : 'Important Notice:'}</span>
          </strong>
          <ul style={{ margin: '2px 0 0', paddingLeft: 20 }}>
            <li>
              {vi
                ? 'Chủ sở hữu hiện tại sẽ trở thành thành viên thông thường và mất quyền quản trị Tenant này.'
                : 'The current owner will become a regular member and lose management rights.'}
            </li>
            <li>
              {vi
                ? 'Hành động này được ghi lại vĩnh viễn trong Audit Log của hệ thống.'
                : 'This action is permanently recorded in the system Audit Log.'}
            </li>
          </ul>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Target Member Selection */}
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label" htmlFor="select-target-member">
              {vi ? 'Chọn Thành Viên Nhận Quyền' : 'Select New Owner'}{' '}
              <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            {eligibleMembers.length === 0 ? (
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px dashed var(--border-medium)',
                  borderRadius: 6,
                  padding: '12px',
                  fontSize: 13,
                  color: 'var(--text-muted)',
                }}
              >
                {vi
                  ? 'Doanh nghiệp hiện chưa có thành viên nào khác để chuyển giao quyền sở hữu.'
                  : 'No other members exist in this tenant to transfer ownership to.'}
              </div>
            ) : (
              <select
                id="select-target-member"
                className="form-control"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                required
                disabled={loading}
              >
                <option value="">{vi ? '-- Chọn một thành viên --' : '-- Select a member --'}</option>
                {eligibleMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name ? `${m.name} (${m.email})` : m.email}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Reason (required for Super Admin) */}
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label" htmlFor="transfer-reason">
              {vi ? 'Lý Do Chuyển Quyền' : 'Reason for Transfer'}{' '}
              {isSuperAdminIntervention && <span style={{ color: 'var(--danger)' }}>*</span>}
            </label>
            <textarea
              id="transfer-reason"
              className="form-control"
              rows={2}
              maxLength={500}
              required={isSuperAdminIntervention}
              placeholder={
                isSuperAdminIntervention
                  ? (vi ? 'Bắt buộc nhập lý do can thiệp chuyển quyền...' : 'Required reason for admin ownership transfer...')
                  : (vi ? 'Ghi chú lý do chuyển giao (tùy chọn)...' : 'Optional notes for ownership transfer...')
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={loading}
              style={{ resize: 'vertical' }}
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
              className="btn btn-primary"
              disabled={loading || !selectedUserId || (isSuperAdminIntervention && !reason.trim())}
              id="btn-confirm-transfer-owner"
              style={{ background: '#f59e0b', borderColor: '#d97706', color: '#000' }}
            >
              {loading ? (vi ? 'Đang xử lý...' : 'Processing...') : (vi ? 'Xác Nhận Chuyển Quyền' : 'Confirm Transfer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
