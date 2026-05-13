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
