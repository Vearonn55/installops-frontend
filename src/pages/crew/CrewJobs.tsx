// src/pages/crew/CrewJobs.tsx
import { useEffect, useMemo, useRef, useState, type Ref } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { formatUiDayMonth } from '../../lib/date-display';
import { toLocalYmd } from '../../lib/local-date';
import { useAuthStore } from '../../stores/auth';
import CrewJobCard from '../../components/crew/CrewJobCard';
import {
  buildCrewJobView,
  installationDayKey,
  isCrewAssigned,
  isCrewStartableStatus,
  isCrewVisibleInstallation,
} from '../../lib/crew-job';
import {
  listInstallations,
  updateInstallationStatus,
  type InstallationList,
} from '../../api/installations';
import type { UUID } from '../../api/http';

const STRIP_DAYS_BEFORE = 4;
const STRIP_DAYS_AFTER = 4;

function startOfLocalDay(d = new Date()) {
  const res = new Date(d);
  res.setHours(0, 0, 0, 0);
  return res;
}

function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/** Prior 4 days, today, upcoming 4 days (9 total). */
function buildNineDayStrip(anchor = new Date()) {
  const today = startOfLocalDay(anchor);
  const len = STRIP_DAYS_BEFORE + 1 + STRIP_DAYS_AFTER;
  return Array.from({ length: len }, (_, i) =>
    addDays(today, i - STRIP_DAYS_BEFORE),
  );
}

const ACTIVE_CREW_STATUSES = new Set([
  'scheduled',
  'staged',
  'in_progress',
  'completed',
  'failed',
  'after_sale_service',
]);

export default function CrewJobs() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation('common');
  const { user } = useAuthStore();

  const dayStrip = useMemo(() => buildNineDayStrip(new Date()), []);
  const stripToday = dayStrip[STRIP_DAYS_BEFORE];

  const todayKey = stripToday.toDateString();
  const [selectedKey, setSelectedKey] = useState<string>(todayKey);
  const todayButtonRef = useRef<HTMLButtonElement>(null);

  const dateRangeLabel = useMemo(() => {
    const first = dayStrip[0];
    const last = dayStrip[dayStrip.length - 1];
    return `${formatUiDayMonth(first)} – ${formatUiDayMonth(last)}`;
  }, [dayStrip]);
  const [startingId, setStartingId] = useState<string | null>(null);

  const installationsQuery = useQuery<InstallationList>({
    queryKey: ['crew-jobs-installations'],
    queryFn: () => listInstallations({ limit: 300, offset: 0 }),
  });

  const startMutation = useMutation({
    mutationFn: (id: UUID) =>
      updateInstallationStatus(id, { status: 'in_progress' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crew-jobs-installations'] });
      queryClient.invalidateQueries({ queryKey: ['crew-installations'] });
    },
  });

  const loading = installationsQuery.isLoading;
  const hasError = installationsQuery.isError;

  const activeDate = useMemo(
    () =>
      dayStrip.find((d) => d.toDateString() === selectedKey) ?? stripToday,
    [dayStrip, selectedKey, stripToday],
  );

  useEffect(() => {
    todayButtonRef.current?.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: 'smooth',
    });
  }, []);

  const dayYmd = toLocalYmd(activeDate);

  const jobs = useMemo(() => {
    const insts = installationsQuery.data?.data ?? [];
    return insts
      .filter((inst) => {
        if (!isCrewAssigned(inst, user?.id)) return false;
        if (!isCrewVisibleInstallation(inst)) return false;
        const raw = String(inst.status || '').toLowerCase();
        if (!ACTIVE_CREW_STATUSES.has(raw)) return false;
        return installationDayKey(inst) === dayYmd;
      })
      .map((inst) => buildCrewJobView(inst))
      .sort((a, b) => a.start.localeCompare(b.start));
  }, [installationsQuery.data, user?.id, dayYmd]);

  const handleStart = async (id: string) => {
    setStartingId(id);
    try {
      await startMutation.mutateAsync(id as UUID);
    } finally {
      setStartingId(null);
    }
  };

  const renderDayButton = (d: Date, opts?: { ref?: Ref<HTMLButtonElement> }) => {
    const isActive = d.toDateString() === selectedKey;
    const isToday = d.toDateString() === todayKey;
    return (
      <button
        key={d.toDateString()}
        ref={opts?.ref}
        type="button"
        className={cn(
          'min-h-14 min-w-[56px] rounded-xl border px-2 py-1.5 text-center transition-colors',
          isActive
            ? 'border-primary-600 bg-primary-600 text-white'
            : isToday
              ? 'border-primary-300 bg-primary-50 text-gray-900 active:bg-primary-100'
              : 'border-gray-200 bg-white text-gray-900 active:bg-gray-50',
        )}
        onClick={() => setSelectedKey(d.toDateString())}
      >
        <div className="text-[10px] font-medium uppercase tracking-wide">
          {d.toLocaleDateString(i18n.language, { weekday: 'short' })}
        </div>
        <div className={cn('text-sm font-bold', isActive ? 'text-white' : '')}>
          {formatUiDayMonth(d)}
        </div>
      </button>
    );
  };

  return (
    <div className="crew-page">
      <header className="sticky top-0 z-10 border-b bg-white/95 backdrop-blur">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl font-bold text-gray-900">{t('crewPages.jobsTitle')}</h1>
            <div className="inline-flex items-center text-xs text-gray-500">
              <CalendarDays className="mr-1 h-3.5 w-3.5" />
              {dateRangeLabel}
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-500">{t('crewPages.jobsSubtitle')}</p>
        </div>

        <div className="overflow-x-auto px-3 pb-3">
          <div className="flex min-w-max items-stretch gap-3">
            <div className="flex gap-2">
              {dayStrip.slice(0, STRIP_DAYS_BEFORE).map((d) => renderDayButton(d))}
            </div>
            <div className="flex px-0.5">
              {renderDayButton(dayStrip[STRIP_DAYS_BEFORE], { ref: todayButtonRef })}
            </div>
            <div className="flex gap-2">
              {dayStrip.slice(STRIP_DAYS_BEFORE + 1).map((d) => renderDayButton(d))}
            </div>
          </div>
        </div>
      </header>

      <main className="space-y-3 p-3">
        {loading && (
          <div className="rounded-2xl border bg-white p-8 text-center text-sm text-gray-500">
            {t('crewPages.loading')}
          </div>
        )}

        {hasError && !loading && (
          <div className="rounded-2xl border bg-white p-8 text-center text-sm text-red-600">
            {t('crewPages.loadError')}
          </div>
        )}

        {!loading &&
          !hasError &&
          jobs.map((job) => (
            <CrewJobCard
              key={job.id}
              job={job}
              showStart={isCrewStartableStatus(job.status)}
              starting={startingId === job.id && startMutation.isPending}
              onStart={() => handleStart(job.id)}
              onOpen={() => navigate(`/crew/jobs/${job.id}`)}
            />
          ))}

        {!loading && !hasError && jobs.length === 0 && (
          <div className="rounded-2xl border bg-white p-8 text-center text-sm text-gray-500">
            {t('crewPages.noJobsDay')}
          </div>
        )}
      </main>
    </div>
  );
}
