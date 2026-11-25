import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { ConfirmDialog } from '../../common/ConfirmDialog';
import { IconAlertTriangle, IconCopy, IconRefresh } from '../../common/Icons';
import { useModalA11y } from '../../../hooks/useModalA11y';
import { EditTenantModal } from '../../modals/EditTenantModal';
import { TransferOwnerModal } from '../../modals/TransferOwnerModal';
import { DeleteTenantModal } from '../../modals/DeleteTenantModal';
import {
  tenantsService,
  type TenantSummary,
  type TenantMember,
  type TenantJoinRequest,
} from '../../../services/tenants.service';

interface TenantOwnerViewProps {
  tenant: TenantSummary;
  onUpdated: () => void;
  onDeleted: () => void;
}

export const TenantOwnerView: React.FC<TenantOwnerViewProps> = ({
  tenant,
  onUpdated,
  onDeleted,
}) => {
  const { lang } = useLanguage();
  const vi = lang === 'vi';
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  // State
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [joinRequests, setJoinRequests] = useState<TenantJoinRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [requestsError, setRequestsError] = useState<string | null>(null);

  // Modals state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Action states
  const [removeMemberTarget, setRemoveMemberTarget] = useState<TenantMember | null>(null);
  const [removingMember, setRemovingMember] = useState(false);

  const [approveTarget, setApproveTarget] = useState<TenantJoinRequest | null>(null);
  const [approving, setApproving] = useState(false);

  const [rejectTarget, setRejectTarget] = useState<TenantJoinRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const { handleBackdropClick: handleRejectBackdropClick } = useModalA11y(
    Boolean(rejectTarget),
    () => setRejectTarget(null),
    rejecting,
  );

  // Fetch members
  const loadMembers = useCallback(async () => {
    setLoadingMembers(true);
    setMembersError(null);
    try {
      const data = await tenantsService.getMembers(tenant.id);
      setMembers(data);
    } catch (err: any) {
      setMembersError(err?.message || (vi ? 'Không thể tải danh sách thành viên' : 'Failed to load members'));
      setMembers(tenant.members || []);
    } finally {
      setLoadingMembers(false);
    }
  }, [tenant.id, tenant.members, vi]);

  // Fetch join requests
  const loadJoinRequests = useCallback(async () => {
    setLoadingRequests(true);
    setRequestsError(null);
    try {
      const reqs = await tenantsService.listJoinRequests(tenant.id);
      setJoinRequests(reqs.filter((r) => r.status === 'PENDING'));
    } catch (err: any) {
      setRequestsError(err?.message || (vi ? 'Không thể tải yêu cầu gia nhập' : 'Failed to load join requests'));
      setJoinRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  }, [tenant.id, vi]);

  useEffect(() => {
    loadMembers();
    loadJoinRequests();
  }, [loadMembers, loadJoinRequests]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(
      vi ? `Đã sao chép ${label} vào clipboard.` : `Copied ${label} to clipboard.`,
      'info',
    );
  };

  const handleRemoveMember = async () => {
    if (!removeMemberTarget) return;
    setRemovingMember(true);
    try {
      await tenantsService.removeMember(tenant.id, removeMemberTarget.id);
      showToast(
        vi
          ? `Đã loại thành viên "${removeMemberTarget.name || removeMemberTarget.email}" khỏi doanh nghiệp.`
          : `Removed member "${removeMemberTarget.name || removeMemberTarget.email}" from tenant.`,
        'success',
      );
      setRemoveMemberTarget(null);
      loadMembers();
      onUpdated();
    } catch (err: any) {
      showToast(err.message || (vi ? 'Không thể loại thành viên' : 'Failed to remove member'), 'error');
    } finally {
      setRemovingMember(false);
    }
  };

  const handleApprove = async () => {
    if (!approveTarget) return;
    setApproving(true);
    try {
      await tenantsService.approveJoinRequest(approveTarget.id);
      showToast(
        vi
          ? `Đã duyệt yêu cầu gia nhập cho "${approveTarget.user?.name || approveTarget.user?.email || 'người dùng'}".`
          : 'Approved join request successfully.',
        'success',
      );
      setApproveTarget(null);
      loadMembers();
      loadJoinRequests();
      onUpdated();
    } catch (err: any) {
      showToast(err.message || (vi ? 'Không thể duyệt yêu cầu' : 'Failed to approve request'), 'error');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setRejecting(true);
    try {
      await tenantsService.rejectJoinRequest(rejectTarget.id, rejectReason.trim() || undefined);
      showToast(
        vi
          ? `Đã từ chối yêu cầu gia nhập của "${rejectTarget.user?.email || 'người dùng'}".`
          : 'Rejected join request.',
        'info',
      );
      setRejectTarget(null);
      setRejectReason('');
      loadJoinRequests();
    } catch (err: any) {
      showToast(err.message || (vi ? 'Không thể từ chối yêu cầu' : 'Failed to reject request'), 'error');
    } finally {
      setRejecting(false);
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(vi ? 'vi-VN' : 'en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const formatDateTime = (iso?: string) => {
    if (!iso) return '—';
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

  const getMonogram = (name?: string, email?: string) => {
    const text = (name || email || '?').trim();
    return text.charAt(0).toUpperCase();
  };

  return (
    <div className="page-container page-container--tenant card-stack">
      {/* Overview Top Card */}
      <div className="tenant-summary-bar" style={{ marginBottom: 0 }}>
        <div>
          <div className="inline-code-row" style={{ gap: 10 }}>
            <h1 className="page-title">{tenant.name}</h1>
            <span className="badge badge-warning">{vi ? 'CHỦ SỞ HỮU' : 'TENANT OWNER'}</span>
          </div>

          {tenant.description && (
            <p className="page-subtitle" style={{ marginTop: 4 }}>
              {tenant.description}
            </p>
          )}

          <div className="tenant-meta-list">
            <span className="inline-code-row">
              <span>Tenant ID:</span>
              <code className="mono-tag">{tenant.id}</code>
              <button
                type="button"
                className="btn-icon"
                onClick={() => copyToClipboard(tenant.id, 'Tenant ID')}
                title={vi ? 'Sao chép Tenant ID' : 'Copy Tenant ID'}
                aria-label={vi ? 'Sao chép Tenant ID' : 'Copy Tenant ID'}
              >
                <IconCopy size={13} />
              </button>
            </span>
            <span>
              {vi ? 'Chủ sở hữu:' : 'Owner:'}{' '}
              <strong style={{ color: 'var(--text-main)' }}>{tenant.owner?.email || tenant.ownerUserId}</strong>
            </span>
            <span>
              {vi ? 'Tổng thành viên:' : 'Members:'}{' '}
              <strong style={{ color: 'var(--success)' }}>{members.length}</strong>
            </span>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setIsEditOpen(true)}
          id="btn-edit-tenant-details"
        >
          {vi ? 'Chỉnh Sửa Tên & Mô Tả' : 'Edit Details'}
        </button>
      </div>

      {/* Card 1: Members Table */}
      <div className="card-panel">
        <div className="panel-header">
          <div className="panel-title">
            {vi
              ? `Danh Sách Thành Viên Doanh Nghiệp (${members.length})`
              : `Tenant Members (${members.length})`}
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadMembers}
            disabled={loadingMembers}
          >
            {loadingMembers ? (vi ? 'Đang tải…' : 'Loading…') : (vi ? 'Làm Mới' : 'Refresh')}
          </button>
        </div>

        {membersError && (
          <div style={{ padding: '12px 16px 0' }}>
            <div className="error-alert" role="alert" id="tenant-members-error" style={{ marginBottom: 0 }}>
              <div className="error-alert-content">
                <IconAlertTriangle size={16} />
                <span>{membersError}</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={loadMembers}
                disabled={loadingMembers}
              >
                <IconRefresh size={13} />
                <span>{vi ? 'Thử lại' : 'Retry'}</span>
              </button>
            </div>
          </div>
        )}

        <div className="table-responsive">
          <table className="mock-table">
            <thead>
              <tr>
                <th>{vi ? 'Thành Viên' : 'Member'}</th>
                <th>Email</th>
                <th>User ID (UUID)</th>
                <th>{vi ? 'Vai Trò Tenant' : 'Tenant Role'}</th>
                <th>{vi ? 'Ngày Gia Nhập' : 'Joined Date'}</th>
                <th style={{ textAlign: 'right' }}>{vi ? 'Thao Tác Owner' : 'Owner Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {loadingMembers ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                    {vi ? 'Đang tải danh sách thành viên...' : 'Loading members...'}
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                    {vi ? 'Chưa có thành viên nào.' : 'No members found.'}
                  </td>
                </tr>
              ) : (
                members.map((m) => {
                  const isOwner = m.id === tenant.ownerUserId || m.isOwner;
                  const isSelf = m.id === currentUser?.id;

                  return (
                    <tr key={m.id} style={isOwner ? { background: 'var(--warning-subtle)' } : undefined}>
                      <td>
                        <div className="inline-code-row" style={{ gap: 10 }}>
                          <div className={`avatar-circle avatar-circle--sm ${isOwner ? 'avatar-circle--admin' : ''}`}>
                            {getMonogram(m.name, m.email)}
                          </div>
                          <strong style={{ color: 'var(--text-main)', fontSize: 13 }}>
                            {m.name || m.email.split('@')[0]}
                            {isSelf && (
                              <span style={{ color: 'var(--warning)', marginLeft: 6, fontSize: 11 }}>
                                ({vi ? 'Bạn' : 'You'})
                              </span>
                            )}
                          </strong>
                        </div>
                      </td>

                      <td style={{ color: 'var(--text-muted)' }}>{m.email}</td>

                      <td>
                        <div className="inline-code-row">
                          <code className="mono-tag">{m.id}</code>
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => copyToClipboard(m.id, 'User ID')}
                            title={vi ? 'Sao chép User ID' : 'Copy User ID'}
                            aria-label={vi ? 'Sao chép User ID' : 'Copy User ID'}
                          >
                            <IconCopy size={13} />
                          </button>
                        </div>
                      </td>

                      <td>
                        {isOwner ? (
                          <span className="badge badge-warning">{vi ? 'Tenant Owner' : 'Owner'}</span>
                        ) : (
                          <span className="badge badge-secondary">{vi ? 'Thành Viên' : 'Member'}</span>
                        )}
                      </td>

                      <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                        {formatDate(m.createdAt)}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        {isOwner ? (
                          <span className="form-hint" style={{ marginTop: 0, fontStyle: 'italic' }}>
                            {vi ? 'Chủ sở hữu' : 'Current Owner'}
                          </span>
                        ) : (
                          <div className="app-actions-group">
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setIsTransferOpen(true)}
                              title={vi ? 'Chuyển giao quyền sở hữu cho thành viên này' : 'Transfer ownership'}
                            >
                              {vi ? 'Chuyển Ownership' : 'Transfer'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => setRemoveMemberTarget(m)}
                              title={vi ? 'Loại thành viên khỏi doanh nghiệp' : 'Remove from tenant'}
                            >
                              {vi ? 'Xóa Khỏi Tenant' : 'Remove'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Card 2: Join Requests Table */}
      <div className="card-panel">
        <div className="panel-header">
          <div className="panel-title">
            {vi
              ? `Yêu Cầu Gia Nhập Đang Chờ Duyệt (${joinRequests.length})`
              : `Pending Join Requests (${joinRequests.length})`}
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadJoinRequests}
            disabled={loadingRequests}
          >
            {loadingRequests ? (vi ? 'Đang tải…' : 'Loading…') : (vi ? 'Làm Mới' : 'Refresh')}
          </button>
        </div>

        {requestsError && (
          <div style={{ padding: '12px 16px 0' }}>
            <div className="error-alert" role="alert" id="tenant-requests-error" style={{ marginBottom: 0 }}>
              <div className="error-alert-content">
                <IconAlertTriangle size={16} />
                <span>{requestsError}</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={loadJoinRequests}
                disabled={loadingRequests}
              >
                <IconRefresh size={13} />
                <span>{vi ? 'Thử lại' : 'Retry'}</span>
              </button>
            </div>
          </div>
        )}

        <div className="table-responsive">
          <table className="mock-table">
            <thead>
              <tr>
                <th>{vi ? 'Người Gửi Yêu Cầu' : 'Applicant'}</th>
                <th>Email</th>
                <th>{vi ? 'Thời Gian Gửi' : 'Submitted At'}</th>
                <th style={{ textAlign: 'right' }}>{vi ? 'Phê Duyệt' : 'Approval Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {loadingRequests ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                    {vi ? 'Đang kiểm tra yêu cầu gia nhập...' : 'Checking join requests...'}
                  </td>
                </tr>
              ) : joinRequests.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                    {vi ? 'Không có yêu cầu gia nhập nào đang chờ duyệt.' : 'No pending requests.'}
                  </td>
                </tr>
              ) : (
                joinRequests.map((req) => (
                  <tr key={req.id}>
                    <td>
                      <strong style={{ color: 'var(--text-main)', fontSize: 13 }}>
                        {req.user?.name || req.user?.email?.split('@')[0] || (vi ? 'Người dùng' : 'User')}
                      </strong>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{req.user?.email}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>{formatDateTime(req.createdAt)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="app-actions-group">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => setApproveTarget(req)}
                        >
                          {vi ? 'Duyệt' : 'Approve'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => {
                            setRejectTarget(req);
                            setRejectReason('');
                          }}
                        >
                          {vi ? 'Từ Chối' : 'Reject'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Card 3: Danger Zone */}
      <div className="danger-zone">
        <div className="inline-code-row" style={{ gap: 8, marginBottom: 6, color: 'var(--danger)' }}>
          <IconAlertTriangle size={18} />
          <div className="card-title" style={{ color: 'var(--danger)' }}>
            {vi ? 'Vùng Nguy Hiểm Doanh Nghiệp' : 'Tenant Danger Zone'}
          </div>
        </div>
        <p className="card-subtitle" style={{ marginBottom: 16 }}>
          {vi
            ? 'Khi giải tán hoặc xóa Tenant, toàn bộ quan hệ thành viên (User.tenantId) sẽ được đưa về null. Người dùng không bị xóa khỏi hệ thống.'
            : 'Dissolving or deleting the tenant will detach all members (setting User.tenantId to null). User accounts are not deleted.'}
        </p>
        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={() => setIsDeleteOpen(true)}
          id="btn-open-delete-tenant"
        >
          {vi ? 'Giải Tán & Xóa Doanh Nghiệp Này' : 'Dissolve & Delete This Tenant'}
        </button>
      </div>

      {/* Modals */}
      <EditTenantModal
        tenant={tenant}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSuccess={() => {
          setIsEditOpen(false);
          onUpdated();
        }}
      />

      <TransferOwnerModal
        tenant={tenant}
        members={members}
        isSuperAdminIntervention={false}
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        onSuccess={() => {
          setIsTransferOpen(false);
          onUpdated();
        }}
      />

      <DeleteTenantModal
        tenant={tenant}
        isSuperAdmin={false}
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={() => {
          setIsDeleteOpen(false);
          onDeleted();
        }}
      />

      {/* Confirm Remove Member Dialog */}
      <ConfirmDialog
        isOpen={Boolean(removeMemberTarget)}
        title={vi ? 'Xác Nhận Loại Thành Viên' : 'Confirm Remove Member'}
        message={
          vi
            ? `Bạn có chắc chắn muốn loại thành viên "${removeMemberTarget?.name || removeMemberTarget?.email}" khỏi doanh nghiệp? Họ sẽ mất quyền truy cập tài nguyên.`
            : `Are you sure you want to remove member "${removeMemberTarget?.email}"?`
        }
        confirmText={removingMember ? (vi ? 'Đang loại...' : 'Removing...') : (vi ? 'Xác Nhận Loại' : 'Remove')}
        cancelText={vi ? 'Hủy' : 'Cancel'}
        variant="danger"
        isLoading={removingMember}
        onConfirm={handleRemoveMember}
        onClose={() => setRemoveMemberTarget(null)}
      />

      {/* Confirm Approve Dialog */}
      <ConfirmDialog
        isOpen={Boolean(approveTarget)}
        title={vi ? 'Xác Nhận Duyệt Gia Nhập' : 'Confirm Approve Join'}
        message={
          vi
            ? `Phê duyệt cho "${approveTarget?.user?.name || approveTarget?.user?.email}" gia nhập doanh nghiệp "${tenant.name}"?`
            : `Approve join request for "${approveTarget?.user?.email}"?`
        }
        confirmText={approving ? (vi ? 'Đang duyệt...' : 'Approving...') : (vi ? 'Duyệt Gia Nhập' : 'Approve')}
        cancelText={vi ? 'Hủy' : 'Cancel'}
        variant="primary"
        isLoading={approving}
        onConfirm={handleApprove}
        onClose={() => setApproveTarget(null)}
      />

      {/* Reject Reason Modal */}
      {rejectTarget && (
        <div
          className="modal-backdrop show"
          id="reject-request-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-request-modal-title"
          onClick={handleRejectBackdropClick}
        >
          <div className="modal-content" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <h3 id="reject-request-modal-title" className="modal-title" style={{ color: 'var(--danger)' }}>
              {vi ? 'Từ Chối Yêu Cầu Gia Nhập' : 'Reject Join Request'}
            </h3>
            <p className="modal-desc">
              {vi
                ? `Bạn đang từ chối yêu cầu của ${rejectTarget.user?.email}. Bạn có thể nhập lý do để lưu vào Audit Log.`
                : `You are rejecting the request from ${rejectTarget.user?.email}.`}
            </p>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" htmlFor="reject-reason-input">
                {vi ? 'Lý Do Từ Chối (Tùy chọn)' : 'Reason (Optional)'}
              </label>
              <textarea
                id="reject-reason-input"
                className="form-control"
                rows={2}
                maxLength={500}
                placeholder={vi ? 'Nhập lý do từ chối...' : 'Enter rejection reason...'}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                disabled={rejecting}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setRejectTarget(null)}
                disabled={rejecting}
              >
                {vi ? 'Hủy' : 'Cancel'}
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleReject}
                disabled={rejecting}
                id="btn-confirm-reject-request"
              >
                {rejecting ? (vi ? 'Đang từ chối...' : 'Rejecting...') : (vi ? 'Xác Nhận Từ Chối' : 'Confirm Reject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
