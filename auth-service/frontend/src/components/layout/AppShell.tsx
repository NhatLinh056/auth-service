import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

interface AppShellProps {
  isLoading?: boolean;
}

export const AppShell: React.FC<AppShellProps> = ({ isLoading = false }) => {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('auth_service_sidebar_collapsed') === 'true';
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('auth_service_sidebar_collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    const onResize = () => {
      if (!window.matchMedia('(max-width: 768px)').matches) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
    };
  }, [mobileOpen]);

  const toggleSidebar = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches) {
      setMobileOpen(prev => !prev);
      return;
    }
    setSidebarCollapsed(prev => !prev);
  };

  const pageTransitionKey = location.pathname.split('/').slice(0, 4).join('/');

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`} id="app-shell">
      <div
        className={`sidebar-backdrop ${mobileOpen ? 'show' : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileOpen}
        onToggleCollapse={toggleSidebar}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="app-main-layout">
        <Topbar
          sidebarCollapsed={sidebarCollapsed}
          mobileOpen={mobileOpen}
          onToggleSidebar={toggleSidebar}
          isLoading={isLoading}
        />
        <main className="app-main-content">
          <div key={pageTransitionKey} className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
