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
