// src/pages/crew/CrewJobs.tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Clock,
  MapPin,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '../../lib/utils';

import {
  listInstallations,
  type InstallationList,
} from '../../api/installations';
import {
  listStores,
  type StoreList,
} from '../../api/stores';

/* --------------------------- Types & helpers --------------------------- */

type CrewJobStatus = 'pending' | 'staged' | 'in_progress' | 'completed' | 'failed';
// zone now comes from backend city/region
type Zone = string;

type CrewJob = {
  id: string;
  order_id: string;
  start: string; // ISO
  end: string;   // ISO
  customer: string;
  address: string;
  zone: Zone;
  status: CrewJobStatus;
  notes?: string;
};

function startOfWeek(d = new Date(), weekStartsOn: 0 | 1 = 1) {
  // 0 = Sunday, 1 = Monday
  const day = d.getDay(); // 0..6 (Sun..Sat)
  const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
  const res = new Date(d);
  res.setHours(0, 0, 0, 0);
  res.setDate(d.getDate() - diff);
  return res;
}

function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function fmtTimeRange(sISO: string, eISO: string) {
  const s = new Date(sISO);
  const e = new Date(eISO);
  const f = (d: Date) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${f(s)}–${f(e)}`;
}

function statusTone(s: CrewJobStatus) {
  switch (s) {
    case 'completed':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'in_progress':
      return 'border-blue-200 bg-blue-50 text-blue-700';
    case 'staged':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'failed':
      return 'border-red-200 bg-red-50 text-red-700';
    default:
      return 'border-gray-200 bg-gray-50 text-gray-700';
  }
}

function statusLabel(s: CrewJobStatus) {
  switch (s) {
    case 'completed':
      return 'Completed';
    case 'in_progress':
      return 'In progress';
    case 'staged':
      return 'Staged';
    case 'failed':
      return 'Failed';
    default:
      return 'Pending';
  }
}

// Map backend installation.status to crew job UI status
function mapBackendStatusToJobStatus(status: string): CrewJobStatus {
  switch (status) {
    case 'in_progress':
      return 'in_progress';
    case 'completed':
      return 'completed';
    case 'failed':
      return 'failed';
    // backend "scheduled" → UI "Pending"
    case 'scheduled':
      return 'pending';
    // we don’t have a separate cancelled pill, show as failed for now
    case 'canceled':
      return 'failed';
    default:
      return 'pending';
  }
}

// DD/MM/YY formatter
function fmtShortDate(d: Date) {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

/* --------------------------- Component --------------------------- */
export default function CrewJobs() {
  const navigate = useNavigate();

  // Today (stable)
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => today.toDateString(), [today]);

  // Week offset: 0 = current week, 1 = next week, 2 = week after, etc.
  const [weekOffset, setWeekOffset] = useState(0);

  // Base: start of CURRENT week (Mon)
  const baseWeekStart = useMemo(() => startOfWeek(today, 1), [today]);

  // Current view's week start (Mon) depending on offset
  const weekStart = useMemo(
    () => addDays(baseWeekStart, weekOffset * 7),
    [baseWeekStart, weekOffset]
  );

  // Week end (Sun) for display (inclusive 7-day range)
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

  // Build week days (Mon–Sun) for the current view
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  // Default selected day: today (for current week)
  const [selectedKey, setSelectedKey] = useState<string>(todayKey);

  // When week changes:
  // - If we're on current week (offset 0), select today
  // - Otherwise, select Monday of that week
  useEffect(() => {
    if (weekOffset === 0) {
      setSelectedKey(todayKey);
    } else {
      setSelectedKey(weekStart.toDateString());
    }
  }, [weekOffset, weekStart, todayKey]);

  // UI state (search is wired to filtering, there is no input yet)
  const [q] = useState('');

  // Fetch installations and stores from backend (axios via /api/* helpers)
  const installationsQuery = useQuery<InstallationList>({
    queryKey: ['crew-jobs-installations'],
    queryFn: () => listInstallations({ limit: 200, offset: 0 }),
  });

  const storesQuery = useQuery<StoreList>({
    queryKey: ['crew-jobs-stores'],
    queryFn: () => listStores({ limit: 200, offset: 0 }),
  });

  const loading = installationsQuery.isLoading || storesQuery.isLoading;
  const hasError = installationsQuery.isError || storesQuery.isError;

  // Map stores by id for quick lookup
  const storesById = useMemo(() => {
    const map = new Map<string, StoreList['data'][number]>();
    const stores = storesQuery.data?.data ?? [];
    for (const store of stores) {
      map.set(store.id, store);
    }
    return map;
  }, [storesQuery.data]);

  // All jobs for the current week (one job per installation)
  const allJobs: CrewJob[] = useMemo(() => {
    const insts = installationsQuery.data?.data ?? [];
    const jobs: CrewJob[] = [];

    const weekEndBound = addDays(weekStart, 7);

    for (const inst of insts) {
      const startIso = inst.scheduled_start ?? null;
      if (!startIso) continue;

      const startDate = new Date(startIso);
      if (startDate < weekStart || startDate >= weekEndBound) continue;

      const endIso = inst.scheduled_end ?? startIso;

      const store = storesById.get(inst.store_id);
      const addr = store?.address;

      const city = addr?.city || addr?.region || '';
      const addressLine = addr?.line1 || '';

      jobs.push({
        id: inst.id,
        order_id: inst.external_order_id,
        start: startIso,
        end: endIso,
        customer: store?.name ?? inst.store_id,
        address: city ? `${addressLine}, ${city}` : addressLine,
        zone: city || 'Unknown',
        status: mapBackendStatusToJobStatus(inst.status),
        notes: inst.notes ?? undefined,
      });
    }

    return jobs;
  }, [installationsQuery.data, storesById, weekStart]);

  // Active day’s jobs
  const activeDate = useMemo(
    () => weekDays.find((d) => d.toDateString() === selectedKey) || weekDays[0],
    [weekDays, selectedKey]
  );

  const raw = useMemo(() => {
    const dayKey = activeDate.toISOString().slice(0, 10);
    return allJobs.filter((j) => j.start.slice(0, 10) === dayKey);
  }, [allJobs, activeDate]);

  const jobs = useMemo(() => {
    let list = raw.map((j) => ({ ...j }));
    // search (when we later add an input, it will use this)
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter(
        (j) =>
          j.customer.toLowerCase().includes(s) ||
          j.order_id.toLowerCase().includes(s) ||
          j.address.toLowerCase().includes(s) ||
          j.zone.toLowerCase().includes(s)
      );
    }
    // sort by start asc
    list.sort((a, b) => a.start.localeCompare(b.start));
    return list;
  }, [raw, q]);

  // Handlers for week navigation
  const goToCurrentWeek = () => setWeekOffset(0);
  const goToNextWeek = () => setWeekOffset((o) => o + 1);

  return (
    <div className="mx-auto w-full max-w-screen-sm">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold text-gray-900">Jobs</div>
          </div>
        </div>

        {/* Week strip */}
        <div className="flex flex-wrap justify-center gap-1.5 overflow-x-hidden px-2 pb-1">
          {weekDays.map((d) => {
            const isActive = d.toDateString() === selectedKey;
            return (
              <button
                key={d.toDateString()}
                className={cn(
                  'min-w-[52px] rounded-lg border px-1 py-1 text-center',
                  isActive
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white hover:bg-gray-50'
                )}
                onClick={() => setSelectedKey(d.toDateString())}
              >
                <div className="text-[10px] uppercase tracking-wide">
                  {d.toLocaleDateString(undefined, { weekday: 'short' })}
                </div>
                <div
                  className={cn(
                    'text-xs font-semibold',
                    isActive ? 'text-white' : 'text-gray-900'
                  )}
                >
                  {d.getDate()}
                </div>
              </button>
            );
          })}
        </div>

        {/* Week range + arrows (centered under weekdays) */}
        <div className="flex items-center justify-center gap-3 pb-2 px-3">
          <button
            type="button"
            onClick={goToCurrentWeek}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:scale-95"
            aria-label="Back to current week"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="inline-flex items-center gap-1 text-base font-semibold text-gray-600">
            <CalendarDays className="h-5 w-5" />
            <span>
              {fmtShortDate(weekStart)} - {fmtShortDate(weekEnd)}
            </span>
          </div>

          <button
            type="button"
            onClick={goToNextWeek}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:scale-95"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* List */}
      <main className="space-y-2 p-3">
        {loading && (
          <div className="rounded-lg border bg-white p-6 text-center text-sm text-gray-500">
            Loading jobs...
          </div>
        )}

        {hasError && !loading && (
          <div className="rounded-lg border bg-white p-6 text-center text-sm text-red-600">
            Failed to load jobs from server.
          </div>
        )}

        {!loading &&
          !hasError &&
          jobs.map((j) => {
            const s = j.status;
            return (
              <div key={j.id} className="rounded-lg border bg-white p-4 shadow-sm">
                <button
                  onClick={() => navigate(`/crew/jobs/${j.id}`)}
                  className="flex w-full items-start justify-between text-left"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-lg font-semibold text-gray-900">
                        {j.customer}
                      </div>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                          statusTone(s)
                        )}
                      >
                        {statusLabel(s)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-700">
                      <Clock className="h-4 w-4" />
                      <span>{fmtTimeRange(j.start, j.end)}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-700">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">
                        {j.address} • {j.zone}
                      </span>
                    </div>
                    {j.notes && (
                      <div className="mt-1 text-xs text-gray-500 line-clamp-2">
                        {j.notes}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="ml-2 h-5 w-5 flex-shrink-0 text-gray-400" />
                </button>
              </div>
            );
          })}

        {!loading && !hasError && jobs.length === 0 && (
          <div className="rounded-lg border bg-white p-6 text-center text-sm text-gray-500">
            No jobs for this day.
          </div>
        )}
      </main>
    </div>
  );
}

/* ---------------------------------------------------------------------------
Utility classes used:
- .input      => your app’s input style
- .btn-soft   => inline-flex items-center justify-center rounded-md border px-3
                 py-2 text-sm text-gray-700 hover:bg-gray-50 active:scale-[0.99]
--------------------------------------------------------------------------- */
