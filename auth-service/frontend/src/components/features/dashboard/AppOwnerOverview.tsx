import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import type { Application } from '../../../types/application.types';
import { DataTable, type Column } from '../../common/DataTable';

interface AppOwnerOverviewProps {
  applications: Application[];
  loading: boolean;
  onGoToApps: () => void;
  onOpenAppDetail: (app: Application) => void;
  onOpenCreateApp?: () => void;
}

export const AppOwnerOverview: React.FC<AppOwnerOverviewProps> = ({
  applications,
  loading,
  onGoToApps,
  onOpenAppDetail,
  onOpenCreateApp,
}) => {
  const { lang, t } = useLanguage();

  const recentApps = applications.slice(0, 5);
  const activeApps = applications.filter((a) => a.status === 'ACTIVE');

  const columns: Column<Application>[] = [
    {
      key: 'name',
      header: t('table.app_name'),
      render: (app) => (
        <span style={{ fontWeight: 600, color: '#fff' }}>{app.name}</span>
      ),
    },
    {
      key: 'appId',
      header: t('table.appid'),
      render: (app) => (
        <span className="mono-tag" style={{ fontSize: 12 }}>{app.appId}</span>
      ),
    },
    {
      key: 'status',
      header: t('table.status'),
      render: (app) => {
        const isActive = app.status === 'ACTIVE';
        return (
          <span className={`status-indicator ${isActive ? 'active' : 'inactive'}`}>
            {isActive ? t('table.status_active') : t('table.status_inactive')}
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      header: t('table.created'),
      render: (app) => (
        <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>
          {app.createdAt ? new Date(app.createdAt).toISOString().split('T')[0] : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: lang === 'vi' ? 'Thao tác' : 'Actions',
      align: 'right',
      render: (app) => (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => onOpenAppDetail(app)}
        >
          {lang === 'vi' ? 'Chi tiết' : 'Details'}
        </button>
      ),
    },
  ];

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
              background: 'rgba(79, 70, 229, 0.15)',
              color: '#818cf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <h2 className="card-title" style={{ margin: 0, fontSize: 16 }}>
              {lang === 'vi' ? 'Ứng Dụng Đã Tạo (Client Applications)' : 'Client Applications'}
            </h2>
            <p className="card-subtitle" style={{ fontSize: 13, color: 'var(--text-dim)', margin: '2px 0 0' }}>
              {lang === 'vi'
                ? `Bạn đang sở hữu ${applications.length} ứng dụng (${activeApps.length} đang hoạt động)`
                : `You own ${applications.length} applications (${activeApps.length} active)`}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {onOpenCreateApp && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onOpenCreateApp}
              id="appowner-btn-create"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 4 }}>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>{lang === 'vi' ? 'Tạo Ứng Dụng Mới' : 'New App'}</span>
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onGoToApps}
            id="appowner-btn-view-all"
          >
            <span>{lang === 'vi' ? 'Xem Tất Cả →' : 'View All →'}</span>
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={recentApps}
        keyExtractor={(app) => app.id}
        loading={loading}
        emptyTitle={lang === 'vi' ? 'Bạn chưa tạo ứng dụng client nào.' : 'No applications found.'}
        emptyDescription={
          lang === 'vi'
            ? 'Hãy tạo ứng dụng đầu tiên để sinh cặp định danh AppID và AppToken kết nối microservice.'
            : 'Create your first application to generate credentials.'
        }
        emptyAction={
          onOpenCreateApp && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onOpenCreateApp}
            >
              {lang === 'vi' ? '+ Tạo Ứng Dụng Đầu Tiên' : '+ Create Your First App'}
            </button>
          )
        }
        onRowClick={(app) => onOpenAppDetail(app)}
      />
    </div>
  );
};

export default AppOwnerOverview;
