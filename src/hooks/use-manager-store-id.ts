import { useMemo } from 'react';
import { useAuthStore } from '../stores/auth';
import type { Store } from '../api/stores';
import { inferManagerStoreId } from '../lib/manager-store';

/** Manager's scoped store id, or null for admins / unscoped. */
export function useManagerStoreId(stores: Store[]): string | null {
  const user = useAuthStore((s) => s.user);
  const isAdmin = useAuthStore((s) => s.hasRole('ADMIN'));

  return useMemo(() => {
    if (isAdmin) return null;
    return inferManagerStoreId(stores, user?.email, user?.store_id);
  }, [isAdmin, stores, user?.email, user?.store_id]);
}
