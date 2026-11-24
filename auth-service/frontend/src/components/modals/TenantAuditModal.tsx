import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { tenantsService, type TenantAuditLog } from '../../services/tenants.service';

interface TenantAuditModalProps {
  tenantId?: string;
  tenantName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const TenantAuditModal: React.FC<TenantAuditModalProps> = ({
  tenantId,
  tenantName,
  isOpen,
  onClose,
}) => {
  const { lang } = useLanguage();
  const vi = lang === 'vi';

  const [logs, setLogs] = useState<TenantAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    tenantsService
      .getAudit(tenantId)
      .then((data) => {
        if (isMounted) setLogs(data);
      })
      .catch((err: any) => {
        if (isMounted) setError(err.message || (vi ? 'Không thể tải nhật ký' : 'Failed to load audit logs'));
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, tenantId, vi]);

  if (!isOpen) return null;

  const renderActionBadge = (action: string) => {
    switch (action) {
      case 'CREATED':
        return <span className="badge badge-success">CREATED</span>;
      case 'UPDATED':
      case 'ADMIN_UPDATED':
        return <span className="badge badge-secondary">{action}</span>;
      case 'MEMBER_JOIN_APPROVED':
        return <span className="badge badge-success">{vi ? 'DUYỆT GIA NHẬP' : 'APPROVED'}</span>;
      case 'MEMBER_JOIN_REJECTED':
        return <span className="badge badge-warning">{vi ? 'TỪ CHỐI' : 'REJECTED'}</span>;
      case 'MEMBER_REMOVED':
        return <span className="badge badge-danger">{vi ? 'XÓA THÀNH VIÊN' : 'REMOVED'}</span>;
      case 'MEMBER_LEFT':
        return <span className="badge badge-secondary">{vi ? 'TỰ RỜI' : 'LEFT'}</span>;
      case 'OWNERSHIP_TRANSFERRED':
      case 'ADMIN_OWNERSHIP_TRANSFERRED':
        return <span className="badge badge-warning">{action}</span>;
      case 'DELETED':
      case 'ADMIN_DELETED':
        return <span className="badge badge-danger">{action}</span>;
      default:
        return <span className="badge badge-secondary">{action}</span>;
    }
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString(vi ? 'vi-VN' : 'en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="modal-backdrop show" id="tenant-audit-modal">
      <div className="modal-content" style={{ maxWidth: 840, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <h3 className="modal-title" style={{ margin: 0 }}>
              {vi ? 'Nhật Ký Can Thiệp (Audit Log)' : 'Tenant Audit Log'}
            </h3>
            <p className="modal-desc" style={{ margin: '4px 0 0' }}>
              {tenantName
                ? (vi ? `Lịch sử các thao tác trên doanh nghiệp "${tenantName}".` : `History of administrative actions on "${tenantName}".`)
                : (vi ? 'Nhật ký can thiệp trên toàn bộ hệ thống.' : 'System-wide tenant audit logs.')}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', margin: '12px 0' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
              {vi ? 'Đang tải nhật ký...' : 'Loading audit logs...'}
            </div>
          ) : error ? (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '12px 16px',
                borderRadius: 6,
                color: 'var(--danger)',
                fontSize: 13,
              }}
            >
              {error}
            </div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
              {vi ? 'Chưa có nhật ký nào được ghi nhận.' : 'No audit records found.'}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="mock-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: 170 }}>{vi ? 'Thời Gian' : 'Timestamp'}</th>
                    <th style={{ width: 140 }}>{vi ? 'Hành Động' : 'Action'}</th>
                    <th style={{ width: 220 }}>{vi ? 'Người Thực Hiện' : 'Actor'}</th>
                    <th>{vi ? 'Chi Tiết / Lý Do' : 'Details / Reason'}</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                        {formatDate(log.createdAt)}
                      </td>
                      <td>{renderActionBadge(log.action)}</td>
                      <td>
                        <code style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {log.actorUserId}
                        </code>
                      </td>
                      <td style={{ fontSize: 13, color: '#e2e8f0' }}>
                        {log.reason || (
                          <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>
                            {vi ? '(Không có ghi chú)' : '(No reason)'}
                          </span>
                        )}
                        {log.fromOwnerId && log.toOwnerId && (
                          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                            {vi ? 'Chuyển từ:' : 'From:'} <code>{log.fromOwnerId.slice(0, 8)}...</code> →{' '}
                            {vi ? 'Đến:' : 'To:'} <code>{log.toOwnerId.slice(0, 8)}...</code>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {vi ? 'Đóng' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
