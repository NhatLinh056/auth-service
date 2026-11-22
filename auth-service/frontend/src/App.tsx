import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { AuthScreen } from './components/auth/AuthScreen';
import { ClientSignIn } from './components/auth/ClientSignIn';
import { ToastContainer } from './components/common/ToastContainer';
import { AppShell } from './components/layout/AppShell';
import { RoleDashboard } from './components/features/dashboard/RoleDashboard';
import { AppDetailPage } from './components/features/applications/AppDetailPage';
import { ApplicationsTab } from './components/tabs/ApplicationsTab';
import { QuickstartPage } from './components/features/quickstart/QuickstartPage';
import { UsersTab } from './components/tabs/UsersTab';
import { MyAccountPage } from './components/features/account/MyAccountPage';
import { MyTenantPage } from './components/features/my-tenant/MyTenantPage';
import { AdminTenantsPage } from './components/features/admin/AdminTenantsPage';
import { CreateAppModal } from './components/modals/CreateAppModal';
import { AssignRoleModal } from './components/modals/AssignRoleModal';
import { ProviderModal } from './components/modals/ProviderModal';

import { applicationsService } from './services/applications.service';
import { usersService } from './services/users.service';

import type { Application } from './types/application.types';
import type { User } from './types/auth.types';
import type { SanitizedOAuthProvider } from './types/provider.types';

// Backward compatibility: detect legacy #account hash and redirect to /console/account
const HashRedirect: React.FC = () => {
  const navigate = useNavigate();
  useEffect(() => {
    if (window.location.hash === '#account') {
      window.location.hash = '';
      navigate('/console/account', { replace: true });
    }
  }, [navigate]);
  return null;
};

