// src/pages/manager/InstallationDetailPage.tsx
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  Package,
  Users,
  Info,
  FileText,
  Image as ImageIcon,
  XCircle,
  Trash2,
  Pencil,
} from 'lucide-react';
import toast from 'react-hot-toast';

import type { Installation } from '../../types';
import { cn } from '../../lib/utils';
import { formatUiDateTime } from '../../lib/date-display';
import { apiGet, isAxiosError, type UUID } from '../../api/http';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/auth';
import {
  updateInstallationStatus,
  deleteInstallation,
} from '../../api/installations';
import EditInstallationModal from '../../components/manager/EditInstallationModal';
import {
  listInstallationMedia,
  type MediaAsset,
} from '../../api/media';
import { resolveMediaUrl } from '../../lib/media-url';
import { getNetsisOrderDetail, type NetsisOrderLine } from '../../api/integrations';
import {
  pickLineQuantity,
  pickStokKoduFromLine,
  stokAdiFromLine,
  lineItemDescriptionFromLine,
  lineRowId,
} from '../../lib/netsis-native';
import {
  crewChecklistLabelKey,
  CREW_CHECKLIST_FIELD_KEYS,
  formatChecklistBooleanValue,
  resolveChecklistAnswersForDisplay,
} from '../../lib/crew-checklist-fields';

function headerActionBtnClass(...parts: (string | false | undefined)[]) {
  return cn(
    'inline-flex h-10 w-[11.5rem] shrink-0 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium',
    ...parts
  );
}

// Minimal types from OpenAPI we actually use here
type StoreDto = {
  id: string;
  name: string;
};

type UserDto = {
  id: string;
  name: string;
  email: string;
};

type InstallationItemDto = {
  id: string;
  external_product_id: string;
  sku?: string | null;
  name?: string | null;
  description?: string | null;
  quantity?: number | null;
  room_tag?: string | null;
  special_instructions?: string | null;
};

type CrewAssignmentDto = {
  id: string;
  crew_user_id: string;
  role: string | null;
  accepted_at?: string | null;
  declined_at?: string | null;
};

type InstallationWithRelations = Installation & {
  /** API field (Netsis / ERP order id); may differ from legacy `order_id` on type `Installation`. */
  external_order_id?: string;
  crew_after_installation_notes?: string | null;
  checklist_failure_reason?: string | null;
  checklist_answers?: Partial<Record<string, boolean>> | null;
  checklistResponses?: Array<{
    id: string;
    value?: unknown;
    item?: { key?: string | null; label?: string | null } | null;
  }>;
  items?: InstallationItemDto[];
  crew?: CrewAssignmentDto[];
};

/** Map NetOpenX kalem lines by stok kodu for merging onto local installation items. */
function netsisLinesByStokKodu(lines: NetsisOrderLine[] | undefined) {
  const m = new Map<string, { sku: string; name: string; description: string }>();
  if (!lines?.length) return m;
  for (const line of lines) {
    const sku = pickStokKoduFromLine(line);
    if (!sku) continue;
    const nameRaw = stokAdiFromLine(line);
    const descRaw = lineItemDescriptionFromLine(line);
    const nameOut = nameRaw && nameRaw !== sku ? nameRaw : sku;
    const description =
      descRaw && descRaw !== sku && descRaw !== nameOut ? descRaw : nameOut;
    m.set(sku, { sku, name: nameOut, description });
  }
  return m;
}

const badge = (s: Installation['status']) =>
  s === 'completed'
    ? 'bg-emerald-100 text-emerald-800'
    : s === 'in_progress' || s === 'accepted'
    ? 'bg-blue-100 text-blue-800'
    : s === 'failed'
    ? 'bg-red-100 text-red-800'
    : s === 'cancelled'
    ? 'bg-yellow-100 text-yellow-800'
    : 'bg-gray-100 text-gray-800';

/** Long crew/manager notes must wrap inside grid cards without stretching the page. */
const noteBodyClass =
  'max-w-full min-h-[64px] break-words whitespace-pre-wrap p-3 text-sm [overflow-wrap:anywhere]';

