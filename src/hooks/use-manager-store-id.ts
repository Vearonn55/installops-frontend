import { useMemo } from 'react';
import { useAuthStore } from '../stores/auth';
import type { Store } from '../api/stores';
import { inferManagerStoreId } from '../lib/manager-store';

/** Manager's scoped store id, or null for admins / unscoped. */
export function useManagerStoreId(stores: Store[]): string | null {
  const user = useAuthStore((s) => s.user);
  const isAdmin = useAuthStore((s) => s.hasRole('ADMIN'));
  const sessionValidated = useAuthStore((s) => s.sessionValidated);

  return useMemo(() => {
    if (isAdmin) return null;
    if (user?.store_id) {
      if (!stores.length || stores.some((s) => s.id === user.store_id)) {
        return user.store_id;
      }
    }
    // Avoid email/store[0] guess before /auth/me — prevents store id flip and duplicate Netsis search.
    if (!sessionValidated) return null;
    return inferManagerStoreId(stores, user?.email, user?.store_id);
  }, [isAdmin, sessionValidated, stores, user?.email, user?.store_id]);
}
