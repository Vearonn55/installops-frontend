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
export function orderIdMatchesNumericSuffix(orderId: string | null | undefined, needle: string): boolean {
  const id = String(orderId ?? '').trim();
  const n = String(needle ?? '').trim();
  if (!n || !/^\d+$/.test(n)) return false;
  return id.replace(/\D/g, '').endsWith(n);
}

export function orderMatchesSearch(o: Order, needle: string): boolean {
  const raw = String(needle ?? '').trim();
  if (/^\d+$/.test(raw)) {
    return (
      orderIdMatchesNumericSuffix(o.id, raw) ||
      orderIdMatchesNumericSuffix(o.external_order_id, raw)
    );
  }
  return (
    textMatchesSearch(o.id, needle) ||
    textMatchesSearch(o.external_order_id, needle) ||
    textMatchesSearch(o.customer_name, needle)
  );
}
