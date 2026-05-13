// src/pages/crew/CrewHome.tsx
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CalendarDays } from 'lucide-react';

import { cn } from '../../lib/utils';
import { formatUiFullFromDate, formatUiTime } from '../../lib/date-display';
import { useAuthStore } from '../../stores/auth';
import {
  listInstallations,
  updateInstallationStatus,
} from '../../api/installations';
import type { UUID } from '../../api/http';
import { toLocalYmd } from '../../lib/local-date';
import CrewJobCard from '../../components/crew/CrewJobCard';
import {
  buildCrewJobView,
  installationDayKey,
  isCrewAssigned,
  isCrewActionableStatus,
  isCrewStartableStatus,
  isCrewVisibleInstallation,
  type CrewJobView,
} from '../../lib/crew-job';
import type { CrewJobsUiStatus } from '../../lib/installation-status';

function startOfWeek(d = new Date()) {
  const day = d.getDay();
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

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function CrewHome() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation('common');
  const { user } = useAuthStore();
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);
  const todayYmd = toLocalYmd(now);
  const [startingId, setStartingId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['crew-installations'],
    queryFn: () => listInstallations({ limit: 300, offset: 0 }),
  });

  const startMutation = useMutation({
    mutationFn: (id: UUID) =>
      updateInstallationStatus(id, { status: 'in_progress' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crew-installations'] });
      queryClient.invalidateQueries({ queryKey: ['crew-jobs-installations'] });
    },
  });

  const myJobs: CrewJobView[] = useMemo(() => {
    const insts = data?.data ?? [];
    return insts
      .filter((inst) => isCrewAssigned(inst, user?.id) && isCrewVisibleInstallation(inst))
      .map((inst) => buildCrewJobView(inst));
  }, [data, user?.id]);

  const weekJobs = useMemo(() => {
    return myJobs.filter((j) => {
      const s = new Date(j.start);
      return s >= weekStart && s <= weekEnd;
    });
  }, [myJobs, weekStart, weekEnd]);

  const todayJobs = useMemo(
    () =>
      myJobs.filter((j) => {
        const inst = (data?.data ?? []).find((i) => i.id === j.id);
        return inst ? installationDayKey(inst) === todayYmd : false;
      }),
    [myJobs, data, todayYmd]
  );

  const activeJob = useMemo(() => {
    const byStart = (a: CrewJobView, b: CrewJobView) =>
      new Date(a.start).getTime() - new Date(b.start).getTime();

    const inProgress = todayJobs.filter((j) => j.status === 'in_progress');
    if (inProgress.length) return [...inProgress].sort(byStart)[0];

    const staged = todayJobs.filter((j) => j.status === 'staged');
    if (staged.length) return [...staged].sort(byStart)[0];

    const actionableToday = todayJobs.filter((j) => isCrewActionableStatus(j.status));
    if (actionableToday.length) return [...actionableToday].sort(byStart)[0];

    const weekInProgress = weekJobs.filter((j) => j.status === 'in_progress');
    if (weekInProgress.length) return [...weekInProgress].sort(byStart)[0];

    const actionableWeek = weekJobs.filter((j) => isCrewActionableStatus(j.status));
    if (actionableWeek.length) return [...actionableWeek].sort(byStart)[0];

    return todayJobs.length ? [...todayJobs].sort(byStart)[0] : null;
  }, [todayJobs, weekJobs]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return {
        date: d,
        label: d.toLocaleDateString(i18n.language, { weekday: 'short' }),
        key: dayKey(d),
        isToday: isSameDay(d, now),
      };
    });
  }, [weekStart, now, i18n.language]);

  const jobsByDay = useMemo(() => {
    const map: Record<string, CrewJobView[]> = {};
    for (const w of weekDays) map[w.key] = [];
    for (const j of weekJobs) {
      const inst = (data?.data ?? []).find((i) => i.id === j.id);
      if (!inst) continue;
      const k = dayKey(new Date(inst.scheduled_start || inst.created_at));
      if (!map[k]) map[k] = [];
      map[k].push(j);
    }
    return map;
  }, [weekDays, weekJobs, data]);

  const handleStart = async (id: string) => {
    setStartingId(id);
    try {
      await startMutation.mutateAsync(id as UUID);
    } finally {
      setStartingId(null);
    }
  };

  const otherToday = todayJobs.filter((j) => j.id !== activeJob?.id);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-screen-sm px-3 pb-[calc(env(safe-area-inset-bottom)+88px)] pt-3">
        <h1 className="text-xl font-bold text-gray-900">{t('crewPages.homeTitle')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('crewPages.loading')}</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto w-full max-w-screen-sm px-3 pb-[calc(env(safe-area-inset-bottom)+88px)] pt-3">
        <h1 className="text-xl font-bold text-gray-900">{t('crewPages.homeTitle')}</h1>
        <p className="mt-3 text-sm text-red-600">{t('crewPages.loadError')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-screen-sm px-3 pb-[calc(env(safe-area-inset-bottom)+88px)] pt-3">
      <div className="mb-3">
        <h1 className="text-xl font-bold text-gray-900">{t('crewPages.homeTitle')}</h1>
        <p className="text-sm text-gray-500">{t('crewPages.homeSubtitle')}</p>
      </div>

      <div className="mb-4 rounded-2xl border bg-white p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between px-1">
          <div className="text-sm font-semibold text-gray-900">{t('crewPages.thisWeek')}</div>
          <div className="text-[11px] text-gray-500">
            {formatUiFullFromDate(weekStart)} – {formatUiFullFromDate(weekEnd)}
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
              <div className="mt-1 flex w-full flex-col items-center gap-0.5">
                {(jobsByDay[d.key] || []).slice(0, 4).map((j) => (
                  <div
                    key={j.id}
                    title={`${j.customerName} • ${formatUiTime(j.start)}`}
                    className={cn('h-1.5 w-5 rounded-full', statusDotClass(j.status))}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-center">
          <Legend color="bg-gray-400" label={t('crewPages.status.pending')} />
          <Legend color="bg-blue-500" label={t('crewPages.status.staged')} />
          <Legend color="bg-amber-400" label={t('crewPages.status.in_progress')} />
          <Legend color="bg-emerald-500" label={t('crewPages.status.completed')} />
        </div>
      </div>

      <section className="mb-4 space-y-2">
        <h2 className="text-sm font-semibold text-gray-900">{t('crewPages.activeJob')}</h2>
        {activeJob ? (
          <CrewJobCard
            job={activeJob}
            showStart={isCrewStartableStatus(activeJob.status)}
            starting={startingId === activeJob.id && startMutation.isPending}
            onStart={() => handleStart(activeJob.id)}
            onOpen={() => navigate(`/crew/jobs/${activeJob.id}`)}
          />
        ) : (
          <div className="rounded-2xl border bg-white p-4 text-sm text-gray-500 shadow-sm">
            {t('crewPages.noActiveJob')}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-900">{t('crewPages.todayJobs')}</h2>
        </div>

        {otherToday.length === 0 ? (
          <div className="rounded-2xl border bg-white p-4 text-center text-sm text-gray-500 shadow-sm">
            {t('crewPages.noOtherToday')}
          </div>
        ) : (
          otherToday.map((job) => (
            <CrewJobCard
              key={job.id}
              job={job}
              showStart={isCrewStartableStatus(job.status)}
              starting={startingId === job.id && startMutation.isPending}
              onStart={() => handleStart(job.id)}
              onOpen={() => navigate(`/crew/jobs/${job.id}`)}
            />
          ))
        )}
      </section>
    </div>
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

function statusDotClass(s: CrewJobsUiStatus) {
  switch (s) {
    case 'staged':
      return 'bg-blue-500';
    case 'in_progress':
      return 'bg-amber-400';
    case 'completed':
      return 'bg-emerald-500';
    case 'failed':
      return 'bg-rose-500';
    case 'after_sale':
      return 'bg-violet-500';
    default:
      return 'bg-gray-400';
  }
}
