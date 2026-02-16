// src/pages/manager/CalendarPage.tsx
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  RefreshCw,
  MapPin,
  Plus,
  LayoutGrid,
  Rows3,
  Clock,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import type { Installation } from '../../types';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../stores/auth-simple';
import { listInstallations } from '../../api/installations';
import { useTranslation } from 'react-i18next';

/* =============== Date helpers =============== */
const MONDAY = 1;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function startOfMonth(d: Date) {
  const x = new Date(d);
  x.setDate(1);
  return startOfDay(x);
}
function endOfMonth(d: Date) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + 1, 0);
  return endOfDay(x);
}
function addMonths(d: Date, n: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}
function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const day = x.getDay() || 7; // Sunday -> 7
  const diff = day - MONDAY;
  x.setDate(x.getDate() - diff);
  return x;
}
function endOfWeek(d: Date) {
  const x = startOfWeek(d);
  x.setDate(x.getDate() + 6);
  return endOfDay(x);
}
function addWeeks(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n * 7);
  return x;
}
function eachDayGrid(monthDate: Date) {
  // 6 rows * 7 cols = 42
  const start = startOfMonth(monthDate);
  const startWeekday = (start.getDay() + 6) % 7; // Monday=0
  const first = new Date(start);
  first.setDate(first.getDate() - startWeekday);

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(first);
    d.setDate(first.getDate() + i);
    days.push(d);
  }
  return days;
}
function eachDayOfWeek(weekAnchor: Date) {
  const begin = startOfWeek(weekAnchor);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(begin);
    d.setDate(begin.getDate() + i);
    return d;
  });
}
function fmtYYYYMMDD(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
function toLocalHM(iso?: string) {
  if (!iso) return '';
  const dt = new Date(iso);
  return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Display helpers DD/MM and DD/MM/YYYY
function fmtDDMM(d: Date) {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}
function fmtDDMMYYYY(d: Date) {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
}

/* =============== Week layout constants =============== */
const DAY_START = 8; // 08:00
const DAY_END = 20; // 20:00 (exclusive)
const HOUR_HEIGHT = 56; // px per hour
const HOURS = Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => DAY_START + i);
const COLUMN_HEIGHT = (DAY_END - DAY_START) * HOUR_HEIGHT;

/* =============== Status color classes (match InstallationsPage) =============== */
function statusClasses(s: Installation['status']) {
  switch (s) {
    case 'completed':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';

    case 'in_progress':
      return 'border-amber-200 bg-amber-50 text-amber-700';

    case 'failed':
      return 'border-rose-200 bg-rose-50 text-rose-700';

    case 'after_sale_service':
      return 'border-sky-200 bg-sky-50 text-sky-700';

    case 'staged':
      return 'border-blue-200 bg-blue-50 text-blue-700';

    case 'canceled': // backend
    case 'cancelled': // safety
      return 'border-zinc-200 bg-zinc-50 text-zinc-700';

    case 'scheduled':
      // "pending" look
      return 'border-gray-200 bg-gray-50 text-gray-700';

    default:
      return 'border-gray-200 bg-gray-50 text-gray-700';
  }
}

/* =============== Week-view overlap groups (Option 1 with popout) =============== */

type DayEventInfo = {
  inst: Installation;
  top: number;
  bottom: number;
};

type OverlapGroup = {
  top: number;
  bottom: number;
  events: DayEventInfo[];
};

// Build groups of overlapping events (by time) for a single day
function computeOverlapGroups(events: Installation[]): OverlapGroup[] {
  if (!events.length) return [];

  // Map events to vertical positions
  const infos: DayEventInfo[] = events.map((ev) => {
    const s = new Date(ev.scheduled_start || new Date());
    const e = ev.scheduled_end ? new Date(ev.scheduled_end) : new Date(s);

    const sh = s.getHours() + s.getMinutes() / 60;
    const eh = e.getHours() + e.getMinutes() / 60;

    const startClamped = Math.max(DAY_START, Math.min(sh, DAY_END));
    const endClamped = Math.max(DAY_START, Math.min(eh, DAY_END));
    const duration = Math.max(0.25, endClamped - startClamped); // ≥ 15 min

    const top = (startClamped - DAY_START) * HOUR_HEIGHT;
    const height = Math.max(28, duration * HOUR_HEIGHT);
    const bottom = top + height;

    return { inst: ev, top, bottom };
  });

  // Sort by start
  infos.sort((a, b) => a.top - b.top || a.bottom - b.bottom);

  const groups: OverlapGroup[] = [];
  for (const info of infos) {
    const last = groups[groups.length - 1];
    if (!last || info.top > last.bottom) {
      // New group
      groups.push({ top: info.top, bottom: info.bottom, events: [info] });
    } else {
      // Extend existing group
      last.events.push(info);
      if (info.bottom > last.bottom) last.bottom = info.bottom;
      if (info.top < last.top) last.top = info.top;
    }
  }

  // Ensure enough height for stacked rows when expanded
  for (const g of groups) {
    const minByCount = g.events.length * 22; // ~22px per row when expanded
    const natural = g.bottom - g.top;
    const finalHeight = Math.max(32, natural, minByCount);
    g.bottom = g.top + finalHeight;
  }

  return groups;
}

/* =============== Component =============== */
type ViewMode = 'month' | 'week';

export default function CalendarPage() {
  const { user } = useAuthStore();
  const { t, i18n } = useTranslation('common');

  const [mode, setMode] = useState<ViewMode>('month');
  const [cursor, setCursor] = useState<Date>(() => new Date());
  const [openGroupId, setOpenGroupId] = useState<string | null>(null); // for week-view popouts

  // Visible ranges
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const weekStart = startOfWeek(cursor);
  const weekEnd = endOfWeek(cursor);

  const from = mode === 'month' ? monthStart : weekStart;
  const to = mode === 'month' ? monthEnd : weekEnd;

  const storeFilter =
    user?.role === 'STORE_MANAGER' && (user as any).store_id
      ? (user as any).store_id
      : undefined;

  // Fetch installs (server filters by store; client filters by date)
  const query = useQuery({
    queryKey: ['installations', { mode, store_id: storeFilter }],
    queryFn: async () => {
      const res = await listInstallations({
        store_id: storeFilter,
        limit: 200,
        offset: 0,
      });

      const apiItems = (res as any).data ?? [];
      const mapped: Installation[] = apiItems.map((i: any) => ({
        id: i.id,
        order_id: i.external_order_id ?? '', // installation code
        store_id: i.store_id,
        scheduled_start: i.scheduled_start,
        scheduled_end: i.scheduled_end,
        status: i.status,
        capacity_slot_id: (i as any).capacity_slot_id ?? undefined,
        notes: i.notes ?? '',
        created_at: i.created_at,
        updated_at: i.updated_at,
      }));

      return mapped;
    },
  });

  const installations = query.data ?? [];

  /* ---- Date helpers shared by both views ---- */
  const todayStr = fmtYYYYMMDD(new Date());
  const isSameMonth = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

  // Client-side date filter per visible range
  const filteredByRange = useMemo(() => {
    const fromMs = from.getTime();
    const toMs = to.getTime();
    return installations.filter((inst) => {
      if (!inst.scheduled_start) return false;
      const d = new Date(inst.scheduled_start);
      d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
      const tMs = d.getTime();
      return tMs >= fromMs && tMs <= toMs;
    });
  }, [installations, from, to]);

  /* ---- Monthly prep ---- */
  const monthDays = useMemo(() => eachDayGrid(cursor), [cursor]);

  const monthLabel = useMemo(
    () =>
      monthStart.toLocaleDateString(i18n.language, {
        month: 'long',
        year: 'numeric',
      }),
    [monthStart, i18n.language]
  );

  const byDayMonth = useMemo(() => {
    const m = new Map<string, Installation[]>();

    for (const inst of filteredByRange) {
      if (!inst.scheduled_start) continue;

      const d = new Date(inst.scheduled_start);
      d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
      const key = fmtYYYYMMDD(d);

      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(inst);
    }

    for (const [, arr] of m) {
      arr.sort((a, b) =>
        (a.scheduled_start || '').localeCompare(b.scheduled_start || '')
      );
    }

    return m;
  }, [filteredByRange]);

  /* ---- Weekly prep ---- */
  const weekDays = useMemo(() => eachDayOfWeek(cursor), [cursor]);
  const weekLabel = `${fmtDDMMYYYY(weekStart)} – ${fmtDDMMYYYY(weekEnd)}`;

  const byDayWeek = useMemo(() => {
    const m = new Map<string, Installation[]>();

    for (const inst of filteredByRange) {
      if (!inst.scheduled_start) continue;

      const d = new Date(inst.scheduled_start);
      d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
      const key = fmtYYYYMMDD(d);

      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(inst);
    }

    for (const [, arr] of m) {
      arr.sort((a, b) =>
        (a.scheduled_start || '').localeCompare(b.scheduled_start || '')
      );
    }

    return m;
  }, [filteredByRange]);

  /* ---- Navigation ---- */
  const prevAction = () =>
    setCursor((c) => (mode === 'month' ? addMonths(c, -1) : addWeeks(c, -1)));
  const nextAction = () =>
    setCursor((c) => (mode === 'month' ? addMonths(c, +1) : addWeeks(c, +1)));
  const todayAction = () => setCursor(new Date());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            className="rounded-md border p-2 hover:bg-gray-50"
            onClick={prevAction}
            aria-label={t('calendarPage.prev')}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            className="rounded-md border p-2 hover:bg-gray-50"
            onClick={nextAction}
            aria-label={t('calendarPage.next')}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="ml-1">
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              <CalendarIcon className="h-6 w-6 text-gray-700" />
              {mode === 'month' ? monthLabel : t('calendarPage.weekView')}
            </h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-gray-500">
              {mode === 'month'
                ? `${fmtDDMMYYYY(monthStart)} – ${fmtDDMMYYYY(monthEnd)}`
                : weekLabel}
              {storeFilter && (
                <span className="inline-flex items-center gap-1 text-gray-600">
                  <MapPin className="h-4 w-4" />{' '}
                  {t('calendarPage.storeLabelShort')}: {storeFilter}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border bg-white p-0.5">
            <button
              className={cn(
                'inline-flex items-center gap-1 rounded px-3 py-1.5 text-sm',
                mode === 'month'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600'
              )}
              onClick={() => setMode('month')}
              title={t('calendarPage.monthly')}
            >
              <LayoutGrid className="h-4 w-4" /> {t('calendarPage.month')}
            </button>
            <button
              className={cn(
                'inline-flex items-center gap-1 rounded px-3 py-1.5 text-sm',
                mode === 'week'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600'
              )}
              onClick={() => setMode('week')}
              title={t('calendarPage.weekly')}
            >
              <Rows3 className="h-4 w-4" /> {t('calendarPage.week')}
            </button>
          </div>

          <button
            onClick={() => query.refetch()}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
            disabled={query.isFetching}
          >
            <RefreshCw
              className={cn('h-4 w-4', query.isFetching && 'animate-spin')}
            />
            {t('calendarPage.refresh')}
          </button>
          <button
            onClick={todayAction}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
            title={t('calendarPage.jumpToThisMonth')}
          >
            <Clock className="h-4 w-4" />
            {t('calendarPage.today')}
          </button>
          <Link
            to="/app/installations/new"
            className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-3 py-2 text-sm text-white hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            {t('calendarPage.createInstallation')}
          </Link>
        </div>
      </div>

      {/* Legend – match InstallationsPage chips */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded border border-gray-200 bg-gray-50" />
          {t('calendarPage.legend.pending', { defaultValue: 'Pending' })}
        </span>

        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded border border-blue-200 bg-blue-50" />
          {t('calendarPage.legend.staged', { defaultValue: 'Staged' })}
        </span>

        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded border border-amber-200 bg-amber-50" />
          {t('calendarPage.legend.inProgress', { defaultValue: 'In Progress' })}
        </span>

        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded border border-emerald-200 bg-emerald-50" />
          {t('calendarPage.legend.completed', { defaultValue: 'Completed' })}
        </span>

        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded border border-rose-200 bg-rose-50" />
          {t('calendarPage.legend.failed', { defaultValue: 'Failed' })}
        </span>

        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded border border-zinc-200 bg-zinc-50" />
          {t('calendarPage.legend.cancelled', { defaultValue: 'Cancelled' })}
        </span>

        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded border border-sky-200 bg-sky-50" />
          {t('calendarPage.legend.afterSaleService', {
            defaultValue: 'After Sale Service',
          })}
        </span>
      </div>

      {/* ===== Month View ===== */}
      {mode === 'month' ? (
        <div className="overflow-hidden rounded-lg border bg-white">
          <div className="grid grid-cols-7 border-b bg-gray-50 text-xs font-medium uppercase text-gray-500">
            {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((dKey) => (
              <div key={dKey} className="px-3 py-2">
                {t(`calendarPage.weekdays.${dKey}`)}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthDays.map((d, idx) => {
              const key = fmtYYYYMMDD(d);
              const isCurrentMonth = isSameMonth(d, monthStart);
              const events = byDayMonth.get(key) ?? [];
              const isToday = key === todayStr;

              return (
                <div
                  key={idx}
                  className={cn(
                    'min-h-[120px] border-b border-r p-2 align-top',
                    (idx + 1) % 7 === 0 && 'border-r-0',
                    !isCurrentMonth && 'bg-gray-50'
                  )}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={cn(
                        'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                        isToday ? 'bg-primary-600 text-white' : 'text-gray-700'
                      )}
                      title={key}
                    >
                      {d.getDate()}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {fmtDDMMYYYY(d)}
                    </span>
                  </div>

                  <div className="space-y-1">
                    {events.slice(0, 3).map((ev) => (
                      <Link
                        to={`/app/installations/${ev.id}`}
                        key={ev.id}
                        className={cn(
                          'block truncate rounded border px-2 py-1 text-[11px] font-medium hover:opacity-90',
                          statusClasses(ev.status)
                        )}
                        title={ev.order_id || ev.id}
                      >
                        {ev.order_id || ev.id}
                      </Link>
                    ))}
                    {events.length > 3 && (
                      <div className="text-[11px] text-gray-500">
                        +{events.length - 3} {t('calendarPage.more')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {query.isLoading && (
            <div className="px-4 py-6 text-sm text-gray-500">
              {t('calendarPage.loadingInstallations')}
            </div>
          )}
          {query.isError && (
            <div className="px-4 py-6 text-sm text-red-600">
              {t('calendarPage.failedToLoadInstallations')}
            </div>
          )}
          {!query.isLoading && filteredByRange.length === 0 && (
            <div className="px-4 py-6 text-sm text-gray-500">
              {t('calendarPage.noInstallationsThisMonth')}
            </div>
          )}
        </div>
      ) : (
        /* ===== Week View ===== */
        <div className="overflow-hidden rounded-lg border bg-white">
          {/* Week header */}
          <div className="grid grid-cols-[80px_repeat(7,minmax(0,1fr))] border-b bg-gray-50">
            <div className="px-2 py-2 text-xs font-medium uppercase text-gray-500">
              {t('calendarPage.timeColumn')}
            </div>
            {weekDays.map((d) => {
              const isToday = fmtYYYYMMDD(d) === todayStr;
              return (
                <div
                  key={d.toISOString()}
                  className="px-2 py-2 text-xs font-medium uppercase text-gray-500"
                >
                  <div
                    className={cn(
                      'inline-flex items-center gap-2 rounded px-2 py-1',
                      isToday && 'bg-primary-100 text-primary-800'
                    )}
                  >
                    {d.toLocaleDateString(i18n.language, {
                      weekday: 'short',
                    })}{' '}
                    <span className="text-gray-500">{fmtDDMM(d)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grid: left time ruler + 7 day columns */}
          <div className="grid grid-cols-[80px_repeat(7,minmax(0,1fr))]">
            {/* Left time ruler */}
            <div
              className="relative border-r"
              style={{ height: COLUMN_HEIGHT }}
            >
              {HOURS.slice(0, -1).map((h, i) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 border-b border-gray-100"
                  style={{ top: i * HOUR_HEIGHT }}
                />
              ))}
              {HOURS.map((h, i) => (
                <div
                  key={`label-${h}`}
                  className="absolute right-2 -translate-y-2 text-[11px] text-gray-500"
                  style={{ top: i * HOUR_HEIGHT }}
                >
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map((day) => {
              const key = fmtYYYYMMDD(day);
              const events = byDayWeek.get(key) ?? [];
              const groups = computeOverlapGroups(events);

              return (
                <div
                  key={key}
                  className="relative border-r bg-white last:border-r-0"
                  style={{ height: COLUMN_HEIGHT }}
                >
                  {/* Hour lines */}
                  {HOURS.slice(0, -1).map((h, i) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-b border-gray-100"
                      style={{ top: i * HOUR_HEIGHT }}
                    />
                  ))}

                  {/* Groups (one main block per overlapping cluster) */}
                  {groups.map((g, gi) => {
                    const groupId = `${key}-${gi}`;
                    const expanded = openGroupId === groupId;
                    const primary = g.events[0];
                    const others = g.events.slice(1);

                    if (expanded) {
                      // Expanded: show full card listing all installations
                      return (
                        <div
                          key={groupId}
                          className="absolute left-1 right-1 rounded-md border border-gray-200 bg-white shadow-sm"
                          style={{ top: g.top, height: g.bottom - g.top }}
                        >
                          <div className="flex justify-between items-center px-2 py-1 border-b border-gray-100 text-[11px] font-semibold text-gray-700">
                            <span>
                              {toLocalHM(
                                primary.inst.scheduled_start
                              )}–{toLocalHM(primary.inst.scheduled_end)}
                            </span>
                            <button
                              className="text-[10px] text-gray-500 hover:text-gray-700"
                              onClick={() => setOpenGroupId(null)}
                            >
                              ×
                            </button>
                          </div>
                          <div className="flex h-full flex-col gap-0.5 overflow-auto px-1 py-1">
                            {g.events.map((info) => {
                              const ev = info.inst;
                              return (
                                <Link
                                  to={`/app/installations/${ev.id}`}
                                  key={ev.id}
                                  className={cn(
                                    'flex items-center justify-between gap-1 rounded px-1 py-0.5 text-[11px] font-medium hover:opacity-90',
                                    statusClasses(ev.status)
                                  )}
                                  title={`${ev.order_id || ev.id} • ${toLocalHM(
                                    ev.scheduled_start
                                  )}–${toLocalHM(ev.scheduled_end)}`}
                                >
                                  <span className="truncate">
                                    {ev.order_id || ev.id}
                                  </span>
                                  <span className="ml-1 flex-shrink-0 text-[10px] opacity-80">
                                    {toLocalHM(ev.scheduled_start)}–
                                    {toLocalHM(ev.scheduled_end)}
                                  </span>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }

                    // Collapsed: show only primary block + optional "+N more"
                    const ev = primary.inst;

                    return (
                      <Link
                        to={`/app/installations/${ev.id}`}
                        key={groupId}
                        className={cn(
                          'absolute left-1 right-1 overflow-hidden rounded border px-2 py-1 text-[11px] font-medium shadow-sm transition-opacity hover:opacity-90',
                          statusClasses(ev.status)
                        )}
                        style={{ top: g.top, height: g.bottom - g.top }}
                        title={`${ev.order_id || ev.id} • ${toLocalHM(
                          ev.scheduled_start
                        )}–${toLocalHM(ev.scheduled_end)}`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate">
                            {ev.order_id || ev.id}
                          </span>
                          <span className="ml-1 flex-shrink-0 text-[10px] opacity-80">
                            {toLocalHM(ev.scheduled_start)}–
                            {toLocalHM(ev.scheduled_end)}
                          </span>
                        </div>
                        {others.length > 0 && (
                          <button
                            className="mt-1 inline-flex items-center rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-medium text-gray-700 shadow-sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setOpenGroupId(
                                openGroupId === groupId ? null : groupId
                              );
                            }}
                          >
                            +{others.length} more
                          </button>
                        )}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {query.isLoading && (
            <div className="px-4 py-6 text-sm text-gray-500">
              {t('calendarPage.loadingInstallations')}
            </div>
          )}
          {query.isError && (
            <div className="px-4 py-6 text-sm text-red-600">
              {t('calendarPage.failedToLoadInstallations')}
            </div>
          )}
          {!query.isLoading && filteredByRange.length === 0 && (
            <div className="px-4 py-6 text-sm text-gray-500">
              {t('calendarPage.noInstallationsThisWeek')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
