/** Turkish-aware lowercase for substring search (ı≠i, ö≠o, etc.). */
export function normalizeForSearch(raw: string | null | undefined): string {
  return String(raw ?? '').toLocaleLowerCase('tr');
}

/** Case-insensitive substring; characters must match (sal → salih, salıh ↛ salih). */
export function textMatchesSearch(
  haystack: string | null | undefined,
  needle: string
): boolean {
  const n = normalizeForSearch(needle);
  if (!n) return true;
  return normalizeForSearch(haystack).includes(n);
}

/**
 * Netsis NetOpenX ItemSlips `q` only understands SQL LIKE (İ ≠ I).
 * Send slip/order-number shaped queries to the API; filter customer names in the browser.
 */
export function netsisApiSearchQ(raw: string): string {
  const t = raw.trim();
  if (!t || /\s/.test(t) || !/\d/.test(t)) return '';
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(t)) return '';
  return t;
}
