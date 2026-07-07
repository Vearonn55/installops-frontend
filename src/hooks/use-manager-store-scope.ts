import { useMemo } from 'react';
import { useAuthStore } from '../stores/auth';

export type ManagerStoreScope = {
  /** Manager's home store (`users.store_id`) — use for creates and locked pickers. */
  homeStoreId: string | null;
  /** Stores the manager may view (group siblings or home only). Null for admins (no automatic filter). */
  visibleStoreIds: string[] | null;
  storeGroupName: string | null;
  isGrouped: boolean;
};

/** Manager visibility across optional store groups; admins get `visibleStoreIds: null`. */
export function useManagerStoreScope(): ManagerStoreScope {
  const user = useAuthStore((s) => s.user);
  const isAdmin = useAuthStore((s) => s.hasRole('ADMIN'));

  return useMemo(() => {
    const homeStoreId = user?.store_id ?? null;
    if (isAdmin) {
      return {
        homeStoreId,
        visibleStoreIds: null,
        storeGroupName: null,
        isGrouped: false,
      };
    }

    const group = user?.store_group;
    const visibleStoreIds =
      group?.store_ids?.length
        ? group.store_ids
        : homeStoreId
          ? [homeStoreId]
          : [];

    return {
      homeStoreId,
      visibleStoreIds,
      storeGroupName: group?.name ?? null,
      isGrouped: Boolean(group && group.store_ids.length > 1),
    };
  }, [user?.store_group, user?.store_id, isAdmin]);
}

/** True when viewing a job that belongs to a sibling store in the manager's group. */
export function isSiblingStoreJob(
  scope: ManagerStoreScope,
  resourceStoreId: string | undefined | null
): boolean {
  if (!scope.homeStoreId || !resourceStoreId) return false;
  return String(resourceStoreId) !== String(scope.homeStoreId);
}
