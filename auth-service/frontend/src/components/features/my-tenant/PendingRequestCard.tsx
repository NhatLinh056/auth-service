import React, { useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useToast } from '../../../contexts/ToastContext';
import { ConfirmDialog } from '../../common/ConfirmDialog';
import { IconAlertTriangle, IconBuilding, IconKey, IconPlus } from '../../common/Icons';
import { tenantsService, type TenantJoinRequest } from '../../../services/tenants.service';

interface PendingRequestCardProps {
  request: TenantJoinRequest;
  onCancelled: () => void;
}

export const PendingRequestCard: React.FC<PendingRequestCardProps> = ({
  request,
  onCancelled,
}) => {
  const { lang } = useLanguage();
  const vi = lang === 'vi';
  const { showToast } = useToast();

  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const formatDate = (iso?: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleString(vi ? 'vi-VN' : 'en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await tenantsService.cancelJoinRequest(request.id);
      showToast(
        vi ? 'Đã hủy yêu cầu gia nhập doanh nghiệp thành công.' : 'Cancelled join request successfully.',
        'info',
      );
      setConfirmCancelOpen(false);
      onCancelled();
    } catch (err: any) {
      showToast(err.message || (vi ? 'Không thể hủy yêu cầu' : 'Failed to cancel request'), 'error');
    } finally {
      setCancelling(false);
    }
  };

  const targetTenant = request.tenant;

  return (
    <div className="page-container page-container--narrow card-stack">
      {/* CASE 1: PENDING REQUEST CARD */}
      <div
        id="scene6PendingCard"
        className="card"
        style={{
          background: 'var(--warning-subtle)',
          borderColor: 'var(--warning-border)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div className="inline-code-row" style={{ flexWrap: 'wrap' }}>
              <span className="badge badge-warning">PENDING</span>
              <strong style={{ color: 'var(--warning)', fontSize: 14 }}>
                {vi ? 'Bạn đang có 1 yêu cầu gia nhập đang chờ duyệt' : 'You have 1 pending join request'}
              </strong>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-main)', margin: '8px 0 4px' }}>
              {vi ? 'Doanh nghiệp mục tiêu:' : 'Target tenant:'}{' '}
              <strong>{targetTenant?.name || (vi ? 'Doanh nghiệp' : 'Tenant')}</strong>{' '}
              {targetTenant?.id && (
                <span className="form-hint">
                  (Tenant ID: <code className="mono-tag">{targetTenant.id}</code>)
                </span>
              )}
            </p>

            {targetTenant?.owner && (
              <p className="card-subtitle" style={{ margin: '2px 0' }}>
                {vi ? 'Chủ sở hữu:' : 'Owner:'} <strong style={{ color: 'var(--text-main)' }}>{targetTenant.owner.email}</strong>
              </p>
            )}

            <p className="form-hint">
              {vi ? 'Gửi yêu cầu lúc:' : 'Submitted at:'} {formatDate(request.createdAt)}
            </p>
          </div>

          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => setConfirmCancelOpen(true)}
            id="btn-cancel-pending-request"
          >
            {vi ? 'Hủy Yêu Cầu' : 'Cancel Request'}
          </button>
        </div>

        <div
          className="inline-code-row"
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: '1px solid var(--warning-border)',
            fontSize: 12,
            color: 'var(--warning)',
            alignItems: 'flex-start',
          }}
        >
          <IconAlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            <strong>{vi ? 'Quy tắc an toàn:' : 'Safety Rule:'}</strong>{' '}
            {vi
              ? 'Khi đang có yêu cầu PENDING, bạn KHÔNG THỂ tạo Tenant mới hoặc gửi yêu cầu gia nhập Tenant khác cho đến khi hủy yêu cầu này.'
              : 'While a PENDING request is active, you CANNOT create a new tenant or apply to another tenant until this request is cancelled.'}
          </span>
        </div>
      </div>

      {/* CASE 2: LOCKED ACTIONS PANEL */}
      <div className="card-panel" id="scene6ActionPanel" style={{ opacity: 0.65 }}>
        <div className="panel-header">
          <div className="panel-title" id="scene6ActionTitle">
            {vi
              ? 'Tùy Chọn Khi Chưa Thuộc Doanh Nghiệp (Đang Tạm Khóa)'
              : 'Options When Not In Tenant (Locked)'}
          </div>
          <span className="badge badge-warning" id="scene6ActionBadge">
            {vi ? 'BỊ KHÓA BỞI HỆ THỐNG' : 'LOCKED BY SYSTEM'}
          </span>
        </div>

        <div className="panel-body">
          <div className="grid-2-col">
            {/* Action 1: Create Tenant (Locked) */}
            <div className="option-tile option-tile-center">
              <div>
                <div className="icon-well icon-well--lg">
                  <IconBuilding size={22} />
                </div>
                <strong style={{ fontSize: 15, color: 'var(--text-main)', display: 'block', marginBottom: 6 }}>
                  {vi ? 'Tạo Doanh Nghiệp Mới' : 'Create New Tenant'}
                </strong>
                <p className="card-subtitle">
                  {vi
                    ? 'Tạo doanh nghiệp của riêng bạn và tự động trở thành Tenant Owner với toàn quyền quản trị thành viên.'
                    : 'Create your own organization and automatically become Tenant Owner with full member management privileges.'}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-block"
                disabled
                title={vi ? 'Bị khóa: Bạn đang có yêu cầu PENDING chờ duyệt' : 'Locked: Active PENDING request exists'}
              >
                <IconPlus size={14} />
                <span>{vi ? 'Tạo Doanh Nghiệp (Đang Khóa)' : 'Create Tenant (Locked)'}</span>
              </button>
            </div>

            {/* Action 2: Join by Tenant ID (Locked) */}
            <div className="option-tile">
              <div className="option-tile-center">
                <div className="icon-well icon-well--lg icon-well--teal">
                  <IconKey size={22} />
                </div>
                <strong style={{ fontSize: 15, color: 'var(--text-main)', display: 'block', marginBottom: 6 }}>
                  {vi ? 'Gia Nhập Theo Tenant ID' : 'Join by Tenant ID'}
                </strong>
                <p className="card-subtitle" style={{ marginBottom: 14 }}>
                  {vi
                    ? 'Nhập mã Tenant ID UUID do doanh nghiệp của bạn cung cấp để tra cứu và gửi yêu cầu gia nhập.'
                    : 'Enter the UUID Tenant ID provided by your organization to look up and apply.'}
                </p>
              </div>

              <div className="inline-code-row" style={{ width: '100%' }}>
                <input
                  type="text"
                  className="form-control form-control-mono"
                  placeholder={vi ? 'Nhập Tenant ID UUID...' : 'Enter UUID Tenant ID...'}
                  disabled
                />
                <button type="button" className="btn btn-secondary btn-sm" disabled>
                  {vi ? 'Kiểm Tra' : 'Verify'}
                </button>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-block"
                disabled
                title={vi ? 'Bị khóa: Bạn đang có yêu cầu PENDING chờ duyệt' : 'Locked: Active PENDING request exists'}
              >
                {vi ? 'Xác Nhận Gửi Yêu Cầu (Đang Khóa)' : 'Submit Join Request (Locked)'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Cancel */}
      <ConfirmDialog
        isOpen={confirmCancelOpen}
        title={vi ? 'Xác Nhận Hủy Yêu Cầu Gia Nhập' : 'Confirm Cancel Join Request'}
        message={
          vi
            ? `Bạn có chắc chắn muốn hủy yêu cầu xin gia nhập doanh nghiệp "${targetTenant?.name || 'mục tiêu'}" không? Sau khi hủy, bạn có thể tạo doanh nghiệp mới hoặc gửi yêu cầu khác.`
            : `Are you sure you want to cancel your join request to "${targetTenant?.name || 'target'}"? Once cancelled, you can create a new tenant or apply to another.`
        }
        confirmText={cancelling ? (vi ? 'Đang hủy…' : 'Cancelling…') : (vi ? 'Xác Nhận Hủy' : 'Confirm Cancel')}
        cancelText={vi ? 'Quay Lại' : 'Back'}
        variant="warning"
        isLoading={cancelling}
        onConfirm={handleCancel}
        onClose={() => setConfirmCancelOpen(false)}
      />
    </div>
  );
};
