import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../contexts/LanguageContext';
import type { User } from '../../../types/auth.types';

interface SuperAdminOverviewProps {
  users: User[];
  tenantsCount: number | null;
  loading: boolean;
}

export const SuperAdminOverview: React.FC<SuperAdminOverviewProps> = ({
  users,
  tenantsCount,
  loading,
}) => {
  const navigate = useNavigate();
  const { lang } = useLanguage();

  const adminUsers = users.filter((u) => u.role === 'ADMIN');
  const regularUsers = users.filter((u) => u.role === 'USER');

  return (
    <div className="card" style={{ marginTop: 24, borderLeft: '4px solid #f59e0b' }}>
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
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <h2 className="card-title" style={{ margin: 0, fontSize: 16 }}>
              {lang === 'vi' ? 'Quản Trị Hệ Thống (Super Admin Hub)' : 'System Governance (Super Admin Hub)'}
            </h2>
            <p className="card-subtitle" style={{ fontSize: 13, color: 'var(--text-dim)', margin: '2px 0 0' }}>
              {lang === 'vi'
                ? 'Tổng quan người dùng toàn cục và doanh nghiệp trên toàn nền tảng'
                : 'Platform-wide user directory and tenant governance'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/console/admin/users')}
            id="superadmin-btn-users"
          >
            <span>{lang === 'vi' ? 'Người Dùng Toàn Hệ Thống →' : 'All Users →'}</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/console/admin/tenants')}
            id="superadmin-btn-tenants"
          >
            <span>{lang === 'vi' ? 'Tất Cả Doanh Nghiệp →' : 'All Tenants →'}</span>
          </button>
        </div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
          }}
        >
          {/* Global Users Metric */}
          <div
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: 16,
              cursor: 'pointer',
            }}
            onClick={() => navigate('/console/admin/users')}
          >
            <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>
              {lang === 'vi' ? 'Người Dùng Hệ Thống' : 'System Users'}
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '4px 0', fontFamily: 'var(--font-mono)' }}>
              {loading ? '...' : users.length}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {loading ? '...' : `${adminUsers.length} Admin, ${regularUsers.length} Users`}
            </div>
          </div>

          {/* Global Tenants Metric */}
          <div
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: 16,
              cursor: 'pointer',
            }}
            onClick={() => navigate('/console/admin/tenants')}
          >
            <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>
              {lang === 'vi' ? 'Tất Cả Doanh Nghiệp' : 'All Tenants'}
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '4px 0', fontFamily: 'var(--font-mono)' }}>
              {tenantsCount !== null ? tenantsCount : '...'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {lang === 'vi' ? 'Quản lý tập trung toàn hệ thống' : 'Central governance active'}
            </div>
          </div>

          {/* System Security Guard Policy */}
          <div
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: 16,
            }}
          >
            <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>
              {lang === 'vi' ? 'Chính Sách An Toàn' : 'Security Guard'}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--success)', margin: '6px 0' }}>
              ✓ AppAuth & Central IAM
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {lang === 'vi' ? 'Chặn tự hạ quyền & bảo vệ dữ liệu' : 'Self-demotion lock active'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
