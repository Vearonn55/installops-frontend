/** Fold Turkish letters so "oz" matches "öz", etc. */
export function foldForSearch(raw: string | null | undefined): string {
  return String(raw ?? '')
    .toLocaleLowerCase('tr')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

export function textMatchesSearch(
  haystack: string | null | undefined,
  needle: string
): boolean {
  const n = foldForSearch(needle);
  if (!n) return true;
  return foldForSearch(haystack).includes(n);
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
