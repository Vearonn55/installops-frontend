// src/pages/crew/CrewJobDetail.tsx
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Clock,
  MapPin,
  Phone,
  Users,
  ChevronRight,
  Play,
  Package,
} from 'lucide-react';

import { cn } from '../../lib/utils';
import { formatUiDateTime, formatUiTime } from '../../lib/date-display';
import {
  getInstallation,
  updateInstallationStatus,
  type Installation,
} from '../../api/installations';
import type { UUID } from '../../api/http';
import { useInstallationNetsis } from '../../hooks/use-installation-netsis';
import {
  buildCrewJobView,
  crewJobCardClass,
  crewStatusLabelKey,
  crewStatusPillClass,
  mergeArpIntoCrewJobView,
} from '../../lib/crew-job';
import {
  netsisLinesByStokKodu,
  netsisLinesToDisplayRows,
} from '../../lib/netsis-native';

type DisplayItem = {
  id: string;
  sku: string;
  name: string;
  description: string;
  qty: number;
};

function buildDisplayItems(inst: Installation, netsisLines: unknown[] | undefined): DisplayItem[] {
  const lines = netsisLines ?? [];
  const byPid = netsisLinesByStokKodu(lines as never);
  const local = inst.items ?? [];

  if (!local.length && lines.length) {
    return netsisLinesToDisplayRows(lines as never).map((row) => ({
      id: row.id,
      sku: row.sku,
      name: row.name,
      description: row.description,
      qty: row.quantity,
    }));
  }

  return local.map((row, idx) => {
    const pid = String(row.external_product_id ?? '').trim();
    const n = byPid.get(pid);
    if (n) {
      return {
        id: row.id,
        sku: n.sku,
        name: n.name,
        description: n.description,
        qty: row.quantity,
      };
    }
    return {
      id: row.id || `item-${idx}`,
      sku: pid,
      name: pid,
      description: row.special_instructions || pid,
      qty: row.quantity,
    };
  });
}

export default function CrewJobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation('common');
  const [starting, setStarting] = useState(false);

  const instQuery = useQuery({
    queryKey: ['installation', id],
    queryFn: () => getInstallation(id as UUID),
    enabled: !!id,
  });

  const inst = instQuery.data;
  const netsis = useInstallationNetsis(inst);

  const job = useMemo(() => {
    if (!inst) return null;
    const base = buildCrewJobView(inst, netsis.order);
    return mergeArpIntoCrewJobView(base, netsis.customerFromArp);
  }, [inst, netsis.order, netsis.customerFromArp]);

  const items = useMemo(
    () => (inst ? buildDisplayItems(inst, netsis.order?.lines) : []),
    [inst, netsis.order?.lines]
  );

  const startMutation = useMutation({
    mutationFn: () => updateInstallationStatus(id as UUID, { status: 'in_progress' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installation', id] });
      queryClient.invalidateQueries({ queryKey: ['crew-jobs-installations'] });
    },
  });

  const handleStart = async () => {
    setStarting(true);
    try {
      await startMutation.mutateAsync();
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="mx-auto h-full w-full max-w-screen-sm">
      <header className="sticky top-0 z-10 border-b bg-white/95 backdrop-blur">
        <div className="flex items-center gap-2 px-3 py-2">
          <button
            type="button"
            className="rounded-lg p-2 hover:bg-gray-100"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-wide text-gray-500">
              {t('crewPages.jobDetail')}
            </div>
            <div className="truncate font-mono text-sm font-semibold text-gray-900">
              {job?.installCode ?? id}
            </div>
          </div>
          {job ? (
            <span
              className={cn(
                'shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                crewStatusPillClass(job.status)
              )}
            >
              {t(crewStatusLabelKey(job.status))}
            </span>
          ) : null}
        </div>
      </header>

      <main className="space-y-3 p-3 pb-[calc(env(safe-area-inset-bottom)+120px)]">
        {instQuery.isLoading && (
          <div className="rounded-2xl border bg-white p-6 text-sm text-gray-600">
            {t('crewPages.loading')}
          </div>
        )}
        {instQuery.isError && (
          <div className="rounded-2xl border bg-white p-6 text-sm text-red-600">
            {t('crewPages.jobLoadError')}
          </div>
        )}

        {job && (
          <>
            <section
              className={cn(
                'rounded-2xl border-2 p-4 shadow-sm',
                crewJobCardClass(job.status)
              )}
            >
              <h1 className="text-xl font-bold text-gray-900">{job.customerName}</h1>
              <p className="mt-1 text-sm font-medium text-gray-700">{job.storeName}</p>

              <div className="mt-3 space-y-2 text-sm text-gray-800">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
                  <span className="break-words leading-snug">{job.address}</span>
                </div>
                {job.phone ? (
                  <a
                    href={`tel:${job.phone.replace(/\s/g, '')}`}
                    className="flex items-center gap-2 font-semibold text-primary-700"
                  >
                    <Phone className="h-4 w-4" />
                    {job.phone}
                  </a>
                ) : null}
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span>
                    {formatUiTime(job.start)}–{formatUiTime(job.end)}
                    <span className="ml-2 text-xs text-gray-500">
                      {formatUiDateTime(job.start)}
                    </span>
                  </span>
                </div>
                {job.crewNames.length > 0 ? (
                  <div className="flex items-start gap-2">
                    <Users className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
                    <span>{job.crewNames.join(' · ')}</span>
                  </div>
                ) : null}
              </div>

              {job.notes ? (
                <p className="mt-3 rounded-lg bg-white/60 p-2 text-xs text-gray-700">
                  {job.notes}
                </p>
              ) : null}
            </section>

            {job.status === 'staged' ? (
              <button
                type="button"
                disabled={starting || startMutation.isPending}
                onClick={handleStart}
                className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 text-base font-bold text-white hover:bg-primary-700 disabled:opacity-60"
              >
                <Play className="h-5 w-5" />
                {starting ? t('crewPages.starting') : t('crewPages.startInstallation')}
              </button>
            ) : null}

            {items.length > 0 ? (
              <section className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <Package className="h-4 w-4" />
                  {t('crewPages.orderLines')}
                </div>
                <ul className="divide-y">
                  {items.map((it) => (
                    <li key={it.id} className="py-3">
                      <div className="text-sm font-medium text-gray-900">{it.name}</div>
                      {it.description && it.description !== it.name ? (
                        <p className="mt-0.5 text-xs text-gray-600">{it.description}</p>
                      ) : null}
                      <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                        <span className="font-mono">{it.sku}</span>
                        <span className="font-semibold text-gray-900">×{it.qty}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="rounded-2xl border bg-white p-4 shadow-sm">
              <button
                type="button"
                onClick={() => navigate(`/crew/jobs/${job.id}/order`)}
                className="flex w-full items-center justify-between gap-2"
              >
                <div className="min-w-0 text-left">
                  <div className="text-xs uppercase tracking-wide text-gray-500">
                    {t('crewPages.order')}
                  </div>
                  <div className="break-all font-mono text-sm text-gray-900">{job.orderId}</div>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
              </button>
            </section>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigate('/crew/jobs')}
                className="btn-soft min-h-12 flex-1"
              >
                {t('crewPages.backToJobs')}
              </button>
              <button
                type="button"
                onClick={() => navigate(`/crew/jobs/${job.id}/checklist`)}
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-primary-600 px-3 text-sm font-semibold text-white hover:bg-primary-700"
              >
                {t('crewPages.openChecklist')}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
