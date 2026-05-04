/** Local calendar YYYY-MM-DD (no UTC shift). */
export function toLocalYmd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isoToLocalYmd(iso: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '';
  return toLocalYmd(parsed);
}
