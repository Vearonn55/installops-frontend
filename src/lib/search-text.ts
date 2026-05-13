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
