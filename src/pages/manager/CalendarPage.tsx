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
import { useAuthStore } from '../../stores/auth';
import { listInstallations, type Installation as ApiInstallation } from '../../api/installations';
import { listTransfers, type Transfer } from '../../api/transfers';
import { listStores } from '../../api/stores';
import {
  normalizeTransferStatus,
  transferStatusBadgeClass,
} from '../../lib/transfer-status';
import { useManagerStoreScope } from '../../hooks/use-manager-store-scope';
import CalendarDayEventsModal, {
  type CalendarDayEvent,
} from '../../components/manager/CalendarDayEventsModal';
import { useTranslation } from 'react-i18next';
import { formatUiDayMonth, formatUiFullFromDate, formatUiTime } from '../../lib/date-display';

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
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function isoToLocalYMD(iso?: string) {
  if (!iso) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return fmtYYYYMMDD(d);
}
function toLocalHM(iso?: string) {
  if (!iso) return '';
  return formatUiTime(iso);
}

/* =============== Week layout constants =============== */
const DAY_START = 8; // 08:00
const DAY_END = 20; // 20:00 (exclusive)
const HOUR_HEIGHT = 56; // px per hour
const HOURS = Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => DAY_START + i);
const COLUMN_HEIGHT = (DAY_END - DAY_START) * HOUR_HEIGHT;
const MONTH_CELL_EVENT_LIMIT = 3;

/* =============== Calendar event helpers =============== */
type CalendarInstallation = Installation & {
  install_code?: string;
  customer_name?: string | null;
};

type CalendarEventKind = 'installation' | 'transfer';

type CalendarEvent = {
  kind: CalendarEventKind;
  id: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  label: string;
  subtitle?: string;
  store_id?: string;
};

function formatDepotLabel(code?: number | null, label?: string | null): string {
  if (label?.trim()) return label.trim();
  if (code != null && !Number.isNaN(code)) return String(code);
  return '—';
}

function calendarInstallationLabel(inst: CalendarInstallation): string {
  const name = (inst.customer_name || '').trim();
  if (name) return name;
  const code = (inst.install_code || '').trim();
  if (code) return code;
  return inst.order_id || inst.id;
}

function mapInstallationToEvent(inst: CalendarInstallation): CalendarEvent {
  return {
    kind: 'installation',
    id: inst.id,
    scheduled_start: inst.scheduled_start,
    scheduled_end: inst.scheduled_end,
    status: inst.status,
    label: calendarInstallationLabel(inst),
    subtitle: inst.order_id || inst.install_code,
    store_id: inst.store_id,
  };
}

function mapTransferToEvent(tr: Transfer): CalendarEvent {
  const source = formatDepotLabel(tr.source_depot_code, tr.source_depot_label);
  const dest = formatDepotLabel(tr.dest_depot_code, tr.dest_depot_label);
  return {
    kind: 'transfer',
    id: tr.id,
    scheduled_start: tr.scheduled_start ?? '',
    scheduled_end: tr.scheduled_end ?? tr.scheduled_start ?? '',
    status: tr.status,
    label: `${source} → ${dest}`,
    subtitle: tr.transfer_code || tr.external_transfer_id,
    store_id: tr.store_id,
  };
}

function calendarEventPath(ev: CalendarEvent): string {
  return ev.kind === 'transfer'
    ? `/app/transfers/${ev.id}`
    : `/app/installations/${ev.id}`;
}

function calendarEventTitle(ev: CalendarEvent, statusLabel: string): string {
  const parts = [ev.label];
  if (ev.subtitle) parts.push(ev.subtitle);
  parts.push(statusLabel);
  if (ev.scheduled_start) {
    parts.push(`${toLocalHM(ev.scheduled_start)}–${toLocalHM(ev.scheduled_end)}`);
  }
  return parts.join(' • ');
}

function calendarEventStatusClasses(ev: CalendarEvent): string {
  if (ev.kind === 'transfer') {
    return transferStatusBadgeClass(normalizeTransferStatus(ev.status));
  }
  return statusClasses(ev.status as Installation['status']);
}

