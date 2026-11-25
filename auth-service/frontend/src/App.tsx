import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useLanguage } from './contexts/LanguageContext';
import { AuthScreen } from './components/auth/AuthScreen';
import { ClientSignIn } from './components/auth/ClientSignIn';
import { ToastContainer } from './components/common/ToastContainer';
import { IconBrandMark } from './components/common/Icons';
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

import { applicationsService } from './services/applications.service';
import { usersService } from './services/users.service';

import type { Application } from './types/application.types';
import type { User } from './types/auth.types';

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
  const { isAuthenticated, isAdmin, token, initializing } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  // Application state
  const [applications, setApplications] = useState<Application[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsError, setAppsError] = useState<string | null>(null);

  // Users state (Admin)
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  // Modals state
  const [isCreateAppOpen, setIsCreateAppOpen] = useState(false);
  const [assignRoleUser, setAssignRoleUser] = useState<User | null>(null);
  const appsReqIdRef = useRef(0);

  // Smooth fade-out transition when boot initialization completes
  const [bootVisible, setBootVisible] = useState(initializing);
  const [bootLeaving, setBootLeaving] = useState(false);

  useEffect(() => {
    if (initializing) {
      setBootVisible(true);
      setBootLeaving(false);
      return;
    }
    if (!bootVisible) return;
    setBootLeaving(true);
    const timer = window.setTimeout(() => {
      setBootVisible(false);
      setBootLeaving(false);
    }, 130);
    return () => window.clearTimeout(timer);
  }, [initializing, bootVisible]);

  // Load applications (guarded against out-of-order stale responses)
  const loadApplications = useCallback(async () => {
    if (!token) return;
    const reqId = ++appsReqIdRef.current;
    setAppsLoading(true);
    setAppsError(null);
    try {
      const data = await applicationsService.findAll();
      if (reqId === appsReqIdRef.current) {
        setApplications(data);
      }
    } catch (err: any) {
      if (reqId === appsReqIdRef.current) {
        setAppsError(err?.message || 'Không thể tải danh sách ứng dụng.');
      }
    } finally {
      if (reqId === appsReqIdRef.current) {
        setAppsLoading(false);
      }
    }
  }, [token]);

  // Load users
  const loadUsers = useCallback(async () => {
    if (!token || !isAdmin) return;
    setUsersLoading(true);
    setUsersError(null);
    try {
      const data = await usersService.getAll();
      setUsers(data);
    } catch (err: any) {
      setUsersError(err?.message || 'Không thể tải danh sách người dùng.');
    } finally {
      setUsersLoading(false);
    }
  }, [token, isAdmin]);

  // Fetch data once per route/auth transition without duplicate requests
  useEffect(() => {
    if (!isAuthenticated) {
      appsReqIdRef.current += 1;
      setApplications([]);
      setAppsError(null);
      setUsers([]);
      setUsersError(null);
      return;
    }
    const path = location.pathname;
    if (path.startsWith('/console/admin/users') && isAdmin) {
      loadUsers();
    } else if (
      path.startsWith('/console/applications') ||
      path.startsWith('/console/dashboard') ||
      path.startsWith('/console/quickstart')
    ) {
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

  // Check centralized signin query
  const flowId = new URLSearchParams(window.location.search).get('signin');
  if (flowId) return <ClientSignIn flowId={flowId} />;

  if (initializing || bootVisible) {
    return (
      <div
        className={`auth-boot-screen${bootLeaving ? ' is-leaving' : ''}`}
        id="auth-boot-screen"
        role="status"
        aria-live="polite"
        aria-label={t('auth_screen.loading_app')}
      >
        <div className="auth-boot-card page-enter">
          <div className="auth-boot-logo" aria-hidden="true">
            <IconBrandMark size={26} strokeWidth={1.9} />
          </div>
          <span className="auth-boot-title">Auth Service</span>
          <div className="auth-boot-progress" aria-hidden="true" />
        </div>
      </div>
    );
  }

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
              <AuthScreen />
            )
          }
        />

        {/* Console Routes: Wrapped in AppShell */}
        <Route
          path="/console"
          element={
            isAuthenticated ? (
              <AppShell isLoading={appsLoading || usersLoading} />
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
                appsLoading={appsLoading}
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
                error={appsError}
                onRefresh={loadApplications}
                onOpenCreateModal={() => setIsCreateAppOpen(true)}
                onOpenDetailModal={(app) => navigate(`/console/applications/${app.id}`)}
              />
            }
          />

          {/* Applications detail route & sub-tab routes */}
          <Route
            path="applications/:appId/:tab?"
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
                  error={usersError}
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
