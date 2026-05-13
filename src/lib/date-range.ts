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

/** Default range for Installations: last month through next month (recent + upcoming). */
export function defaultDateRangeInstallationsList(
  now: Date = new Date()
): { from: string; to: string } {
  return {
    from: toYmd(addCalendarMonths(now, -1)),
    to: toYmd(addCalendarMonths(now, 1)),
  };
}

/** YYYY-MM-DD from an ISO / SQL datetime string. */
export function ymdFromIsoTimestamp(iso: string | null | undefined): string {
  if (!iso) return '';
  const s = String(iso).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = parseOrderDate(s);
  return d ? toYmd(d) : '';
}

/** True when scheduled (or created) range overlaps inclusive filter [from, to] (YYYY-MM-DD). */
export function installationInDateRange(
  opts: {
    scheduledStart?: string | null;
    scheduledEnd?: string | null;
    createdAt?: string | null;
  },
  from: string,
  to: string
): boolean {
  if (!from || !to) return true;
  const startYmd = ymdFromIsoTimestamp(opts.scheduledStart);
  const endYmd = ymdFromIsoTimestamp(opts.scheduledEnd ?? opts.scheduledStart);
  const fallbackYmd = ymdFromIsoTimestamp(opts.createdAt);
  const rangeStart = startYmd || fallbackYmd;
  const rangeEnd = endYmd || rangeStart;
  if (!rangeStart) return false;
  return rangeStart <= to && rangeEnd >= from;
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
