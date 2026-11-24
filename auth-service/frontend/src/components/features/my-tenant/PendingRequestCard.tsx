import React, { useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useToast } from '../../../contexts/ToastContext';
import { ConfirmDialog } from '../../common/ConfirmDialog';
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
    <div style={{ maxWidth: 840, margin: '20px auto' }}>
      {/* CASE 1: PENDING REQUEST CARD (Matching Scene 6 Wireframe) */}
      <div
        id="scene6PendingCard"
        style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: 8,
          padding: '18px 20px',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="badge badge-warning">PENDING</span>
              <strong style={{ color: '#f59e0b', fontSize: 14 }}>
                {vi ? 'Bạn đang có 1 yêu cầu gia nhập đang chờ duyệt' : 'You have 1 pending join request'}
              </strong>
            </div>

            <p style={{ fontSize: 13, color: '#fff', margin: '8px 0 2px' }}>
              {vi ? 'Doanh nghiệp mục tiêu:' : 'Target tenant:'}{' '}
              <strong>{targetTenant?.name || vi ? 'Doanh nghiệp' : 'Tenant'}</strong>{' '}
              {targetTenant?.id && (
                <span style={{ color: 'var(--text-dim)' }}>
                  (Tenant ID: <code style={{ fontSize: 11 }}>{targetTenant.id}</code>)
                </span>
              )}
            </p>

            {targetTenant?.owner && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0' }}>
                {vi ? 'Chủ sở hữu:' : 'Owner:'} <strong>{targetTenant.owner.email}</strong>
              </p>
            )}

            <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '4px 0 0' }}>
              {vi ? 'Gửi yêu cầu lúc:' : 'Submitted at:'} {formatDate(request.createdAt)}
            </p>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setConfirmCancelOpen(true)}
            style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.4)', whiteSpace: 'nowrap' }}
            id="btn-cancel-pending-request"
          >
            {vi ? 'Hủy Yêu Cầu (Cancel)' : 'Cancel Request'}
          </button>
        </div>

        <div
          style={{
            marginTop: 14,
            paddingTop: 10,
            borderTop: '1px solid rgba(245, 158, 11, 0.2)',
            fontSize: 12,
            color: '#f59e0b',
            lineHeight: 1.5,
          }}
        >
          ⚠️ <strong>{vi ? 'Quy tắc an toàn:' : 'Safety Rule:'}</strong>{' '}
          {vi
            ? 'Khi đang có yêu cầu PENDING, bạn KHÔNG THỂ tạo Tenant mới hoặc gửi yêu cầu gia nhập Tenant khác cho đến khi hủy yêu cầu này.'
            : 'While a PENDING request is active, you CANNOT create a new tenant or apply to another tenant until this request is cancelled.'}
        </div>
      </div>

      {/* CASE 2: LOCKED ACTIONS PANEL (Scene 6) */}
      <div className="card-panel" id="scene6ActionPanel" style={{ opacity: 0.55, position: 'relative' }}>
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="panel-title" id="scene6ActionTitle">
            {vi
              ? 'Tùy Chọn Khi Chưa Thuộc Doanh Nghiệp (Đang Tạm Khóa Do Có Yêu Cầu PENDING)'
              : 'Options When Not In Tenant (Locked Due to Active PENDING Request)'}
          </div>
          <span className="badge badge-warning" id="scene6ActionBadge">
            {vi ? 'BỊ KHÓA BỞI HỆ THỐNG' : 'LOCKED BY SYSTEM'}
          </span>
        </div>

        <div className="panel-body" style={{ padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Action 1: Create Tenant (Locked) */}
            <div
              style={{
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
                padding: 20,
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 32, marginBottom: 10 }}>🏢</div>
                <strong style={{ fontSize: 15, color: '#fff' }}>
                  {vi ? 'Tạo Doanh Nghiệp Mới' : 'Create New Tenant'}
                </strong>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '6px 0 16px' }}>
                  {vi
                    ? 'Tạo doanh nghiệp của riêng bạn và tự động trở thành Tenant Owner với toàn quyền quản trị thành viên.'
                    : 'Create your own organization and automatically become Tenant Owner with full member management privileges.'}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                disabled
                style={{ width: '100%', opacity: 0.5, cursor: notAllowedStyle.cursor }}
                title={vi ? 'Bị khóa: Bạn đang có yêu cầu PENDING chờ duyệt' : 'Locked: Active PENDING request exists'}
              >
                {vi ? '+ Tạo Doanh Nghiệp (Đang Khóa)' : '+ Create Tenant (Locked)'}
              </button>
            </div>

            {/* Action 2: Join by Tenant ID (Locked) */}
            <div
              style={{
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
                padding: 20,
                textAlign: 'left',
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 10, textAlign: 'center' }}>🔑</div>
              <strong style={{ fontSize: 15, color: '#fff', display: 'block', textAlign: 'center' }}>
                {vi ? 'Gia Nhập Theo Tenant ID' : 'Join by Tenant ID'}
              </strong>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '6px 0 14px', textAlign: 'center' }}>
                {vi
                  ? 'Nhập mã Tenant ID UUID do doanh nghiệp của bạn cung cấp để tra cứu và gửi yêu cầu gia nhập.'
                  : 'Enter the UUID Tenant ID provided by your organization to look up and apply.'}
              </p>

              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input
                  type="text"
                  placeholder={vi ? 'Nhập Tenant ID UUID...' : 'Enter UUID Tenant ID...'}
                  disabled
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-medium)',
                    color: '#94a3b8',
                    padding: '7px 10px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontFamily: 'monospace',
                    flex: 1,
                    cursor: 'not-allowed',
                  }}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled
                  style={{ cursor: 'not-allowed' }}
                >
                  {vi ? 'Kiểm Tra' : 'Verify'}
                </button>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                disabled
                style={{ width: '100%', opacity: 0.5, cursor: 'not-allowed' }}
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
        confirmText={cancelling ? (vi ? 'Đang hủy...' : 'Cancelling...') : (vi ? 'Xác Nhận Hủy' : 'Confirm Cancel')}
        cancelText={vi ? 'Quay Lại' : 'Back'}
        variant="warning"
        isLoading={cancelling}
        onConfirm={handleCancel}
        onClose={() => setConfirmCancelOpen(false)}
      />
    </div>
  );
};

const notAllowedStyle = { cursor: 'not-allowed' };
