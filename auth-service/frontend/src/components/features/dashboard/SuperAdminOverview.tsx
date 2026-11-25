import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../contexts/LanguageContext';
import { IconCheck, IconShield } from '../../common/Icons';
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

  return (
    <div className="compact-callout compact-callout--admin" style={{ marginTop: 0, marginBottom: 20 }}>
      <div className="card-header-left">
        <div className="icon-well icon-well--amber">
          <IconShield size={18} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h2 className="card-title">
              {lang === 'vi' ? 'Quản Trị Hệ Thống' : 'System Governance'}
            </h2>
            <span className="badge badge-success">
              <IconCheck size={12} />
              <span>AppAuth & Central IAM</span>
            </span>
          </div>
          <p className="card-subtitle">
            {loading
              ? (lang === 'vi' ? 'Đang tải thống kê quản trị...' : 'Loading governance summary...')
              : lang === 'vi'
              ? `${users.length} tài khoản (${adminUsers.length} Admin) · ${tenantsCount ?? 0} doanh nghiệp · Chặn tự hạ quyền đang bật`
              : `${users.length} accounts (${adminUsers.length} Admin) · ${tenantsCount ?? 0} tenants · Self-demotion lock active`}
          </p>
        </div>
      </div>

      <div className="card-header-actions">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => navigate('/console/admin/users')}
          id="superadmin-btn-users"
        >
          <span>{lang === 'vi' ? 'Người Dùng Toàn Hệ Thống' : 'All Users'}</span>
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => navigate('/console/admin/tenants')}
          id="superadmin-btn-tenants"
        >
          <span>{lang === 'vi' ? 'Tất Cả Doanh Nghiệp' : 'All Tenants'}</span>
        </button>
      </div>
    </div>
  );
};
