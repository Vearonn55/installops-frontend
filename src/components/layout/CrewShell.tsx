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
  labelKey: string;
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

function crewNavActive(pathname: string, href: string): boolean {
  if (href === '/crew') return pathname === '/crew';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function CrewShell() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const location = useLocation();
  const { t } = useTranslation();
  useDateDisplayStore((s) => s.datePattern);

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

  return (
    <div className="crew-shell flex flex-col bg-gray-50">
      {!isOnline && (
        <div className="shrink-0 border-b border-yellow-200 bg-yellow-100 px-4 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center">
              <WifiOff className="mr-2 h-4 w-4 shrink-0 text-yellow-600" />
              <span className="text-sm text-yellow-800">You&apos;re offline</span>
            </div>
            <span className="shrink-0 text-xs text-yellow-600">
              {pendingActions.length} pending
            </span>
          </div>
        </div>
      )}

      {isOnline && pendingActions.length > 0 && (
        <div className="shrink-0 border-b border-blue-200 bg-blue-100 px-4 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center">
              {isSyncing ? (
                <RefreshCw className="mr-2 h-4 w-4 shrink-0 animate-spin text-blue-600" />
              ) : (
                <Wifi className="mr-2 h-4 w-4 shrink-0 text-blue-600" />
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
                type="button"
                onClick={() => syncActions()}
                className="shrink-0 text-xs text-blue-600 underline hover:text-blue-800"
              >
                Sync now
              </button>
            )}
          </div>
        </div>
      )}

      {completedActions.length > 0 && (
        <div className="shrink-0 border-b border-green-200 bg-green-100 px-4 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center">
              <CheckCircle className="mr-2 h-4 w-4 shrink-0 text-green-600" />
              <span className="text-sm text-green-800">
                {completedActions.length} synced
              </span>
            </div>
            <button
              type="button"
              onClick={clearCompletedActions}
              className="shrink-0 text-xs text-green-600 underline hover:text-green-800"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="crew-shell-main flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
        <Outlet />
      </div>

      <nav
        className="crew-tab-bar"
        style={{ height: 'calc(var(--crew-tab-bar-h) + env(safe-area-inset-bottom, 0px))' }}
        aria-label="Crew navigation"
      >
        <div className="mx-auto flex h-[var(--crew-tab-bar-h)] max-w-screen-sm items-stretch justify-around gap-0.5 px-1">
          {navigation.map((item) => {
            const isActive = crewNavActive(location.pathname, item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'relative flex min-h-[44px] min-w-0 max-w-[25%] flex-1 touch-manipulation flex-col items-center justify-center rounded-lg px-1 py-1 text-[10px] font-medium leading-tight transition-colors active:opacity-80 sm:px-2 sm:text-xs',
                  isActive
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                )}
              >
                <item.icon
                  className={cn(
                    'mb-0.5 h-5 w-5 shrink-0',
                    isActive ? 'text-primary-600' : 'text-gray-400'
                  )}
                />
                <span className="line-clamp-2 text-center">{t(item.labelKey)}</span>
                {item.badge ? (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
