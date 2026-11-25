import React from 'react';
import type { Application } from '../../types/application.types';
import { AppListPage } from '../features/applications/AppListPage';

export interface ApplicationsTabProps {
  applications: Application[];
  loading: boolean;
  error?: string | null;
  onRefresh: () => void;
  onOpenCreateModal: () => void;
  onOpenDetailModal: (app: Application) => void;
}

export const ApplicationsTab: React.FC<ApplicationsTabProps> = ({
  applications,
  loading,
  error,
  onRefresh,
  onOpenCreateModal,
  onOpenDetailModal,
}) => {
  return (
    <AppListPage
      applications={applications}
      loading={loading}
      error={error}
      onRefresh={onRefresh}
      onOpenCreateModal={onOpenCreateModal}
      onOpenDetailModal={onOpenDetailModal}
    />
  );
};

export default ApplicationsTab;
