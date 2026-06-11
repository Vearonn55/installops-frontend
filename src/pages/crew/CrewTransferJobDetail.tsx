import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  MapPin,
  Package,
  Play,
  Users,
  Camera,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { cn } from '../../lib/utils';
import { formatUiDateTime, formatUiTime } from '../../lib/date-display';
import type { UUID } from '../../api/http';
import {
  getTransfer,
  updateTransferStatus,
  upsertTransferCrewNotes,
  updateTransferFailureReason,
} from '../../api/transfers';
import { getNetsisTransferDetail } from '../../api/integrations';
import { mergeTransferDisplayItems } from '../../lib/transfer-display-items';
import {
  buildCrewTransferView,
  crewJobCardClass,
  crewReadOnlyBannerKey,
  crewStatusLabelKey,
  crewStatusPillClass,
  isCrewStartableStatus,
} from '../../lib/crew-job';

export default function CrewTransferJobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation('common');
  const [starting, setStarting] = useState(false);
  const [crewNotes, setCrewNotes] = useState('');
  const [failureReason, setFailureReason] = useState('');

  const transferQuery = useQuery({
    queryKey: ['transfer', id],
    queryFn: () => getTransfer(id as UUID),
    enabled: !!id,
  });

  const transfer = transferQuery.data;

  const netsisTransferItemsQuery = useQuery({
    queryKey: ['transfer-netsis-lines', transfer?.id, transfer?.store_id, transfer?.external_transfer_id],
    enabled: Boolean(transfer?.store_id && transfer?.external_transfer_id),
    queryFn: async () => {
      const res = await getNetsisTransferDetail({
        store_id: String(transfer!.store_id) as UUID,
        transfer_id: String(transfer!.external_transfer_id || ''),
      });
      return res.data?.items ?? [];
    },
    retry: false,
  });

  const job = useMemo(
    () => (transfer ? buildCrewTransferView(transfer) : null),
    [transfer]
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['transfer', id] });
    queryClient.invalidateQueries({ queryKey: ['crew-jobs-transfers'] });
    queryClient.invalidateQueries({ queryKey: ['crew-transfers'] });
  };

  const startMutation = useMutation({
    mutationFn: () => updateTransferStatus(id as UUID, { status: 'in_progress' }),
    onSuccess: invalidate,
  });

  const completeMutation = useMutation({
    mutationFn: () => updateTransferStatus(id as UUID, { status: 'completed' }),
    onSuccess: () => {
      invalidate();
      toast.success(t('crewPages.transferCompleted'));
    },
  });

  const failMutation = useMutation({
    mutationFn: async () => {
      if (failureReason.trim()) {
        await updateTransferFailureReason(id as UUID, {
          failure_reason: failureReason.trim(),
        });
      }
      await updateTransferStatus(id as UUID, { status: 'failed' });
    },
    onSuccess: () => {
      invalidate();
      toast.success(t('crewPages.transferFailed'));
    },
  });

  const notesMutation = useMutation({
    mutationFn: () =>
      upsertTransferCrewNotes(id as UUID, { crew_notes: crewNotes.trim() || null }),
    onSuccess: () => {
      invalidate();
      toast.success(t('crewPages.notesSaved'));
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

  const displayItems = useMemo(
    () =>
      mergeTransferDisplayItems(
        transfer?.items ?? [],
        netsisTransferItemsQuery.data ?? []
      ),
    [transfer?.items, netsisTransferItemsQuery.data]
  );
  const canAct = job?.status === 'in_progress';

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
              {t('crewPages.transferDetail')}
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

      <main className="crew-page space-y-3">
        {transferQuery.isLoading && (
          <div className="rounded-2xl border bg-white p-6 text-sm text-gray-600">
            {t('crewPages.loading')}
          </div>
        )}
        {transferQuery.isError && (
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
              <div className="mb-2 inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-800">
                {t('crewPages.transferBadge')}
              </div>
              <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold text-gray-900">
                <span>{job.sourceDepotLabel || job.sourceDepotCode || '—'}</span>
                <ArrowRight className="h-5 w-5 text-gray-500" />
                <span>{job.destDepotLabel || job.destDepotCode || '—'}</span>
              </h1>
              <p className="mt-1 text-sm font-medium text-gray-700">{job.storeName}</p>
              <p className="mt-1 font-mono text-xs text-gray-600">{job.externalTransferId}</p>

              <div className="mt-3 space-y-2 text-sm text-gray-800">
                {job.address && job.address !== '—' ? (
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
                    <span className="break-words leading-snug">{job.address}</span>
                  </div>
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

            {isCrewStartableStatus(job.status) ? (
              <button
                type="button"
                disabled={starting || startMutation.isPending}
                onClick={handleStart}
                className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 text-base font-bold text-white hover:bg-primary-700 disabled:opacity-60"
              >
                <Play className="h-5 w-5" />
                {starting ? t('crewPages.starting') : t('crewPages.startTransfer')}
              </button>
            ) : null}

            {displayItems.length > 0 ? (
              <section className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <Package className="h-4 w-4" />
                  {t('crewPages.transferLines')}
                </div>
                <ul className="divide-y">
                  {displayItems.map((it) => {
                    const sku = String(it.sku ?? it.external_product_id ?? '').trim();
                    const nameRaw = String(it.name ?? '').trim();
                    const descRaw = String(it.description ?? '').trim();
                    const title =
                      nameRaw && nameRaw !== sku ? nameRaw : sku;
                    const subtitle =
                      descRaw && descRaw !== sku && descRaw !== nameRaw
                        ? descRaw
                        : null;
                    return (
                      <li key={it.id} className="py-3">
                        <div className="font-mono text-xs text-gray-500">{sku}</div>
                        <div className="text-sm font-medium text-gray-900">{title}</div>
                        {subtitle ? (
                          <p className="mt-0.5 text-xs text-gray-600">{subtitle}</p>
                        ) : null}
                        <div className="mt-1 text-xs font-semibold text-gray-900">
                          ×{it.quantity}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            {canAct ? (
              <>
                <section className="rounded-2xl border bg-white p-4 shadow-sm">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {t('crewPages.crewNotes')}
                  </label>
                  <textarea
                    className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
                    rows={3}
                    value={crewNotes || transfer?.crew_notes || ''}
                    onChange={(e) => setCrewNotes(e.target.value)}
                    placeholder={t('crewPages.crewNotesPlaceholder')}
                  />
                  <button
                    type="button"
                    disabled={notesMutation.isPending}
                    onClick={() => notesMutation.mutate()}
                    className="mt-2 text-sm font-semibold text-primary-700"
                  >
                    {t('crewPages.saveNotes')}
                  </button>
                </section>

                <button
                  type="button"
                  onClick={() => navigate(`/crew/jobs/${job.id}/capture?kind=transfer`)}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border bg-white px-4 text-sm font-semibold text-gray-900 shadow-sm"
                >
                  <Camera className="h-5 w-5" />
                  {t('crewPages.addPhotos')}
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={completeMutation.isPending}
                    onClick={() => completeMutation.mutate()}
                    className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-sm font-semibold text-white"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    {t('crewPages.completeTransfer')}
                  </button>
                  <button
                    type="button"
                    disabled={failMutation.isPending}
                    onClick={() => failMutation.mutate()}
                    className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-50 px-3 text-sm font-semibold text-red-800"
                  >
                    <XCircle className="h-5 w-5" />
                    {t('crewPages.failTransfer')}
                  </button>
                </div>

                <textarea
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  rows={2}
                  value={failureReason}
                  onChange={(e) => setFailureReason(e.target.value)}
                  placeholder={t('crewPages.failureReasonPlaceholder')}
                />
              </>
            ) : null}

            {crewReadOnlyBannerKey(job.status) ? (
              <p className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                {t(crewReadOnlyBannerKey(job.status)!)}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => navigate('/crew/jobs')}
              className="btn-soft min-h-12 w-full"
            >
              {t('crewPages.backToJobs')}
            </button>
          </>
        )}
      </main>
    </div>
  );
}
