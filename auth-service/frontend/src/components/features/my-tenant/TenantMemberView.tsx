import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { ConfirmDialog } from '../../common/ConfirmDialog';
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
    <div style={{ maxWidth: 1100, margin: '20px auto' }}>
      {/* Top Overview Card (Scene 7 Wireframe) */}
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
            <span className="badge badge-secondary">{vi ? 'THÀNH VIÊN' : 'MEMBER'}</span>
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
          </div>
        </div>

        {/* Leave Button */}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setLeaveConfirmOpen(true)}
          style={{
            color: 'var(--danger)',
            borderColor: 'rgba(239, 68, 68, 0.4)',
            padding: '8px 16px',
            fontWeight: 600,
          }}
          id="btn-leave-tenant"
        >
          {vi ? 'Rời Khỏi Doanh Nghiệp (Leave)' : 'Leave Tenant'}
        </button>
      </div>

      {/* Members List Table (Read-Only) */}
      <div className="card-panel">
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="panel-title" style={{ fontSize: 15 }}>
            {vi ? `Danh Sách Thành Viên (Chế Độ Chỉ Xem) — ${members.length} người` : `Organization Members (Read-Only) — ${members.length} total`}
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            {vi ? 'Cập nhật theo thời gian thực' : 'Realtime Directory'}
          </span>
        </div>

        <div className="table-responsive">
          <table className="mock-table" style={{ width: '100%' }}>
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
                    <tr key={m.id} style={isSelf ? { background: 'rgba(59, 130, 246, 0.05)' } : undefined}>
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
                                <span style={{ color: 'var(--primary)', marginLeft: 6, fontSize: 11 }}>
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
