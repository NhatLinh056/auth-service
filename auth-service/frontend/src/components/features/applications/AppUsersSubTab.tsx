import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useToast } from '../../../contexts/ToastContext';
import type { Application, AppUser } from '../../../types/application.types';
import { SkeletonTable } from '../../common/SkeletonTable';
import { EmptyState } from '../../common/EmptyState';
import { ConfirmDialog } from '../../common/ConfirmDialog';
import { IconCopy, IconRefresh, IconSearch } from '../../common/Icons';

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
    <div id="app-view-users" className="page-container">
      {/* Table Card Panel */}
      <div className="card-panel">
        {/* Toolbar Header */}
        <div className="toolbar-row">
          <div className="toolbar-controls">
            <div className="search-box">
              <IconSearch size={14} />
              <input
                type="text"
                id="app-users-search"
                className="search-input"
                placeholder={lang === 'vi' ? 'Tìm theo email, tên...' : 'Search by email, name...'}
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onRefresh}
              disabled={loading}
            >
              <IconRefresh size={14} style={{ animation: loading ? 'spin 1s linear infinite' : undefined }} />
              <span>{lang === 'vi' ? 'Làm mới' : 'Refresh'}</span>
            </button>
          </div>

          <span className="results-count-badge">
            {lang === 'vi'
              ? `Tổng cộng: ${filteredUsers.length} AppUser`
              : `Total: ${filteredUsers.length} AppUsers`}
          </span>
        </div>

        {/* Table */}
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>{lang === 'vi' ? 'Khách Hàng / Email' : 'User / Email'}</th>
                <th>{lang === 'vi' ? 'Phương Thức Đăng Nhập' : 'Last Login Method'}</th>
                <th>AppUser ID</th>
                <th>{lang === 'vi' ? 'Ngày Tham Gia' : 'Joined App At'}</th>
                <th style={{ textAlign: 'right' }}>{t('table.actions')}</th>
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
                  let badgeClass = 'badge-neutral';

                  if (isGoogle) {
                    displayMethod = 'Google';
                    badgeClass = 'badge-danger';
                  } else if (isFacebook) {
                    displayMethod = 'Facebook';
                    badgeClass = 'badge-info';
                  } else if (isPassword) {
                    displayMethod = lang === 'vi' ? 'Mật khẩu' : 'Password';
                    badgeClass = 'badge-success';
                  } else if (isPlatformSession) {
                    displayMethod = 'Platform SSO';
                    badgeClass = 'badge-primary';
                  }

                  const shortId = u.id ? `${u.id.slice(0, 8)}...${u.id.slice(-6)}` : 'N/A';
                  const joinedDate = u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—';

                  return (
                    <tr key={u.id}>
                      {/* 1. User / Email */}
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 13 }}>
                          {u.name || (lang === 'vi' ? 'Khách chưa đặt tên' : 'Unnamed User')}
                        </div>
                        <div className="form-hint" style={{ marginTop: 2 }}>
                          {u.email}
                        </div>
                      </td>

                      {/* 2. Login Method */}
                      <td>
                        <span className={`badge ${badgeClass}`}>{displayMethod}</span>
                      </td>

                      {/* 3. AppUser ID (Short + Copy) */}
                      <td>
                        <div className="inline-code-row">
                          <code className="mono-tag" title={u.id}>
                            {shortId}
                          </code>
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => copyAppUserId(u.id)}
                            title={lang === 'vi' ? 'Sao chép AppUser ID đầy đủ' : 'Copy Full AppUser ID'}
                            aria-label={lang === 'vi' ? 'Sao chép AppUser ID đầy đủ' : 'Copy Full AppUser ID'}
                          >
                            <IconCopy size={13} />
                          </button>
                        </div>
                      </td>

                      {/* 4. Joined Date */}
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {joinedDate}
                      </td>

                      {/* 5. Actions (Delete AppUser) */}
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-danger btn-xs"
                          onClick={() => setDeleteTarget(u)}
                          title={
                            lang === 'vi'
                              ? 'Xóa người dùng khỏi ứng dụng này (không xóa tài khoản platform)'
                              : 'Remove user from this application'
                          }
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
