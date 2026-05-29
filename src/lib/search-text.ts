import type { Order } from '../api/orders';

/** Turkish-aware lowercase for substring search (ı≠i, ö≠o, etc.). */
export function normalizeForSearch(raw: string | null | undefined): string {
  return String(raw ?? '').toLocaleLowerCase('tr');
}

/** Collapse whitespace for multi-word name matching. */
export function normalizeSearchNeedle(raw: string): string {
  return normalizeForSearch(raw).replace(/\s+/g, ' ').trim();
}

/** Case-insensitive substring; characters must match (sal → salih, salıh ↛ salih). */
export function textMatchesSearch(
  haystack: string | null | undefined,
  needle: string
): boolean {
  const n = normalizeSearchNeedle(needle);
  if (!n) return true;
  const hay = normalizeForSearch(haystack).replace(/\s+/g, ' ');
  return hay.includes(n);
}

/** Orders list search: partial external id suffix or customer name. */
export function orderMatchesSearch(o: Order, needle: string): boolean {
  return (
    textMatchesSearch(o.id, needle) ||
    textMatchesSearch(o.external_order_id, needle) ||
    textMatchesSearch(o.customer_name, needle)
  );
}
