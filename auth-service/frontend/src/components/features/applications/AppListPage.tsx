import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useToast } from '../../../contexts/ToastContext';
import type { Application, ApplicationStatus } from '../../../types/application.types';
import { Pagination } from '../../common/Pagination';
import { SkeletonTable } from '../../common/SkeletonTable';
import { EmptyState } from '../../common/EmptyState';

export interface AppListPageProps {
  applications: Application[];
  loading: boolean;
  onRefresh: () => void;
  onOpenCreateModal: () => void;
  onOpenDetailModal?: (app: Application) => void;
  onNavigateToDetail?: (appId: string) => void;
}

export const AppListPage: React.FC<AppListPageProps> = ({
  applications,
  loading,
  onRefresh: _onRefresh,
  onOpenCreateModal,
  onOpenDetailModal,
  onNavigateToDetail,
}) => {
  const { user, isAdmin } = useAuth();
  const { lang, t } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Search & Filters state
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'ALL' | 'MINE'>(isAdmin ? 'ALL' : 'MINE');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ApplicationStatus>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name_asc' | 'name_desc'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter & Sort computation
  const filteredApplications = useMemo(() => {
    let list = [...applications];

    // 1. Super Admin View Mode Filter
    if (isAdmin && viewMode === 'MINE') {
      const myId = user?.id;
      const myEmail = user?.email?.toLowerCase();
      list = list.filter((app) => {
        return (
          app.userId === myId ||
          app.user?.id === myId ||
          (myEmail && app.user?.email?.toLowerCase() === myEmail)
        );
      });
    }

    // 2. Search query (matches name, appId, owner email, owner name)
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((app) => {
        const name = (app.name || '').toLowerCase();
        const appId = (app.appId || '').toLowerCase();
        const ownerEmail = (app.user?.email || '').toLowerCase();
        const ownerName = (app.user?.name || '').toLowerCase();
        return (
          name.includes(q) ||
          appId.includes(q) ||
          ownerEmail.includes(q) ||
          ownerName.includes(q)
        );
      });
    }

    // 3. Status filter
    if (statusFilter !== 'ALL') {
      list = list.filter((app) => app.status === statusFilter);
    }

    // 4. Sorting
    list.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'name_desc') return (b.name || '').localeCompare(a.name || '');
      return 0;
    });

    return list;
  }, [applications, isAdmin, viewMode, user, search, statusFilter, sortBy]);

  // Paginated slice
  const paginatedApplications = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredApplications.slice(start, start + pageSize);
  }, [filteredApplications, currentPage, pageSize]);

  const clearFilters = () => {
    setSearch('');
    if (isAdmin) setViewMode('ALL');
    setStatusFilter('ALL');
    setSortBy('newest');
    setCurrentPage(1);
  };

  const copyAppId = (appId: string) => {
    navigator.clipboard
      .writeText(appId)
      .then(() => {
        showToast(`${t('toasts.copied')} AppID ${t('toasts.to_clipboard')}`, 'success');
      })
      .catch(() => {
        showToast('Failed to copy AppID', 'error');
      });
  };

  const handleOpenDetail = (app: Application) => {
    if (onNavigateToDetail) {
      onNavigateToDetail(app.id);
    } else {
      navigate(`/console/applications/${app.id}`);
    }
    if (onOpenDetailModal) {
      onOpenDetailModal(app);
    }
  };

  return (
    <div className="tab-content active" id="tab-apps-list" style={{ width: '100%' }}>
      {/* 1. Page Header */}
      <div
        className="page-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h1 className="page-title" style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, color: '#fff' }}>
            {lang === 'vi' ? 'Danh Sách Ứng Dụng' : 'Platform Applications'}
          </h1>
          <p className="page-subtitle" style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
            {lang === 'vi'
              ? 'Quản lý các microservice và client application tích hợp vào hệ thống xác thực tập trung.'
              : 'Manage client applications and microservices integrated into the centralized auth system.'}
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={onOpenCreateModal}
          id="btn-create-app-top"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>{t('apps.create_btn')}</span>
        </button>
      </div>

      {/* 2. Search & Filter Card Panel (Scene 2 Layout) */}
      <div
        className="card"
        style={{
          background: 'var(--bg-surface, #111827)',
          border: '1px solid var(--border-subtle, #1e293b)',
          borderRadius: 8,
          marginBottom: 20,
        }}
      >
        <div
          className="panel-header"
          style={{
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
            borderBottom: '1px solid var(--border-subtle, #1e293b)',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
            {/* Search input with strictly bounded width & box-sizing */}
            <div style={{ position: 'relative', width: 190, minWidth: 150, flexShrink: 0, boxSizing: 'border-box' }}>
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{
                  position: 'absolute',
                  left: 9,
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
                id="apps-search-input"
                className="form-control"
                placeholder={lang === 'vi' ? 'Tìm theo tên, AppID...' : 'Search name, AppID...'}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  paddingLeft: 28,
                  paddingRight: 8,
                  height: 32,
                  fontSize: 12,
                  boxSizing: 'border-box',
                  background: 'var(--bg-input, #0f172a)',
                  border: '1px solid var(--border-medium, #334155)',
                  color: '#fff',
                  borderRadius: 6,
                  width: '100%',
                }}
              />
            </div>

            {/* Super Admin View Mode Filter (Only when isAdmin === true) */}
            {isAdmin && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0, whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: 11, color: 'var(--text-dim, #94a3b8)', whiteSpace: 'nowrap' }}>
                  {t('filter.view_mode')}
                </span>
                <select
                  id="apps-view-mode-filter"
                  className="filter-select"
                  value={viewMode}
                  onChange={(e) => {
                    setViewMode(e.target.value as 'ALL' | 'MINE');
                    setCurrentPage(1);
                  }}
                  style={{
                    height: 32,
                    fontSize: 11,
                    boxSizing: 'border-box',
                    background: 'var(--bg-input, #0f172a)',
                    border: '1px solid var(--border-medium, #334155)',
                    color: '#fff',
                    borderRadius: 6,
                    padding: '0 6px',
                    cursor: 'pointer',
                  }}
                >
                  <option value="ALL">{t('filter.view_mode_all')}</option>
                  <option value="MINE">{t('filter.view_mode_mine')}</option>
                </select>
              </div>
            )}

            {/* Status Filter */}
            <select
              id="apps-status-filter"
              className="filter-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              style={{
                height: 32,
                fontSize: 11,
                boxSizing: 'border-box',
                background: 'var(--bg-input, #0f172a)',
                border: '1px solid var(--border-medium, #334155)',
                color: '#fff',
                borderRadius: 6,
                padding: '0 6px',
                flexShrink: 0,
                cursor: 'pointer',
              }}
            >
              <option value="ALL">{t('filter.all_statuses')}</option>
              <option value="ACTIVE">{t('filter.status_active')}</option>
              <option value="INACTIVE">{t('filter.status_inactive')}</option>
            </select>

            {/* Sort Filter */}
            <select
              id="apps-sort-by"
              className="filter-select"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as any);
                setCurrentPage(1);
              }}
              style={{
                height: 32,
                fontSize: 11,
                boxSizing: 'border-box',
                background: 'var(--bg-input, #0f172a)',
                border: '1px solid var(--border-medium, #334155)',
                color: '#fff',
                borderRadius: 6,
                padding: '0 6px',
                flexShrink: 0,
                cursor: 'pointer',
              }}
            >
              <option value="newest">{t('filter.sort_newest')}</option>
              <option value="oldest">{t('filter.sort_oldest')}</option>
              <option value="name_asc">{t('filter.sort_name_asc')}</option>
              <option value="name_desc">{t('filter.sort_name_desc')}</option>
            </select>

            {/* Clear Filter button if filters are active */}
            {(search || statusFilter !== 'ALL' || (isAdmin && viewMode !== 'ALL') || sortBy !== 'newest') && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={clearFilters}
                style={{
                  height: 32,
                  fontSize: 11,
                  padding: '0 6px',
                  borderRadius: 6,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  boxSizing: 'border-box',
                  color: 'var(--text-dim, #94a3b8)',
                }}
                title={t('filter.clear_filter')}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                <span>{t('filter.clear_filter')}</span>
              </button>
            )}
          </div>

          {/* Result Count Indicator aligned right */}
          <div
            id="apps-count-indicator"
            style={{
              fontSize: 12,
              color: 'var(--text-dim, #94a3b8)',
              whiteSpace: 'nowrap',
              marginLeft: 'auto',
            }}
          >
            {lang === 'vi'
              ? `Hiển thị ${filteredApplications.length} / ${applications.length} ứng dụng`
              : `Showing ${filteredApplications.length} of ${applications.length} apps`}
          </div>
        </div>

        {/* 3. Applications Table */}
        <div className="table-responsive" style={{ overflowX: 'auto', width: '100%' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-dim, #64748b)', borderBottom: '1px solid var(--border-subtle, #1e293b)', width: '22%' }}>
                  {t('table.app_name')}
                </th>
                <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-dim, #64748b)', borderBottom: '1px solid var(--border-subtle, #1e293b)', width: '24%' }}>
                  {t('table.appid')}
                </th>
                <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-dim, #64748b)', borderBottom: '1px solid var(--border-subtle, #1e293b)', width: '20%' }}>
                  {t('table.owner')}
                </th>
                <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-dim, #64748b)', borderBottom: '1px solid var(--border-subtle, #1e293b)', width: '12%' }}>
                  {t('table.status')}
                </th>
                <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-dim, #64748b)', borderBottom: '1px solid var(--border-subtle, #1e293b)', width: '10%' }}>
                  {t('table.created')}
                </th>
                <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-dim, #64748b)', borderBottom: '1px solid var(--border-subtle, #1e293b)', width: '12%', textAlign: 'right' }}>
                  {t('table.actions')}
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 0 }}>
                    <SkeletonTable rows={4} columns={6} />
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 0 }}>
                    <EmptyState
                      title={t('apps.empty')}
                      description={
                        lang === 'vi'
                          ? 'Tạo ứng dụng đầu tiên để nhận AppID và thiết lập xác thực cho microservice của bạn.'
                          : 'Create your first application to generate AppID and configure microservice auth.'
                      }
                      action={
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={onOpenCreateModal}
                        >
                          {t('apps.create_btn')}
                        </button>
                      }
                    />
                  </td>
                </tr>
              ) : filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 0 }}>
                    <EmptyState
                      title={t('filter.no_matches')}
                      description={
                        lang === 'vi'
                          ? 'Không tìm thấy ứng dụng nào khớp với bộ lọc hoặc từ khóa tìm kiếm.'
                          : 'No applications match your active search keyword or filter.'
                      }
                      action={
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={clearFilters}
                        >
                          {t('filter.clear_filter')}
                        </button>
                      }
                    />
                  </td>
                </tr>
              ) : (
                paginatedApplications.map((app) => {
                  const isActive = app.status === 'ACTIVE';
                  const createdDate = app.createdAt
                    ? new Date(app.createdAt).toISOString().split('T')[0]
                    : '—';
                  const ownerEmail = app.user?.email || '—';
                  const isMine =
                    app.userId === user?.id ||
                    app.user?.id === user?.id ||
                    (user?.email && app.user?.email === user?.email);

                  return (
                    <tr
                      key={app.id}
                      style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                      onClick={() => handleOpenDetail(app)}
                      className="app-row"
                    >
                      {/* Name & Note */}
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-subtle, #1e293b)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong
                            style={{ color: '#fff', fontSize: 13, cursor: 'pointer' }}
                            title={app.name}
                          >
                            {app.name}
                          </strong>
                          <span style={{ fontSize: 11, color: 'var(--text-dim, #64748b)', marginTop: 2 }}>
                            {lang === 'vi' ? 'Cổng xác thực microservice' : 'Microservice auth client'}
                          </span>
                        </div>
                      </td>

                      {/* AppID with Copy */}
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-subtle, #1e293b)' }}>
                        <span className="mono-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <code style={{ fontSize: 12 }}>{app.appId}</code>
                          <button
                            type="button"
                            className="btn-icon"
                            style={{
                              width: 20,
                              height: 20,
                              padding: 0,
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-dim, #64748b)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title={t('table.copy_appid')}
                            onClick={(e) => {
                              e.stopPropagation();
                              copyAppId(app.appId);
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                          </button>
                        </span>
                      </td>

                      {/* Owner Email & isMine Pill */}
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-subtle, #1e293b)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                          <span
                            style={{
                              fontSize: 12,
                              color: 'var(--text-muted, #94a3b8)',
                              maxWidth: 150,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={ownerEmail}
                          >
                            {ownerEmail}
                          </span>
                          {isMine && (
                            <span
                              className="badge badge-info"
                              style={{ fontSize: 10, padding: '1px 5px', flexShrink: 0 }}
                            >
                              {t('filter.you_tag')}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-subtle, #1e293b)' }}>
                        <span className={`badge ${isActive ? 'badge-success' : 'badge-danger'}`}>
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: isActive ? 'var(--success, #10b981)' : 'var(--danger, #ef4444)',
                            }}
                          />
                          {isActive ? t('table.status_active') : t('table.status_inactive')}
                        </span>
                      </td>

                      {/* Created date */}
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-subtle, #1e293b)', fontSize: 12, color: 'var(--text-dim, #64748b)', whiteSpace: 'nowrap' }}>
                        {createdDate}
                      </td>

                      {/* Action */}
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-subtle, #1e293b)', textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(app);
                          }}
                          id={`btn-manage-app-${app.id}`}
                          style={{
                            height: 28,
                            padding: '0 8px',
                            fontSize: 11,
                            borderRadius: 6,
                            whiteSpace: 'nowrap',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                          }}
                        >
                          {t('filter.manage_app')}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Pagination */}
        {filteredApplications.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredApplications.length}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 50]}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(sz) => {
              setPageSize(sz);
              setCurrentPage(1);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default AppListPage;
