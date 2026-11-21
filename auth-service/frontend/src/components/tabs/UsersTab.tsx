import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { DataTable, type Column } from '../common/DataTable';
import type { User, Role } from '../../types/auth.types';

interface UsersTabProps {
  users: User[];
  loading: boolean;
  onRefresh: () => void;
  onOpenAssignRole: (user: User) => void;
}

export const UsersTab: React.FC<UsersTabProps> = ({
  users,
  loading,
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: isAdmin
                  ? 'rgba(245, 158, 11, 0.15)'
                  : 'rgba(79, 70, 229, 0.15)',
                border: isAdmin
                  ? '1px solid rgba(245, 158, 11, 0.4)'
                  : '1px solid rgba(79, 70, 229, 0.3)',
                color: isAdmin ? '#f59e0b' : '#818cf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              {initial}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <strong style={{ color: '#fff', fontSize: 13 }}>
                  {u.name || (vi ? 'Chưa đặt tên' : 'Unnamed')}
                </strong>
                {isSelf && (
                  <span
                    className="badge badge-warning"
                    style={{ fontSize: 10, padding: '1px 6px', lineHeight: '14px' }}
                  >
                    {vi ? '(Bạn)' : '(You)'}
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--text-dim, #64748b)',
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
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <code
            className="mono-tag"
            style={{
              fontSize: 11,
              padding: '2px 6px',
              background: 'var(--bg-surface-elevated, #1a2234)',
              borderRadius: 4,
              border: '1px solid var(--border-subtle, #1e293b)',
            }}
            title={u.id}
          >
            {u.id.slice(0, 8)}…
          </code>
          <button
            type="button"
            onClick={() => copyToClipboard(u.id, 'User ID')}
            style={{
              background: 'none',
              border: 'none',
              padding: 2,
              cursor: 'pointer',
              color: 'var(--text-dim, #64748b)',
              display: 'inline-flex',
              alignItems: 'center',
            }}
            title={vi ? 'Sao chép đầy đủ User ID' : 'Copy full User ID'}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
        </div>
      ),
    },
    {
      key: 'role',
      header: vi ? 'Vai Trò Hệ Thống' : 'System Role',
      width: '14%',
      render: (u) => (
        <span
          className={`badge ${u.role === 'ADMIN' ? 'badge-warning' : 'badge-neutral'}`}
          style={{ fontWeight: 600, fontSize: 11 }}
        >
          {u.role === 'ADMIN' ? (vi ? 'ADMIN' : 'ADMIN') : (vi ? 'USER' : 'USER')}
        </span>
      ),
    },
    {
      key: 'tenant',
      header: vi ? 'Doanh Nghiệp Trực Thuộc' : 'Tenant Affiliation',
      width: '18%',
      render: (u) =>
        u.tenantId ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <code
              className="mono-tag"
              style={{
                fontSize: 11,
                padding: '2px 6px',
                background: 'var(--bg-surface-elevated, #1a2234)',
                borderRadius: 4,
                border: '1px solid var(--border-subtle, #1e293b)',
              }}
              title={u.tenantId}
            >
              {u.tenantId.slice(0, 8)}…
            </code>
            <button
              type="button"
              onClick={() => copyToClipboard(u.tenantId!, 'Tenant ID')}
              style={{
                background: 'none',
                border: 'none',
                padding: 2,
                cursor: 'pointer',
                color: 'var(--text-dim, #64748b)',
                display: 'inline-flex',
                alignItems: 'center',
              }}
              title={vi ? 'Sao chép Tenant ID' : 'Copy Tenant ID'}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
          </div>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--text-dim, #64748b)' }}>
            {vi ? 'Chưa tham gia' : 'None'}
          </span>
        ),
    },
    {
      key: 'createdAt',
      header: vi ? 'Ngày Đăng Ký' : 'Registration Date',
      width: '12%',
      render: (u) => (
        <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: 12, whiteSpace: 'nowrap' }}>
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
              style={{ opacity: 0.5, cursor: 'not-allowed' }}
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
              style={{ opacity: 0.5, cursor: 'not-allowed' }}
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
            className="btn btn-primary btn-sm"
            onClick={() => onOpenAssignRole(u)}
          >
            {vi ? 'Phân Quyền' : 'Assign Role'}
          </button>
        );
      },
    },
  ];

  return (
    <div className="tab-content active" id="tab-users" style={{ width: '100%', maxWidth: 1400, margin: '0 auto' }}>
      {/* Page Header */}
      <div
        className="page-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1 className="page-title" style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>
            {vi ? 'Tài Khoản Người Dùng Nền Tảng' : 'Platform User Directory'}
          </h1>
          <p className="page-subtitle" style={{ margin: '4px 0 0 0', fontSize: 13, color: 'var(--text-muted, #94a3b8)' }}>
            {vi
              ? 'Danh sách người dùng Canonical toàn hệ thống và phân quyền Quản trị viên (ADMIN).'
              : 'Canonical system users directory and System Admin (ADMIN) role assignment.'}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onRefresh}
          disabled={loading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}
          >
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
          {vi ? 'Làm mới' : 'Refresh'}
        </button>
      </div>

      {/* Security Guidance Alert Box (Matching Scene 8) */}
      <div
        style={{
          background: 'rgba(79, 70, 229, 0.08)',
          border: '1px solid rgba(79, 70, 229, 0.3)',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 20,
          fontSize: 12,
          color: '#818cf8',
          lineHeight: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 16 }}>🛡️</span>
        <div>
          <strong>{vi ? 'Chính sách thiết kế V2:' : 'V2 Security Policy:'}</strong>{' '}
          {vi
            ? 'Giao diện không hiển thị nút xóa User; Chặn tự hạ quyền chính mình và chặn hạ quyền Quản trị viên cuối cùng của hệ thống.'
            : 'User deletion is disabled; self-demotion and demoting the last administrator are strictly blocked.'}
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div
        className="table-toolbar"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
          background: 'var(--bg-surface, #111827)',
          padding: '12px 16px',
          borderRadius: 8,
          border: '1px solid var(--border-subtle, #1e293b)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: 1 }}>
          {/* Search Box */}
          <div
            className="search-box"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--bg-input, #0e1422)',
              border: '1px solid var(--border-medium, #334155)',
              borderRadius: 6,
              padding: '6px 12px',
              minWidth: 260,
              maxWidth: 360,
              flex: 1,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-dim, #64748b)' }}>
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              id="users-search-input"
              className="search-input"
              placeholder={vi ? 'Tìm theo email, tên, User ID...' : 'Search by email, name, User ID...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                fontSize: 13,
                outline: 'none',
                width: '100%',
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-dim, #64748b)',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: 14,
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Role Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-dim, #64748b)' }}>
              {vi ? 'Lọc vai trò:' : 'Role:'}
            </span>
            <select
              id="users-role-filter"
              className="filter-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              style={{
                background: 'var(--bg-input, #0e1422)',
                border: '1px solid var(--border-medium, #334155)',
                color: '#fff',
                padding: '6px 10px',
                borderRadius: 6,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              <option value="ALL">{vi ? 'Tất cả vai trò' : 'All Roles'}</option>
              <option value="ADMIN">{vi ? 'Chỉ Super Admin (ADMIN)' : 'Super Admin (ADMIN)'}</option>
              <option value="USER">{vi ? 'Chỉ Người Dùng (USER)' : 'Standard User (USER)'}</option>
            </select>
          </div>

          {/* Sort Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-dim, #64748b)' }}>
              {vi ? 'Sắp xếp:' : 'Sort:'}
            </span>
            <select
              id="users-sort-by"
              className="filter-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{
                background: 'var(--bg-input, #0e1422)',
                border: '1px solid var(--border-medium, #334155)',
                color: '#fff',
                padding: '6px 10px',
                borderRadius: 6,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              <option value="email_asc">{vi ? 'Email (A-Z)' : 'Email (A-Z)'}</option>
              <option value="email_desc">{vi ? 'Email (Z-A)' : 'Email (Z-A)'}</option>
              <option value="name_asc">{vi ? 'Tên (A-Z)' : 'Name (A-Z)'}</option>
              <option value="role_admin">{vi ? 'Quản trị viên lên trước' : 'ADMIN first'}</option>
            </select>
          </div>
        </div>

        {/* Counter Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            id="users-count-badge"
            className="results-count-badge"
            style={{
              fontSize: 12,
              color: 'var(--text-dim, #64748b)',
              background: 'var(--bg-surface-elevated, #1a2234)',
              padding: '4px 10px',
              borderRadius: 4,
              border: '1px solid var(--border-subtle, #1e293b)',
            }}
          >
            {vi
              ? `Hiển thị ${filteredUsers.length} / ${users.length} người dùng`
              : `Showing ${filteredUsers.length} of ${users.length} users`}
          </span>
        </div>
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