function calendarEventStatusLabel(
  ev: CalendarEvent,
  t: (key: string) => string
): string {
  if (ev.kind === 'transfer') {
    return t(`transfersPage.statusLabels.${normalizeTransferStatus(ev.status)}`);
  }
  return t(
    `installationsPage.statusLabels.${statusLabelKey(ev.status as Installation['status'])}`
  );
}

function groupEventsByDay(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const m = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    if (!ev.scheduled_start) continue;
    const key = isoToLocalYMD(ev.scheduled_start);
    if (!key) continue;
    if (!m.has(key)) m.set(key, []);
    m.get(key)!.push(ev);
  }
  for (const [, arr] of m) {
    arr.sort((a, b) => (a.scheduled_start || '').localeCompare(b.scheduled_start || ''));
  }
  return m;
}

function TransferKindBadge({ title }: { title: string }) {
  return (
    <span
      className="mr-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded bg-indigo-600 align-middle text-[8px] font-bold leading-none text-white"
      title={title}
      aria-label={title}
    >
      t
    </span>
  );
}

function statusLabelKey(status: Installation['status']): string {
  if (status === 'scheduled') return 'pending';
  if (status === 'canceled') return 'cancelled';
  return status;
}

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
      return 'border-violet-200 bg-violet-50 text-violet-700';

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

/* =============== Component =============== */
type ViewMode = 'month' | 'week';

