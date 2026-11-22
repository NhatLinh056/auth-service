import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useToast } from '../../../contexts/ToastContext';
import { DataTable, type Column } from '../../common/DataTable';
import { EmptyState } from '../../common/EmptyState';
import { TransferOwnerModal } from '../../modals/TransferOwnerModal';
import { DeleteTenantModal } from '../../modals/DeleteTenantModal';
import { TenantAuditModal } from '../../modals/TenantAuditModal';
import { EditTenantModal } from '../../modals/EditTenantModal';
import {
  tenantsService,
  type TenantSummary,
  type TenantMember,
} from '../../../services/tenants.service';

export const AdminTenantsPage: React.FC = () => {
  const { lang } = useLanguage();
  const vi = lang === 'vi';
  const { showToast } = useToast();

  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal states
  const [editTarget, setEditTarget] = useState<TenantSummary | null>(null);
  const [auditTarget, setAuditTarget] = useState<{ id?: string; name?: string } | null>(null);
  const [transferTarget, setTransferTarget] = useState<TenantSummary | null>(null);
  const [transferMembers, setTransferMembers] = useState<TenantMember[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<TenantSummary | null>(null);

  const loadTenants = useCallback(async () => {
    setLoading(true);
    try {
      const data = await tenantsService.list();
      setTenants(data);
    } catch (err: any) {
      showToast(err.message || (vi ? 'Không thể tải danh sách doanh nghiệp' : 'Failed to load tenants'), 'error');
    } finally {
      setLoading(false);
    }
  }, [vi, showToast]);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  // Reset pagination on search
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(
      vi ? `Đã sao chép ${label} vào clipboard.` : `Copied ${label} to clipboard.`,
      'info',
    );
  };

  const handleOpenTransfer = async (t: TenantSummary) => {
    setTransferTarget(t);
    try {
      const mems = await tenantsService.getMembers(t.id);
      setTransferMembers(mems);
    } catch {
      setTransferMembers(t.members || []);
    }
  };

  const filteredTenants = useMemo(() => {
    let list = [...tenants];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((t) => {
        const name = (t.name || '').toLowerCase();
        const id = (t.id || '').toLowerCase();
        const ownerEmail = (t.owner?.email || '').toLowerCase();
        const ownerName = (t.owner?.name || '').toLowerCase();
        return name.includes(q) || id.includes(q) || ownerEmail.includes(q) || ownerName.includes(q);
      });
    }
    return list;
  }, [tenants, search]);

  const paginatedTenants = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTenants.slice(start, start + pageSize);
  }, [filteredTenants, currentPage, pageSize]);

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

  // Define Columns for DataTable
  const columns: Column<TenantSummary>[] = [
    {
      key: 'name',
      header: vi ? 'Tên Doanh Nghiệp' : 'Tenant Name',
      render: (t) => (
        <div>
          <strong style={{ color: '#fff', fontSize: 13 }}>{t.name}</strong>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <code style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'monospace' }}>
              {t.id}
            </code>
            <button
              type="button"
              onClick={() => copyToClipboard(t.id, 'Tenant ID')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                padding: '0 2px',
                fontSize: 10,
              }}
              title={vi ? 'Sao chép Tenant ID' : 'Copy Tenant ID'}
            >
              📋
            </button>
          </div>
        </div>
      ),
    },
    {
      key: 'owner',
      header: vi ? 'Chủ Sở Hữu (Owner)' : 'Owner',
      render: (t) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: '#f59e0b',
              color: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 11,
              flexShrink: 0,
            }}
          >
            {getMonogram(t.owner?.name, t.owner?.email)}
          </div>
          <div>
            <div style={{ fontSize: 13, color: '#e2e8f0' }}>{t.owner?.email || t.ownerUserId}</div>
            {t.owner?.name && (
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{t.owner.name}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'members',
      header: vi ? 'Số Thành Viên' : 'Members',
      render: (t) => (
        <span className="badge badge-secondary" style={{ fontSize: 11 }}>
          {t._count?.users || 1} {vi ? 'thành viên' : 'members'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: vi ? 'Ngày Tạo' : 'Created Date',
      render: (t) => (
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          {formatDate(t.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: vi ? 'Thao Tác Admin' : 'Admin Actions',
      align: 'right',
      render: (t) => (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setEditTarget(t)}
            title={vi ? 'Chỉnh sửa tên hoặc mô tả doanh nghiệp' : 'Edit tenant name or description'}
          >
            {vi ? 'Sửa' : 'Edit'}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setAuditTarget({ id: t.id, name: t.name })}
            title={vi ? 'Xem lịch sử nhật ký can thiệp' : 'View audit log'}
          >
            {vi ? 'Audit Log' : 'Audit'}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleOpenTransfer(t)}
            title={vi ? 'Chuyển quyền cho thành viên hiện tại (bắt buộc nhập lý do)' : 'Transfer ownership (reason required)'}
          >
            {vi ? 'Chuyển Quyền' : 'Transfer'}
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => setDeleteTarget(t)}
            title={vi ? 'Cho phép xóa khi còn thành viên; tất cả User.tenantId về null; bắt buộc nhập lý do' : 'Delete tenant with reason (detaches members)'}
          >
            {vi ? 'Xóa Tenant' : 'Delete'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1280, margin: '20px auto' }}>
      {/* Top Header & System-wide Audit Log button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0 }}>
            {vi ? 'Quản Trị Doanh Nghiệp Toàn Cục' : 'Global Tenant Administration'}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
            {vi
              ? 'Dành riêng cho Super Admin. Quản trị toàn bộ danh sách Tenant, tra cứu audit log và can thiệp quyền.'
              : 'Dedicated Super Admin console. Manage all system tenants, inspect audit logs, and oversee ownership.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setAuditTarget({})}
            id="btn-view-global-audit-logs"
          >
            {vi ? '📋 Nhật Ký Toàn Cầu' : '📋 Global Audit Logs'}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadTenants}
            disabled={loading}
          >
            {loading ? (vi ? 'Đang tải...' : 'Loading...') : (vi ? 'Làm Mới' : 'Refresh')}
          </button>
        </div>
      </div>

      {/* Filter / Search Bar (Scene 9 Wireframe) */}
      <div className="card-panel" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, maxWidth: 420 }}>
            <input
              type="text"
              className="form-control"
              placeholder={vi ? 'Tìm theo tên tenant, chủ sở hữu, ID...' : 'Search by tenant name, owner, ID...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              id="input-admin-search-tenants"
              style={{ fontSize: 13 }}
            />
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            {vi
              ? `Hệ thống: ${filteredTenants.length} Doanh Nghiệp`
              : `Total: ${filteredTenants.length} Tenants`}
          </div>
        </div>
      </div>

      {/* Tenants Table */}
      {filteredTenants.length === 0 && !loading ? (
        <EmptyState
          title={vi ? 'Không tìm thấy doanh nghiệp nào' : 'No tenants found'}
          description={
            search
              ? (vi ? 'Không có doanh nghiệp nào khớp với từ khóa tìm kiếm.' : 'No tenants match your search filter.')
              : (vi ? 'Hệ thống hiện chưa có doanh nghiệp nào được tạo.' : 'No tenants have been created yet.')
          }
          icon="🏢"
          action={
            search ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSearch('')}
              >
                {vi ? 'Xóa Bộ Lọc' : 'Clear Filter'}
              </button>
            ) : undefined
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={paginatedTenants}
          keyExtractor={(t) => t.id}
          loading={loading}
          pagination={{
            currentPage,
            pageSize,
            totalItems: filteredTenants.length,
            onPageChange: setCurrentPage,
            onPageSizeChange: (newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            },
          }}
        />
      )}

      {/* Audit Log Modal */}
      {auditTarget && (
        <TenantAuditModal
          tenantId={auditTarget.id}
          tenantName={auditTarget.name}
          isOpen={Boolean(auditTarget)}
          onClose={() => setAuditTarget(null)}
        />
      )}

      {/* Edit Tenant Modal (Admin Editing) */}
      {editTarget && (
        <EditTenantModal
          tenant={editTarget}
          isOpen={Boolean(editTarget)}
          onClose={() => setEditTarget(null)}
          onSuccess={() => {
            setEditTarget(null);
            loadTenants();
          }}
        />
      )}

      {/* Transfer Owner Modal (Admin Intervention) */}
      {transferTarget && (
        <TransferOwnerModal
          tenant={transferTarget}
          members={transferMembers}
          isSuperAdminIntervention={true}
          isOpen={Boolean(transferTarget)}
          onClose={() => setTransferTarget(null)}
          onSuccess={() => {
            setTransferTarget(null);
            loadTenants();
          }}
        />
      )}

      {/* Delete Tenant Modal (Admin Intervention) */}
      {deleteTarget && (
        <DeleteTenantModal
          tenant={deleteTarget}
          isSuperAdmin={true}
          isOpen={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          onSuccess={() => {
            setDeleteTarget(null);
            loadTenants();
          }}
        />
      )}
    </div>
  );
};
