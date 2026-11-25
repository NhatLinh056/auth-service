import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import type { Application } from '../../../types/application.types';
import { DataTable, type Column } from '../../common/DataTable';
import { IconLayers, IconPlus } from '../../common/Icons';

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
        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{app.name}</span>
      ),
    },
    {
      key: 'appId',
      header: t('table.appid'),
      render: (app) => (
        <span className="mono-tag">{app.appId}</span>
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
    <div className="card-panel">
      <div className="panel-header">
        <div className="card-header-left">
          <div className="icon-well">
            <IconLayers size={18} />
          </div>
          <div>
            <h2 className="panel-title">
              {lang === 'vi' ? 'Ứng Dụng Gần Đây' : 'Recent Applications'}
            </h2>
            <p className="card-subtitle">
              {lang === 'vi'
                ? `${applications.length} ứng dụng (${activeApps.length} đang hoạt động)`
                : `${applications.length} applications (${activeApps.length} active)`}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onGoToApps}
          id="appowner-btn-view-all"
        >
          <span>{lang === 'vi' ? 'Xem Tất Cả' : 'View All'}</span>
        </button>
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
              <IconPlus size={14} />
              <span>{lang === 'vi' ? 'Tạo Ứng Dụng Đầu Tiên' : 'Create Your First App'}</span>
            </button>
          )
        }
        onRowClick={(app) => onOpenAppDetail(app)}
      />
    </div>
  );
};

export default AppOwnerOverview;
