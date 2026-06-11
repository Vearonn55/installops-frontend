// src/pages/manager/TransferDetailPage.tsx
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Package,
  Users,
  Info,
  FileText,
  Image as ImageIcon,
  XCircle,
  Trash2,
  Pencil,
  Play,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import { cn } from '../../lib/utils';
import { formatUiDateTime } from '../../lib/date-display';
import { apiGet, isAxiosError, type UUID } from '../../api/http';
import { useAuthStore } from '../../stores/auth';
import {
  getTransfer,
  getTransferTimeline,
  listTransferMedia,
  updateTransferStatus,
  deleteTransfer,
  type Transfer,
} from '../../api/transfers';
import EditTransferModal from '../../components/manager/EditTransferModal';
import { resolveMediaUrl } from '../../lib/media-url';
import { RevealablePhotoGrid } from '../../components/media/RevealablePhotoGrid';
import {
  auditRowToTransferTimelineEvent,
  transferTimelineAccentClass,
} from '../../lib/transfer-timeline-audit';
import {
  normalizeTransferStatus,
  transferStatusBadgeClass,
  canCancelTransfer,
  canStartTransfer,
  canCompleteTransfer,
} from '../../lib/transfer-status';

function headerActionBtnClass(...parts: (string | false | undefined)[]) {
  return cn(
    'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium sm:w-auto sm:min-w-[9rem]',
    ...parts
  );
}

function formatDepot(code?: number | null, label?: string | null): string {
  if (label?.trim()) return label.trim();
  if (code != null && !Number.isNaN(code)) return String(code);
  return '—';
}

type UserDto = { id: string; name: string; email: string };

