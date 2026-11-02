import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './contexts/AuthContext';
import { Navbar, type TabType } from './components/layout/Navbar';
import { AuthScreen } from './components/auth/AuthScreen';
import { ClientSignIn } from './components/auth/ClientSignIn';
import { ToastContainer } from './components/common/ToastContainer';
import { OverviewTab } from './components/tabs/OverviewTab';
import { ApplicationsTab } from './components/tabs/ApplicationsTab';
import { UsersTab } from './components/tabs/UsersTab';
import { ProvidersTab } from './components/tabs/ProvidersTab';
import { AccountTab } from './components/tabs/AccountTab';
import { TenantsTab } from './components/tabs/TenantsTab';
import { CreateAppModal } from './components/modals/CreateAppModal';
import { AppDetailModal } from './components/modals/AppDetailModal';
import { AssignRoleModal } from './components/modals/AssignRoleModal';
import { ProviderModal } from './components/modals/ProviderModal';

import { applicationsService } from './services/applications.service';
import { usersService } from './services/users.service';
import { providersService } from './services/providers.service';

import type { Application } from './types/application.types';
import type { User } from './types/auth.types';
import type { SanitizedOAuthProvider } from './types/provider.types';

export const App: React.FC = () => {
  const { isAuthenticated, isAdmin, token } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>(window.location.hash === '#account' ? 'account' : 'overview');

  // Application state
  const [applications, setApplications] = useState<Application[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);

  // Users state (Admin)
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Providers state
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [providers, setProviders] = useState<SanitizedOAuthProvider[]>([]);
  const [providersLoading, setProvidersLoading] = useState(false);

  // Modals state
  const [isCreateAppOpen, setIsCreateAppOpen] = useState(false);
  const [detailApp, setDetailApp] = useState<Application | null>(null);
  const [assignRoleUser, setAssignRoleUser] = useState<User | null>(null);
  const [editProvider, setEditProvider] = useState<SanitizedOAuthProvider | null>(null);

  // Load applications
  const loadApplications = useCallback(async () => {
    if (!token) return;
    setAppsLoading(true);
    try {
      const data = await applicationsService.findAll();
      setApplications(data);
      if (data.length > 0 && !selectedAppId) {
        setSelectedAppId(data[0].id);
      }
    } catch {
      // Handled in service or empty
    } finally {
      setAppsLoading(false);
    }
  }, [token, selectedAppId]);

  // Load users
  const loadUsers = useCallback(async () => {
    if (!token || !isAdmin) return;
    setUsersLoading(true);
    try {
      const data = await usersService.getAll();
      setUsers(data);
    } catch {
      // Handled in service or empty
    } finally {
      setUsersLoading(false);
    }
  }, [token, isAdmin]);

  // Load providers for selected app
  const loadProviders = useCallback(async (appId?: string) => {
    const targetAppId = appId || selectedAppId;
    if (!token || !targetAppId) return;
    setProvidersLoading(true);
    try {
      const data = await providersService.findAllByApplication(targetAppId);
      setProviders(data);
    } catch {
      setProviders([]);
    } finally {
      setProvidersLoading(false);
    }
  }, [token, selectedAppId]);

  // Fetch initial data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadApplications();
    } else {
      setApplications([]);
      setUsers([]);
      setProviders([]);
      setSelectedAppId(null);
      setActiveTab(window.location.hash === '#account' ? 'account' : 'overview');
    }
  }, [isAuthenticated, loadApplications]);

  // Tab switching effect
  useEffect(() => {
    if (!isAuthenticated) return;
    if (activeTab === 'users' && isAdmin) {
      loadUsers();
    } else if (activeTab === 'providers' && selectedAppId) {
      loadProviders(selectedAppId);
    } else if (activeTab === 'apps' || activeTab === 'overview') {
      loadApplications();
    }
  }, [activeTab, isAuthenticated, isAdmin, selectedAppId, loadUsers, loadProviders, loadApplications]);

  // Handlers
  const handleSelectAppForProviders = (appId: string) => {
    setSelectedAppId(appId);
    loadProviders(appId);
  };

  const handleGoToProviders = (appId: string) => {
    setSelectedAppId(appId);
    setActiveTab('providers');
    loadProviders(appId);
  };

  const handleCreateAppSuccess = (newApp: Application) => {
    setIsCreateAppOpen(false);
    setApplications(prev => [newApp, ...prev]);
    setSelectedAppId(newApp.id);
    setDetailApp(newApp);
  };

  const handleUpdateApp = (updated: Application) => {
    setApplications(prev => prev.map(a => (a.id === updated.id ? updated : a)));
    if (detailApp?.id === updated.id) {
      setDetailApp(updated);
    }
  };

  const handleAssignRoleSuccess = (updatedUser: User) => {
    setUsers(prev => prev.map(u => (u.id === updatedUser.id ? updatedUser : u)));
  };

  const handleProviderSaved = (updated: SanitizedOAuthProvider) => {
    setProviders(prev => prev.map(p => (p.provider === updated.provider ? updated : p)));
  };

  const flowId = new URLSearchParams(window.location.search).get('signin');
  if (flowId) return <ClientSignIn flowId={flowId} />;

  if (!isAuthenticated) {
    return (
      <>
        <AuthScreen />
        <ToastContainer />
      </>
    );
  }

  return (
    <div id="app-shell">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="main-content">
        {activeTab === 'account' && <AccountTab />}
        {activeTab === 'tenants' && <TenantsTab />}
        {activeTab === 'overview' && (
          <OverviewTab
            applications={applications}
            onGoToApps={() => setActiveTab('apps')}
            onOpenAppDetail={setDetailApp}
          />
        )}

        {activeTab === 'apps' && (
          <ApplicationsTab
            applications={applications}
            loading={appsLoading}
            onRefresh={loadApplications}
            onOpenCreateModal={() => setIsCreateAppOpen(true)}
            onOpenDetailModal={setDetailApp}
            onGoToProviders={handleGoToProviders}
          />
        )}

        {activeTab === 'users' && isAdmin && (
          <UsersTab
            users={users}
            loading={usersLoading}
            onRefresh={loadUsers}
            onOpenAssignRole={setAssignRoleUser}
          />
        )}

        {activeTab === 'providers' && (
          <ProvidersTab
            applications={applications}
            selectedAppId={selectedAppId}
            onSelectApp={handleSelectAppForProviders}
            providers={providers}
            loading={providersLoading}
            onRefresh={() => loadProviders()}
            onOpenConfigure={setEditProvider}
            onOpenAppDetail={setDetailApp}
          />
        )}
      </main>

      {/* Modals */}
      <CreateAppModal
        isOpen={isCreateAppOpen}
        onClose={() => setIsCreateAppOpen(false)}
        onSuccess={handleCreateAppSuccess}
      />

      <AppDetailModal
        app={detailApp}
        isOpen={Boolean(detailApp)}
        onClose={() => setDetailApp(null)}
        onUpdateApp={handleUpdateApp}
      />

      <AssignRoleModal
        user={assignRoleUser}
        isOpen={Boolean(assignRoleUser)}
        onClose={() => setAssignRoleUser(null)}
        onSuccess={handleAssignRoleSuccess}
      />

      <ProviderModal
        applicationId={selectedAppId}
        provider={editProvider}
        isOpen={Boolean(editProvider)}
        onClose={() => setEditProvider(null)}
        onSuccess={handleProviderSaved}
      />

      <ToastContainer />
    </div>
  );
};

export default App;