export default function InstallationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation('common');
  const { hasRole } = useAuthStore();
  const isAdmin = hasRole('ADMIN');
  const [canceling, setCanceling] = useState(false);
  const [staging, setStaging] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // ---- Main installation (with items + crew embedded) ----
  const query = useQuery({
    queryKey: ['installation', id],
    enabled: !!id,
    queryFn: async (): Promise<InstallationWithRelations> => {
      if (!id) {
        throw new Error('Missing installation id');
      }
      const installation = await apiGet<InstallationWithRelations>(
        `/installations/${id}`
      );
      return installation;
    },
  });

  const inst = query.data;
  const items = useMemo<InstallationItemDto[]>(() => inst?.items ?? [], [inst]);
  const crew = useMemo<CrewAssignmentDto[]>(() => inst?.crew ?? [], [inst]);
  const checklistAnswers = useMemo(
    () =>
      resolveChecklistAnswersForDisplay(
        inst?.checklist_answers ?? null,
        inst?.checklistResponses
      ),
    [inst?.checklist_answers, inst?.checklistResponses]
  );
  const hasAnyChecklistAnswer = CREW_CHECKLIST_FIELD_KEYS.some(
    (key) => checklistAnswers[key] === true || checklistAnswers[key] === false
  );
  /** Netsis order lines: used to enrich local items (SKU / name / description) and as fallback when there are no local rows. */
  const netsisOrderItemsQuery = useQuery({
    queryKey: ['installation-netsis-order-lines', inst?.id, inst?.store_id, inst?.external_order_id],
    enabled: Boolean(inst?.store_id && inst?.external_order_id),
    queryFn: async () => {
      const res = await getNetsisOrderDetail({
        store_id: String(inst!.store_id) as UUID,
        order_id: String(inst!.external_order_id || ''),
      });
      return res.data?.lines ?? [];
    },
    retry: false,
  });

  const displayItems = useMemo<InstallationItemDto[]>(() => {
    const netsisLines = netsisOrderItemsQuery.data ?? [];
    const byPid = netsisLinesByStokKodu(netsisLines);

    if (!items.length) {
      return netsisLines.map((line, idx) => {
        const sku = pickStokKoduFromLine(line);
        const nm = stokAdiFromLine(line);
        const desc = lineItemDescriptionFromLine(line);
        return {
          id: lineRowId(line, idx),
          external_product_id: sku,
          sku,
          name: nm?.trim() ? nm : sku,
          description:
            (desc?.trim() && desc.trim() !== (nm || '').trim() ? desc : null) ?? nm ?? sku,
          quantity: pickLineQuantity(line),
          room_tag: null,
          special_instructions: null,
        };
      }) as InstallationItemDto[];
    }

    return items.map((row) => {
      const pid = String(row.external_product_id ?? '').trim();
      const n = byPid.get(pid);
      if (n) {
        return {
          ...row,
          sku: n.sku,
          name: n.name,
          description: n.description,
        };
      }
      const sku = row.sku ?? pid;
      return {
        ...row,
        sku,
        name: row.name ?? null,
        description: row.description ?? row.special_instructions ?? null,
      };
    });
  }, [items, netsisOrderItemsQuery.data]);

  // ---- Store name lookup (instead of raw store_id) ----
  const storeQuery = useQuery({
    queryKey: ['store', inst?.store_id],
    enabled: !!inst?.store_id,
    queryFn: async () => {
      return apiGet<StoreDto>(`/stores/${inst!.store_id}`);
    },
  });

  // ---- Crew user names lookup (instead of raw crew_user_id) ----
  const crewUsersQuery = useQuery({
    queryKey: ['installationCrewUsers', inst?.id],
    enabled: !!inst && Array.isArray(inst.crew) && inst.crew.length > 0,
    queryFn: async () => {
      const map: Record<string, UserDto> = {};
      if (!inst?.crew) return map;

      const uniqueIds = Array.from(
        new Set(inst.crew.map((c) => c.crew_user_id).filter(Boolean))
      );

      for (const uid of uniqueIds) {
        try {
          const user = await apiGet<UserDto>(`/users/${uid}`);
          map[uid] = user;
        } catch {
          // skip failed lookups; fall back to raw ID
        }
      }

      return map;
    },
  });

  const crewUsers = crewUsersQuery.data ?? {};

  // ---- Installation media (photos) ----
  const mediaQuery = useQuery({
    queryKey: ['installationMedia', id],
    enabled: !!id,
    refetchOnMount: 'always',
    queryFn: async () => {
      if (!id) throw new Error('Missing installation id');
      try {
        return await listInstallationMedia(id, { limit: 50, offset: 0 });
      } catch (e) {
        if (isAxiosError(e) && e.response?.status === 403) {
          throw new Error(
            (e.response.data as { message?: string })?.message ||
              'You do not have permission to list installation media.'
          );
        }
        if (isAxiosError(e) && e.response?.data && typeof (e.response.data as any).message === 'string') {
          throw new Error((e.response.data as { message: string }).message);
        }
        throw e;
      }
    },
    retry: false,
  });

  const mediaErrorText = mediaQuery.error
    ? mediaQuery.error instanceof Error
      ? mediaQuery.error.message
      : 'Could not load photos for this installation.'
    : '';

  const photos: MediaAsset[] = useMemo(() => {
    const raw = mediaQuery.data?.data;
    const list = Array.isArray(raw) ? raw : [];
    return list.filter(
      (m): m is MediaAsset =>
        m != null &&
        typeof m === 'object' &&
        typeof (m as MediaAsset).type === 'string' &&
        (m as MediaAsset).type === 'photo'
    );
  }, [mediaQuery.data]);

  const statusLabel =
    inst?.status != null
      ? (() => {
          const key = `installationsPage.statusLabels.${inst.status}`;
          if (i18n.exists(key)) return t(key);
          return String(inst.status).replace(/_/g, ' ');
        })()
      : '—';

  const rawStatus = String(inst?.status ?? '');
  const canCancel =
    !isAdmin &&
    inst &&
    rawStatus !== 'canceled' &&
    rawStatus !== 'cancelled' &&
    rawStatus !== 'completed';

  const canStage =
    !isAdmin &&
    inst &&
    (rawStatus === 'pending' || rawStatus === 'scheduled');

  const handleStage = async () => {
    if (!id) return;
    setStaging(true);
    try {
      await updateInstallationStatus(id as UUID, { status: 'staged' });
      await queryClient.invalidateQueries({ queryKey: ['installation', id] });
      await queryClient.invalidateQueries({ queryKey: ['installations'] });
      await queryClient.invalidateQueries({ queryKey: ['calendar'] });
      toast.success(t('installationsPage.actions.stageInstallation'));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('installationsPage.loadError');
      toast.error(msg);
    } finally {
      setStaging(false);
    }
  };

  const handleCancel = async () => {
    if (!id || !window.confirm(t('installationsPage.confirmCancel'))) return;
    setCanceling(true);
    try {
      await updateInstallationStatus(id as UUID, { status: 'canceled' });
      await queryClient.invalidateQueries({ queryKey: ['installation', id] });
      await queryClient.invalidateQueries({ queryKey: ['installations'] });
      await queryClient.invalidateQueries({ queryKey: ['calendar'] });
      toast.success(t('installationDetailPage.toasts.cancelled'));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('installationDetailPage.toasts.cancelFailed');
      toast.error(msg);
    } finally {
      setCanceling(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !window.confirm(t('installationsPage.confirmDelete'))) return;
    setDeleting(true);
    try {
      await deleteInstallation(id as UUID);
      await queryClient.invalidateQueries({ queryKey: ['installations'] });
      await queryClient.invalidateQueries({ queryKey: ['calendar'] });
      toast.success(t('installationDetailPage.toasts.deleted'));
      navigate('/app/installations');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('installationDetailPage.toasts.deleteFailed');
      toast.error(msg);
      setDeleting(false);
    }
  };

  return (
    <div className="min-w-0 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-md border px-2 py-1.5 text-sm hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('installationDetailPage.header.title')} #{id}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {t('installationDetailPage.header.subtitle')}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link
            to="/app/calendar"
            className={headerActionBtnClass(
              'border-gray-200 bg-white text-gray-800 hover:bg-gray-50'
            )}
          >
            <CalendarDays className="h-4 w-4 shrink-0" />
            <span className="truncate">{t('installationDetailPage.buttons.openCalendar')}</span>
          </Link>
          {inst?.external_order_id ? (
            <Link
              to={`/app/orders/${encodeURIComponent(inst.external_order_id)}?store_id=${encodeURIComponent(inst.store_id)}`}
              className={headerActionBtnClass(
                'border-gray-200 bg-white text-gray-800 hover:bg-gray-50'
              )}
            >
              <ClipboardList className="h-4 w-4 shrink-0" />
              <span className="truncate">{t('installationDetailPage.buttons.viewOrder')}</span>
            </Link>
          ) : null}
          {id ? (
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className={headerActionBtnClass(
                'border-primary-200 bg-primary-50 text-primary-800 hover:bg-primary-100'
              )}
            >
              <Pencil className="h-4 w-4 shrink-0" />
              <span className="truncate">{t('installationsPage.actions.edit')}</span>
            </button>
          ) : null}
          {!isAdmin && inst ? (
            <button
              type="button"
              onClick={() => void handleStage()}
              disabled={!canStage || staging}
              className={headerActionBtnClass(
                canStage
                  ? 'border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100'
                  : 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400',
                staging && 'opacity-50'
              )}
            >
              <Package className="h-4 w-4 shrink-0" />
              <span className="truncate">{t('installationsPage.actions.stageInstallation')}</span>
            </button>
          ) : null}
          {canCancel ? (
            <button
              type="button"
              onClick={() => void handleCancel()}
              disabled={canceling}
              className={headerActionBtnClass(
                'border-zinc-200 bg-zinc-50 text-zinc-800 hover:bg-zinc-100',
                canceling && 'opacity-50'
              )}
            >
              <XCircle className="h-4 w-4 shrink-0" />
              <span className="truncate">{t('installationDetailPage.buttons.cancelInstallation')}</span>
            </button>
          ) : null}
          {isAdmin ? (
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={deleting}
              className={headerActionBtnClass(
                'border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100',
                deleting && 'opacity-50'
              )}
            >
              <Trash2 className="h-4 w-4 shrink-0" />
              <span className="truncate">{t('installationDetailPage.buttons.deleteInstallation')}</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Meta cards */}
      <div className="grid min-w-0 grid-cols-1 gap-6 md:grid-cols-3">
        {/* Status + store + schedule */}
        <div className="card min-w-0">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <Info className="h-4 w-4" />
              {t('installationDetailPage.statusCard.title')}
            </h3>
            <p className="card-description">
              {t('installationDetailPage.statusCard.subtitle')}
            </p>
          </div>
          <div className="card-content space-y-2 text-sm">
            <div>
              <span
                className={cn(
                  'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                  inst ? badge(inst.status) : 'bg-gray-100 text-gray-800'
                )}
              >
                {inst ? statusLabel : '—'}
              </span>
            </div>
            <div>
              {t('installationDetailPage.statusCard.store')}{' '}
              <span className="text-gray-700">
                {storeQuery.data?.name ?? inst?.store_id ?? '—'}
              </span>
            </div>
            <div>
              {t('installationDetailPage.statusCard.start')}{' '}
              <span className="text-gray-700">
                {inst?.scheduled_start
                  ? formatUiDateTime(inst.scheduled_start)
                  : '—'}
              </span>
            </div>
            <div>
              {t('installationDetailPage.statusCard.end')}{' '}
              <span className="text-gray-700">
                {inst?.scheduled_end
                  ? formatUiDateTime(inst.scheduled_end)
                  : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Crew */}
        <div className="card min-w-0">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('installationDetailPage.crewCard.title')}
            </h3>
            <p className="card-description">
              {t('installationDetailPage.crewCard.subtitle')}
            </p>
          </div>
          <div className="card-content">
            {crew.length === 0 ? (
              <div className="text-sm text-gray-500">
                {t('installationDetailPage.crewCard.none')}
              </div>
            ) : (
              <ul className="space-y-2">
                {crew.map((c) => {
                  const user = crewUsers[c.crew_user_id];
                  const statusKey = c.accepted_at
                    ? 'accepted'
                    : c.declined_at
                    ? 'declined'
                    : 'pending';
                  const statusLabel = t(
                    `installationDetailPage.crewCard.status.${statusKey}`
                  );

                  return (
                    <li
                      key={c.id}
                      className="rounded-md border px-3 py-2 text-sm flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium text-gray-900">
                          {user?.name ??
                            t('installationDetailPage.crewCard.memberFallback')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {c.role ||
                            t('installationDetailPage.crewCard.roleFallback')}{' '}
                          · {statusLabel}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {user?.email ?? c.crew_user_id}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="card min-w-0">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t('installationDetailPage.notesCard.title')}
            </h3>
            <p className="card-description">
              {t('installationDetailPage.notesCard.subtitle')}
            </p>
          </div>
          <div className="card-content space-y-4">
            <div>
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                {t('installationDetailPage.notesCard.title')}
              </div>
              <div className={cn("rounded-md border bg-white text-gray-800", noteBodyClass)}>
                {inst?.notes?.trim() ? (
                  inst.notes
                ) : (
                  <span className="text-gray-400">
                    {t('installationDetailPage.notesCard.none')}
                  </span>
                )}
              </div>
            </div>
            <div>
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                {t('installationDetailPage.paymentNoteCard.title')}
              </div>
              <p className="mb-2 text-xs text-gray-500">
                {t('installationDetailPage.paymentNoteCard.subtitle')}
              </p>
              <div className={cn("rounded-md border border-amber-100 bg-amber-50/50 text-gray-900", noteBodyClass)}>
                {String(inst?.customer_payment_note || '').trim() ? (
                  inst!.customer_payment_note
                ) : (
                  <span className="text-gray-400">
                    {t('installationDetailPage.paymentNoteCard.none')}
                  </span>
                )}
              </div>
            </div>
            <div>
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                {t('installationDetailPage.crewNotesCard.title')}
              </div>
              <p className="mb-2 text-xs text-gray-500">
                {t('installationDetailPage.crewNotesCard.subtitle')}
              </p>
              <div className={cn("rounded-md border border-primary-100 bg-primary-50/40 text-gray-900", noteBodyClass)}>
                {String(inst?.crew_after_installation_notes || '').trim() ? (
                  inst!.crew_after_installation_notes
                ) : (
                  <span className="text-gray-400">
                    {t('installationDetailPage.crewNotesCard.none')}
                  </span>
                )}
              </div>
            </div>
            <div>
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                {t('installationDetailPage.checklistCard.failureReason')}
              </div>
              <div className={cn("rounded-md border border-rose-100 bg-rose-50/40 text-gray-900", noteBodyClass)}>
                {String(inst?.checklist_failure_reason || '').trim() ? (
                  inst!.checklist_failure_reason
                ) : (
                  <span className="text-gray-400">
                    {t('installationDetailPage.checklistCard.noFailureReason')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card min-w-0">
        <div className="card-header">
          <h3 className="card-title">{t('installationDetailPage.checklistCard.title')}</h3>
          <p className="card-description">{t('installationDetailPage.checklistCard.subtitle')}</p>
        </div>
        <div className="card-content space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {inst?.checklist_result === 'success' ? (
              <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                {t('installationDetailPage.checklistCard.resultSuccess')}
              </span>
            ) : inst?.checklist_result === 'failed' ? (
              <span className="inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800">
                {t('installationDetailPage.checklistCard.resultFailed')}
              </span>
            ) : (
              <span className="text-gray-400">{t('installationDetailPage.checklistCard.none')}</span>
            )}
            {inst?.checklist_completed_at ? (
              <span className="text-xs text-gray-500">
                {t('installationDetailPage.checklistCard.completedAt')}: {formatUiDateTime(inst.checklist_completed_at)}
              </span>
            ) : null}
          </div>
          {!hasAnyChecklistAnswer ? (
            <p className="text-sm text-gray-400">{t('installationDetailPage.checklistCard.noResponses')}</p>
          ) : null}
          <ul className="divide-y divide-gray-100 rounded-md border bg-white">
            {CREW_CHECKLIST_FIELD_KEYS.map((key) => (
              <li key={key} className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
                <span className="min-w-0 flex-1 text-gray-800">{t(crewChecklistLabelKey(key))}</span>
                <span className="shrink-0 font-medium text-gray-900">
                  {formatChecklistBooleanValue(
                    checklistAnswers[key],
                    t('crewPages.checklist.yes'),
                    t('crewPages.checklist.no'),
                    t('installationDetailPage.checklistCard.notAnswered')
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Items */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title flex items-center gap-2">
            <Package className="h-4 w-4" />
            {t('installationDetailPage.itemsCard.title')}
          </h3>
          <p className="card-description">
            {t('installationDetailPage.itemsCard.subtitle')}
          </p>
        </div>
        <div className="card-content overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  SKU
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Qty
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('installationDetailPage.itemsCard.table.room')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('installationDetailPage.itemsCard.table.instructions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {displayItems.map((it) => {
                const sku = String(it.sku ?? it.external_product_id ?? '').trim() || '—';
                const nameRaw = String(it.name ?? '').trim();
                const descRaw = String(it.description ?? '').trim();
                const instr = String(it.special_instructions ?? '').trim();
                const hasDistinctName = Boolean(nameRaw && nameRaw !== sku);
                const name = hasDistinctName
                  ? nameRaw
                  : t('installationDetailPage.itemsCard.table.noProductTitle');
                let description: string;
                let descriptionIsPlaceholder = false;
                if (descRaw && descRaw !== sku && descRaw !== nameRaw) description = descRaw;
                else if (instr) description = instr;
                else if (descRaw && descRaw !== sku) description = descRaw;
                else {
                  description = t(
                    'installationDetailPage.itemsCard.table.noProductDescription'
                  );
                  descriptionIsPlaceholder = true;
                }
                return (
                <tr key={it.id}>
                  <td className="px-4 py-3 text-sm font-mono text-gray-900">
                    {sku}
                  </td>
                  <td
                    className={cn(
                      'px-4 py-3 text-sm text-gray-900',
                      !hasDistinctName && 'text-gray-500 italic'
                    )}
                  >
                    {name}
                  </td>
                  <td
                    className={cn(
                      'px-4 py-3 text-sm text-gray-700',
                      descriptionIsPlaceholder && 'text-gray-500 italic'
                    )}
                  >
                    {description}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {it.quantity ?? 1}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {it.room_tag ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {it.special_instructions ?? '—'}
                  </td>
                </tr>
              );
              })}
              {displayItems.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-sm text-gray-500"
                  >
                    {t('installationDetailPage.itemsCard.none')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {(query.isLoading || netsisOrderItemsQuery.isLoading) && (
            <div className="px-4 py-6 text-sm text-gray-500">
              {t('installationDetailPage.loading')}
            </div>
          )}
          {(query.isError || netsisOrderItemsQuery.isError) && (
            <div className="px-4 py-6 text-sm text-red-600">
              {t('installationDetailPage.loadError')}
            </div>
          )}
        </div>
      </div>

      {/* Media / Photos */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Photos
          </h3>
          <p className="card-description">
            Photos captured by the crew for this installation.
          </p>
        </div>
        <div className="card-content">
          {mediaQuery.isLoading && (
            <div className="text-sm text-gray-500">Loading photos…</div>
          )}

          {mediaQuery.isError && (
            <div className="text-sm text-red-600">
              {mediaErrorText || 'Could not load photos for this installation.'}
            </div>
          )}

          {!mediaQuery.isLoading && !mediaQuery.isError && photos.length === 0 && (
            <div className="text-sm text-gray-500">
              No photos have been uploaded for this installation yet.
            </div>
          )}

          {photos.length > 0 && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
              {photos.map((m) => {
                const src = resolveMediaUrl(m.url);
                return (
                <a
                  key={m.id}
                  href={src}
                  target="_blank"
                  rel="noreferrer"
                  className="group block overflow-hidden rounded-md border bg-gray-50"
                >
                  <img
                    src={src}
                    alt="Installation photo"
                    className="h-32 w-full object-cover transition-transform group-hover:scale-105"
                  />
                </a>
              );
              })}
            </div>
          )}
        </div>
      </div>

      <EditInstallationModal
        installationId={(id as UUID) ?? null}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        canEditStatus={isAdmin}
        onSaved={() => {
          void queryClient.invalidateQueries({ queryKey: ['installation', id] });
        }}
      />
    </div>
  );
}