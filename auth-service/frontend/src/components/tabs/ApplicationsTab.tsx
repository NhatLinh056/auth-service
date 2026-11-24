import React, { useState } from 'react';
import type { Application } from '../../types/application.types';
import type { SanitizedOAuthProvider } from '../../types/provider.types';
import { SelectedAppView } from './SelectedAppView';
import { AppListPage } from '../features/applications/AppListPage';

export interface ApplicationsTabProps {
  applications: Application[];
  loading: boolean;
  onRefresh: () => void;
  onOpenCreateModal: () => void;
  onOpenDetailModal: (app: Application) => void;
  selectedApp?: Application | null;
  onSelectApp?: (app: Application | null) => void;
  onUpdateApp?: (app: Application) => void;
  onOpenConfigureProvider?: (provider: SanitizedOAuthProvider) => void;
}

export const ApplicationsTab: React.FC<ApplicationsTabProps> = ({
  applications,
  loading,
  onRefresh,
  onOpenCreateModal,
  onOpenDetailModal,
  selectedApp,
  onSelectApp,
  onUpdateApp,
  onOpenConfigureProvider,
}) => {
  const [internalSelectedApp, setInternalSelectedApp] = useState<Application | null>(null);
  const currentSelectedApp = selectedApp !== undefined ? selectedApp : internalSelectedApp;

  const handleSelectApp = (app: Application | null) => {
    if (onSelectApp) onSelectApp(app);
    setInternalSelectedApp(app);
  };

  if (currentSelectedApp) {
    return (
      <SelectedAppView
        app={currentSelectedApp}
        onBack={() => handleSelectApp(null)}
        onUpdateApp={(updated) => {
          handleSelectApp(updated);
          if (onUpdateApp) onUpdateApp(updated);
          onRefresh();
        }}
        onDeleteApp={(_id) => {
          handleSelectApp(null);
          onRefresh();
        }}
        onOpenConfigureProvider={onOpenConfigureProvider || (() => {})}
      />
    );
  }

  return (
    <AppListPage
      applications={applications}
      loading={loading}
      onRefresh={onRefresh}
      onOpenCreateModal={onOpenCreateModal}
      onOpenDetailModal={onOpenDetailModal}
      onNavigateToDetail={(appId) => {
        const found = applications.find((a) => a.id === appId);
        if (found) handleSelectApp(found);
      }}
    />
  );
};

export default ApplicationsTab;
