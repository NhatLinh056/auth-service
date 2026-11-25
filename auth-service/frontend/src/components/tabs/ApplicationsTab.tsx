import React from 'react';
import type { Application } from '../../types/application.types';
import { AppListPage } from '../features/applications/AppListPage';

export interface ApplicationsTabProps {
  applications: Application[];
  loading: boolean;
  onRefresh: () => void;
  onOpenCreateModal: () => void;
  onOpenDetailModal: (app: Application) => void;
}

export const ApplicationsTab: React.FC<ApplicationsTabProps> = ({
  applications,
  loading,
  onRefresh,
  onOpenCreateModal,
  onOpenDetailModal,
}) => {
  return (
    <AppListPage
      applications={applications}
      loading={loading}
      onRefresh={onRefresh}
      onOpenCreateModal={onOpenCreateModal}
      onOpenDetailModal={onOpenDetailModal}
    />
  );
};

export default ApplicationsTab;
