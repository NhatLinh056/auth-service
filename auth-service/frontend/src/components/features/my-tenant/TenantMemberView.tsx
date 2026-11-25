import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { ConfirmDialog } from '../../common/ConfirmDialog';
import { IconCopy } from '../../common/Icons';
import {
  tenantsService,
  type TenantSummary,
  type TenantMember,
} from '../../../services/tenants.service';

interface TenantMemberViewProps {
  tenant: TenantSummary;
  onLeft: () => void;
}

export const TenantMemberView: React.FC<TenantMemberViewProps> = ({
  tenant,
  onLeft,
}) => {
  const { lang } = useLanguage();
  const vi = lang === 'vi';
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [members, setMembers] = useState<TenantMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoadingMembers(true);

    tenantsService
      .getMembers(tenant.id)
      .then((data) => {
        if (isMounted) setMembers(data);
      })
      .catch(() => {
        if (isMounted) setMembers(tenant.members || []);
      })
      .finally(() => {
        if (isMounted) setLoadingMembers(false);
      });

    return () => {
      isMounted = false;
    };
  }, [tenant.id, tenant.members]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(
      vi ? `Đã sao chép ${label} vào clipboard.` : `Copied ${label} to clipboard.`,
      'info',
    );
  };

  const handleLeave = async () => {
    setLeaving(true);
    try {
      await tenantsService.leave();
      showToast(
        vi ? 'Bạn đã rời doanh nghiệp thành công.' : 'You have left the tenant successfully.',
        'info',
      );
      setLeaveConfirmOpen(false);
      onLeft();
    } catch (err: any) {
      showToast(err.message || (vi ? 'Không thể rời doanh nghiệp' : 'Failed to leave tenant'), 'error');
    } finally {
      setLeaving(false);
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

  const getMonogram = (name?: string, email?: string) => {
    const text = (name || email || '?').trim();
    return text.charAt(0).toUpperCase();
  };

  return (
    <div className="page-container page-container--tenant card-stack">
      {/* Top Overview Card */}
      <div className="tenant-summary-bar" style={{ marginBottom: 0 }}>
        <div>
          <div className="inline-code-row" style={{ gap: 10 }}>
            <h1 className="page-title">{tenant.name}</h1>
            <span className="badge badge-secondary">{vi ? 'THÀNH VIÊN' : 'MEMBER'}</span>
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
          </div>
        </div>

        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={() => setLeaveConfirmOpen(true)}
          id="btn-leave-tenant"
        >
          {vi ? 'Rời Khỏi Doanh Nghiệp' : 'Leave Tenant'}
        </button>
      </div>

      {/* Members List Table (Read-Only) */}
      <div className="card-panel">
        <div className="panel-header">
          <div className="panel-title">
            {vi ? `Danh Sách Thành Viên (${members.length})` : `Organization Members (${members.length})`}
          </div>
          <span className="form-hint" style={{ marginTop: 0 }}>
            {vi ? 'Chế độ chỉ xem' : 'Read-only directory'}
          </span>
        </div>

        <div className="table-responsive">
          <table className="mock-table">
            <thead>
              <tr>
                <th>{vi ? 'Thành Viên' : 'Member'}</th>
                <th>Email</th>
                <th>User ID (UUID)</th>
                <th>{vi ? 'Vai Trò Tenant' : 'Tenant Role'}</th>
                <th style={{ textAlign: 'right' }}>{vi ? 'Ngày Tham Gia' : 'Joined Date'}</th>
              </tr>
            </thead>
            <tbody>
              {loadingMembers ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                    {vi ? 'Đang tải danh sách thành viên...' : 'Loading members...'}
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                    {vi ? 'Không có thành viên nào khác.' : 'No other members found.'}
                  </td>
                </tr>
              ) : (
                members.map((m) => {
                  const isOwner = m.id === tenant.ownerUserId || m.isOwner;
                  const isSelf = m.id === currentUser?.id;

                  return (
                    <tr key={m.id} style={isSelf ? { background: 'var(--primary-subtle)' } : undefined}>
                      <td>
                        <div className="inline-code-row" style={{ gap: 10 }}>
                          <div className={`avatar-circle avatar-circle--sm ${isOwner ? 'avatar-circle--admin' : ''}`}>
                            {getMonogram(m.name, m.email)}
                          </div>
                          <strong style={{ color: 'var(--text-main)', fontSize: 13 }}>
                            {m.name || m.email.split('@')[0]}
                            {isSelf && (
                              <span style={{ color: 'var(--primary)', marginLeft: 6, fontSize: 11 }}>
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

                      <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-dim)' }}>
                        {formatDate(m.createdAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Leave Dialog */}
      <ConfirmDialog
        isOpen={leaveConfirmOpen}
        title={vi ? 'Xác Nhận Rời Khỏi Doanh Nghiệp' : 'Confirm Leave Tenant'}
        message={
          vi
            ? `Bạn có chắc chắn muốn rời khỏi doanh nghiệp "${tenant.name}" không? Sau khi rời, bạn sẽ mất quyền truy cập tài nguyên của doanh nghiệp này.`
            : `Are you sure you want to leave "${tenant.name}"? You will lose access to all resources associated with this tenant.`
        }
        confirmText={leaving ? (vi ? 'Đang xử lý...' : 'Leaving...') : (vi ? 'Xác Nhận Rời' : 'Confirm Leave')}
        cancelText={vi ? 'Quay Lại' : 'Back'}
        variant="danger"
        isLoading={leaving}
        onConfirm={handleLeave}
        onClose={() => setLeaveConfirmOpen(false)}
      />
    </div>
  );
};