export default function TransferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation('common');
  const { hasRole } = useAuthStore();
  const isAdmin = hasRole('ADMIN');
  const [canceling, setCanceling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const query = useQuery({
    queryKey: ['transfer', id],
    enabled: !!id,
    queryFn: () => getTransfer(id as UUID),
  });

  const tr = query.data;
  const items = useMemo(() => tr?.items ?? [], [tr]);
  const crew = useMemo(() => tr?.crew ?? [], [tr]);
  const uiStatus = normalizeTransferStatus(tr?.status);

  const timelineQuery = useQuery({
    queryKey: ['transfer-timeline', id],
    enabled: !!id,
    queryFn: () => getTransferTimeline(id as UUID, { limit: 100, offset: 0 }),
  });

  const timelineEvents = useMemo(
    () => (timelineQuery.data?.timeline?.data ?? []).map(auditRowToTransferTimelineEvent),
    [timelineQuery.data]
  );

  const storeQuery = useQuery({
    queryKey: ['store', tr?.store_id],
    enabled: !!tr?.store_id && !tr?.store?.name,
    queryFn: () => apiGet<{ id: string; name: string }>(`/stores/${tr!.store_id}`),
  });

  const crewUsersQuery = useQuery({
    queryKey: ['transferCrewUsers', tr?.id],
    enabled: !!tr && crew.length > 0,
    queryFn: async () => {
      const map: Record<string, UserDto> = {};
      const uniqueIds = Array.from(new Set(crew.map((c) => c.crew_user_id).filter(Boolean)));
      for (const uid of uniqueIds) {
        try {
          map[uid] = await apiGet<UserDto>(`/users/${uid}`);
        } catch {
          /* skip */
        }
      }
      return map;
    },
  });

  const crewUsers = crewUsersQuery.data ?? {};

  const mediaQuery = useQuery({
    queryKey: ['transferMedia', id],
    enabled: !!id,
    refetchOnMount: 'always',
    queryFn: async () => {
      try {
        return await listTransferMedia(id as UUID, { limit: 50, offset: 0 });
      } catch (e) {
        if (isAxiosError(e) && e.response?.status === 403) {
          throw new Error(
            (e.response.data as { message?: string })?.message ||
              'You do not have permission to list transfer media.'
          );
        }
        throw e;
      }
    },
    retry: false,
  });

  const photos = useMemo(
    () =>
      (mediaQuery.data?.data ?? []).filter(
        (m) => m != null && typeof m === 'object' && m.type === 'photo'
      ),
    [mediaQuery.data]
  );

  const statusLabel = t(`transfersPage.statusLabels.${uiStatus}`);
  const storeName = tr?.store?.name ?? storeQuery.data?.name ?? tr?.store_id ?? '—';

  const handleStatus = async (status: Transfer['status']) => {
    if (!id) return;
    setStatusUpdating(true);
    try {
      await updateTransferStatus(id as UUID, { status });
      await queryClient.invalidateQueries({ queryKey: ['transfer', id] });
      await queryClient.invalidateQueries({ queryKey: ['transfers'] });
      await queryClient.invalidateQueries({ queryKey: ['transfer-timeline', id] });
      toast.success(t('transferDetailPage.toasts.statusUpdated'));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('transferDetailPage.toasts.statusFailed'));
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleCancel = async () => {
    if (!id || !window.confirm(t('transfersPage.confirmCancel'))) return;
    setCanceling(true);
    try {
      await updateTransferStatus(id as UUID, { status: 'canceled' });
      await queryClient.invalidateQueries({ queryKey: ['transfer', id] });
      await queryClient.invalidateQueries({ queryKey: ['transfers'] });
      toast.success(t('transferDetailPage.toasts.cancelled'));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('transferDetailPage.toasts.cancelFailed'));
    } finally {
      setCanceling(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !window.confirm(t('transfersPage.confirmDelete'))) return;
    setDeleting(true);
    try {
      await deleteTransfer(id as UUID);
      await queryClient.invalidateQueries({ queryKey: ['transfers'] });
      toast.success(t('transferDetailPage.toasts.deleted'));
      navigate('/app/transfers');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('transferDetailPage.toasts.deleteFailed'));
      setDeleting(false);
    }
  };

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md border text-sm hover:bg-gray-50"
            aria-label={t('transferDetailPage.header.back')}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
              {tr?.transfer_code || t('transferDetailPage.header.title')} #{id?.slice(0, 8)}
            </h1>
            <p className="mt-1 text-sm text-gray-500">{t('transferDetailPage.header.subtitle')}</p>
          </div>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
          {id ? (
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className={headerActionBtnClass('border-primary-200 bg-primary-50 text-primary-800 hover:bg-primary-100')}
            >
              <Pencil className="h-4 w-4 shrink-0" />
              <span className="truncate">{t('transfersPage.actions.edit')}</span>
            </button>
          ) : null}
          {canStartTransfer(uiStatus) ? (
            <button
              type="button"
              onClick={() => void handleStatus('in_progress')}
              disabled={statusUpdating}
              className={headerActionBtnClass('border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100', statusUpdating && 'opacity-50')}
            >
              <Play className="h-4 w-4 shrink-0" />
              <span className="truncate">{t('transferDetailPage.buttons.start')}</span>
            </button>
          ) : null}
          {canCompleteTransfer(uiStatus) ? (
            <button
              type="button"
              onClick={() => void handleStatus('completed')}
              disabled={statusUpdating}
              className={headerActionBtnClass('border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100', statusUpdating && 'opacity-50')}
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span className="truncate">{t('transferDetailPage.buttons.complete')}</span>
            </button>
          ) : null}
          {!isAdmin && canCancelTransfer(uiStatus) ? (
            <button
              type="button"
              onClick={() => void handleCancel()}
              disabled={canceling}
              className={headerActionBtnClass('border-zinc-200 bg-zinc-50 text-zinc-800 hover:bg-zinc-100', canceling && 'opacity-50')}
            >
              <XCircle className="h-4 w-4 shrink-0" />
              <span className="truncate">{t('transferDetailPage.buttons.cancel')}</span>
            </button>
          ) : null}
          {isAdmin ? (
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={deleting}
              className={headerActionBtnClass('border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100', deleting && 'opacity-50')}
            >
              <Trash2 className="h-4 w-4 shrink-0" />
              <span className="truncate">{t('transferDetailPage.buttons.delete')}</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 md:grid-cols-3">
        <div className="card min-w-0">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <Info className="h-4 w-4" />
              {t('transferDetailPage.statusCard.title')}
            </h3>
          </div>
          <div className="card-content space-y-2 text-sm">
            <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-xs font-medium', transferStatusBadgeClass(uiStatus))}>
              {statusLabel}
            </span>
            <div>
              {t('transferDetailPage.statusCard.fisno')}{' '}
              <span className="font-mono text-gray-700">{tr?.external_transfer_id ?? '—'}</span>
            </div>
            <div>
              {t('transferDetailPage.statusCard.store')}{' '}
              <span className="text-gray-700">{storeName}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {t('transferDetailPage.statusCard.depots')}{' '}
              <span className="inline-flex items-center gap-1 font-medium text-gray-800">
                {formatDepot(tr?.source_depot_code, tr?.source_depot_label)}
                <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
                {formatDepot(tr?.dest_depot_code, tr?.dest_depot_label)}
              </span>
            </div>
            <div>
              {t('transferDetailPage.statusCard.start')}{' '}
              <span className="tabular-nums text-gray-700">{formatUiDateTime(tr?.scheduled_start)}</span>
            </div>
            <div>
              {t('transferDetailPage.statusCard.end')}{' '}
              <span className="tabular-nums text-gray-700">{formatUiDateTime(tr?.scheduled_end)}</span>
            </div>
            {tr?.erp_date ? (
              <div>
                {t('transferDetailPage.statusCard.erpDate')}{' '}
                <span className="tabular-nums text-gray-700">{formatUiDateTime(tr.erp_date)}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="card min-w-0">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('transferDetailPage.crewCard.title')}
            </h3>
          </div>
          <div className="card-content">
            {crew.length === 0 ? (
              <div className="text-sm text-gray-500">{t('transferDetailPage.crewCard.none')}</div>
            ) : (
              <ul className="space-y-2">
                {crew.map((c) => {
                  const user = crewUsers[c.crew_user_id] ?? c.crew;
                  const statusKey = c.accepted_at ? 'accepted' : c.declined_at ? 'declined' : 'pending';
                  return (
                    <li key={c.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <div>
                        <div className="font-medium text-gray-900">{user?.name ?? '—'}</div>
                        <div className="text-xs text-gray-500">
                          {c.role || t('transferDetailPage.crewCard.roleFallback')} ·{' '}
                          {t(`transferDetailPage.crewCard.status.${statusKey}`)}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="card min-w-0">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t('transferDetailPage.notesCard.title')}
            </h3>
          </div>
          <div className="card-content space-y-3 text-sm">
            <div>
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                {t('transferDetailPage.notesCard.location')}
              </div>
              <div className="rounded-md border bg-white p-3">{tr?.location?.trim() || '—'}</div>
            </div>
            <div>
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                {t('transferDetailPage.notesCard.managerNotes')}
              </div>
              <div className="rounded-md border bg-white p-3 whitespace-pre-wrap">{tr?.notes?.trim() || '—'}</div>
            </div>
            {tr?.failure_reason ? (
              <div>
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-rose-600">
                  {t('transferDetailPage.notesCard.failureReason')}
                </div>
                <div className="rounded-md border border-rose-100 bg-rose-50/40 p-3 whitespace-pre-wrap">{tr.failure_reason}</div>
              </div>
            ) : null}
            {tr?.crew_notes ? (
              <div>
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                  {t('transferDetailPage.notesCard.crewNotes')}
                </div>
                <div className="rounded-md border border-primary-100 bg-primary-50/40 p-3 whitespace-pre-wrap">{tr.crew_notes}</div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="card min-w-0">
        <div className="card-header">
          <h3 className="card-title">{t('transferDetailPage.timeline.title')}</h3>
          <p className="card-description">
            {t('transferDetailPage.timeline.subtitle')}{' '}
            <Link to="/app/audit" className="font-medium text-primary-700 hover:underline">
              {t('transferDetailPage.timeline.auditLink')}
            </Link>
          </p>
        </div>
        <div className="card-content">
          {timelineQuery.isLoading ? (
            <p className="text-sm text-gray-500">{t('transferDetailPage.loading')}</p>
          ) : timelineEvents.length === 0 ? (
            <p className="text-sm text-gray-500">{t('transferDetailPage.timeline.empty')}</p>
          ) : (
            <ul className="space-y-3">
              {timelineEvents.map((ev) => (
                <li key={ev.id} className={cn('border-l-2 pl-3', transferTimelineAccentClass(ev.tone))}>
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                    <p className="text-sm font-medium leading-snug text-gray-900">{ev.headline}</p>
                    <time className="shrink-0 text-xs tabular-nums text-gray-500" dateTime={ev.date}>
                      {formatUiDateTime(ev.date)}
                    </time>
                  </div>
                  {ev.detail ? <p className="mt-1 text-sm text-gray-600">{ev.detail}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title flex items-center gap-2">
            <Package className="h-4 w-4" />
            {t('transferDetailPage.itemsCard.title')}
          </h3>
        </div>
        <div className="card-content overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">SKU</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Qty</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  {t('transferDetailPage.itemsCard.instructions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {items.map((it) => (
                <tr key={it.id}>
                  <td className="px-4 py-3 font-mono text-sm text-gray-900">{it.external_product_id}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{it.quantity ?? 1}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{it.special_instructions ?? '—'}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-500">
                    {t('transferDetailPage.itemsCard.none')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            {t('transferDetailPage.media.title')}
          </h3>
        </div>
        <div className="card-content">
          {mediaQuery.isLoading && <div className="text-sm text-gray-500">{t('transferDetailPage.media.loading')}</div>}
          {mediaQuery.isError && (
            <div className="text-sm text-red-600">
              {mediaQuery.error instanceof Error ? mediaQuery.error.message : t('transferDetailPage.media.loadError')}
            </div>
          )}
          {!mediaQuery.isLoading && !mediaQuery.isError && photos.length === 0 && (
            <div className="text-sm text-gray-500">{t('transferDetailPage.media.empty')}</div>
          )}
          {photos.length > 0 && (
            <RevealablePhotoGrid
              photos={photos.map((m) => ({
                id: m.id,
                url: resolveMediaUrl(m.url),
              }))}
            />
          )}
        </div>
      </div>

      <EditTransferModal
        transferId={(id as UUID) ?? null}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          void queryClient.invalidateQueries({ queryKey: ['transfer', id] });
        }}
      />
    </div>
  );
}
