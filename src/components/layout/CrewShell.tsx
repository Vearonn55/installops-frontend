// src/components/layout/CrewShell.tsx
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Home,
  ClipboardList,
  AlertTriangle,
  Settings as SettingsIcon,
  Wifi,
  WifiOff,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';

import { useDateDisplayStore } from '../../stores/date-display';
import { cn } from '../../lib/utils';

interface NavigationItem {
  labelKey: string; // i18n key, e.g. "nav.crewHome"
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const navigation: NavigationItem[] = [
  { labelKey: 'nav.crewHome', href: '/crew', icon: Home },
  { labelKey: 'nav.crewJobs', href: '/crew/jobs', icon: ClipboardList },
  { labelKey: 'nav.crewIssues', href: '/crew/issues', icon: AlertTriangle },
  { labelKey: 'nav.crewSettings', href: '/crew/settings', icon: SettingsIcon },
];

export default function CrewShell() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const location = useLocation();
  const { t } = useTranslation();
  useDateDisplayStore((s) => s.datePattern);

  // Stubs until offline store is wired back
  const pendingActions: any[] = [];
  const completedActions: any[] = [];
  const isSyncing = false;
  const syncActions = async () => {};
  const clearCompletedActions = () => {};

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSync = async () => {
    await syncActions();
  };
  const handleClearCompleted = () => {
    clearCompletedActions();
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-yellow-100 border-b border-yellow-200 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <WifiOff className="h-4 w-4 text-yellow-600 mr-2" />
              <span className="text-sm text-yellow-800">You're offline</span>
            </div>
            <span className="text-xs text-yellow-600">
              {pendingActions.length} action
              {pendingActions.length !== 1 ? 's' : ''} pending
            </span>
          </div>
        </div>
      )}

      {/* Sync status banner */}
      {isOnline && pendingActions.length > 0 && (
        <div className="bg-blue-100 border-b border-blue-200 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {isSyncing ? (
                <RefreshCw className="h-4 w-4 text-blue-600 mr-2 animate-spin" />
              ) : (
                <Wifi className="h-4 w-4 text-blue-600 mr-2" />
              )}
              <span className="text-sm text-blue-800">
                {isSyncing
                  ? 'Syncing...'
                  : `${pendingActions.length} action${
                      pendingActions.length !== 1 ? 's' : ''
                    } pending sync`}
              </span>
            </div>
            {!isSyncing && (
              <button
                onClick={handleSync}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Sync now
              </button>
            )}
          </div>
        </div>
      )}

      {/* Success banner */}
      {completedActions.length > 0 && (
        <div className="bg-green-100 border-b border-green-200 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
              <span className="text-sm text-green-800">
                {completedActions.length} action
                {completedActions.length !== 1 ? 's' : ''} synced
              </span>
            </div>
            <button
              onClick={handleClearCompleted}
              className="text-xs text-green-600 hover:text-green-800 underline"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Main content — scrollable on small screens */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain">
        <Outlet />
      </div>

      {/* Bottom navigation */}
      <div className="border-t border-gray-200 bg-white px-1 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <nav className="flex justify-around gap-0.5">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'relative flex min-w-0 max-w-[25%] flex-1 touch-manipulation flex-col items-center rounded-lg px-1 py-2 text-[10px] font-medium leading-tight transition-colors sm:px-2 sm:text-xs',
                  isActive
                    ? 'text-primary-600 bg-primary-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50',
                )}
              >
                <item.icon
                  className={cn(
                    'mb-0.5 h-5 w-5 shrink-0 sm:mb-1',
                    isActive ? 'text-primary-600' : 'text-gray-400',
                  )}
                />
                <span className="line-clamp-2 text-center">{t(item.labelKey)}</span>
                {item.badge && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

    </div>
  );
}
