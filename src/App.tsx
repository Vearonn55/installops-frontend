// src/App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import { useEffect, useState } from 'react';

import { queryClient } from './lib/query-client';
import { useAuthStore, initializeAuth } from './stores/auth-simple';

// Layout & guards
import AppShell from './components/layout/AppShell';
import CrewShell from './components/layout/CrewShell';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RoleGuard from './components/auth/RoleGuard';
import ErrorBoundary from './components/ErrorBoundary';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import UsersPage from './pages/admin/UsersPage';
import ReportsPage from './pages/admin/ReportsPage';
import RolesPage from './pages/admin/RolesPage';
import IntegrationsPage from './pages/admin/IntegrationsPage';
import CapacitySettingsPage from './pages/admin/CapacitySettingsPage';

// Manager pages
import ManagerDashboard from './pages/manager/ManagerDashboard';
import OrdersPage from './pages/manager/OrdersPage';
import OrderDetailPage from './pages/manager/OrderDetailPage';
import CreateOrderPage from './pages/manager/CreateOrderPage';
import InstallationsPage from './pages/manager/InstallationsPage';
import InstallationDetailPage from './pages/manager/InstallationDetailPage';
import CreateInstallationPage from './pages/manager/CreateInstallationPage';
import CalendarPage from './pages/manager/CalendarPage';

// Crew pages
import CrewHome from './pages/crew/CrewHome';
import CrewJobs from './pages/crew/CrewJobs';
import CrewJobDetail from './pages/crew/CrewJobDetail';
import CrewOrderDetail from './pages/crew/CrewOrderDetail';
import CrewChecklist from './pages/crew/CrewChecklist';
import CrewCapture from './pages/crew/CrewCapture';
import CrewIssues from './pages/crew/CrewIssues';
import CrewSettings from './pages/crew/CrewSettings';

// Shared pages
import YourProfile from './pages/shared/YourProfile';
import AuditPage from './pages/shared/AuditPage';
import NotFoundPage from './pages/shared/NotFoundPage';
import ForbiddenPage from './pages/shared/ForbiddenPage';
import SettingsPage from './pages/shared/SettingsPage';
import ComingSoonPage from './pages/shared/ComingSoonPage';


type DevtoolsCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const cornerToSide: Record<DevtoolsCorner, 'top' | 'bottom' | 'left' | 'right'> = {
  'top-left': 'left',
  'bottom-left': 'left',
  'top-right': 'right',
  'bottom-right': 'right',
};

