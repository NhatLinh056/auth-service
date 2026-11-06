import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
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
  const { t, lang } = useLanguage();
  const vi = lang === 'vi';

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | Role>('ALL');
  const [sortBy, setSortBy] = useState<'email_asc' | 'email_desc' | 'name_asc' | 'role_admin'>('email_asc');

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

  const clearFilters = () => {
    setSearch('');
    setRoleFilter('ALL');
    setSortBy('email_asc');
  };

  const countBadgeText = t('filter.showing_users')
    .replace('{count}', String(filteredUsers.length))
    .replace('{total}', String(users.length));

  return (
    <div className="tab-content active" id="tab-users">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('users.title')}</h1>
          <p className="page-subtitle">
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
        >
          {t('users.refresh')}
        </button>
      </div>

      {/* Users Search & Filter Toolbar */}
      <div className="table-toolbar">
        <div className="table-toolbar-left">
          <div className="search-box">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              id="users-search-input"
              className="search-input"
              placeholder={vi ? 'Tìm theo email, tên, User ID, Tenant ID...' : 'Search by email, name, User ID, Tenant ID...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            id="users-role-filter"
            className="filter-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
          >
            <option value="ALL">{t('filter.all_roles')}</option>
            <option value="ADMIN">{t('filter.role_admin')}</option>
            <option value="USER">{t('filter.role_user')}</option>
          </select>

          <select
            id="users-sort-by"
            className="filter-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="email_asc">{t('filter.sort_email_asc')}</option>
            <option value="email_desc">{t('filter.sort_email_desc')}</option>
            <option value="name_asc">{t('filter.sort_name_asc')}</option>
            <option value="role_admin">{t('filter.sort_role_admin_first')}</option>
          </select>
        </div>

        <div className="table-toolbar-right">
          <span id="users-count-badge" className="results-count-badge">
            {countBadgeText}
          </span>
        </div>
      </div>

      {/* Users Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('table.user_id')}</th>
              <th>{t('table.email')}</th>
              <th>{t('table.user_name')}</th>
              <th>{t('table.role')}</th>
              <th>{vi ? 'Doanh nghiệp (Tenant)' : 'Tenant ID'}</th>
              <th>{t('table.created')}</th>
              <th style={{ textAlign: 'right' }}>{t('table.actions')}</th>
            </tr>
          </thead>
          <tbody id="users-table-body">
            {loading ? (
              <tr>
                <td
                  colSpan={7}
                  style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 32 }}
                >
                  {t('users.loading')}
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{ textAlign: 'center', padding: 36, color: 'var(--text-muted)' }}
                >
                  <p style={{ marginBottom: 12 }}>{t('filter.no_matches')}</p>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={clearFilters}
                  >
                    {t('filter.clear_filter')}
                  </button>
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id}>
                  <td>
                    <code
                      className="mono-tag"
                      style={{ fontSize: 11, cursor: 'pointer' }}
                      title={u.id}
                      onClick={() => navigator.clipboard.writeText(u.id)}
                    >
                      {u.id.slice(0, 8)}…
                    </code>
                  </td>
                  <td style={{ fontWeight: 500, color: '#fff' }}>{u.email}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{u.name || '—'}</td>
                  <td>
                    <span
                      className={`nav-user-role ${u.role === 'ADMIN' ? 'role-admin' : ''}`}
                    >
                      {u.role === 'ADMIN' ? t('table.role_admin') : t('table.role_user')}
                    </span>
                  </td>
                  <td>
                    {u.tenantId ? (
                      <code
                        className="mono-tag"
                        style={{ fontSize: 11, cursor: 'pointer' }}
                        title={u.tenantId}
                        onClick={() => navigator.clipboard.writeText(u.tenantId!)}
                      >
                        {u.tenantId.slice(0, 8)}…
                      </code>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                        {vi ? 'Chưa tham gia' : 'None'}
                      </span>
                    )}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString(vi ? 'vi-VN' : 'en-US') : '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => onOpenAssignRole(u)}
                    >
                      {t('table.assign_role')}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
