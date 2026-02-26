// src/pages/crew/CrewHome.tsx
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, MapPin, Clock, ClipboardCheck, User2 } from 'lucide-react';

import { cn } from '../../lib/utils';
import { useAuthStore } from '../../stores/auth-simple';
import {
  listInstallations,
  type Installation,
  type InstallStatus,
  type CrewAssignment,
} from '../../api/installations';

type JobStatus = 'scheduled' | 'in_progress' | 'completed' | 'failed';

type CrewJob = {
  id: string;
  customer: string;
  address: string;
  start: string; // ISO
  end: string; // ISO
  zone: string;
  status: JobStatus;
};

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfWeek(d = new Date()) {
  // Monday first
  const day = d.getDay(); // 0..6 (Sun..Sat)
  const diff = (day + 6) % 7;
  const res = new Date(d);
  res.setDate(d.getDate() - diff);
  res.setHours(0, 0, 0, 0);
  return res;
}

function endOfWeek(d = new Date()) {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// Map backend InstallStatus → UI JobStatus bucket
function mapStatusToJobStatus(status: InstallStatus): JobStatus {
  switch (status) {
    case 'in_progress':
      return 'in_progress';
    case 'completed':
      return 'completed';
    case 'failed':
      return 'failed';
    // scheduled, staged, canceled, after_sale_service → treat as scheduled/awaiting
    case 'scheduled':
    case 'staged':
    case 'canceled':
    case 'after_sale_service':
    default:
      return 'scheduled';
  }
}

// Build address/zone from store + address relations (best-effort)
function buildAddress(inst: Installation): { customer: string; address: string; zone: string } {
  const storeName = (inst as any).store?.name ?? 'Store';

  const line1 = (inst as any).store?.address?.line1 as string | undefined;
  const city = (inst as any).store?.address?.city as string | undefined;
  const region = (inst as any).store?.address?.region as string | undefined;

  const addressParts = [line1, city, region].filter(Boolean);
  const address = addressParts.join(', ') || storeName;

  const zone = city || storeName || 'Zone';

  return { customer: storeName, address, zone };
}

export default function CrewHome() {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);

  const { user } = useAuthStore();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['crew-installations'],
    queryFn: () => listInstallations({}), // we filter by crew on the client side
  });

  const installations: Installation[] = data?.data ?? [];

  // Installations where current user is assigned as crew
  const crewJobs: CrewJob[] = useMemo(() => {
    if (!user) return [];
    const userId = user.id;

    return installations
      .filter((inst) => {
        const crew = (inst.crew || []) as CrewAssignment[];
        return crew.some((c) => c.crew_user_id === userId);
      })
      .map((inst) => {
        const { customer, address, zone } = buildAddress(inst);
        if (!inst.scheduled_start || !inst.scheduled_end) {
          return null; // ignore unscheduled for week view
        }
        return {
          id: inst.id, // real installation ID (UUID)
          customer,
          address,
          start: inst.scheduled_start,
          end: inst.scheduled_end,
          zone,
          status: mapStatusToJobStatus(inst.status),
        } as CrewJob;
      })
      .filter(Boolean) as CrewJob[];
  }, [installations, user]);

  // Build Mon..Sun strip
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const label = d.toLocaleDateString([], { weekday: 'short' }); // Mon/Tue...
      return { date: d, label, key: dayKey(d), isToday: isSameDay(d, now) };
    });
  }, [weekStart, now]);

  // Jobs within the current week
  const weekJobs = useMemo(
    () =>
      crewJobs.filter((j) => {
        const s = new Date(j.start);
        return s >= weekStart && s <= weekEnd;
      }),
    [crewJobs, weekStart, weekEnd]
  );

  const jobsByDay = useMemo(() => {
    const map: Record<string, CrewJob[]> = {};
    for (const w of weekDays) map[w.key] = [];
    for (const j of weekJobs) {
      const s = new Date(j.start);
      const k = dayKey(s);
      if (!map[k]) map[k] = [];
      map[k].push(j);
    }
    return map;
  }, [weekDays, weekJobs]);

  // Today’s jobs (from weekly set)
  const todayJobs = useMemo(() => {
    const d0 = new Date(now);
    d0.setHours(0, 0, 0, 0);
    const d1 = new Date(now);
    d1.setHours(23, 59, 59, 999);
    return weekJobs.filter((j) => {
      const s = new Date(j.start);
      return s >= d0 && s <= d1;
    });
  }, [weekJobs, now]);

  // Current Active Job:
  // 1) in_progress this week (earliest)
  // 2) else earliest job today
  // 3) else earliest upcoming job this week
  // 4) else earliest job in the week
  const activeJob = useMemo(() => {
    if (!weekJobs.length) return null;

    const byStart = (a: CrewJob, b: CrewJob) =>
      new Date(a.start).getTime() - new Date(b.start).getTime();

    const inProgress = weekJobs.filter((j) => j.status === 'in_progress');
    if (inProgress.length) {
      return [...inProgress].sort(byStart)[0];
    }

    if (todayJobs.length) {
      return [...todayJobs].sort(byStart)[0];
    }

    const upcoming = weekJobs.filter((j) => new Date(j.start) >= now);
    if (upcoming.length) {
      return [...upcoming].sort(byStart)[0];
    }

    return [...weekJobs].sort(byStart)[0];
  }, [weekJobs, todayJobs, now]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-md px-3 pb-[calc(env(safe-area-inset-bottom)+88px)] pt-3">
        <div className="mb-3">
          <h1 className="text-lg font-bold text-gray-900">Crew Home</h1>
          <p className="text-xs text-gray-500">Loading your jobs…</p>
        </div>
        <div className="rounded-xl border bg-white p-4 text-sm text-gray-500 shadow-sm">
          Fetching assigned installations…
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto w-full max-w-md px-3 pb-[calc(env(safe-area-inset-bottom)+88px)] pt-3">
        <div className="mb-3">
          <h1 className="text-lg font-bold text-gray-900">Crew Home</h1>
          <p className="text-xs text-gray-500">Your current job and weekly summary</p>
        </div>
        <div className="rounded-xl border bg-white p-4 text-sm text-red-600 shadow-sm">
          Failed to load installations. Please try again later.
        </div>
      </div>
    );
  }

  return (
    // Narrow, centered; safe padding for CrewShell bottom bar
    <div className="mx-auto w-full max-w-md px-3 pb-[calc(env(safe-area-inset-bottom)+88px)] pt-3">
      {/* Header */}
      <div className="mb-3">
        <h1 className="text-lg font-bold text-gray-900">Crew Home</h1>
        <p className="text-xs text-gray-500">Your current job and weekly summary</p>
      </div>

      {/* Optional summary cards – keep commented if not needed
      <div className="mb-3 grid grid-cols-4 gap-2">
        <SummaryCard label="Week" value={summary.weekTotal} />
        <SummaryCard label="Active" value={summary.active} />
        <SummaryCard label="Done" value={summary.done} />
        <SummaryCard label="Issues" value={summary.issues} />
      </div>
      */}

      {/* Mini Weekly Calendar */}
      <div className="mb-3 rounded-xl border bg-white p-2 shadow-sm">
        <div className="mb-2 flex items-center justify-between px-1">
          <div className="text-sm font-semibold text-gray-900">This Week</div>
          <div className="text-[11px] text-gray-500">
            {weekStart.toLocaleDateString()} – {weekEnd.toLocaleDateString()}
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((d) => (
            <div key={d.key} className="flex flex-col items-center">
              <div
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px]',
                  d.isToday ? 'bg-primary-600 text-white' : 'text-gray-600'
                )}
              >
                {d.label}
              </div>
              <div
                className={cn(
                  'mt-1 flex h-6 w-6 items-center justify-center rounded-full text-xs',
                  d.isToday ? 'bg-primary-100 text-primary-700' : 'text-gray-700'
                )}
              >
                {d.date.getDate()}
              </div>
              {/* colored sticks under each day */}
              <div className="mt-1 flex w-full flex-col items-center gap-0.5">
                {(jobsByDay[d.key] || [])
                  .slice(0, 4)
                  .map((j) => (
                    <div
                      key={j.id}
                      title={`${j.customer} • ${fmtTime(j.start)}-${fmtTime(j.end)}`}
                      className={cn('h-1.5 w-5 rounded-full', statusColor(j.status))}
                    />
                  ))}
                {(jobsByDay[d.key] || []).length > 4 && (
                  <div className="text-[10px] text-gray-500">
                    +{(jobsByDay[d.key] || []).length - 4}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Centered Legend */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-center">
          <Legend color="bg-sky-400" label="Scheduled" />
          <Legend color="bg-amber-500" label="Active" />
          <Legend color="bg-emerald-500" label="Done" />
          <Legend color="bg-rose-500" label="Issue" />
        </div>
      </div>

      {/* Current Active Job */}
      <section className="mb-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Current Active Job</h2>
        {activeJob ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3 shadow-sm">
            <div className="mb-1 flex items-center justify-between">
              <div className="text-base font-semibold text-gray-900">
                {activeJob.customer}
              </div>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">
                {activeJob.status === 'in_progress' ? 'In progress' : 'Next job'}
              </span>
            </div>

            <div className="mt-1 grid grid-cols-1 gap-1 text-sm text-gray-700">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-gray-500" />
                <span>
                  {fmtTime(activeJob.start)} – {fmtTime(activeJob.end)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-gray-500" />
                <span>{activeJob.zone}</span>
              </div>
              <div className="line-clamp-2 text-gray-600">{activeJob.address}</div>
              <div className="flex items-center gap-1.5 text-gray-600">
                <User2 className="h-3.5 w-3.5 text-gray-500" />
                <span>Job ID: {activeJob.id}</span>
              </div>
            </div>

            <div className="mt-3">
              <Link
                to={`/crew/jobs/${activeJob.id}/checklist`}
                className="inline-flex w-full items-center justify-center rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                <ClipboardCheck className="mr-2 h-4 w-4" />
                Open Checklist
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border bg-white p-3 text-sm text-gray-500 shadow-sm">
            No job currently active.
          </div>
        )}
      </section>

      {/* Today’s Jobs (excluding active to avoid duplication) */}
      <section className="rounded-xl border bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <CalendarDays className="h-4 w-4 text-gray-500" />
          <div className="text-sm font-semibold text-gray-900">Today’s Jobs</div>
        </div>

        {todayJobs.filter((j) => j.id !== activeJob?.id).length === 0 ? (
          <div className="p-5 text-center text-sm text-gray-500">
            No other jobs today.
          </div>
        ) : (
          <ul className="divide-y">
            {todayJobs
              .filter((j) => j.id !== activeJob?.id)
              .map((j) => (
                <li key={j.id} className="px-3 py-3">
                  <div className="flex items-center justify-between">
                    <Link to={`/crew/jobs/${j.id}`} className="block min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-gray-900">
                        {j.customer}
                        <span className="ml-2 text-xs font-normal text-gray-500">
                          #{j.id}
                        </span>
                      </div>
                      <div className="mt-1 grid grid-cols-1 gap-3 text-sm text-gray-700 sm:grid-cols-2">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Clock className="h-4 w-4" />
                          {fmtTime(j.start)} – {fmtTime(j.end)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-4 w-4" />
                          {j.zone}
                        </span>
                      </div>
                    </Link>

                    <div className="ml-3 flex flex-col items-end gap-1">
                      <StatusPill status={j.status} />
                      <Link
                        to={`/crew/jobs/${j.id}/checklist`}
                        className="inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700 hover:bg-primary-100"
                      >
                        <ClipboardCheck className="mr-1 h-3 w-3" />
                        Checklist
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ------------------------------ UI bits ------------------------------ */

function StatusPill({ status }: { status: JobStatus }) {
  const tone: Record<JobStatus, string> = {
    scheduled: 'border-sky-200 bg-sky-50 text-sky-700',
    in_progress: 'border-amber-200 bg-amber-50 text-amber-700',
    completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    failed: 'border-rose-200 bg-rose-50 text-rose-700',
  };
  const label =
    status === 'in_progress'
      ? 'In progress'
      : status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]',
        tone[status]
      )}
    >
      {label}
    </span>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-gray-600">
      <span className={cn('inline-block h-1.5 w-4 rounded-full', color)} />
      {label}
    </span>
  );
}

function statusColor(s: JobStatus) {
  switch (s) {
    case 'scheduled':
      return 'bg-sky-400';
    case 'in_progress':
      return 'bg-amber-500';
    case 'completed':
      return 'bg-emerald-500';
    case 'failed':
      return 'bg-rose-500';
    default:
      return 'bg-gray-300';
  }
}
