import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import type { TenantContext } from '../../../services/tenants.service';

interface TenantOverviewProps {
  tenantContext: TenantContext | null;
  loading: boolean;
  onGoToTenants: () => void;
}

export const TenantOverview: React.FC<TenantOverviewProps> = ({
  tenantContext,
  loading,
  onGoToTenants,
}) => {
  const { lang } = useLanguage();

  const tenant = tenantContext?.tenant;
  const pending = tenantContext?.pendingRequest || tenantContext?.joinRequest;

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <div
        className="card-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div>
            <h2 className="card-title" style={{ margin: 0, fontSize: 16 }}>
              {lang === 'vi' ? 'Không Gian Doanh Nghiệp (My Tenant)' : 'Tenant Workspace'}
            </h2>
            <p className="card-subtitle" style={{ fontSize: 13, color: 'var(--text-dim)', margin: '2px 0 0' }}>
              {loading
                ? '...'
                : tenant
                ? (tenant.isOwner
                    ? (lang === 'vi' ? 'Bạn là Chủ sở hữu doanh nghiệp' : 'You are the Tenant Owner')
                    : (lang === 'vi' ? 'Bạn là Thành viên chính thức' : 'You are a Tenant Member'))
                : pending
                ? (lang === 'vi' ? 'Bạn đang có yêu cầu gia nhập chờ phê duyệt' : 'You have a pending join request')
                : (lang === 'vi' ? 'Bạn chưa thuộc doanh nghiệp nào' : 'Not affiliated with any tenant')}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onGoToTenants}
          id="tenant-btn-manage"
        >
          <span>{lang === 'vi' ? 'Không Gian Doanh Nghiệp Của Tôi →' : 'My Tenant Hub →'}</span>
        </button>
      </div>

      <div style={{ padding: '20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 16 }}>
            {lang === 'vi' ? 'Đang tải thông tin doanh nghiệp...' : 'Loading tenant data...'}
          </div>
        ) : tenant ? (
          /* State 1 & 2: User is in a Tenant */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
            }}
          >
            <div
              style={{
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: 16,
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>
                {lang === 'vi' ? 'Tên Doanh Nghiệp' : 'Tenant Name'}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '4px 0' }}>
                {tenant.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                ID: <span className="mono-tag" style={{ fontSize: 11 }}>{tenant.id}</span>
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: 16,
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>
                {lang === 'vi' ? 'Vai Trò Trong Doanh Nghiệp' : 'Your Role'}
              </div>
              <div style={{ marginTop: 6 }}>
                <span
                  className="badge"
                  style={{
                    background: tenant.isOwner ? 'rgba(79, 70, 229, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                    color: tenant.isOwner ? '#818cf8' : '#10b981',
                    fontSize: 12,
                    padding: '4px 10px',
                  }}
                >
                  {tenant.isOwner
                    ? (lang === 'vi' ? '★ CHỦ SỞ HỮU (OWNER)' : '★ OWNER')
                    : (lang === 'vi' ? '● THÀNH VIÊN (MEMBER)' : '● MEMBER')}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                {tenant.isOwner
                  ? (lang === 'vi' ? 'Có quyền quản lý thành viên & duyệt yêu cầu' : 'Full tenant management rights')
                  : (lang === 'vi' ? 'Có quyền sử dụng tài nguyên nội bộ' : 'Internal resources access')}
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: 16,
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>
                {lang === 'vi' ? 'Quy Mô Thành Viên' : 'Members'}
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '4px 0', fontFamily: 'var(--font-mono)' }}>
                {tenant._count?.users || 1}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {lang === 'vi' ? 'Thành viên trực thuộc doanh nghiệp' : 'Affiliated tenant users'}
              </div>
            </div>
          </div>
        ) : pending ? (
          /* State 3: User has Pending Join Request */
          <div
            style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontWeight: 600, color: '#fbbf24', fontSize: 14 }}>
                ⏳ {lang === 'vi' ? 'Yêu Cầu Gia Nhập Đang Chờ Duyệt (PENDING)' : 'Join Request Pending Approval'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                {lang === 'vi'
                  ? `Bạn đã gửi yêu cầu gia nhập tới doanh nghiệp ${pending.tenant?.name || pending.tenantId}. Vui lòng chờ Tenant Owner phê duyệt.`
                  : `You sent a join request to ${pending.tenant?.name || pending.tenantId}. Waiting for approval.`}
              </div>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onGoToTenants}
            >
              {lang === 'vi' ? 'Xem & Hủy Yêu Cầu' : 'View & Cancel Request'}
            </button>
          </div>
        ) : (
          /* State 4: User has No Tenant */
          <div
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px dashed var(--border-medium)',
              borderRadius: 'var(--radius-md)',
              padding: 24,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 6 }}>
              {lang === 'vi' ? 'Bạn Chưa Tham Gia Doanh Nghiệp Nào' : 'No Tenant Affiliation'}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 auto 16px', maxWidth: 540 }}>
              {lang === 'vi'
                ? 'Bạn có thể tự tạo một doanh nghiệp mới để trở thành Tenant Owner, hoặc nhập Tenant ID do đồng nghiệp cung cấp để xin gia nhập.'
                : 'You can create a new organization to become Tenant Owner, or enter a Tenant ID to join an existing organization.'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={onGoToTenants}
              >
                {lang === 'vi' ? 'Khám Phá Doanh Nghiệp Của Tôi' : 'Go to My Tenant'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