// 403 Forbidden View for unauthorized routes
const ForbiddenView: React.FC = () => (
  <div style={{ padding: '32px 0' }}>
    <div className="card" style={{ maxWidth: 640, borderLeft: '4px solid var(--danger)' }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px', color: 'var(--danger)' }}>
        403 Forbidden — Quyền Truy Cập Bị Từ Chối
      </h3>
      <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.6 }}>
        Chỉ Quản trị viên hệ thống (Super Admin) mới có quyền truy cập khu vực quản trị toàn cục này.
        Vui lòng quay lại Bảng điều khiển hoặc liên hệ quản trị viên cấp cao.
      </p>
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const { isAuthenticated, isAdmin, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Application state
  const [applications, setApplications] = useState<Application[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);

  // Users state (Admin)
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Modals state
  const [isCreateAppOpen, setIsCreateAppOpen] = useState(false);
  const [assignRoleUser, setAssignRoleUser] = useState<User | null>(null);
  const [editProvider, setEditProvider] = useState<SanitizedOAuthProvider | null>(null);

  // Load applications
  const loadApplications = useCallback(async () => {
    if (!token) return;
    setAppsLoading(true);
    try {
      const data = await applicationsService.findAll();
      setApplications(data);
    } catch {
      // Handled in service or empty
    } finally {
      setAppsLoading(false);
    }
  }, [token]);

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

  // Fetch initial data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadApplications();
    } else {
      setApplications([]);
      setUsers([]);
    }
  }, [isAuthenticated, loadApplications]);

  // Auto-fetch data on route changes
  useEffect(() => {
    if (!isAuthenticated) return;
    const path = location.pathname;
    if (path.startsWith('/console/admin/users') && isAdmin) {
      loadUsers();
    } else if (path.startsWith('/console/applications') || path.startsWith('/console/dashboard') || path.startsWith('/console/quickstart')) {
      loadApplications();
    }
  }, [location.pathname, isAuthenticated, isAdmin, loadUsers, loadApplications]);

  // Handlers
  const handleCreateAppSuccess = (newApp: Application) => {
    setIsCreateAppOpen(false);
    setApplications(prev => [newApp, ...prev]);
    navigate(`/console/applications/${newApp.id}`);
  };

  const handleUpdateApp = (updated: Application) => {
    setApplications(prev => prev.map(a => (a.id === updated.id ? updated : a)));
  };

  const handleAssignRoleSuccess = (updatedUser: User) => {
    setUsers(prev => prev.map(u => (u.id === updatedUser.id ? updatedUser : u)));
  };

  const handleProviderSaved = (_updated: SanitizedOAuthProvider) => {
    setEditProvider(null);
  };

  // Check centralized signin query
  const flowId = new URLSearchParams(window.location.search).get('signin');
  if (flowId) return <ClientSignIn flowId={flowId} />;

  return (
    <>
      <HashRedirect />
      <Routes>
        {/* Root Route: AuthScreen if unauthenticated, redirect to /console/dashboard if authenticated */}
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to="/console/dashboard" replace />
            ) : (
              <>
                <AuthScreen />
                <ToastContainer />
              </>
            )
          }
        />

        {/* Console Routes: Wrapped in AppShell */}
        <Route
          path="/console"
          element={
            isAuthenticated ? (
              <AppShell />
            ) : (
              <Navigate to="/" replace />
            )
          }
        >
          {/* Index under /console redirects to /console/dashboard */}
          <Route index element={<Navigate to="/console/dashboard" replace />} />

          {/* Dashboard */}
          <Route
            path="dashboard"
            element={
              <RoleDashboard
                applications={applications}
                onGoToApps={() => navigate('/console/applications')}
                onOpenAppDetail={(app) => navigate(`/console/applications/${app.id}`)}
                onOpenCreateApp={() => setIsCreateAppOpen(true)}
                onGoToTenants={() => navigate('/console/my-tenant')}
              />
            }
          />

          {/* Applications list */}
          <Route
            path="applications"
            element={
              <ApplicationsTab
                applications={applications}
                loading={appsLoading}
                onRefresh={loadApplications}
                onOpenCreateModal={() => setIsCreateAppOpen(true)}
                onOpenDetailModal={(app) => navigate(`/console/applications/${app.id}`)}
                onUpdateApp={handleUpdateApp}
                onOpenConfigureProvider={setEditProvider}
              />
            }
          />

          {/* Applications detail route & sub-tab routes */}
          <Route
            path="applications/:appId"
            element={
              <AppDetailPage
                onUpdateAppList={handleUpdateApp}
                onRemoveFromAppList={(deletedId) => {
                  setApplications((prev) => prev.filter((a) => a.id !== deletedId));
                }}
              />
            }
          />
          <Route
            path="applications/:appId/:tab"
            element={
              <AppDetailPage
                onUpdateAppList={handleUpdateApp}
                onRemoveFromAppList={(deletedId) => {
                  setApplications((prev) => prev.filter((a) => a.id !== deletedId));
                }}
              />
            }
          />

          {/* Quickstart */}
          <Route
            path="quickstart"
            element={
              <QuickstartPage
                applications={applications}
                onOpenCreateApp={() => setIsCreateAppOpen(true)}
              />
            }
          />

          {/* My Tenant */}
          <Route path="my-tenant" element={<MyTenantPage />} />

          {/* Admin: Users (protected by isAdmin) */}
          <Route
            path="admin/users"
            element={
              isAdmin ? (
                <UsersTab
                  users={users}
                  loading={usersLoading}
                  onRefresh={loadUsers}
                  onOpenAssignRole={setAssignRoleUser}
                />
              ) : (
                <ForbiddenView />
              )
            }
          />

          {/* Admin: Tenants (protected by isAdmin) */}
          <Route
            path="admin/tenants"
            element={
              isAdmin ? (
                <AdminTenantsPage />
              ) : (
                <ForbiddenView />
              )
            }
          />

          {/* My Account */}
          <Route path="account" element={<MyAccountPage />} />
        </Route>

        {/* Wildcard Fallback */}
        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? '/console/dashboard' : '/'} replace />}
        />
      </Routes>

      {/* Global Modals */}
      <CreateAppModal
        isOpen={isCreateAppOpen}
        onClose={() => setIsCreateAppOpen(false)}
        onSuccess={handleCreateAppSuccess}
      />

      <AssignRoleModal
        user={assignRoleUser}
        isOpen={Boolean(assignRoleUser)}
        onClose={() => setAssignRoleUser(null)}
        onSuccess={handleAssignRoleSuccess}
        adminCount={users.filter(u => u.role === 'ADMIN').length}
      />

      <ProviderModal
        applicationId={editProvider?.applicationId || ''}
        provider={editProvider}
        isOpen={Boolean(editProvider)}
        onClose={() => setEditProvider(null)}
        onSuccess={handleProviderSaved}
      />

      <ToastContainer />
    </>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};

export default App;
