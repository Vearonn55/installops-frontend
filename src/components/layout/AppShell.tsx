// src/components/layout/AppShell.tsx
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import {
  LayoutDashboard,
  Package,
  Calendar,
  ShoppingCart,
  BarChart3,
  Settings,
  User as UserIcon,
  Bell,
  Search,
  Menu,
  X,
  Shield,
  Plus,
  LogOut,
  HelpCircle,
  Keyboard,
} from 'lucide-react';

import CommandPalette, { type CommandPaletteItem } from '../CommandPalette';
import { useAuthStore } from '../../stores/auth-simple';
import { cn } from '../../lib/utils';
import type { UserRole } from '../../types';

interface NavigationItem {
  labelKey: string; // i18n key, e.g. "nav.dashboard"
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  badge?: number;
}

const navigation: NavigationItem[] = [
  {
    labelKey: 'nav.dashboard',
    href: '/app/dashboard',
    icon: LayoutDashboard,
    roles: ['ADMIN', 'STORE_MANAGER'],
  },
  {
    labelKey: 'nav.orders',
    href: '/app/orders',
    icon: ShoppingCart,
    roles: ['ADMIN', 'STORE_MANAGER'],
  },
  {
    labelKey: 'nav.installations',
    href: '/app/installations',
    icon: Package,
    roles: ['ADMIN', 'STORE_MANAGER'],
  },
  {
    labelKey: 'nav.calendar',
    href: '/app/calendar',
    icon: Calendar,
    roles: ['ADMIN', 'STORE_MANAGER'],
  },
  {
    labelKey: 'nav.reports',
    href: '/app/admin/reports',
    icon: BarChart3,
    roles: ['ADMIN'],
  },
  {
    labelKey: 'nav.usersAndRoles',
    href: '/app/admin/users',
    icon: Shield,
    roles: ['ADMIN'],
  },
  {
    labelKey: 'nav.integrations',
    href: '/app/admin/integrations',
    icon: Settings,
    roles: ['ADMIN'],
  },
  {
    labelKey: 'nav.audit',
    href: '/app/audit',
    icon: Shield,
    roles: ['ADMIN'],
  },
];

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { user, hasAnyRole, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const filteredNavigation = navigation.filter((item) =>
    hasAnyRole(item.roles as any),
  );

  const paletteItems = useMemo<CommandPaletteItem[]>(() => {
    const pages: CommandPaletteItem[] = filteredNavigation.map((item) => ({
      id: `page-${item.href}`,
      label: t(item.labelKey),
      href: item.href,
      type: 'page' as const,
      icon: item.icon,
    }));
    const canManage = hasAnyRole(['ADMIN', 'STORE_MANAGER']);
    const commands: CommandPaletteItem[] = [
      ...(canManage
        ? [
            {
              id: 'cmd-new-order',
              label: t('commandPalette.newOrder'),
              href: '/app/orders/new',
              type: 'command' as const,
              icon: Plus,
            },
            {
              id: 'cmd-new-installation',
              label: t('commandPalette.newInstallation'),
              href: '/app/installations/new',
              type: 'command' as const,
              icon: Plus,
            },
          ]
        : []),
      {
        id: 'cmd-profile',
        label: t('commandPalette.profile'),
        href: '/app/profile',
        type: 'command' as const,
        icon: UserIcon,
      },
      {
        id: 'cmd-settings',
        label: t('commandPalette.settings'),
        href: '/app/settings',
        type: 'command' as const,
        icon: Settings,
      },
      {
        id: 'cmd-signout',
        label: t('commandPalette.signOut'),
        type: 'command' as const,
        icon: LogOut,
        action: () => {},
      },
    ];
    const help: CommandPaletteItem[] = [
      {
        id: 'help-centre',
        label: t('commandPalette.helpCentre'),
        type: 'help' as const,
        icon: HelpCircle,
        action: () => window.open('/help', '_blank'),
      },
      {
        id: 'help-shortcuts',
        label: t('commandPalette.keyboardShortcuts'),
        type: 'help' as const,
        icon: Keyboard,
        action: () => window.open('/help#shortcuts', '_blank'),
      },
    ];
    return [...pages, ...commands, ...help];
  }, [filteredNavigation, t, hasAnyRole]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handlePaletteSelect = (item: CommandPaletteItem) => {
    if (item.action) {
      if (item.id === 'cmd-signout') {
        handleLogout();
      } else {
        item.action();
      }
    } else if (item.href) {
      navigate(item.href);
      setSidebarOpen(false);
    }
  };

  const handleLogout = async () => {
    try {
      logout();
      navigate('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const roleLabel = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return t('roles.admin');
      case 'STORE_MANAGER':
        return t('roles.storeManager');
      case 'CREW':
        return t('roles.crew');
      default:
        return role ?? '';
    }
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Mobile sidebar */}
      <div
        className={cn(
          'fixed inset-0 z-40 md:hidden',
          sidebarOpen ? 'block' : 'hidden',
        )}
        aria-hidden={!sidebarOpen}
      >
        <div
          className="fixed inset-0 bg-gray-600/75"
          onClick={() => setSidebarOpen(false)}
        />
        <div className="relative ml-auto flex h-full w-72 flex-col bg-white shadow-xl">
          <div className="absolute right-0 top-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pt-5 pb-4">
            <div className="flex items-center px-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
                <Package className="h-5 w-5 text-white" />
              </div>
              <span className="ml-2 text-xl font-bold text-gray-900">
                {t('appName')}
              </span>
            </div>

            <nav className="mt-5 space-y-1 px-2">
              {filteredNavigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'group flex items-center rounded-md px-2 py-2 text-base font-medium',
                      isActive
                        ? 'bg-primary-100 text-primary-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                    )}
                  >
                    <item.icon
                      className={cn(
                        'mr-4 h-6 w-6',
                        isActive
                          ? 'text-primary-500'
                          : 'text-gray-400 group-hover:text-gray-500',
                      )}
                    />
                    {t(item.labelKey)}
                    {item.badge && (
                      <span className="ml-auto rounded-full bg-primary-100 px-2 py-1 text-xs font-medium text-primary-600">
                        {item.badge}
                      </span>
                    )}
                  </a>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex w-64 flex-col">
          <div className="flex h-0 flex-1 flex-col border-r border-gray-200 bg-white">
            <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
              <div className="flex items-center px-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
                  <Package className="h-5 w-5 text-white" />
                </div>
                <span className="ml-2 text-xl font-bold text-gray-900">
                  {t('appName')}
                </span>
              </div>

              <nav className="mt-5 flex-1 space-y-1 px-2">
                {filteredNavigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'group flex items-center rounded-md px-2 py-2 text-sm font-medium',
                        isActive
                          ? 'bg-primary-100 text-primary-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                      )}
                    >
                      <item.icon
                        className={cn(
                          'mr-3 h-5 w-5',
                          isActive
                            ? 'text-primary-500'
                            : 'text-gray-400 group-hover:text-gray-500',
                        )}
                      />
                      {t(item.labelKey)}
                      {item.badge && (
                        <span className="ml-auto rounded-full bg-primary-100 px-2 py-1 text-xs font-medium text-primary-600">
                          {item.badge}
                        </span>
                      )}
                    </a>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex w-0 flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="relative z-10 flex h-16 flex-shrink-0 bg-white shadow">
          <button
            type="button"
            className="border-r border-gray-200 px-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex flex-1 justify-between px-4">
            {/* Search / Command palette trigger */}
            <div className="flex flex-1">
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                className="flex w-full md:ml-0 items-center gap-2 rounded-lg border border-transparent py-2 pl-8 pr-3 text-left text-gray-500 hover:border-gray-200 hover:bg-gray-50 hover:text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <Search className="h-5 w-5 flex-shrink-0 -ml-6 text-gray-400" />
                <span className="truncate">{t('commandPalette.placeholder')}</span>
                <kbd className="ml-auto hidden sm:inline-flex h-5 items-center rounded border border-gray-200 bg-gray-50 px-1.5 text-xs text-gray-400">
                  ⌘K
                </kbd>
              </button>
            </div>

            {/* Right side: notifications + user menu */}
            <div className="ml-4 flex items-center md:ml-6">
              <button
                type="button"
                className="rounded-full bg-white p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                <Bell className="h-6 w-6" />
              </button>

              {/* Profile dropdown */}
              <div className="relative ml-3">
                <button
                  type="button"
                  className="flex max-w-xs items-center rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  onClick={() => setUserMenuOpen((v) => !v)}
                >
                  <span className="sr-only">
                    {t('header.openUserMenu')}
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100">
                    <UserIcon className="h-5 w-5 text-primary-600" />
                  </div>
                  <span className="ml-2 hidden text-sm font-medium text-gray-700 md:block">
                    {user?.name}
                  </span>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="border-b border-gray-200 px-4 py-2 text-sm text-gray-700">
                      <div className="font-medium">{user?.name}</div>
                      <div className="text-gray-500">{user?.email}</div>
                      <div className="text-xs text-gray-400">
                        {roleLabel(user?.role)}
                      </div>
                    </div>
                    <a
                      href="/app/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      {t('header.yourProfile')}
                    </a>
                    <a
                      href="/app/settings"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      {t('header.settings')}
                    </a>
                    <button
                      onClick={handleLogout}
                      className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                      type="button"
                    >
                      {t('header.signOut')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="relative flex-1 overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        items={paletteItems}
        onSelect={handlePaletteSelect}
        placeholder={t('commandPalette.placeholder')}
        noResultsText={t('commandPalette.noResults')}
      />
    </div>
  );
}
