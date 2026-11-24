import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export const AppShell: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('auth_service_sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('auth_service_sidebar_collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => !prev);
  };

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`} id="app-shell">
      <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />
      <div className="app-main-layout">
        <Topbar sidebarCollapsed={sidebarCollapsed} onToggleSidebar={toggleSidebar} />
        <main className="app-main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
