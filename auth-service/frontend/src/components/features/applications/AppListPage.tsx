import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useToast } from '../../../contexts/ToastContext';
import type { Application, ApplicationStatus } from '../../../types/application.types';
import { Pagination } from '../../common/Pagination';
import { SkeletonTable } from '../../common/SkeletonTable';
import { EmptyState } from '../../common/EmptyState';
import { IconAlertTriangle, IconCopy, IconPlus, IconRefresh, IconSearch, IconX } from '../../common/Icons';

export interface AppListPageProps {
  applications: Application[];
  loading: boolean;
  error?: string | null;
  onRefresh: () => void;
  onOpenCreateModal: () => void;
  onOpenDetailModal?: (app: Application) => void;
}

export const AppListPage: React.FC<AppListPageProps> = ({
  applications,
  loading,
  error,
  onRefresh,
  onOpenCreateModal,
  onOpenDetailModal,
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
    if (onOpenDetailModal) {
      onOpenDetailModal(app);
    } else {
      navigate(`/console/applications/${app.id}`);
    }
  };

  return (
    <div className="tab-content active page-container" id="tab-apps-list">
      {/* 1. Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {lang === 'vi' ? 'Danh Sách Ứng Dụng' : 'Platform Applications'}
          </h1>
          <p className="page-subtitle">
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
        >
          <IconPlus size={15} />
          <span>{t('apps.create_btn')}</span>
        </button>
      </div>

      {error && (
        <div className="error-alert" role="alert" id="apps-load-error">
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
            <span>{lang === 'vi' ? 'Thử lại' : 'Retry'}</span>
          </button>
        </div>
      )}

      {/* 2. Search & Filter Card Panel */}
      <div className="card-panel">
        <div className="toolbar-row">
          <div className="toolbar-controls">
            {/* Search input */}
            <div className="search-box">
              <IconSearch size={14} />
              <input
                type="text"
                id="apps-search-input"
                className="search-input"
                placeholder={lang === 'vi' ? 'Tìm theo tên, AppID...' : 'Search name, AppID...'}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Super Admin View Mode Filter (Only when isAdmin === true) */}
            {isAdmin && (
              <div className="inline-code-row">
                <label htmlFor="apps-view-mode-filter" className="form-hint" style={{ marginTop: 0, whiteSpace: 'nowrap' }}>
                  {t('filter.view_mode')}
                </label>
                <select
                  id="apps-view-mode-filter"
                  className="filter-select"
                  value={viewMode}
                  onChange={(e) => {
                    setViewMode(e.target.value as 'ALL' | 'MINE');
                    setCurrentPage(1);
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
              aria-label={t('filter.all_statuses')}
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
              aria-label={t('filter.sort_newest')}
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
                title={t('filter.clear_filter')}
              >
                <IconX size={12} />
                <span>{t('filter.clear_filter')}</span>
              </button>
            )}
          </div>

          {/* Result Count Indicator */}
          <div id="apps-count-indicator" className="results-count-badge">
            {lang === 'vi'
              ? `Hiển thị ${filteredApplications.length} / ${applications.length} ứng dụng`
              : `Showing ${filteredApplications.length} of ${applications.length} apps`}
          </div>
        </div>

        {/* 3. Applications Table */}
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '22%' }}>{t('table.app_name')}</th>
                <th style={{ width: '24%' }}>{t('table.appid')}</th>
                <th style={{ width: '20%' }}>{t('table.owner')}</th>
                <th style={{ width: '12%' }}>{t('table.status')}</th>
                <th style={{ width: '10%' }}>{t('table.created')}</th>
                <th style={{ width: '12%', textAlign: 'right' }}>{t('table.actions')}</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 0 }}>
                    <SkeletonTable rows={4} columns={6} />
                  </td>
                </tr>
              ) : error && applications.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 0 }}>
                    <EmptyState
                      title={lang === 'vi' ? 'Không thể tải danh sách ứng dụng' : 'Unable to load applications'}
                      description={error}
                      action={
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={onRefresh}
                        >
                          <IconRefresh size={13} />
                          <span>{lang === 'vi' ? 'Thử lại' : 'Retry'}</span>
                        </button>
                      }
                    />
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
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleOpenDetail(app)}
                      className="app-row clickable-row"
                    >
                      {/* Name & Note */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong style={{ color: 'var(--text-main)', fontSize: 13 }} title={app.name}>
                            {app.name}
                          </strong>
                          <span className="form-hint" style={{ marginTop: 2 }}>
                            {lang === 'vi' ? 'Cổng xác thực microservice' : 'Microservice auth client'}
                          </span>
                        </div>
                      </td>

                      {/* AppID with Copy */}
                      <td>
                        <span className="mono-tag">
                          <code>{app.appId}</code>
                          <button
                            type="button"
                            className="btn-icon"
                            title={t('table.copy_appid')}
                            aria-label={t('table.copy_appid')}
                            onClick={(e) => {
                              e.stopPropagation();
                              copyAppId(app.appId);
                            }}
                          >
                            <IconCopy size={13} />
                          </button>
                        </span>
                      </td>

                      {/* Owner Email & isMine Pill */}
                      <td>
                        <div className="inline-code-row" style={{ minWidth: 0 }}>
                          <span
                            style={{
                              fontSize: 12,
                              color: 'var(--text-muted)',
                              maxWidth: 160,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={ownerEmail}
                          >
                            {ownerEmail}
                          </span>
                          {isMine && (
                            <span className="badge badge-info">
                              {t('filter.you_tag')}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`badge ${isActive ? 'badge-success' : 'badge-danger'}`}>
                          {isActive ? t('table.status_active') : t('table.status_inactive')}
                        </span>
                      </td>

                      {/* Created date */}
                      <td style={{ fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                        {createdDate}
                      </td>

                      {/* Action */}
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(app);
                          }}
                          id={`btn-manage-app-${app.id}`}
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
