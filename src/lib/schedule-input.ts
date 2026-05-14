import { format, isValid, parseISO } from 'date-fns';

function coerceDate(input: string | null | undefined): Date | null {
  if (!input) return null;
  const parsed = parseISO(input);
  if (isValid(parsed)) return parsed;
  const d = new Date(input);
  return isValid(d) ? d : null;
}

/** `YYYY-MM-DD` → `DD/MM/YYYY` for schedule text inputs. */
export function formatScheduleDateInput(ymd: string): string {
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** Parse `DD/MM/YYYY` → `YYYY-MM-DD` or null. */
export function parseScheduleDateInput(text: string): string | null {
  const m = text.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, mo - 1, d, 12, 0, 0, 0);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Parse `HH:mm` (24h) or null. */
export function parseScheduleTimeInput(text: string): string | null {
  const m = text.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/** ISO / API datetime → `DD/MM/YYYY HH:mm` for edit form text inputs. */
export function formatScheduleDateTimeInput(iso: string | null | undefined): string {
  const d = coerceDate(iso);
  if (!d) return '';
  return format(d, 'dd/MM/yyyy HH:mm');
}

/** Parse `DD/MM/YYYY HH:mm` → ISO string or null. */
export function parseScheduleDateTimeInput(text: string): string | null {
  const m = text.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  const h = Number(m[4]);
  const min = Number(m[5]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h < 0 || h > 23 || min < 0 || min > 59) return null;
  const dt = new Date(y, mo - 1, d, h, min, 0, 0);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== mo - 1 ||
    dt.getDate() !== d ||
    dt.getHours() !== h ||
    dt.getMinutes() !== min
  ) {
    return null;
  }
  return dt.toISOString();
}
