import { format, isValid, parseISO } from 'date-fns';
import {
  useDateDisplayStore,
  type DatePattern,
} from '../stores/date-display';

const PATTERNS: Record<
  DatePattern,
  { date: string; dateTime: string; dayMonth: string }
> = {
  DMY: {
    date: 'dd/MM/yyyy',
    dateTime: 'dd/MM/yyyy HH:mm',
    dayMonth: 'dd/MM',
  },
  MDY: {
    date: 'MM/dd/yyyy',
    dateTime: 'MM/dd/yyyy HH:mm',
    dayMonth: 'MM/dd',
  },
  YMD: {
    date: 'yyyy-MM-dd',
    dateTime: 'yyyy-MM-dd HH:mm',
    dayMonth: 'MM-dd',
  },
};

function coerceDate(input: string | Date | null | undefined): Date | null {
  if (input == null || input === '') return null;
  if (input instanceof Date) return isValid(input) ? input : null;
  if (typeof input === 'string') {
    const s = input.trim();
    // Plain calendar date from <input type="date"> — parse in local time (parseISO is UTC midnight).
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, mo, d] = s.split('-').map(Number);
      const local = new Date(y, mo - 1, d, 12, 0, 0, 0);
      return isValid(local) ? local : null;
    }
  }
  const parsed = parseISO(input as string);
  if (isValid(parsed)) return parsed;
  const d = new Date(input as string);
  return isValid(d) ? d : null;
}

function activePattern(): DatePattern {
  return useDateDisplayStore.getState().datePattern;
}

/** Calendar / list date only (respects Settings → date format). */
export function formatUiDate(input: string | Date | null | undefined): string {
  const d = coerceDate(input);
  if (!d) return '—';
  return format(d, PATTERNS[activePattern()].date);
}

/** Date + 24h time */
export function formatUiDateTime(input: string | Date | null | undefined): string {
  const d = coerceDate(input);
  if (!d) return '—';
  return format(d, PATTERNS[activePattern()].dateTime);
}

export function formatUiTime(input: string | Date | null | undefined): string {
  const d = coerceDate(input);
  if (!d) return '—';
  return format(d, 'HH:mm');
}

/** Compact day/month for week headers (e.g. 08/04 or 04/08). */
export function formatUiDayMonth(d: Date): string {
  return format(d, PATTERNS[activePattern()].dayMonth);
}

/** Full date from a Date object (calendar tooltips / subtitles). */
export function formatUiFullFromDate(d: Date): string {
  return format(d, PATTERNS[activePattern()].date);
}
