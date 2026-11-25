import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { DataTable, type Column } from '../common/DataTable';
import { IconAlertTriangle, IconCopy, IconRefresh, IconSearch, IconShield, IconX } from '../common/Icons';
import type { User, Role } from '../../types/auth.types';

interface UsersTabProps {
  users: User[];
  loading: boolean;
  error?: string | null;
  onRefresh: () => void;
  onOpenAssignRole: (user: User) => void;
}

export const UsersTab: React.FC<UsersTabProps> = ({
  users,
  loading,
  error,
  onRefresh,
  onOpenAssignRole,
}) => {
  const { lang } = useLanguage();
  const vi = lang === 'vi';
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | Role>('ALL');
  const [sortBy, setSortBy] = useState<'email_asc' | 'email_desc' | 'name_asc' | 'role_admin'>('email_asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Total count of ADMINs across entire directory
  const adminCount = useMemo(() => {
    return users.filter((u) => u.role === 'ADMIN').length;
  }, [users]);

  // Reset pagination when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, sortBy]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(
      vi ? `Đã sao chép ${label} vào clipboard.` : `Copied ${label} to clipboard.`,
      'info',
    );
  };

  const filteredUsers = useMemo(() => {
    let list = [...users];

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((u) => {
        const email = (u.email || '').toLowerCase();
        const name = (u.name || '').toLowerCase();
        const id = (u.id || '').toLowerCase();
        const tenant = (u.tenantId || '').toLowerCase();
        return email.includes(q) || name.includes(q) || id.includes(q) || tenant.includes(q);
      });
    }

    if (roleFilter !== 'ALL') {
      list = list.filter((u) => u.role === roleFilter);
    }

    list.sort((a, b) => {
      if (sortBy === 'email_asc') return (a.email || '').localeCompare(b.email || '');
      if (sortBy === 'email_desc') return (b.email || '').localeCompare(a.email || '');
      if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'role_admin') {
        if (a.role === b.role) return (a.email || '').localeCompare(b.email || '');
        return a.role === 'ADMIN' ? -1 : 1;
      }
      return 0;
    });

    return list;
  }, [users, search, roleFilter, sortBy]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  const clearFilters = () => {
    setSearch('');
    setRoleFilter('ALL');
    setSortBy('email_asc');
    setCurrentPage(1);
  };

  const columns: Column<User>[] = [
    {
      key: 'user_email',
      header: vi ? 'Người Dùng / Email' : 'User / Email',
      width: '28%',
      render: (u) => {
        const isSelf = currentUser?.id === u.id;
        const initial = (u.name || u.email || 'U').charAt(0).toUpperCase();
        const isAdmin = u.role === 'ADMIN';

        return (
          <div className="card-header-left">
            <div className={`avatar-circle ${isAdmin ? 'avatar-circle--admin' : 'avatar-circle--subtle'}`}>
              {initial}
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="inline-code-row" style={{ flexWrap: 'wrap' }}>
                <strong style={{ color: 'var(--text-main)', fontSize: 13 }}>
                  {u.name || (vi ? 'Chưa đặt tên' : 'Unnamed')}
                </strong>
                {isSelf && (
                  <span className="badge badge-warning">
                    {vi ? '(Bạn)' : '(You)'}
                  </span>
                )}
              </div>
              <div
                className="form-hint"
                style={{
                  marginTop: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={u.email}
              >
                {u.email}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'id',
      header: 'User ID',
      width: '16%',
      render: (u) => (
        <div className="inline-code-row">
          <code className="mono-tag" title={u.id}>
            {u.id.slice(0, 8)}…
          </code>
          <button
            type="button"
            className="btn-icon"
            onClick={() => copyToClipboard(u.id, 'User ID')}
            title={vi ? 'Sao chép đầy đủ User ID' : 'Copy full User ID'}
            aria-label={vi ? 'Sao chép đầy đủ User ID' : 'Copy full User ID'}
          >
            <IconCopy size={13} />
          </button>
        </div>
      ),
    },
    {
      key: 'role',
      header: vi ? 'Vai Trò Hệ Thống' : 'System Role',
      width: '14%',
      render: (u) => (
        <span className={`badge ${u.role === 'ADMIN' ? 'badge-warning' : 'badge-neutral'}`}>
          {u.role === 'ADMIN' ? 'ADMIN' : 'USER'}
        </span>
      ),
    },
    {
      key: 'tenant',
      header: vi ? 'Doanh Nghiệp Trực Thuộc' : 'Tenant Affiliation',
      width: '18%',
      render: (u) =>
        u.tenantId ? (
          <div className="inline-code-row">
            <code className="mono-tag" title={u.tenantId}>
              {u.tenantId.slice(0, 8)}…
            </code>
            <button
              type="button"
              className="btn-icon"
              onClick={() => copyToClipboard(u.tenantId!, 'Tenant ID')}
              title={vi ? 'Sao chép Tenant ID' : 'Copy Tenant ID'}
              aria-label={vi ? 'Sao chép Tenant ID' : 'Copy Tenant ID'}
            >
              <IconCopy size={13} />
            </button>
          </div>
        ) : (
          <span className="form-hint" style={{ marginTop: 0 }}>
            {vi ? 'Chưa tham gia' : 'None'}
          </span>
        ),
    },
    {
      key: 'createdAt',
      header: vi ? 'Ngày Đăng Ký' : 'Registration Date',
      width: '12%',
      render: (u) => (
        <span style={{ color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
          {u.createdAt
            ? new Date(u.createdAt).toLocaleDateString(vi ? 'vi-VN' : 'en-US', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })
            : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: vi ? 'Thao Tác Phân Quyền' : 'Role Assignment',
      align: 'right',
      width: '12%',
      render: (u) => {
        const isSelf = currentUser?.id === u.id;
        const isLastAdmin = u.role === 'ADMIN' && adminCount <= 1;

        if (isSelf) {
          return (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled
              title={
                vi
                  ? 'Không thể tự phân quyền hoặc tự hạ quyền chính mình'
                  : 'Cannot assign or demote your own role'
              }
            >
              {vi ? 'Phân Quyền (Bị Khóa)' : 'Assign Role (Locked)'}
            </button>
          );
        }

        if (isLastAdmin) {
          return (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled
              title={
                vi
                  ? 'Không thể hạ quyền Quản trị viên cuối cùng của hệ thống'
                  : 'Cannot demote the last system administrator'
              }
            >
              {vi ? 'Phân Quyền (Bị Khóa)' : 'Assign Role (Locked)'}
            </button>
          );
        }

        return (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onOpenAssignRole(u)}
          >
            {vi ? 'Phân Quyền' : 'Assign Role'}
          </button>
        );
      },
    },
  ];

  return (
    <div className="tab-content active page-container" id="tab-users">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {vi ? 'Tài Khoản Người Dùng Nền Tảng' : 'Platform User Directory'}
          </h1>
          <p className="page-subtitle">
            {vi
              ? 'Danh sách người dùng Canonical toàn hệ thống và phân quyền Quản trị viên (ADMIN).'
              : 'Canonical system users directory and System Admin (ADMIN) role assignment.'}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onRefresh}
          disabled={loading}
        >
          <IconRefresh size={14} style={{ animation: loading ? 'spin 1s linear infinite' : undefined }} />
          <span>{vi ? 'Làm mới' : 'Refresh'}</span>
        </button>
      </div>

      {error && (
        <div className="error-alert" role="alert" id="users-load-error">
          <div className="error-alert-content">
            <IconAlertTriangle size={16} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onRefresh}
            disabled={loading}
          >
            <IconRefresh size={13} />
            <span>{vi ? 'Thử lại' : 'Retry'}</span>
          </button>
        </div>
      )}

      {/* Security Guidance Alert Box */}
      <div className="info-banner info-banner--primary">
        <span className="info-banner-icon" aria-hidden="true">
          <IconShield size={16} />
        </span>
        <div>
          <strong>{vi ? 'Chính sách thiết kế V2:' : 'V2 Security Policy:'}</strong>{' '}
          {vi
            ? 'Giao diện không hiển thị nút xóa User; Chặn tự hạ quyền chính mình và chặn hạ quyền Quản trị viên cuối cùng của hệ thống.'
            : 'User deletion is disabled; self-demotion and demoting the last administrator are strictly blocked.'}
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="table-toolbar">
        <div className="table-toolbar-left">
          <div className="search-box">
            <IconSearch size={14} />
            <input
              type="text"
              id="users-search-input"
              className="search-input"
              placeholder={vi ? 'Tìm theo email, tên, User ID...' : 'Search by email, name, User ID...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="btn-icon"
                onClick={() => setSearch('')}
                aria-label={vi ? 'Xóa từ khóa tìm kiếm' : 'Clear search'}
                style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)' }}
              >
                <IconX size={13} />
              </button>
            )}
          </div>

          {/* Role Filter */}
          <div className="inline-code-row">
            <label htmlFor="users-role-filter" className="form-hint" style={{ marginTop: 0 }}>
              {vi ? 'Vai trò:' : 'Role:'}
            </label>
            <select
              id="users-role-filter"
              className="filter-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
            >
              <option value="ALL">{vi ? 'Tất cả vai trò' : 'All Roles'}</option>
              <option value="ADMIN">{vi ? 'Chỉ Super Admin (ADMIN)' : 'Super Admin (ADMIN)'}</option>
              <option value="USER">{vi ? 'Chỉ Người Dùng (USER)' : 'Standard User (USER)'}</option>
            </select>
          </div>

          {/* Sort Filter */}
          <div className="inline-code-row">
            <label htmlFor="users-sort-by" className="form-hint" style={{ marginTop: 0 }}>
              {vi ? 'Sắp xếp:' : 'Sort:'}
            </label>
            <select
              id="users-sort-by"
              className="filter-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="email_asc">{vi ? 'Email (A-Z)' : 'Email (A-Z)'}</option>
              <option value="email_desc">{vi ? 'Email (Z-A)' : 'Email (Z-A)'}</option>
              <option value="name_asc">{vi ? 'Tên (A-Z)' : 'Name (A-Z)'}</option>
              <option value="role_admin">{vi ? 'Quản trị viên lên trước' : 'ADMIN first'}</option>
            </select>
          </div>
        </div>

        <span id="users-count-badge" className="results-count-badge">
          {vi
            ? `Hiển thị ${filteredUsers.length} / ${users.length} người dùng`
            : `Showing ${filteredUsers.length} of ${users.length} users`}
        </span>
      </div>

      {/* Main Users Table via P2 DataTable Component */}
      <DataTable<User>
        columns={columns}
        data={paginatedUsers}
        keyExtractor={(u) => u.id}
        loading={loading}
        emptyTitle={vi ? 'Không tìm thấy người dùng' : 'No users found'}
        emptyDescription={
          search || roleFilter !== 'ALL'
            ? vi
              ? 'Không có người dùng nào khớp với bộ lọc hiện tại.'
              : 'No users matched the current search criteria.'
            : vi
            ? 'Chưa có người dùng nào trong hệ thống.'
            : 'No users registered yet.'
        }
        emptyAction={
          search || roleFilter !== 'ALL' ? (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={clearFilters}
            >
              {vi ? 'Xóa bộ lọc' : 'Clear filters'}
            </button>
          ) : undefined
        }
        pagination={{
          currentPage,
          totalItems: filteredUsers.length,
          pageSize,
          onPageChange: setCurrentPage,
          onPageSizeChange: (newPageSize) => {
            setPageSize(newPageSize);
            setCurrentPage(1);
          },
          pageSizeOptions: [10, 20, 50],
          disabled: loading,
        }}
      />
    </div>
  );
};
