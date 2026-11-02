import { useEffect, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  tenantsService,
  type TenantAuditLog,
  type TenantContext,
  type TenantJoinRequest,
  type TenantSummary,
} from '../../services/tenants.service';

export function TenantsTab() {
  const { lang } = useLanguage();
  const vi = lang === 'vi';

  const [context, setContext] = useState<TenantContext | null>(null);
  const [current, setCurrent] = useState<TenantSummary | null>(null);
  const [allTenants, setAllTenants] = useState<TenantSummary[]>([]);
  const [auditLogs, setAuditLogs] = useState<TenantAuditLog[]>([]);
  const [joinRequests, setJoinRequests] = useState<TenantJoinRequest[]>([]);
  const [joinRequestsError, setJoinRequestsError] = useState<string | null>(null);
  const [showAudit, setShowAudit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean } | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Forms state
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [joinTenantId, setJoinTenantId] = useState('');
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [transferUserId, setTransferUserId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);

  const loadData = async (selectedId?: string) => {
    try {
      setLoading(true);
      const ctx = await tenantsService.getMe();
      setContext(ctx);

      let list: TenantSummary[] = [];
      if (ctx.isSystemAdmin) {
        list = await tenantsService.list();
        setAllTenants(list);
      }

      const activeId =
        selectedId !== undefined
          ? selectedId
          : ctx.tenant?.id || (ctx.isSystemAdmin && list.length > 0 ? list[0].id : null);

      if (activeId) {
        const detail = ctx.tenant?.id === activeId ? ctx.tenant : await tenantsService.getDetail(activeId);
        setCurrent(detail);
        setEditName(detail.name);
        setEditDesc(detail.description || '');

        if (showAudit) {
          try {
            const logs = await tenantsService.getAudit(activeId);
            setAuditLogs(logs);
          } catch {
            setAuditLogs([]);
          }
        } else {
          setAuditLogs([]);
        }

        if (detail.canManage) {
          try {
            const reqs = await tenantsService.listJoinRequests(activeId);
            setJoinRequests(reqs);
            setJoinRequestsError(null);
          } catch (err: any) {
            setJoinRequests([]);
            setJoinRequestsError(err.message || (vi ? 'Không thể tải danh sách yêu cầu gia nhập' : 'Failed to load join requests'));
          }
        } else {
          setJoinRequests([]);
          setJoinRequestsError(null);
        }
      } else {
        setCurrent(null);
        setAuditLogs([]);
        setJoinRequests([]);
        setJoinRequestsError(null);
        setShowAudit(false);
      }
    } catch (err: any) {
      setFeedback({ text: err.message || (vi ? 'Không thể tải thông tin doanh nghiệp' : 'Failed to load tenant info'), error: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleCopyId = (id: string) => {
    navigator.clipboard
      .writeText(id)
      .then(() => {
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
      })
      .catch(() => {});
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) return;
    try {
      setFeedback(null);
      const created = await tenantsService.create({ name: createName.trim(), description: createDesc.trim() || undefined });
      setCreateName('');
      setCreateDesc('');
      setFeedback({ text: vi ? 'Đã tạo doanh nghiệp thành công. Bạn là chủ doanh nghiệp.' : 'Tenant created. You are the owner.' });
      await loadData(created.id);
    } catch (err: any) {
      setFeedback({ text: err.message, error: true });
    }
  };

  const handleApplyJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinTenantId.trim()) return;
    try {
      setFeedback(null);
      await tenantsService.applyJoin(joinTenantId.trim());
      setJoinTenantId('');
      setFeedback({
        text: vi
          ? 'Đã gửi yêu cầu gia nhập thành công. Trạng thái: Chờ duyệt (PENDING).'
          : 'Join request submitted. Status: PENDING.',
      });
      await loadData();
    } catch (err: any) {
      setFeedback({ text: err.message, error: true });
    }
  };

  const handleCancelJoin = async (requestId: string) => {
    if (!window.confirm(vi ? 'Bạn có chắc chắn muốn hủy yêu cầu gia nhập này không?' : 'Cancel this join request?')) return;
    try {
      setFeedback(null);
      await tenantsService.cancelJoinRequest(requestId);
      setFeedback({ text: vi ? 'Đã hủy yêu cầu gia nhập.' : 'Join request cancelled.' });
      await loadData();
    } catch (err: any) {
      setFeedback({ text: err.message, error: true });
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current) return;
    try {
      setFeedback(null);
      await tenantsService.update(current.id, { name: editName.trim(), description: editDesc.trim() });
      setFeedback({ text: vi ? 'Đã cập nhật thông tin doanh nghiệp.' : 'Tenant updated successfully.' });
      setShowEdit(false);
      await loadData(current.id);
    } catch (err: any) {
      setFeedback({ text: err.message, error: true });
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current || !transferUserId) return;
    if (!window.confirm(vi ? 'Chuyển quyền sở hữu cho người đã chọn? Chủ cũ sẽ thành thành viên.' : 'Transfer ownership to selected user?')) return;
    try {
      setFeedback(null);
      await tenantsService.transfer(current.id, { userId: transferUserId, reason: transferReason.trim() || undefined });
      setFeedback({ text: vi ? 'Đã chuyển quyền sở hữu thành công.' : 'Ownership transferred.' });
      setShowTransfer(false);
      setTransferUserId('');
      setTransferReason('');
      await loadData(current.id);
    } catch (err: any) {
      setFeedback({ text: err.message, error: true });
    }
  };

  const handleDelete = async () => {
    if (!current) return;
    if (!window.confirm(vi ? 'Xác nhận xóa doanh nghiệp này? Chỉ xóa được khi không còn thành viên nào khác.' : 'Delete this tenant? Only allowed if no other members exist.')) return;
    try {
      setFeedback(null);
      await tenantsService.delete(current.id);
      setFeedback({ text: vi ? 'Đã xóa doanh nghiệp.' : 'Tenant deleted.' });
      await loadData();
    } catch (err: any) {
      setFeedback({ text: err.message, error: true });
    }
  };

  const handleApproveJoinRequest = async (requestId: string) => {
    try {
      setFeedback(null);
      await tenantsService.approveJoinRequest(requestId);
      setFeedback({ text: vi ? 'Đã phê duyệt yêu cầu gia nhập thành công.' : 'Join request approved.' });
      await loadData(current?.id);
    } catch (err: any) {
      setFeedback({ text: err.message, error: true });
    }
  };

  const handleRejectJoinRequest = async (requestId: string) => {
    const reason = window.prompt(vi ? 'Nhập lý do từ chối (tùy chọn):' : 'Enter rejection reason (optional):');
    if (reason === null) return;
    try {
      setFeedback(null);
      await tenantsService.rejectJoinRequest(requestId, reason.trim() || undefined);
      setFeedback({ text: vi ? 'Đã từ chối yêu cầu gia nhập.' : 'Join request rejected.' });
      await loadData(current?.id);
    } catch (err: any) {
      setFeedback({ text: err.message, error: true });
    }
  };

  const handleRemoveMember = async (userId: string, memberEmail: string) => {
    if (!current) return;
    if (!window.confirm(vi ? `Xác nhận loại thành viên ${memberEmail} khỏi doanh nghiệp?` : `Remove member ${memberEmail}?`)) return;
    try {
      setFeedback(null);
      await tenantsService.removeMember(current.id, userId);
      setFeedback({ text: vi ? 'Đã loại thành viên khỏi doanh nghiệp.' : 'Member removed.' });
      await loadData(current.id);
    } catch (err: any) {
      setFeedback({ text: err.message, error: true });
    }
  };

  const handleLeaveTenant = async () => {
    if (!window.confirm(vi ? 'Bạn có chắc chắn muốn rời khỏi doanh nghiệp này không?' : 'Leave this tenant?')) return;
    try {
      setFeedback(null);
      await tenantsService.leave();
      setFeedback({ text: vi ? 'Bạn đã rời doanh nghiệp thành công.' : 'You have left the tenant.' });
      await loadData();
    } catch (err: any) {
      setFeedback({ text: err.message, error: true });
    }
  };

  const handleToggleAudit = async () => {
    if (!showAudit && current) {
      try {
        const logs = await tenantsService.getAudit(current.id);
        setAuditLogs(logs);
      } catch (err: any) {
        setFeedback({ text: err.message, error: true });
      }
    }
    setShowAudit(!showAudit);
  };

  if (loading && !context) {
    return (
      <div className="tab-content active tenant-page">
        <p style={{ color: 'var(--text-muted)' }}>{vi ? 'Đang tải thông tin doanh nghiệp…' : 'Loading tenant info…'}</p>
      </div>
    );
  }

  return (
    <div className="tab-content active tenant-page" id="tenants-tab">
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <div>
          <h1 className="page-title">{vi ? 'Quản lý Doanh nghiệp' : 'Tenant Management'}</h1>
          <p className="page-subtitle">
            {context?.isSystemAdmin
              ? (vi ? 'Chế độ Super Admin: xem và điều phối toàn bộ doanh nghiệp trong hệ thống.' : 'Super Admin mode: manage and audit all tenants.')
              : (vi ? 'Thông tin công ty và quản lý thành viên trực thuộc doanh nghiệp.' : 'Company information and membership.')}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => void loadData(current?.id)}
        >
          {vi ? 'Làm mới' : 'Refresh'}
        </button>
      </div>

      {feedback && (
        <div className={`tenant-notice ${feedback.error ? 'is-error' : 'is-success'}`}>
          <span>{feedback.text}</span>
          <button type="button" className="btn btn-ghost btn-xs" onClick={() => setFeedback(null)}>✕</button>
        </div>
      )}

      {/* Super Admin Bar */}
      {context?.isSystemAdmin && allTenants.length > 0 && (
        <div className="tenant-admin-bar">
          <div className="tenant-admin-bar-label">
            <span>{vi ? 'Doanh nghiệp hệ thống:' : 'System Tenants:'}</span>
          </div>
          <select
            className="tenant-admin-bar-select"
            value={current?.id || ''}
            onChange={(e) => {
              setShowAudit(false);
              setAuditLogs([]);
              setJoinRequests([]);
              setJoinRequestsError(null);
              setShowEdit(false);
              setShowTransfer(false);
              void loadData(e.target.value);
            }}
          >
            {context?.tenant ? (
              <option value={context.tenant.id}>
                {vi ? `Doanh nghiệp của tôi (${context.tenant.name})` : `My Tenant (${context.tenant.name})`}
              </option>
            ) : (
              <option value="" disabled={allTenants.length > 0 && Boolean(current?.id)}>
                {vi ? '-- Chọn doanh nghiệp cần xem --' : '-- Select Tenant --'}
              </option>
            )}
            {allTenants
              .filter((t) => t.id !== context?.tenant?.id)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (Chủ: {t.owner?.name || t.owner?.email} · {t._count?.users ?? 0} {vi ? 'thành viên' : 'members'})
                </option>
              ))}
          </select>
        </div>
      )}

      {current ? (
        <div>
          {/* Main Info Card */}
          <div className="tenant-hero-card">
            <div className="tenant-hero-header">
              <div>
                <div className="tenant-hero-title-group">
                  <h2 className="tenant-hero-title">{current.name}</h2>
                  {current.isOwner ? (
                    <span className="tenant-badge tenant-badge-owner">
                      {vi ? 'Chủ doanh nghiệp' : 'Owner'}
                    </span>
                  ) : context?.isSystemAdmin && context.tenant?.id !== current.id ? (
                    <span className="tenant-badge tenant-badge-admin">
                      {vi ? 'Super Admin' : 'Super Admin'}
                    </span>
                  ) : (
                    <span className="tenant-badge tenant-badge-member">
                      {vi ? 'Thành viên' : 'Member'}
                    </span>
                  )}
                </div>
                <p className="tenant-hero-desc">
                  {current.description || (vi ? 'Chưa có mô tả cho doanh nghiệp này.' : 'No description provided.')}
                </p>
              </div>

              {/* Action buttons */}
              <div className="tenant-actions">
                {current.canManage && (
                  <>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setShowEdit(!showEdit)}
                    >
                      {showEdit ? (vi ? 'Đóng' : 'Close') : (vi ? 'Chỉnh sửa' : 'Edit')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setShowTransfer(!showTransfer)}
                    >
                      {vi ? 'Chuyển chủ' : 'Transfer'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => void handleToggleAudit()}
                    >
                      {showAudit ? (vi ? 'Ẩn nhật ký' : 'Hide Audit') : (vi ? 'Nhật ký' : 'Audit Logs')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => void handleDelete()}
                    >
                      {vi ? 'Xóa' : 'Delete'}
                    </button>
                  </>
                )}
                {!current.isOwner && context?.tenant?.id === current.id && (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => void handleLeaveTenant()}
                  >
                    {vi ? 'Rời doanh nghiệp' : 'Leave Tenant'}
                  </button>
                )}
              </div>
            </div>

            {/* Meta Row */}
            <div className="tenant-meta-row">
              <div className="tenant-meta-item">
                <strong>ID:</strong>
                <code className="mono-tag" style={{ userSelect: 'all' }}>{current.id}</code>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => handleCopyId(current.id)}
                  title={vi ? 'Sao chép ID' : 'Copy ID'}
                >
                  {copiedId ? (vi ? 'Đã sao chép' : 'Copied') : (vi ? 'Sao chép' : 'Copy')}
                </button>
              </div>
              <div className="tenant-meta-item">
                <strong>{vi ? 'Chủ sở hữu:' : 'Owner:'}</strong>
                <span>{current.owner?.name || current.owner?.email} ({current.owner?.email})</span>
              </div>
              <div className="tenant-meta-item">
                <strong>{vi ? 'Thành viên:' : 'Members:'}</strong>
                <span>{current._count?.users ?? current.members?.length ?? 1}</span>
              </div>
            </div>

            {/* Inline Edit Form */}
            {showEdit && current.canManage && (
              <form onSubmit={handleUpdate} className="tenant-subform">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#fff', margin: 0 }}>
                    {vi ? 'Chỉnh sửa thông tin doanh nghiệp' : 'Edit Tenant Info'}
                  </h4>
                  <button type="button" className="btn btn-ghost btn-xs" onClick={() => setShowEdit(false)}>✕</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label className="form-label">{vi ? 'Tên doanh nghiệp *' : 'Tenant Name *'}</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      maxLength={120}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">{vi ? 'Mô tả' : 'Description'}</label>
                    <input
                      type="text"
                      className="form-control"
                      maxLength={500}
                      placeholder={vi ? 'Nhập mô tả...' : 'Enter description...'}
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" className="btn btn-primary btn-sm">{vi ? 'Lưu thay đổi' : 'Save Changes'}</button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowEdit(false)}>{vi ? 'Hủy' : 'Cancel'}</button>
                </div>
              </form>
            )}

            {/* Inline Transfer Form */}
            {showTransfer && current.canManage && (
              <form onSubmit={handleTransfer} className="tenant-subform">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#fff', margin: 0 }}>
                    {vi ? 'Chuyển giao quyền sở hữu' : 'Transfer Ownership'}
                  </h4>
                  <button type="button" className="btn btn-ghost btn-xs" onClick={() => setShowTransfer(false)}>✕</button>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '0 0 12px', lineHeight: '1.4' }}>
                  {vi
                    ? 'Chuyển quyền sở hữu cho một thành viên hiện tại trong doanh nghiệp. Chủ cũ sẽ trở thành thành viên thường.'
                    : 'Transfer ownership to an existing member. The current owner will become a regular member.'}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label className="form-label">{vi ? 'Chọn chủ sở hữu mới *' : 'Select New Owner *'}</label>
                    <select
                      className="form-control"
                      required
                      value={transferUserId}
                      onChange={(e) => setTransferUserId(e.target.value)}
                    >
                      <option value="">{vi ? '-- Chọn thành viên --' : '-- Select member --'}</option>
                      {(current.members || [])
                        .filter((m) => m.id !== current.ownerUserId)
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name || m.email} ({m.email})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">
                      {context?.isSystemAdmin && !current.isOwner
                        ? (vi ? 'Lý do can thiệp (bắt buộc) *' : 'Intervention Reason *')
                        : (vi ? 'Lý do chuyển quyền (tùy chọn)' : 'Reason (optional)')}
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      maxLength={500}
                      required={Boolean(context?.isSystemAdmin && !current.isOwner)}
                      placeholder={vi ? 'Nhập lý do...' : 'Enter reason...'}
                      value={transferReason}
                      onChange={(e) => setTransferReason(e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" className="btn btn-primary btn-sm">{vi ? 'Xác nhận chuyển' : 'Confirm Transfer'}</button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowTransfer(false)}>{vi ? 'Hủy' : 'Cancel'}</button>
                </div>
              </form>
            )}

            {/* Inline Audit Logs Table */}
            {showAudit && (
              <div className="tenant-subform">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#fff', margin: 0 }}>
                    {vi ? 'Nhật ký can thiệp & chuyển quyền' : 'Audit Logs'}
                  </h4>
                  <button type="button" className="btn btn-ghost btn-xs" onClick={() => setShowAudit(false)}>✕</button>
                </div>
                {auditLogs.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: 0 }}>
                    {vi ? 'Chưa có bản ghi nhật ký nào.' : 'No audit records found.'}
                  </p>
                ) : (
                  <div className="table-container" style={{ margin: 0 }}>
                    <table className="data-table" style={{ minWidth: '600px' }}>
                      <thead>
                        <tr>
                          <th>{vi ? 'Thời gian' : 'Time'}</th>
                          <th>{vi ? 'Hành động' : 'Action'}</th>
                          <th>{vi ? 'Chủ cũ → Mới' : 'From → To'}</th>
                          <th>{vi ? 'Lý do' : 'Reason'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs.map((log) => (
                          <tr key={log.id}>
                            <td style={{ color: 'var(--text-muted)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                              {new Date(log.createdAt).toLocaleString()}
                            </td>
                            <td>
                              <code className="mono-tag">{log.action}</code>
                            </td>
                            <td style={{ fontSize: '12px' }}>
                              {log.fromOwnerId
                                ? `${log.fromOwnerId.slice(0, 8)}… → ${log.toOwnerId ? log.toOwnerId.slice(0, 8) + '…' : '-'}`
                                : log.toOwnerId ? `${log.toOwnerId.slice(0, 8)}…` : '-'}
                            </td>
                            <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                              {log.reason || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Join Requests Panel (Only for Managers/Owners) */}
          {current.canManage && (
            <div className="tenant-panel">
              <div className="tenant-panel-header">
                <h3 className="tenant-panel-title">
                  {vi ? 'Yêu cầu xin gia nhập đang chờ duyệt' : 'Pending Join Requests'}
                  {joinRequests.filter((r) => r.status === 'PENDING').length > 0 && (
                    <span className="tenant-badge tenant-badge-pending">
                      {joinRequests.filter((r) => r.status === 'PENDING').length}
                    </span>
                  )}
                </h3>
              </div>

              {joinRequestsError ? (
                <div className="tenant-notice is-error" style={{ margin: 0 }}>
                  <span>{joinRequestsError}</span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    onClick={() => void loadData(current.id)}
                  >
                    {vi ? 'Thử lại' : 'Retry'}
                  </button>
                </div>
              ) : joinRequests.filter((r) => r.status === 'PENDING').length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                  {vi ? 'Không có yêu cầu xin gia nhập nào đang chờ duyệt.' : 'No pending join requests.'}
                </p>
              ) : (
                <div className="table-container" style={{ margin: 0 }}>
                  <table className="data-table" style={{ minWidth: '600px' }}>
                    <thead>
                      <tr>
                        <th>{vi ? 'Họ và tên' : 'Name'}</th>
                        <th>{vi ? 'Email' : 'Email'}</th>
                        <th>{vi ? 'Thời gian' : 'Requested At'}</th>
                        <th style={{ textAlign: 'right' }}>{vi ? 'Hành động' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {joinRequests
                        .filter((r) => r.status === 'PENDING')
                        .map((req) => (
                          <tr key={req.id}>
                            <td style={{ fontWeight: 500 }}>
                              {req.user?.name || (vi ? 'Chưa đặt tên' : 'No name')}
                            </td>
                            <td style={{ color: 'var(--text-muted)' }}>{req.user?.email}</td>
                            <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                              {req.createdAt ? new Date(req.createdAt).toLocaleString() : '-'}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '6px' }}>
                                <button
                                  type="button"
                                  className="btn btn-success-subtle btn-xs"
                                  onClick={() => void handleApproveJoinRequest(req.id)}
                                >
                                  {vi ? 'Duyệt' : 'Approve'}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-danger btn-xs"
                                  onClick={() => void handleRejectJoinRequest(req.id)}
                                >
                                  {vi ? 'Từ chối' : 'Reject'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Members Panel (Only for Managers/Owners) */}
          {current.canManage && (
            <div className="tenant-panel">
              <div className="tenant-panel-header">
                <h3 className="tenant-panel-title">
                  {vi ? 'Danh sách thành viên' : 'Tenant Members'}
                  <span className="results-count-badge" style={{ marginLeft: '4px' }}>
                    {current.members?.length || 0}
                  </span>
                </h3>
              </div>
              <div className="table-container" style={{ margin: 0 }}>
                <table className="data-table" style={{ minWidth: '600px' }}>
                  <thead>
                    <tr>
                      <th>{vi ? 'Họ và tên' : 'Name'}</th>
                      <th>{vi ? 'Email' : 'Email'}</th>
                      <th>{vi ? 'Vai trò' : 'Role'}</th>
                      <th style={{ textAlign: 'right' }}>{vi ? 'Hành động' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(current.members || []).map((member) => (
                      <tr key={member.id}>
                        <td style={{ fontWeight: 500 }}>
                          {member.name || (vi ? 'Chưa đặt tên' : 'No name')}
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>{member.email}</td>
                        <td>
                          {member.id === current.ownerUserId ? (
                            <span className="tenant-badge tenant-badge-owner">
                              {vi ? 'Chủ doanh nghiệp' : 'Owner'}
                            </span>
                          ) : (
                            <span className="tenant-badge tenant-badge-member">
                              {vi ? 'Thành viên' : 'Member'}
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {member.id !== current.ownerUserId && (
                            <button
                              type="button"
                              className="btn btn-danger btn-xs"
                              onClick={() => void handleRemoveMember(member.id, member.email)}
                            >
                              {vi ? 'Loại' : 'Remove'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          {/* REJECTED notice */}
          {context?.pendingRequest?.status === 'REJECTED' && (
            <div className="tenant-notice is-error">
              <div>
                <strong>{vi ? 'Yêu cầu gia nhập đã bị từ chối' : 'Join Request Rejected'}:</strong>{' '}
                <span>
                  {vi
                    ? `Chủ doanh nghiệp "${context.pendingRequest.tenant?.name || context.pendingRequest.tenantId}" đã từ chối yêu cầu của bạn.`
                    : `The owner of "${context.pendingRequest.tenant?.name || context.pendingRequest.tenantId}" has rejected your request.`}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-xs"
                onClick={() => void handleCancelJoin(context.pendingRequest!.id)}
              >
                {vi ? 'Đóng' : 'Dismiss'}
              </button>
            </div>
          )}

          {/* PENDING card */}
          {context?.pendingRequest?.status === 'PENDING' ? (
            <div className="tenant-panel" style={{ textAlign: 'center', padding: '32px 24px' }}>
              <span className="tenant-badge tenant-badge-pending" style={{ fontSize: '12px', padding: '4px 12px', marginBottom: '14px' }}>
                {vi ? 'Đang chờ phê duyệt' : 'Pending Approval'}
              </span>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', margin: '0 0 8px' }}>
                {vi ? 'Bạn đã gửi yêu cầu gia nhập doanh nghiệp' : 'Join Request Submitted'}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '0 auto 20px', maxWidth: '520px', lineHeight: '1.5' }}>
                {vi
                  ? 'Yêu cầu của bạn đang chờ chủ doanh nghiệp xem xét. Sau khi được duyệt, bạn sẽ tự động được gán vào doanh nghiệp.'
                  : 'Your request is awaiting owner approval. Once approved, you will join the tenant.'}
              </p>

              <div className="tenant-subform" style={{ maxWidth: '520px', margin: '0 auto 20px', textAlign: 'left' }}>
                <div style={{ marginBottom: '8px' }}>
                  <strong style={{ color: 'var(--text-dim)', fontSize: '12px' }}>{vi ? 'Doanh nghiệp:' : 'Tenant:'}</strong>{' '}
                  <span style={{ fontWeight: 600, color: '#fff' }}>{context.pendingRequest.tenant?.name || 'Doanh nghiệp'}</span>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Tenant ID:</strong>{' '}
                  <code className="mono-tag">{context.pendingRequest.tenantId}</code>
                </div>
                {context.pendingRequest.tenant?.owner && (
                  <div>
                    <strong style={{ color: 'var(--text-dim)', fontSize: '12px' }}>{vi ? 'Chủ sở hữu:' : 'Owner:'}</strong>{' '}
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      {context.pendingRequest.tenant.owner.name || context.pendingRequest.tenant.owner.email} ({context.pendingRequest.tenant.owner.email})
                    </span>
                  </div>
                )}
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => void handleCancelJoin(context.pendingRequest!.id)}
              >
                {vi ? 'Hủy yêu cầu gia nhập' : 'Cancel Join Request'}
              </button>

              <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)', textAlign: 'left', maxWidth: '520px', margin: '28px auto 0' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: '0 0 4px' }}>
                  {vi ? 'Hoặc tạo doanh nghiệp riêng' : 'Or Create Your Own Tenant'}
                </h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '0 0 14px' }}>
                  {vi
                    ? 'Bạn có thể tự tạo doanh nghiệp mới ngay bây giờ (yêu cầu chờ duyệt cũ sẽ tự động bị hủy).'
                    : 'You can create your own tenant now (your pending request will be cancelled automatically).'}
                </p>
                <form onSubmit={handleCreate}>
                  <div className="form-group">
                    <label className="form-label">{vi ? 'Tên doanh nghiệp *' : 'Tenant Name *'}</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      maxLength={120}
                      placeholder={vi ? 'Ví dụ: Công ty Công nghệ ABC' : 'e.g. Acme Tech'}
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{vi ? 'Mô tả (tùy chọn)' : 'Description (optional)'}</label>
                    <input
                      type="text"
                      className="form-control"
                      maxLength={500}
                      placeholder={vi ? 'Nhập mô tả...' : 'Enter description...'}
                      value={createDesc}
                      onChange={(e) => setCreateDesc(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm">
                    {vi ? 'Tạo doanh nghiệp' : 'Create Tenant'}
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div>
              {context?.isSystemAdmin && allTenants.length > 0 && (
                <div className="tenant-notice is-warning" style={{ marginBottom: '16px' }}>
                  <span>
                    {vi
                      ? 'Bạn chưa chọn doanh nghiệp nào. Hãy chọn từ danh sách phía trên hoặc tạo doanh nghiệp mới bên dưới.'
                      : 'No tenant selected. Choose one from the dropdown above or create a new one below.'}
                  </span>
                </div>
              )}

              <div className="tenant-empty-grid">
                {/* Create Card */}
                <div className="tenant-empty-card">
                  <div style={{ marginBottom: '8px' }}>
                    <h3>{vi ? 'Tạo doanh nghiệp mới' : 'Create a New Tenant'}</h3>
                  </div>
                  <p>
                    {vi
                      ? 'Dành cho người đại diện hoặc quản lý tổ chức. Sau khi tạo, bạn sẽ là Chủ doanh nghiệp (Owner) và có quyền quản lý thành viên.'
                      : 'For organization owners or managers. You will become the Tenant Owner with full member management privileges.'}
                  </p>
                  <form onSubmit={handleCreate} style={{ marginTop: 'auto' }}>
                    <div className="form-group">
                      <label className="form-label">{vi ? 'Tên doanh nghiệp *' : 'Tenant Name *'}</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        maxLength={120}
                        placeholder={vi ? 'Ví dụ: Công ty Cổ phần Alpha' : 'e.g. Alpha Corp'}
                        value={createName}
                        onChange={(e) => setCreateName(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{vi ? 'Mô tả (tùy chọn)' : 'Description (optional)'}</label>
                      <input
                        type="text"
                        className="form-control"
                        maxLength={500}
                        placeholder={vi ? 'Giới thiệu về doanh nghiệp...' : 'Brief introduction...'}
                        value={createDesc}
                        onChange={(e) => setCreateDesc(e.target.value)}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                      {vi ? 'Tạo doanh nghiệp' : 'Create Tenant'}
                    </button>
                  </form>
                </div>

                {/* Apply Join Card */}
                <div className="tenant-empty-card">
                  <div style={{ marginBottom: '8px' }}>
                    <h3>{vi ? 'Xin gia nhập doanh nghiệp' : 'Join Existing Tenant'}</h3>
                  </div>
                  <p>
                    {vi
                      ? 'Nhập mã Tenant ID của doanh nghiệp. Yêu cầu của bạn sẽ được chuyển đến Chủ doanh nghiệp để phê duyệt trước khi bạn chính thức là thành viên.'
                      : 'Enter the Tenant ID. Your request will be PENDING until the Tenant Owner approves it.'}
                  </p>
                  <form onSubmit={handleApplyJoin} style={{ marginTop: 'auto' }}>
                    <div className="form-group">
                      <label className="form-label">Tenant ID (UUID) *</label>
                      <input
                        type="text"
                        className="form-control form-control-mono"
                        required
                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        value={joinTenantId}
                        onChange={(e) => setJoinTenantId(e.target.value)}
                      />
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '16px', lineHeight: '1.4' }}>
                      {vi
                        ? 'Mỗi tài khoản chỉ gửi 1 yêu cầu gia nhập tại một thời điểm.'
                        : 'Only one pending join request is allowed at a time.'}
                    </div>
                    <button type="submit" className="btn btn-secondary" style={{ width: '100%' }}>
                      {vi ? 'Gửi yêu cầu gia nhập' : 'Submit Join Request'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
