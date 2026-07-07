// src/stores/auth.ts — cookie session via /auth/me; single source of truth for app auth state
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '../types';
import {
  getCurrentUser,
  login as apiLogin,
  logout as logoutSession,
} from '../api/auth';
import { isAxiosError } from '../api/http';
import { getLoginErrorMessage } from '../lib/auth-errors';
import { queryClient } from '../lib/query-client';

/** Backend may return "store_manager", "Store Manager", "manager" etc. Normalize to UserRole. */
function normalizeBackendRole(role: string | null | undefined): UserRole {
  if (!role || typeof role !== 'string') return 'ADMIN';
  const r = role.trim().toLowerCase().replace(/\s+/g, '_');
  if (r === 'admin' || r === 'administrator') return 'ADMIN';
  if (r === 'store_manager' || r === 'manager' || r === 'storemanager') return 'STORE_MANAGER';
  if (r === 'crew' || r === 'installation_crew' || r === 'installationcrew') return 'CREW';
  return 'ADMIN';
}

function mapMeToUser(me: Awaited<ReturnType<typeof getCurrentUser>>, emailFallback = ''): User {
  return {
    id: me.id,
    name: me.name || '',
    email: me.email || emailFallback,
    phone: me.phone ?? undefined,
    role: normalizeBackendRole(me.role),
    permissions: Array.isArray(me.permissions) ? me.permissions : [],
    store_id: me.store_id ?? undefined,
    store_group: me.store_group ?? undefined,
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  hasHydrated: boolean;
  /** True after `/auth/me` validation finishes (success or 401). */
  sessionValidated: boolean;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
}

type AuthStore = AuthState & AuthActions;

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  ADMIN: [
    'users:read', 'users:write', 'users:delete',
    'stores:read', 'stores:write', 'stores:delete',
    'orders:read', 'orders:write', 'orders:delete',
    'installations:read', 'installations:write', 'installations:delete',
    'inventory:read', 'inventory:write', 'inventory:delete',
    'reports:read', 'reports:write',
    'audit:read',
    'webhooks:read', 'webhooks:write', 'webhooks:delete',
    'capacity:read', 'capacity:write',
    'checklists:read', 'checklists:write', 'checklists:delete',
  ],
  STORE_MANAGER: [
    'orders:read', 'orders:write',
    'installations:read', 'installations:write',
    'customers:read', 'customers:write',
    'calendar:read', 'calendar:write',
    'reports:read',
  ],
  CREW: [
    'installations:read',
    'checklists:read', 'checklists:write',
    'media:read', 'media:write',
  ],
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      hasHydrated: false,
      sessionValidated: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          await apiLogin({ email, password });
          await new Promise((r) => setTimeout(r, 100));
          const me = await getCurrentUser();
          const mappedUser = mapMeToUser(me, email);

          set({
            user: mappedUser,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            sessionValidated: true,
          });
        } catch (err: unknown) {
          const message = getLoginErrorMessage(err);
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: message,
            sessionValidated: true,
          });
          throw err;
        }
      },

      logout: () => {
        void logoutSession().catch(() => {});
        void useAuthStore.persist.clearStorage();
        queryClient.clear();
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          sessionValidated: true,
        });
      },

      clearError: () => {
        set({ error: null });
      },

      hasPermission: (permission: string) => {
        const { user } = get();
        if (!user) return false;
        const fromApi = user.permissions;
        if (fromApi && fromApi.length) {
          if (fromApi.includes('admin:*')) return true;
          if (fromApi.includes(permission)) return true;
          const prefix = permission.includes(':') ? `${permission.split(':')[0]}:*` : '';
          if (prefix && fromApi.includes(prefix)) return true;
        }
        const role = normalizeBackendRole(user.role) as UserRole;
        const userPermissions = ROLE_PERMISSIONS[role] || [];
        return userPermissions.includes(permission);
      },

      hasRole: (role: UserRole) => {
        const { user } = get();
        if (!user) return false;
        return normalizeBackendRole(user.role) === role;
      },

      hasAnyRole: (roles: UserRole[]) => {
        const { user } = get();
        if (!user) return false;
        return roles.includes(normalizeBackendRole(user.role) as UserRole);
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user
          ? {
              ...state.user,
              permissions: state.user.permissions,
            }
          : null,
      }),
      merge: (persisted, current) => {
        const p = persisted as { user?: User | null };
        const user = p.user
          ? {
              ...p.user,
              role: normalizeBackendRole(p.user.role) as UserRole,
              permissions: p.user.permissions,
            }
          : null;
        return {
          ...current,
          user,
          isAuthenticated: false,
          sessionValidated: false,
        };
      },
    }
  )
);

function isAuthFailure(err: unknown): boolean {
  return isAxiosError(err) && (err.response?.status === 401 || err.response?.status === 403);
}

/** Validate session cookie with `/auth/me` after rehydrate. */
export const initializeAuth = async () => {
  useAuthStore.setState({ isLoading: true });

  try {
    const me = await getCurrentUser();
    const prev = useAuthStore.getState().user;
    const mappedUser: User = {
      ...mapMeToUser(me, prev?.email || ''),
      phone: me.phone ?? prev?.phone,
      permissions: Array.isArray(me.permissions) ? me.permissions : prev?.permissions,
      store_id: me.store_id ?? prev?.store_id,
      store_group: me.store_group ?? prev?.store_group,
      status: prev?.status ?? 'active',
      created_at: prev?.created_at ?? new Date().toISOString(),
    };

    useAuthStore.setState({
      user: mappedUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      sessionValidated: true,
    });

    return { user: mappedUser, isAuthenticated: true };
  } catch (err) {
    if (isAuthFailure(err)) {
      void useAuthStore.persist.clearStorage();
      useAuthStore.setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        sessionValidated: true,
      });
      return { user: null, isAuthenticated: false };
    }

    useAuthStore.setState({
      isLoading: false,
      sessionValidated: true,
    });
    return {
      user: useAuthStore.getState().user,
      isAuthenticated: useAuthStore.getState().isAuthenticated,
    };
  }
};

function onStorageHydrated() {
  useAuthStore.setState({ hasHydrated: true });
  void initializeAuth();
}

const unsubPersist = useAuthStore.persist.onFinishHydration(() => {
  onStorageHydrated();
  unsubPersist();
});

if (useAuthStore.persist.hasHydrated()) {
  onStorageHydrated();
}
