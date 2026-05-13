import type { Store } from '../api/stores';

/** Pick the single store a store manager should see (Weltew vs Lajivert, etc.). */
export function inferManagerStoreId(
  stores: Store[],
  email?: string | null
): string | null {
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
