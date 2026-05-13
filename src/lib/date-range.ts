/** Local calendar date as YYYY-MM-DD (for `<input type="date">`). */
export function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addCalendarMonths(base: Date, months: number): Date {
  const x = new Date(base);
  x.setMonth(x.getMonth() + months);
  return x;
}

/** Default report/list range: today through the same calendar day one month ahead. */
export function defaultDateRangeOneMonthAhead(
  now: Date = new Date()
): { from: string; to: string } {
  return {
    from: toYmd(now),
    to: toYmd(addCalendarMonths(now, 1)),
  };
}

/** Parse order timestamps from API (`2023-11-28 00:00:00`, ISO, etc.). */
export function parseOrderDate(raw: string | null | undefined): Date | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  const normalized = s.includes('T') ? s : s.replace(' ', 'T');
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Default range for the Orders list: last calendar month through today. */
export function defaultDateRangeOrdersList(
  now: Date = new Date()
): { from: string; to: string } {
  return {
    from: toYmd(addCalendarMonths(now, -1)),
    to: toYmd(now),
  };
}
