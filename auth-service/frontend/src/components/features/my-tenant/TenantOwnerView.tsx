import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { ConfirmDialog } from '../../common/ConfirmDialog';
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
  const [joinRequests, setJoinRequests] = useState<TenantJoinRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

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

  // Fetch members
  const loadMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const data = await tenantsService.getMembers(tenant.id);
      setMembers(data);
    } catch {
      setMembers(tenant.members || []);
    } finally {
      setLoadingMembers(false);
    }
  }, [tenant.id, tenant.members]);

  // Fetch join requests
  const loadJoinRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const reqs = await tenantsService.listJoinRequests(tenant.id);
      setJoinRequests(reqs.filter((r) => r.status === 'PENDING'));
    } catch {
      setJoinRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  }, [tenant.id]);

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
    <div style={{ maxWidth: 1100, margin: '20px auto' }}>
      {/* Overview Top Card (Scene 5 Wireframe) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          padding: '20px 24px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 8,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0 }}>
              {tenant.name}
            </h1>
            <span className="badge badge-warning">{vi ? 'CHỦ SỞ HỮU' : 'TENANT OWNER'}</span>
          </div>

          {tenant.description && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 8px' }}>
              {tenant.description}
            </p>
          )}

          <div style={{ fontSize: 12, color: 'var(--text-dim)', display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 6 }}>
            <span>
              Tenant ID:{' '}
              <code style={{ fontSize: 11, color: '#93c5fd' }}>{tenant.id}</code>{' '}
              <button
                type="button"
                onClick={() => copyToClipboard(tenant.id, 'Tenant ID')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0 4px',
                  fontSize: 11,
                }}
                title={vi ? 'Sao chép Tenant ID' : 'Copy Tenant ID'}
              >
                📋
              </button>
            </span>
            <span>
              {vi ? 'Chủ sở hữu:' : 'Owner:'}{' '}
              <strong style={{ color: '#fff' }}>{tenant.owner?.email || tenant.ownerUserId}</strong>
            </span>
            <span>
              {vi ? 'Tổng thành viên:' : 'Members:'}{' '}
              <strong style={{ color: 'var(--success)' }}>{members.length}</strong>
            </span>
          </div>
        </div>

        {/* Action button */}
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
      <div className="card-panel" style={{ marginBottom: 24 }}>
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="panel-title" style={{ fontSize: 15 }}>
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
            {loadingMembers ? (vi ? 'Đang tải...' : 'Loading...') : (vi ? 'Làm Mới' : 'Refresh')}
          </button>
        </div>

        <div className="table-responsive">
          <table className="mock-table" style={{ width: '100%' }}>
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
                    <tr key={m.id} style={isOwner ? { background: 'rgba(245, 158, 11, 0.03)' } : undefined}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              background: isOwner ? '#f59e0b' : 'var(--primary)',
                              color: isOwner ? '#000' : '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: 13,
                              flexShrink: 0,
                            }}
                          >
                            {getMonogram(m.name, m.email)}
                          </div>
                          <div>
                            <strong style={{ color: '#fff', fontSize: 13 }}>
                              {m.name || m.email.split('@')[0]}
                              {isSelf && (
                                <span style={{ color: '#f59e0b', marginLeft: 6, fontSize: 11 }}>
                                  ({vi ? 'Bạn' : 'You'})
                                </span>
                              )}
                            </strong>
                          </div>
                        </div>
                      </td>

                      <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{m.email}</td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <code style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                            {m.id}
                          </code>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(m.id, 'User ID')}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-dim)',
                              cursor: 'pointer',
                              padding: '0 2px',
                              fontSize: 10,
                            }}
                            title={vi ? 'Sao chép User ID' : 'Copy User ID'}
                          >
                            📋
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
                          <span style={{ color: 'var(--text-dim)', fontSize: 12, fontStyle: 'italic' }}>
                            {vi ? 'Chủ sở hữu' : 'Current Owner'}
                          </span>
                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
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
                              className="btn btn-secondary btn-sm"
                              onClick={() => setRemoveMemberTarget(m)}
                              style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
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
      <div className="card-panel" style={{ marginBottom: 24 }}>
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="panel-title" style={{ fontSize: 15 }}>
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
            {loadingRequests ? (vi ? 'Đang tải...' : 'Loading...') : (vi ? 'Làm Mới' : 'Refresh')}
          </button>
        </div>

        <div className="table-responsive">
          <table className="mock-table" style={{ width: '100%' }}>
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
                      <strong style={{ color: '#fff', fontSize: 13 }}>
                        {req.user?.name || req.user?.email.split('@')[0] || vi ? 'Người dùng' : 'User'}
                      </strong>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{req.user?.email}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>{formatDateTime(req.createdAt)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => setApproveTarget(req)}
                        >
                          {vi ? 'Duyệt (Approve)' : 'Approve'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setRejectTarget(req);
                            setRejectReason('');
                          }}
                          style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                        >
                          {vi ? 'Từ Chối (Reject)' : 'Reject'}
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

      {/* Card 3: Danger Zone (Scene 5 Wireframe) */}
      <div className="danger-zone" style={{ padding: 20, border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: 8, background: 'rgba(239, 68, 68, 0.04)' }}>
        <div className="danger-title" style={{ color: 'var(--danger)', fontSize: 16, fontWeight: 700 }}>
          {vi ? 'Danger Zone Doanh Nghiệp' : 'Tenant Danger Zone'}
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '6px 0 16px', lineHeight: 1.5 }}>
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
        <div className="modal-backdrop show" id="reject-request-modal">
          <div className="modal-content" style={{ maxWidth: 480 }}>
            <h3 className="modal-title" style={{ color: 'var(--danger)' }}>
              {vi ? 'Từ Chối Yêu Cầu Gia Nhập' : 'Reject Join Request'}
            </h3>
            <p className="modal-desc">
              {vi
                ? `Bạn đang từ chối yêu cầu của ${rejectTarget.user?.email}. Bạn có thể nhập lý do để lưu vào Audit Log.`
                : `You are rejecting the request from ${rejectTarget.user?.email}.`}
            </p>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">
                {vi ? 'Lý Do Từ Chối (Tùy chọn)' : 'Reason (Optional)'}
              </label>
              <textarea
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
