import type { Store } from '../api/stores';

/** Pick the single store a store manager should see. */
export function inferManagerStoreId(
  stores: Store[],
  email?: string | null,
  userStoreId?: string | null
): string | null {
  // Assigned store on the user record wins — even before stores list has loaded.
  if (userStoreId) {
    if (!stores.length || stores.some((s) => s.id === userStoreId)) {
      return userStoreId;
    }
  }
  if (stores.length === 1) return stores[0].id;
  const em = (email || '').toLowerCase();
  for (const s of stores) {
    const name = (s.name || '').toLowerCase();
    const ext = (s.external_store_id || '').toLowerCase();
    if (name && em.includes(name)) return s.id;
    if (ext && em.includes(ext)) return s.id;
  }
  if (em.includes('weltew') || em.includes('weltev')) {
    const hit = stores.find((s) => /weltew|weltev/i.test(s.name || ''));
    if (hit) return hit.id;
  }
  if (em.includes('lajivert')) {
    const hit = stores.find((s) => /lajivert/i.test(s.name || ''));
    if (hit) return hit.id;
  }
  return stores[0]?.id ?? null;
}
