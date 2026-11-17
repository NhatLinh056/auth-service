import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useToast } from '../../../contexts/ToastContext';
import type { Application, AppUser } from '../../../types/application.types';
import { SkeletonTable } from '../../common/SkeletonTable';
import { EmptyState } from '../../common/EmptyState';
import { ConfirmDialog } from '../../common/ConfirmDialog';

export interface AppUsersSubTabProps {
  app: Application;
  appUsers: AppUser[];
  loading: boolean;
  onRefresh: () => void;
  onDeleteAppUser: (appUserId: string) => Promise<void>;
}

export const AppUsersSubTab: React.FC<AppUsersSubTabProps> = ({
  app: _app,
  appUsers,
  loading,
  onRefresh,
  onDeleteAppUser,
}) => {
  const { lang, t } = useLanguage();
  const { showToast } = useToast();

  const [userSearch, setUserSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Search filter
  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return appUsers;
    return appUsers.filter((u) => {
      const name = (u.name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const rawMethod = (u.lastLoginMethod || u.provider || '').toLowerCase();
      return name.includes(q) || email.includes(q) || rawMethod.includes(q);
    });
  }, [appUsers, userSearch]);

  const copyAppUserId = (id: string) => {
    navigator.clipboard
      .writeText(id)
      .then(() => {
        showToast(
          lang === 'vi'
            ? `Đã sao chép AppUser ID: ${id}`
            : `Copied AppUser ID: ${id}`,
          'success'
        );
      })
      .catch(() => {
        showToast('Failed to copy AppUser ID', 'error');
      });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await onDeleteAppUser(deleteTarget.id);
      showToast(
        lang === 'vi'
          ? `Đã xóa người dùng "${deleteTarget.name || deleteTarget.email}" khỏi ứng dụng.`
          : `Removed user "${deleteTarget.name || deleteTarget.email}" from application.`,
        'success'
      );
      setDeleteTarget(null);
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi xóa người dùng khỏi ứng dụng', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div id="app-view-users" style={{ width: '100%' }}>
      {/* Table Card Panel */}
      <div
        className="card"
        style={{
          background: 'var(--bg-surface, #111827)',
          border: '1px solid var(--border-subtle, #1e293b)',
          borderRadius: 8,
          marginBottom: 20,
          overflow: 'hidden',
        }}
      >
        {/* Toolbar Header: Strictly aligned search + refresh + counter */}
        <div
          style={{
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            borderBottom: '1px solid var(--border-subtle, #1e293b)',
          }}
        >
          {/* Left: Search input (280px) and Refresh button side-by-side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative', width: 280 }}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-dim, #64748b)',
                  pointerEvents: 'none',
                }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                id="app-users-search"
                placeholder={lang === 'vi' ? 'Tìm theo email, tên...' : 'Search by email, name...'}
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={{
                  height: 36,
                  paddingLeft: 34,
                  paddingRight: 12,
                  fontSize: 13,
                  background: 'var(--bg-input, #0f172a)',
                  border: '1px solid var(--border-medium, #334155)',
                  color: '#fff',
                  borderRadius: 6,
                  width: '100%',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onRefresh}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                height: 36,
                padding: '0 14px',
                borderRadius: 6,
                whiteSpace: 'nowrap',
              }}
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
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              <span>{lang === 'vi' ? 'Làm mới' : 'Refresh'}</span>
            </button>
          </div>

          {/* Right: Counter badge */}
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--text-muted, #94a3b8)',
              background: 'var(--bg-card, #1e293b)',
              padding: '4px 12px',
              borderRadius: 12,
              border: '1px solid var(--border-subtle, #334155)',
              whiteSpace: 'nowrap',
            }}
          >
            {lang === 'vi'
              ? `Tổng cộng: ${filteredUsers.length} AppUser`
              : `Total: ${filteredUsers.length} AppUsers`}
          </div>
        </div>

        {/* Table */}
        <div className="table-responsive" style={{ overflowX: 'auto', width: '100%' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(15, 23, 42, 0.6)' }}>
                <th style={{ padding: '12px 18px', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-dim, #94a3b8)', borderBottom: '1px solid var(--border-subtle, #1e293b)' }}>
                  {lang === 'vi' ? 'Khách Hàng / Email' : 'User / Email'}
                </th>
                <th style={{ padding: '12px 18px', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-dim, #94a3b8)', borderBottom: '1px solid var(--border-subtle, #1e293b)' }}>
                  {lang === 'vi' ? 'Phương Thức Đăng Nhập' : 'Last Login Method'}
                </th>
                <th style={{ padding: '12px 18px', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-dim, #94a3b8)', borderBottom: '1px solid var(--border-subtle, #1e293b)' }}>
                  {lang === 'vi' ? 'AppUser ID' : 'AppUser ID'}
                </th>
                <th style={{ padding: '12px 18px', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-dim, #94a3b8)', borderBottom: '1px solid var(--border-subtle, #1e293b)' }}>
                  {lang === 'vi' ? 'Ngày Tham Gia' : 'Joined App At'}
                </th>
                <th style={{ padding: '12px 18px', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-dim, #94a3b8)', borderBottom: '1px solid var(--border-subtle, #1e293b)', textAlign: 'right' }}>
                  {t('table.actions')}
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: 0 }}>
                    <SkeletonTable rows={4} columns={5} />
                  </td>
                </tr>
              ) : appUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '36px 20px' }}>
                    <EmptyState
                      title={lang === 'vi' ? 'Chưa có người dùng nào thuộc ứng dụng này' : 'No users found for this application'}
                      description={
                        lang === 'vi'
                          ? 'Khi người dùng đăng nhập vào ứng dụng qua OAuth (Google/Facebook) hoặc tài khoản nền tảng, hồ sơ AppUser của họ sẽ xuất hiện tại đây.'
                          : 'When users sign in to this application via OAuth or centralized login, their AppUser profile will appear here.'
                      }
                    />
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '36px 20px' }}>
                    <EmptyState
                      title={t('filter.no_matches')}
                      description={
                        lang === 'vi'
                          ? 'Không tìm thấy AppUser nào khớp với từ khóa tìm kiếm.'
                          : 'No AppUsers match your search keyword.'
                      }
                      action={
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setUserSearch('')}
                        >
                          {t('filter.clear_filter')}
                        </button>
                      }
                    />
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const rawMethod = (u.lastLoginMethod || u.provider || '').toUpperCase();
                  const isGoogle = rawMethod.includes('GOOGLE');
                  const isFacebook = rawMethod.includes('FACEBOOK');
                  const isPassword = rawMethod.includes('PASSWORD');
                  const isPlatformSession = rawMethod.includes('PLATFORM_SESSION');

                  let displayMethod = lang === 'vi' ? 'Chưa xác định' : 'Unknown';
                  let badgeBg = 'rgba(148, 163, 184, 0.15)';
                  let badgeColor = '#94a3b8';

                  if (isGoogle) {
                    displayMethod = 'Google';
                    badgeBg = 'rgba(234, 67, 53, 0.15)';
                    badgeColor = '#ea4335';
                  } else if (isFacebook) {
                    displayMethod = 'Facebook';
                    badgeBg = 'rgba(24, 119, 242, 0.15)';
                    badgeColor = '#1877f2';
                  } else if (isPassword) {
                    displayMethod = 'Mật khẩu';
                    badgeBg = 'rgba(16, 185, 129, 0.15)';
                    badgeColor = '#10b981';
                  } else if (isPlatformSession) {
                    displayMethod = 'Platform SSO';
                    badgeBg = 'rgba(129, 140, 248, 0.15)';
                    badgeColor = '#818cf8';
                  }

                  const shortId = u.id ? `${u.id.slice(0, 8)}...${u.id.slice(-6)}` : 'N/A';
                  const joinedDate = u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—';

                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle, #1e293b)',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      {/* 1. User / Email */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 600, color: '#fff', fontSize: 13 }}>
                          {u.name || (lang === 'vi' ? 'Khách chưa đặt tên' : 'Unnamed User')}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)', marginTop: 2 }}>
                          {u.email}
                        </div>
                      </td>

                      {/* 2. Login Method */}
                      <td style={{ padding: '14px 18px' }}>
                        <span
                          className="badge"
                          style={{
                            background: badgeBg,
                            color: badgeColor,
                            fontWeight: 600,
                            fontSize: 11,
                            padding: '3px 8px',
                            borderRadius: 4,
                            border: `1px solid ${badgeBg}`,
                          }}
                        >
                          {displayMethod}
                        </span>
                      </td>

                      {/* 3. AppUser ID (Short + Copy) */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <code
                            style={{
                              fontSize: 12,
                              color: '#cbd5e1',
                              background: 'rgba(0, 0, 0, 0.3)',
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontFamily: 'var(--font-mono, monospace)',
                            }}
                            title={u.id}
                          >
                            {shortId}
                          </code>
                          <button
                            type="button"
                            className="btn btn-secondary btn-xs"
                            onClick={() => copyAppUserId(u.id)}
                            title={lang === 'vi' ? 'Sao chép AppUser ID đầy đủ' : 'Copy Full AppUser ID'}
                            style={{ padding: '2px 6px', fontSize: 11 }}
                          >
                            {lang === 'vi' ? 'Copy' : 'Copy'}
                          </button>
                        </div>
                      </td>

                      {/* 4. Joined Date */}
                      <td style={{ padding: '14px 18px', fontSize: 12, color: 'var(--text-muted, #94a3b8)' }}>
                        {joinedDate}
                      </td>

                      {/* 5. Actions (Delete AppUser) */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-danger btn-xs"
                          onClick={() => setDeleteTarget(u)}
                          title={
                            lang === 'vi'
                              ? 'Xóa người dùng khỏi ứng dụng này (không xóa tài khoản platform)'
                              : 'Remove user from this application'
                          }
                          style={{
                            padding: '4px 10px',
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {lang === 'vi' ? 'Xóa khỏi App' : 'Remove'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Delete AppUser Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title={lang === 'vi' ? 'Xác nhận xóa AppUser' : 'Confirm AppUser Removal'}
        message={
          lang === 'vi'
            ? `Bạn có chắc chắn muốn xóa "${deleteTarget?.name || deleteTarget?.email}" khỏi ứng dụng này? Tài khoản người dùng toàn cục trên Auth Service vẫn được bảo toàn an toàn.`
            : `Are you sure you want to remove "${deleteTarget?.name || deleteTarget?.email}" from this application? The platform user account will not be deleted.`
        }
        confirmText={lang === 'vi' ? 'Xóa khỏi ứng dụng' : 'Remove from App'}
        cancelText={lang === 'vi' ? 'Hủy' : 'Cancel'}
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default AppUsersSubTab;
