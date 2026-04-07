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
  const parsed = parseISO(input);
  if (isValid(parsed)) return parsed;
  const d = new Date(input);
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
