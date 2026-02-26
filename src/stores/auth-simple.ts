// src/stores/auth-simple.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '../types';
import { getCurrentUser } from '../api/auth';
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

// Permission mapping based on roles
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
      // State
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          // apiLogin() already ran in LoginPage and set the cookie.
          // Here we just read the current user/session from /auth/me.
          const me = await getCurrentUser();

          const mappedUser: User = {
            id: me.id,
            // We don't get name/email from /auth/me, so we use what we know
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
        } catch (err: any) {
          const is401 = isAxiosError(err) && err.response?.status === 401;
          const message = is401
            ? 'Session could not be established. Please enable cookies and try again, or contact support if the problem persists.'
            : (err?.response?.data?.message || err?.message || 'Login failed');
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

// Simple initialization function
// Attempts to restore session from backend /auth/me using the sid cookie.
export const initializeAuth = async () => {
  const state = useAuthStore.getState();

  try {
    // This will succeed if sid cookie is valid (user has an active session)
    const me = await getCurrentUser();

    // If we already had a user in local storage, keep it.
    // Otherwise, create a minimal user object from /auth/me and cast to User.
    const mappedUser: User =
      state.user ??
      {
        id: me.id,
        name: state.user?.name ?? '',
        email: state.user?.email ?? '',
        phone: state.user?.phone,
        role: normalizeBackendRole(me.role),
        store_id: state.user?.store_id,
        status: state.user?.status ?? 'active',
        created_at: state.user?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

    useAuthStore.setState({
      ...state,
      user: mappedUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    return { user: mappedUser, isAuthenticated: true };
  } catch {
    // If /auth/me fails (401 or other), just return whatever we had persisted.
    return { user: state.user, isAuthenticated: state.isAuthenticated };
  }
};
