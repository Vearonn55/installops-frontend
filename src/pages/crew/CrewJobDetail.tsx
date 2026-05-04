// src/pages/crew/CrewJobDetail.tsx
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Clock, MapPin, Phone, ChevronRight } from 'lucide-react';

import { cn } from '../../lib/utils';
import { formatUiTime } from '../../lib/date-display';
import { getInstallation, type Installation } from '../../api/installations';
import type { UUID } from '../../api/http';

type CrewJobStatus = 'pending' | 'staged' | 'in_progress' | 'completed' | 'failed';

type CrewJob = {
  id: string;
  order_id: string;
  start: string;
  end: string;
  customer: string;
  phone?: string;
  address: string;
  zone: string;
  status: CrewJobStatus;
  notes?: string;
  items?: Array<{ sku: string; name: string; qty: number }>;
};

function formatTimeRange(startISO: string, endISO: string) {
  return `${formatUiTime(startISO)}–${formatUiTime(endISO)}`;
}

function mapBackendStatusToJobStatus(status: string): CrewJobStatus {
  switch (status) {
    case 'staged':
      return 'staged';
    case 'in_progress':
      return 'in_progress';
    case 'completed':
      return 'completed';
    case 'failed':
      return 'failed';
    case 'canceled':
      return 'failed';
    case 'scheduled':
      return 'pending';
    default:
      return 'pending';
  }
}

function installationToCrewJob(inst: Installation): CrewJob {
  const store = inst.store;
  const addr = store?.address;
  const city = addr?.city || addr?.region || '';
  const addressLine = addr?.line1 || '';
  const start = inst.scheduled_start ?? inst.created_at;
  const end = inst.scheduled_end ?? start;

  return {
    id: inst.id,
    order_id: inst.external_order_id,
    start,
    end,
    customer: store?.name ?? inst.store_id,
    phone: store?.phone ?? undefined,
    address: city ? `${addressLine}, ${city}` : addressLine,
    zone: city || '—',
    status: mapBackendStatusToJobStatus(inst.status),
    notes: inst.notes ?? undefined,
    items: (inst.items ?? []).map((it) => ({
      sku: it.external_product_id,
      name: it.external_product_id,
      qty: it.quantity,
    })),
  };
}

function statusClass(s: CrewJobStatus) {
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

export default function CrewJobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const instQuery = useQuery({
    queryKey: ['installation', id],
    queryFn: () => getInstallation(id as UUID),
    enabled: !!id,
  });

  const job: CrewJob | null = useMemo(() => {
    if (!instQuery.data) return null;
    return installationToCrewJob(instQuery.data);
  }, [instQuery.data]);

  return (
    <div className="mx-auto h-full w-full max-w-screen-sm">
      <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="flex items-center gap-3 px-3 py-2">
          <button className="rounded-md p-1 hover:bg-gray-50" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-gray-500">Job</div>
            <div className="text-sm font-semibold text-gray-900">{id ?? '—'}</div>
          </div>
          {job && (
            <span
              className={cn(
                'ml-auto inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
                statusClass(job.status)
              )}
            >
              {statusLabel(job.status)}
            </span>
          )}
        </div>
      </header>

      <main className="space-y-4 p-3 pb-[calc(env(safe-area-inset-bottom)+92px)]">
        {instQuery.isLoading && (
          <div className="rounded-xl border bg-white p-4 text-sm text-gray-600">Loading job…</div>
        )}
        {instQuery.isError && (
          <div className="rounded-xl border bg-white p-4 text-sm text-red-600">
            Failed to load job. It may not exist or you may not have access.
          </div>
        )}
        {job && (
          <>
            <section className="rounded-xl border bg-white p-3 shadow-sm">
              <div className="text-base font-semibold text-gray-900">{job.customer}</div>

              <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span>{formatTimeRange(job.start, job.end)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="break-words">{job.address} • {job.zone}</span>
                </div>
                {job.phone && (
                  <a
                    href={`tel:${job.phone}`}
                    className="flex items-center gap-2 text-primary-700 hover:underline"
                  >
                    <Phone className="h-4 w-4" />
                    {job.phone}
                  </a>
                )}
              </div>

              {job.notes && (
                <div className="mt-2 rounded-lg bg-gray-50 p-2 text-xs text-gray-600">
                  <span className="font-medium text-gray-700">Notes:</span> {job.notes}
                </div>
              )}
            </section>

            {!!job.items?.length && (
              <section className="rounded-xl border bg-white p-3 shadow-sm">
                <div className="mb-2 text-sm font-semibold text-gray-900">Items</div>
                <ul className="divide-y">
                  {job.items.map((it, idx) => (
                    <li key={`${it.sku}-${idx}`} className="flex items-center justify-between py-2">
                      <div className="min-w-0">
                        <div className="text-sm text-gray-900">{it.name}</div>
                        <div className="text-xs font-mono text-gray-500">{it.sku}</div>
                      </div>
                      <div className="text-sm font-medium text-gray-900">×{it.qty}</div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="rounded-xl border bg-white p-3 shadow-sm">
              <div className="text-sm font-semibold text-gray-900">Progress</div>
              <ol className="mt-2 grid grid-cols-3 gap-2 text-center text-[11px]">
                {[
                  { key: 'staged', label: 'Staged' },
                  { key: 'in_progress', label: 'In progress' },
                  { key: 'completed', label: 'Completed' },
                ].map((s) => {
                  const active =
                    (s.key === 'staged' &&
                      (job.status === 'staged' || job.status === 'in_progress' || job.status === 'completed')) ||
                    (s.key === 'in_progress' &&
                      (job.status === 'in_progress' || job.status === 'completed')) ||
                    (s.key === 'completed' && job.status === 'completed');

                  return (
                    <li
                      key={s.key}
                      className={cn(
                        'rounded-lg border px-2 py-1',
                        active
                          ? 'border-primary-200 bg-emerald-200 text-primary-700'
                          : 'border-gray-200 text-gray-500'
                      )}
                    >
                      {s.label}
                    </li>
                  );
                })}
              </ol>
            </section>

            <section className="rounded-xl border bg-white p-3 shadow-sm">
              <button
                type="button"
                onClick={() => navigate(`/crew/jobs/${job.id}/order`)}
                className="flex w-full items-center justify-between"
              >
                <div className="text-left">
                  <div className="text-xs uppercase tracking-wide text-gray-500">Order</div>
                  <div className="break-all font-mono text-sm text-gray-900">{job.order_id}</div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </button>
            </section>
          </>
        )}
      </main>
      {job && (
        <footer className="fixed bottom-0 left-0 right-0 border-t bg-white/95 backdrop-blur">
          <div className="mx-auto flex w-full max-w-screen-sm gap-2 px-3 py-2 pb-[calc(env(safe-area-inset-bottom)+8px)]">
            <button
              type="button"
              onClick={() => navigate('/crew/jobs')}
              className="btn-soft flex-1"
            >
              Back to Jobs
            </button>
            <button
              type="button"
              onClick={() => navigate(`/crew/jobs/${job.id}/checklist`)}
              className="inline-flex flex-1 items-center justify-center rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Open Checklist
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
