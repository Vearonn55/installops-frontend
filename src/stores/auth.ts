// src/stores/auth.ts — cookie session via /auth/me; single source of truth for app auth state
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '../types';
import { getCurrentUser, logout as logoutSession } from '../api/auth';
import { isAxiosError } from '../api/http';

/** Backend may return "store_manager", "Store Manager", "manager" etc. Normalize to UserRole. */
function normalizeBackendRole(role: string | null | undefined): UserRole {
  if (!role || typeof role !== 'string') return 'ADMIN';
  const r = role.trim().toLowerCase().replace(/\s+/g, '_');
  if (r === 'admin' || r === 'administrator') return 'ADMIN';
  if (r === 'store_manager' || r === 'manager' || r === 'storemanager') return 'STORE_MANAGER';
  if (r === 'crew' || r === 'installation_crew' || r === 'installationcrew') return 'CREW';
  return 'ADMIN';
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  /** False until persisted auth is re-read from storage (avoids bogus redirects before rehydrate). */
  hasHydrated: boolean;
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

      login: async (email: string, _password: string) => {
        set({ isLoading: true, error: null });

        try {
          const me = await getCurrentUser();

          const mappedUser: User = {
            id: me.id,
            name: '',
            email,
            phone: undefined,
            role: normalizeBackendRole(me.role),
            store_id: undefined,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          set({
            user: mappedUser,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (err: unknown) {
          const e = err as { response?: { status?: number; data?: { message?: string } }; message?: string };
          const is401 = isAxiosError(err) && err.response?.status === 401;
          const message = is401
            ? 'Session could not be established. Please enable cookies and try again, or contact support if the problem persists.'
            : (e?.response?.data?.message || e?.message || 'Login failed');
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: message,
          });
          throw err;
        }
      },

      logout: () => {
        void logoutSession().catch(() => {});
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      },

      clearError: () => {
        set({ error: null });
      },

      hasPermission: (permission: string) => {
        const { user } = get();
        if (!user) return false;
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
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      merge: (persisted, current) => {
        const p = persisted as { user?: User | null; isAuthenticated?: boolean };
        const user = p.user
          ? { ...p.user, role: normalizeBackendRole(p.user.role) as UserRole }
          : null;
        return { ...current, user, isAuthenticated: p.isAuthenticated ?? current.isAuthenticated };
      },
    }
  )
);

/** Merge /auth/me with persisted user after rehydrate. */
export const initializeAuth = async () => {
  const state = useAuthStore.getState();

  try {
    const me = await getCurrentUser();
    const prev = state.user;
    const mappedUser: User = {
      id: me.id,
      name: prev?.name ?? '',
      email: prev?.email ?? '',
      phone: prev?.phone,
      role: normalizeBackendRole(me.role),
      store_id: prev?.store_id,
      status: prev?.status ?? 'active',
      created_at: prev?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    useAuthStore.setState({
      user: mappedUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    return { user: mappedUser, isAuthenticated: true };
  } catch {
    return { user: state.user, isAuthenticated: state.isAuthenticated };
  }
};

/**
 * `persist` may finish hydrating inside `create()` (sync localStorage path). You must not call
 * `useAuthStore` from `onRehydrateStorage` — the `useAuthStore` binding is still in the TDZ.
 * Mark storage ready here, then validate the session cookie with `/auth/me`.
 */
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