export default function CalendarPage() {
  const { user, hasRole } = useAuthStore();
  const { t, i18n } = useTranslation('common');
  const isAdmin = hasRole('ADMIN');

  const [mode, setMode] = useState<ViewMode>(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
      ? 'week'
      : 'month'
  );
  const [cursor, setCursor] = useState<Date>(() => new Date());
  const [dayModalDate, setDayModalDate] = useState<Date | null>(null);

  // Visible ranges
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const weekStart = startOfWeek(cursor);
  const weekEnd = endOfWeek(cursor);

  const from = mode === 'month' ? monthStart : weekStart;
  const to = mode === 'month' ? monthEnd : weekEnd;

  const storesQuery = useQuery({
    queryKey: ['stores', 'calendar'],
    queryFn: async () => {
      const res = await listStores({ limit: 200, offset: 0 });
      return res.data ?? [];
    },
  });

  const { homeStoreId, isGrouped, storeGroupName } = useManagerStoreScope();

  const storeNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of storesQuery.data ?? []) {
      m.set(s.id, s.name);
    }
    return m;
  }, [storesQuery.data]);

  const listParams = {
    limit: 300,
    offset: 0,
  };

  const installationsQuery = useQuery({
    queryKey: ['calendar', 'installations', { scope: isAdmin ? 'all' : homeStoreId ?? 'none' }],
    enabled: isAdmin || storesQuery.isSuccess,
    queryFn: async () => {
      const res = await listInstallations(listParams);
      const apiItems = (res.data ?? []) as ApiInstallation[];
      const mapped: CalendarInstallation[] = apiItems.map((i) => ({
        id: i.id,
        order_id: i.external_order_id ?? '',
        install_code: i.install_code,
        customer_name: i.customer_name,
        store_id: i.store_id,
        scheduled_start: i.scheduled_start ?? '',
        scheduled_end: i.scheduled_end ?? '',
        status: i.status as Installation['status'],
        capacity_slot_id: undefined,
        notes: i.notes ?? '',
        created_at: i.created_at,
        updated_at: i.updated_at,
      }));
      return mapped.map(mapInstallationToEvent);
    },
  });

  const transfersQuery = useQuery({
    queryKey: ['calendar', 'transfers', { scope: isAdmin ? 'all' : homeStoreId ?? 'none' }],
    enabled: isAdmin || storesQuery.isSuccess,
    queryFn: async () => {
      const res = await listTransfers(listParams);
      return (res.data ?? []).map(mapTransferToEvent);
    },
  });

  const events = useMemo(
    () => [...(installationsQuery.data ?? []), ...(transfersQuery.data ?? [])],
    [installationsQuery.data, transfersQuery.data]
  );

  const isFetching = installationsQuery.isFetching || transfersQuery.isFetching;
  const isLoading = installationsQuery.isLoading || transfersQuery.isLoading;
  const isError = installationsQuery.isError || transfersQuery.isError;

  const refreshCalendar = () => {
    void installationsQuery.refetch();
    void transfersQuery.refetch();
  };

  const dayModalEvents = useMemo((): CalendarDayEvent[] => {
    if (!dayModalDate) return [];
    const key = fmtYYYYMMDD(dayModalDate);
    return events.filter((ev) => isoToLocalYMD(ev.scheduled_start) === key);
  }, [dayModalDate, events]);

  /* ---- Date helpers shared by both views ---- */
  const todayStr = fmtYYYYMMDD(new Date());
  const isSameMonth = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

  // Client-side date filter per visible range
  const filteredByRange = useMemo(() => {
    const fromMs = from.getTime();
    const toMs = to.getTime();
    return events.filter((ev) => {
      if (!ev.scheduled_start) return false;
      const tMs = new Date(ev.scheduled_start).getTime();
      return tMs >= fromMs && tMs <= toMs;
    });
  }, [events, from, to]);

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

  const byDayMonth = useMemo(
    () => groupEventsByDay(filteredByRange),
    [filteredByRange]
  );

  /* ---- Weekly prep ---- */
  const weekDays = useMemo(() => eachDayOfWeek(cursor), [cursor]);
  const weekLabel = `${formatUiFullFromDate(weekStart)} – ${formatUiFullFromDate(weekEnd)}`;

  const byDayWeek = useMemo(
    () => groupEventsByDay(filteredByRange),
    [filteredByRange]
  );

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
                ? `${formatUiFullFromDate(monthStart)} – ${formatUiFullFromDate(monthEnd)}`
                : weekLabel}
              {isGrouped && storeGroupName ? (
                <span className="inline-flex items-center gap-1 text-gray-600">
                  <MapPin className="h-4 w-4" />
                  {t('calendarPage.groupSubtitle', {
                    name: storeGroupName,
                    count: user?.store_group?.store_ids?.length ?? 0,
                  })}
                </span>
              ) : null}
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <div className="inline-flex w-full rounded-md border bg-white p-0.5 sm:w-auto">
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
            onClick={refreshCalendar}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
            disabled={isFetching}
          >
            <RefreshCw
              className={cn('h-4 w-4', isFetching && 'animate-spin')}
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
          {t('calendarPage.legend.pending')}
        </span>

        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded border border-blue-200 bg-blue-50" />
          {t('calendarPage.legend.staged')}
        </span>

        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded border border-amber-200 bg-amber-50" />
          {t('calendarPage.legend.inProgress')}
        </span>

        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded border border-emerald-200 bg-emerald-50" />
          {t('calendarPage.legend.completed')}
        </span>

        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded border border-rose-200 bg-rose-50" />
          {t('calendarPage.legend.failed')}
        </span>

        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded border border-zinc-200 bg-zinc-50" />
          {t('calendarPage.legend.cancelled')}
        </span>

        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded border border-sky-200 bg-sky-50" />
          {t('calendarPage.legend.afterSaleService')}
        </span>

        <span className="inline-flex items-center gap-2">
          <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded bg-indigo-600 text-[8px] font-bold text-white">
            t
          </span>
          {t('calendarPage.legend.transfer')}
        </span>
      </div>

      {/* ===== Month View ===== */}
      {mode === 'month' ? (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <div className="min-w-[640px]">
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
                      {formatUiFullFromDate(d)}
                    </span>
                  </div>

                  <div className="space-y-1">
                    {events.slice(0, MONTH_CELL_EVENT_LIMIT).map((ev) => {
                      const statusLabel = calendarEventStatusLabel(ev, t);
                      return (
                        <Link
                          to={calendarEventPath(ev)}
                          key={`${ev.kind}-${ev.id}`}
                          className={cn(
                            'block truncate rounded border px-2 py-1 text-[11px] font-medium hover:opacity-90',
                            calendarEventStatusClasses(ev)
                          )}
                          title={calendarEventTitle(ev, statusLabel)}
                        >
                          {ev.kind === 'transfer' ? (
                            <TransferKindBadge title={t('calendarPage.transferIndicator')} />
                          ) : null}
                          {ev.label}
                        </Link>
                      );
                    })}
                    {events.length > MONTH_CELL_EVENT_LIMIT && (
                      <button
                        type="button"
                        onClick={() => setDayModalDate(d)}
                        className="text-left text-[11px] text-primary-700 hover:underline"
                      >
                        +{events.length - MONTH_CELL_EVENT_LIMIT} {t('calendarPage.more')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {isLoading && (
            <div className="px-4 py-6 text-sm text-gray-500">
              {t('calendarPage.loadingEvents')}
            </div>
          )}
          {isError && (
            <div className="px-4 py-6 text-sm text-red-600">
              {t('calendarPage.failedToLoadEvents')}
            </div>
          )}
          {!isLoading && filteredByRange.length === 0 && (
            <div className="px-4 py-6 text-sm text-gray-500">
              {t('calendarPage.noEventsThisMonth')}
            </div>
          )}
          </div>
        </div>
      ) : (
        /* ===== Week View ===== */
        <div className="overflow-x-auto rounded-lg border bg-white">
          {/* Week header */}
          <div className="min-w-[720px]">
          <div className="grid grid-cols-[80px_repeat(7,minmax(0,1fr))] border-b bg-gray-50">
            <div className="px-2 py-2 text-xs font-medium uppercase text-gray-500">
              {t('calendarPage.timeColumn')}
            </div>
            {weekDays.map((d) => {
              const isToday = fmtYYYYMMDD(d) === todayStr;
              return (
                <div
                  key={fmtYYYYMMDD(d)}
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
                    <span className="text-gray-500">{formatUiDayMonth(d)}</span>
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

                  {/* Events */}
                  {events.map((ev) => {
                    const statusLabel = calendarEventStatusLabel(ev, t);
                    const s = new Date(ev.scheduled_start || day);
                    const e = new Date(ev.scheduled_end || s);

                    const sh = s.getHours() + s.getMinutes() / 60;
                    const eh = e.getHours() + e.getMinutes() / 60;

                    const startClamped = Math.max(
                      DAY_START,
                      Math.min(sh, DAY_END)
                    );
                    const endClamped = Math.max(
                      DAY_START,
                      Math.min(eh, DAY_END)
                    );
                    const duration = Math.max(0.25, endClamped - startClamped);

                    const top = (startClamped - DAY_START) * HOUR_HEIGHT;
                    const height = Math.max(28, duration * HOUR_HEIGHT);

                    return (
                      <Link
                        to={calendarEventPath(ev)}
                        key={`${ev.kind}-${ev.id}`}
                        className={cn(
                          'absolute left-1 right-1 overflow-hidden rounded border px-2 py-1 text-[11px] font-medium shadow-sm transition-opacity hover:opacity-90',
                          calendarEventStatusClasses(ev)
                        )}
                        style={{ top, height }}
                        title={calendarEventTitle(ev, statusLabel)}
                      >
                        <div className="truncate">
                          {ev.kind === 'transfer' ? (
                            <TransferKindBadge title={t('calendarPage.transferIndicator')} />
                          ) : null}
                          {ev.label}
                        </div>
                        {ev.subtitle ? (
                          <div className="truncate text-[10px] opacity-80">{ev.subtitle}</div>
                        ) : null}
                        <div className="text-[10px] opacity-70">
                          {toLocalHM(ev.scheduled_start)}–
                          {toLocalHM(ev.scheduled_end)}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {isLoading && (
            <div className="px-4 py-6 text-sm text-gray-500">
              {t('calendarPage.loadingEvents')}
            </div>
          )}
          {isError && (
            <div className="px-4 py-6 text-sm text-red-600">
              {t('calendarPage.failedToLoadEvents')}
            </div>
          )}
          {!isLoading && filteredByRange.length === 0 && (
            <div className="px-4 py-6 text-sm text-gray-500">
              {t('calendarPage.noEventsThisWeek')}
            </div>
          )}
          </div>
        </div>
      )}
      <CalendarDayEventsModal
        open={Boolean(dayModalDate)}
        date={dayModalDate}
        events={dayModalEvents}
        storeNameById={storeNameById}
        showStoreNames={isGrouped}
        onClose={() => setDayModalDate(null)}
        eventPath={calendarEventPath}
        eventTimeLabel={(ev) =>
          `${toLocalHM(ev.scheduled_start)}–${toLocalHM(ev.scheduled_end)}`
        }
      />
    </div>
  );
}