function App() {
  const { isAuthenticated, user } = useAuthStore();

// Initialize auth once
useEffect(() => {
  // In dev (localhost), do NOT auto-restore session from backend.
  // This prevents automatic login and always shows the normal login page first.
  if (!import.meta.env.DEV) {
    initializeAuth();
  }
}, []);


  // React Query Devtools position (persisted by DevControls)
  const [rqPosition, setRqPosition] = useState<DevtoolsCorner>('bottom-right');
  useEffect(() => {
    const KEY = 'DEV_RQ_POS';
    const load = () => {
      const v = localStorage.getItem(KEY) as DevtoolsCorner | null;
      if (v === 'top-left' || v === 'top-right' || v === 'bottom-left' || v === 'bottom-right') {
        setRqPosition(v);
      }
    };
    load();
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY && e.newValue) {
        const v = e.newValue as DevtoolsCorner;
        if (v === 'top-left' || v === 'top-right' || v === 'bottom-left' || v === 'bottom-right') {
          setRqPosition(v);
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

const getDefaultRoute = () => {
  if (!isAuthenticated || !user) return '/auth/login';
  switch (user.role) {
    case 'ADMIN':
    case 'STORE_MANAGER':
      return '/app/dashboard';
    case 'CREW':
      return '/crew';
    default:
      return '/app/dashboard';
  }
};


  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              {/* Public routes */}
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/auth/reset-password" element={<ResetPasswordPage />} />


              {/* App routes (Admin/Manager/Warehouse) */}
              <Route
                path="/app/*"
                element={
                  <ProtectedRoute>
                    <AppShell />
                  </ProtectedRoute>
                }
              >
                {/* Dashboard */}
                <Route
                  path="dashboard"
                  element={
                    <RoleGuard roles={['ADMIN', 'STORE_MANAGER']}>
                      {user?.role === 'ADMIN' && <AdminDashboard />}
                      {user?.role === 'STORE_MANAGER' && <ManagerDashboard />}
                    </RoleGuard>
                  }
                />

                {/* Orders (read-only, from external API) */}
                <Route
                  path="orders"
                  element={
                    <RoleGuard roles={['ADMIN', 'STORE_MANAGER']}>
                      <OrdersPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="orders/:id"
                  element={
                    <RoleGuard roles={['ADMIN', 'STORE_MANAGER']}>
                      <OrderDetailPage />
                    </RoleGuard>
                  }
                />
                {/* Keeping new order route if you still want to test the form; remove if not needed */}
                <Route
                  path="orders/new"
                  element={
                    <RoleGuard roles={['ADMIN', 'STORE_MANAGER']}>
                      <CreateOrderPage />
                    </RoleGuard>
                  }
                />

                {/* Installations */}
                <Route
                  path="installations"
                  element={
                    <RoleGuard roles={['ADMIN', 'STORE_MANAGER']}>
                      <InstallationsPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="installations/:id"
                  element={
                    <RoleGuard roles={['ADMIN', 'STORE_MANAGER']}>
                      <InstallationDetailPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="installations/new"
                  element={
                    <RoleGuard roles={['ADMIN', 'STORE_MANAGER']}>
                      <CreateInstallationPage />
                    </RoleGuard>
                  }
                />

                {/* Calendar */}
                <Route
                  path="calendar"
                  element={
                    <RoleGuard roles={['ADMIN', 'STORE_MANAGER']}>
                      <CalendarPage />
                    </RoleGuard>
                  }
                />

                {/* Your profile*/}
                <Route
                  path="profile"
                  element={
                    <RoleGuard roles={['ADMIN', 'STORE_MANAGER']}>
                      <YourProfile />
                    </RoleGuard>
                  }
                />
                {/* Settings */}
                <Route
                  path="settings"
                  element={
                    <RoleGuard roles={['ADMIN', 'STORE_MANAGER']}>
                      <SettingsPage />
                    </RoleGuard>
                  }
                />

                {/* Coming soon (unimplemented features) */}
                <Route path="coming-soon" element={<ComingSoonPage />} />

                {/* Admin-only */}
                <Route
                  path="admin/users"
                  element={
                    <RoleGuard roles={['ADMIN']}>
                      <UsersPage />
                    </RoleGuard>
                  } 
                />

                <Route
                  path="admin/reports"
                  element={
                    <RoleGuard roles={['ADMIN']}>
                      <ReportsPage />
                    </RoleGuard>
                  }
                />

                <Route
                  path="admin/roles"
                  element={
                    <RoleGuard roles={['ADMIN']}>
                      <RolesPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="admin/integrations"
                  element={
                    <RoleGuard roles={['ADMIN']}>
                      <IntegrationsPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="admin/capacity"
                  element={
                    <RoleGuard roles={['ADMIN']}>
                      <CapacitySettingsPage />
                    </RoleGuard>
                  }
                />

                {/* Audit */}
                <Route
                  path="audit"
                  element={
                    <RoleGuard roles={['ADMIN']}>
                      <AuditPage />
                    </RoleGuard>
                  }
                />
              </Route>

              {/* Crew PWA */}
              <Route
                path="/crew/*"
                element={
                  <ProtectedRoute>
                    <RoleGuard roles={['CREW']}>
                      <CrewShell />
                    </RoleGuard>
                  </ProtectedRoute>
                }
              >
                <Route index element={<CrewHome />} />
                <Route path="jobs" element={<CrewJobs />} />
                <Route path="jobs/:id" element={<CrewJobDetail />} />
                <Route path="jobs/:id/checklist" element={<CrewChecklist />} />
                <Route path="jobs/:id/capture" element={<CrewCapture />} />
                <Route path="jobs/:id/issues" element={<CrewIssues />} />
                <Route path="jobs/:id/order" element={<CrewOrderDetail />} />
                <Route path="issues" element={<CrewIssues />} />
                <Route path="settings" element={<CrewSettings />} />
              </Route>

            {/* Errors & redirects */}
            <Route path="/403" element={<ForbiddenPage />} />
            <Route path="/404" element={<NotFoundPage />} />
            <Route path="/" element={<Navigate to="/auth/login" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>  {/* ← add this line */}

          {/* Toast notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: { background: '#363636', color: '#fff' },
              success: { duration: 3000, iconTheme: { primary: '#22c55e', secondary: '#fff' } },
              error: { duration: 5000, iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
        </div>
      </Router>


        {/* React Query DevTools (movable) */}
        {import.meta.env.DEV && (
         <ReactQueryDevtools
         initialIsOpen={false}
         position={
         rqPosition.startsWith('top')
          ? 'top'
          : 'bottom'
         } // safely map corner to side
         />
)}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;