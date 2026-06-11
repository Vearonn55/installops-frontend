// src/pages/manager/TransfersPage.tsx
import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Calendar as CalendarIcon,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Edit3,
  Trash2,
  ArrowRight,
  Store as StoreIcon,
} from 'lucide-react';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import { cn } from '../../lib/utils';
import { formatUiDateTime } from '../../lib/date-display';
import {
  defaultDateRangeInstallationsList,
  installationInDateRange,
} from '../../lib/date-range';
import { useManagerStoreId } from '../../hooks/use-manager-store-id';
import { useAuthStore } from '../../stores/auth';
import {
  listTransfers,
  type Transfer,
  type TransferStatus,
  updateTransferStatus,
  deleteTransfer,
} from '../../api/transfers';
import { listStores, type Store } from '../../api/stores';
import type { UUID } from '../../api/http';
import EditTransferModal from '../../components/manager/EditTransferModal';
import ResponsiveDataView, {
  MobileCardActions,
  MobileCardField,
} from '../../components/ui/ResponsiveDataView';
import RowActionsMenu, { type RowActionItem } from '../../components/ui/RowActionsMenu';
import { pageHeaderClass, primaryButtonClass } from '../../lib/responsive-layout';
import { textMatchesSearch } from '../../lib/search-text';
import { DateRangeFilter } from '../../components/filters/DateRangeFilter';
import {
  normalizeTransferStatus,
  transferStatusBadgeClass,
  transferStatusRank,
  canCancelTransfer,
  type TransferStatus as UiTransferStatus,
} from '../../lib/transfer-status';

type Row = {
  id: string;
  transferCode: string;
  status: UiTransferStatus;
  start: string | null;
  end: string | null;
  createdAt: string;
  externalTransferId: string;
  storeName: string;
  location?: string;
  sourceDepot: string;
  destDepot: string;
  crewCount: number;
};

const TRANSFERS_PAGE_SIZE = 50;

function formatDepot(code?: number | null, label?: string | null): string {
  if (label?.trim()) return label.trim();
  if (code != null && !Number.isNaN(code)) return String(code);
  return '—';
}

function makeRow(tr: Transfer, store?: Store): Row {
  const uiStatus = normalizeTransferStatus(tr.status);
  const resolvedStore = store ?? tr.store;

  return {
    id: tr.id,
    transferCode: tr.transfer_code ?? tr.id,
    status: uiStatus,
    start: tr.scheduled_start ?? null,
    end: tr.scheduled_end ?? null,
    createdAt: tr.created_at,
    externalTransferId: tr.external_transfer_id,
    storeName: resolvedStore?.name ?? tr.store_id,
    location: tr.location ?? undefined,
    sourceDepot: formatDepot(tr.source_depot_code, tr.source_depot_label),
    destDepot: formatDepot(tr.dest_depot_code, tr.dest_depot_label),
    crewCount: Array.isArray(tr.crew) ? tr.crew.length : 0,
  };
}

function applyTransferFilters(
  rows: Row[],
  opts: {
    q: string;
    status: UiTransferStatus | 'all';
    from: string;
    to: string;
  }
): Row[] {
  let list = rows.slice();

  if (opts.from && opts.to) {
    list = list.filter((r) =>
      installationInDateRange(
        { scheduledStart: r.start, scheduledEnd: r.end, createdAt: r.createdAt },
        opts.from,
        opts.to
      )
    );
  }

  if (opts.q.trim()) {
    list = list.filter(
      (r) =>
        textMatchesSearch(r.id, opts.q) ||
        textMatchesSearch(r.transferCode, opts.q) ||
        textMatchesSearch(r.externalTransferId, opts.q) ||
        textMatchesSearch(r.storeName, opts.q) ||
        textMatchesSearch(r.location, opts.q) ||
        textMatchesSearch(r.sourceDepot, opts.q) ||
        textMatchesSearch(r.destDepot, opts.q)
    );
  }

  if (opts.status !== 'all') {
    list = list.filter((r) => r.status === opts.status);
  }

  return list;
}

export default function TransfersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation('common');
  const { hasRole } = useAuthStore();
  const isAdmin = hasRole('ADMIN');

  const rangeDefault = useMemo(() => defaultDateRangeInstallationsList(), []);

  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [adminStoreId, setAdminStoreId] = useState<string>('');
  const [status, setStatus] = useState<UiTransferStatus | 'all'>('all');
  const [from, setFrom] = useState<string>(rangeDefault.from);
  const [to, setTo] = useState<string>(rangeDefault.to);
  const [sortBy, setSortBy] = useState<'start' | 'transferCode' | 'depots' | 'status'>('transferCode');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQ(q.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    setPage(1);
  }, [q, status, from, to, adminStoreId]);

  const storesQuery = useQuery({
    queryKey: ['stores'],
    queryFn: async () => listStores({ limit: 200, offset: 0 }),
  });

  const managerStoreId = useManagerStoreId(storesQuery.data?.data ?? []);
  const effectiveStoreId = isAdmin
    ? adminStoreId || undefined
    : managerStoreId || undefined;

  const transfersQuery = useInfiniteQuery({
    queryKey: ['transfers', { store_id: effectiveStoreId ?? 'all', q: debouncedQ }],
    enabled: storesQuery.isSuccess && (isAdmin || Boolean(managerStoreId)),
    queryFn: async ({ pageParam }) => {
      const offset = typeof pageParam === 'number' ? pageParam : 0;
      return listTransfers({
        limit: TRANSFERS_PAGE_SIZE,
        offset,
        ...(effectiveStoreId ? { store_id: effectiveStoreId as UUID } : {}),
        ...(debouncedQ ? { q: debouncedQ } : {}),
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const next = lastPage.offset + lastPage.data.length;
      if (lastPage.data.length < TRANSFERS_PAGE_SIZE) return undefined;
      return next;
    },
  });

  const allTransfers: Transfer[] = useMemo(
    () => transfersQuery.data?.pages.flatMap((p) => p.data) ?? [],
    [transfersQuery.data]
  );

  const [editingId, setEditingId] = useState<UUID | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const storesById = useMemo(() => {
    const m = new Map<string, Store>();
    (storesQuery.data?.data ?? []).forEach((s) => m.set(s.id, s));
    return m;
  }, [storesQuery.data]);

  const allRows: Row[] = useMemo(
    () => allTransfers.map((tr) => makeRow(tr, storesById.get(tr.store_id))),
    [allTransfers, storesById]
  );

  const filterOpts = useMemo(() => ({ q, status, from, to }), [q, status, from, to]);

  const rowsForStatusCounts = useMemo(
    () =>
      applyTransferFilters(allRows, {
        q: filterOpts.q,
        status: 'all',
        from: filterOpts.from,
        to: filterOpts.to,
      }),
    [allRows, filterOpts.q, filterOpts.from, filterOpts.to]
  );

  const filtered = useMemo(() => {
    let list = applyTransferFilters(allRows, filterOpts);
    list.sort((a, b) => {
      switch (sortBy) {
        case 'start': {
          const as = a.start ?? '';
          const bs = b.start ?? '';
          return sortDir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
        }
        case 'transferCode': {
          const cmp = a.transferCode.localeCompare(b.transferCode, undefined, {
            numeric: true,
            sensitivity: 'base',
          });
          return sortDir === 'asc' ? cmp : -cmp;
        }
        case 'depots': {
          const ad = `${a.sourceDepot}→${a.destDepot}`;
          const bd = `${b.sourceDepot}→${b.destDepot}`;
          return sortDir === 'asc' ? ad.localeCompare(bd) : bd.localeCompare(ad);
        }
        case 'status':
          return sortDir === 'asc'
            ? transferStatusRank(a.status) - transferStatusRank(b.status)
            : transferStatusRank(b.status) - transferStatusRank(a.status);
      }
    });
    return list;
  }, [allRows, filterOpts, sortBy, sortDir]);

  const counts = useMemo(() => {
    const c: Record<UiTransferStatus | 'all', number> = {
      all: rowsForStatusCounts.length,
      scheduled: rowsForStatusCounts.filter((r) => r.status === 'scheduled').length,
      in_progress: rowsForStatusCounts.filter((r) => r.status === 'in_progress').length,
      completed: rowsForStatusCounts.filter((r) => r.status === 'completed').length,
      failed: rowsForStatusCounts.filter((r) => r.status === 'failed').length,
      canceled: rowsForStatusCounts.filter((r) => r.status === 'canceled').length,
    };
    return c;
  }, [rowsForStatusCounts]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const filteredEmptyWithData = allRows.length > 0 && filtered.length === 0;
  const isLoadingList =
    transfersQuery.isLoading || (!isAdmin && storesQuery.isLoading);

  const toggleSort = (k: typeof sortBy) => {
    if (sortBy === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(k);
      setSortDir('asc');
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm(t('transfersPage.confirmCancel'))) return;
    setCancelingId(id);
    try {
      await updateTransferStatus(id as UUID, { status: 'canceled' });
      await queryClient.invalidateQueries({ queryKey: ['transfers'] });
      toast.success(t('transfersPage.toasts.cancelled'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('transfersPage.toasts.cancelFailed');
      toast.error(msg);
    } finally {
      setCancelingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('transfersPage.confirmDelete'))) return;
    setDeletingId(id);
    try {
      await deleteTransfer(id as UUID);
      await queryClient.invalidateQueries({ queryKey: ['transfers'] });
      toast.success(t('transfersPage.toasts.deleted'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('transfersPage.toasts.deleteFailed');
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const secondaryRowActions = (r: Row): RowActionItem[] => {
    const items: RowActionItem[] = [
      {
        id: 'edit',
        label: t('transfersPage.actions.edit'),
        onClick: () => setEditingId(r.id as UUID),
      },
    ];
    if (isAdmin) {
      items.push({
        id: 'delete',
        label: t('transfersPage.actions.delete'),
        onClick: () => void handleDelete(r.id),
        disabled: deletingId === r.id,
        variant: 'danger' as const,
      });
    } else if (canCancelTransfer(r.status)) {
      items.push({
        id: 'cancel',
        label: t('transfersPage.actions.cancel'),
        onClick: () => void handleCancel(r.id),
        disabled: cancelingId === r.id,
      });
    }
    return items;
  };

  const paginationFooter = (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t p-3 text-sm">
      <div className="text-gray-600">
        {t('transfersPage.pagination.showing')}{' '}
        <span className="font-medium text-gray-900">{paged.length}</span>{' '}
        {t('transfersPage.pagination.of')}{' '}
        <span className="font-medium text-gray-900">{filtered.length}</span>
        {filtered.length !== allRows.length ? (
          <span className="text-gray-500">
            {' '}
            · {t('transfersPage.pagination.loaded', { count: allRows.length })}
          </span>
        ) : null}
      </div>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
        {transfersQuery.hasNextPage ? (
          <button
            type="button"
            onClick={() => void transfersQuery.fetchNextPage()}
            disabled={transfersQuery.isFetchingNextPage}
            className={cn(
              'min-h-11 rounded-md border border-primary-300 bg-primary-50 px-3 py-2 text-primary-800',
              transfersQuery.isFetchingNextPage && 'opacity-50'
            )}
          >
            {transfersQuery.isFetchingNextPage
              ? t('transfersPage.pagination.loadingMore')
              : t('transfersPage.pagination.loadMore')}
          </button>
        ) : null}
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className={cn('min-h-11 rounded-md border px-3 py-2', page === 1 ? 'opacity-50' : 'hover:bg-gray-50')}
        >
          {t('transfersPage.pagination.prev')}
        </button>
        <div className="flex min-h-11 items-center justify-center">
          {t('transfersPage.pagination.page')} <span className="font-medium">{page}</span> / {totalPages}
        </div>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className={cn(
            'min-h-11 rounded-md border px-3 py-2',
            page === totalPages ? 'opacity-50' : 'hover:bg-gray-50'
          )}
        >
          {t('transfersPage.pagination.next')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className={pageHeaderClass}>
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{t('transfersPage.title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('transfersPage.subtitle')}</p>
        </div>
        <button
          onClick={() => navigate('/app/transfers/new')}
          className={cn(primaryButtonClass, 'bg-primary-600 text-white hover:bg-primary-700')}
        >
          <Plus className="mr-2 h-4 w-4" />
          {t('transfersPage.createButton')}
        </button>
      </div>

      <div className="filter-panel space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:items-end">
          <div className="min-w-0">
            <label className="mb-1 block text-xs text-gray-600">
              {t('ordersPage.storeLabel')}
            </label>
            <div className="relative min-w-0">
              <StoreIcon className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select
                className={cn(
                  'input-select-with-icon w-full',
                  !isAdmin && Boolean(managerStoreId) && 'opacity-60'
                )}
                value={isAdmin ? adminStoreId : managerStoreId ?? ''}
                disabled={!isAdmin && Boolean(managerStoreId)}
                onChange={(e) => {
                  if (!isAdmin) return;
                  setAdminStoreId(e.target.value);
                  setPage(1);
                }}
              >
                {isAdmin ? (
                  <option value="">{t('ordersPage.storeAll')}</option>
                ) : null}
                {(storesQuery.data?.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="min-w-0">
            <label className="mb-1 block text-xs text-gray-600">
              {t('transfersPage.filters.searchLabel')}
            </label>
            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                className="input-search-field w-full"
                placeholder={t('transfersPage.filters.searchPlaceholder')}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
          <div className="min-w-0">
            <label className="mb-1 block text-xs text-gray-600">
              {t('transfersPage.filters.statusLabel')}
            </label>
            <div className="relative min-w-0">
              <Filter className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select
                className="input-select-with-icon w-full"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as UiTransferStatus | 'all');
                  setPage(1);
                }}
              >
                <option value="all">{t('transfersPage.filters.status.all')}</option>
                <option value="scheduled">{t('transfersPage.filters.status.scheduled')}</option>
                <option value="in_progress">{t('transfersPage.filters.status.in_progress')}</option>
                <option value="completed">{t('transfersPage.filters.status.completed')}</option>
                <option value="failed">{t('transfersPage.filters.status.failed')}</option>
                <option value="canceled">{t('transfersPage.filters.status.canceled')}</option>
              </select>
            </div>
          </div>
        </div>
        <DateRangeFilter
          from={from}
          to={to}
          fromLabel={t('transfersPage.filters.from')}
          toLabel={t('transfersPage.filters.to')}
          onFromChange={(val) => {
            setFrom(val);
            if (to && val > to) setTo(val);
            setPage(1);
          }}
          onToChange={(val) => {
            setTo(val);
            if (from && val < from) setFrom(val);
            setPage(1);
          }}
        />
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto pb-1 pt-0.5 md:flex-wrap md:overflow-visible">
        <QuickChip label={t('transfersPage.chips.all')} value={counts.all} active={status === 'all'} onClick={() => { setStatus('all'); setPage(1); }} />
        <QuickChip label={t('transfersPage.chips.scheduled')} value={counts.scheduled} tone="gray" icon={<Clock className="h-3.5 w-3.5" />} active={status === 'scheduled'} onClick={() => { setStatus('scheduled'); setPage(1); }} />
        <QuickChip label={t('transfersPage.chips.in_progress')} value={counts.in_progress} tone="amber" icon={<Clock className="h-3.5 w-3.5" />} active={status === 'in_progress'} onClick={() => { setStatus('in_progress'); setPage(1); }} />
        <QuickChip label={t('transfersPage.chips.completed')} value={counts.completed} tone="emerald" icon={<CheckCircle2 className="h-3.5 w-3.5" />} active={status === 'completed'} onClick={() => { setStatus('completed'); setPage(1); }} />
        <QuickChip label={t('transfersPage.chips.failed')} value={counts.failed} tone="rose" icon={<AlertTriangle className="h-3.5 w-3.5" />} active={status === 'failed'} onClick={() => { setStatus('failed'); setPage(1); }} />
        <QuickChip label={t('transfersPage.chips.canceled')} value={counts.canceled} tone="zinc" icon={<XCircle className="h-3.5 w-3.5" />} active={status === 'canceled'} onClick={() => { setStatus('canceled'); setPage(1); }} />
      </div>

      <ResponsiveDataView
        rows={paged}
        keyExtractor={(r) => r.id}
        loading={isLoadingList}
        loadingContent={<p className="px-4 py-8 text-center text-sm text-gray-500">{t('transfersPage.loading')}</p>}
        error={transfersQuery.isError}
        errorContent={<p className="px-4 py-8 text-center text-sm text-red-600">{t('transfersPage.loadError')}</p>}
        empty={!isLoadingList && !transfersQuery.isError && paged.length === 0}
        emptyContent={
          <p className="px-4 py-8 text-center text-sm text-gray-500">
            {filteredEmptyWithData
              ? t('transfersPage.noResultsInRange', { loaded: allRows.length })
              : t('transfersPage.noResults')}
          </p>
        }
        footer={paginationFooter}
        renderMobileCard={(r) => (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900">{r.transferCode}</p>
                <p className="text-xs text-gray-500">{r.externalTransferId || '—'}</p>
              </div>
              <StatusPill status={r.status} label={t(`transfersPage.statusLabels.${r.status}`)} />
            </div>
            <DepotArrow source={r.sourceDepot} dest={r.destDepot} />
            <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <MobileCardField label={t('transfersPage.table.start')}>
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <CalendarIcon className="h-3.5 w-3.5 text-gray-400" />
                  {formatUiDateTime(r.start)}
                </span>
              </MobileCardField>
              <MobileCardField label={t('transfersPage.table.store')}>{r.storeName}</MobileCardField>
            </dl>
            <MobileCardActions>
              <button
                type="button"
                onClick={() => navigate(`/app/transfers/${r.id}`)}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md bg-primary-600 px-3 text-sm font-medium text-white hover:bg-primary-700"
              >
                {t('transfersPage.actions.view')}
              </button>
              <RowActionsMenu actions={secondaryRowActions(r)} triggerLabel={t('transfersPage.actions.moreActions')} />
            </MobileCardActions>
          </div>
        )}
        desktop={
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-600">
              <tr>
                <Th label={t('transfersPage.table.start')} active={sortBy === 'start'} dir={sortDir} onClick={() => toggleSort('start')} />
                <Th label={t('transfersPage.table.transfer')} active={sortBy === 'transferCode'} dir={sortDir} onClick={() => toggleSort('transferCode')} />
                <Th label={t('transfersPage.table.depots')} active={sortBy === 'depots'} dir={sortDir} onClick={() => toggleSort('depots')} />
                <th className="px-3 py-2 text-left">{t('transfersPage.table.store')}</th>
                <Th label={t('transfersPage.table.status')} active={sortBy === 'status'} dir={sortDir} onClick={() => toggleSort('status')} />
                <th className="w-28 px-3 py-2 text-left">{t('transfersPage.table.crew')}</th>
                <th className="min-w-[11rem] px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoadingList ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-gray-500">{t('transfersPage.loading')}</td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                    {filteredEmptyWithData
                      ? t('transfersPage.noResultsInRange', { loaded: allRows.length })
                      : t('transfersPage.noResults')}
                  </td>
                </tr>
              ) : (
                paged.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1 text-xs tabular-nums text-gray-600">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        {formatUiDateTime(r.start)}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900">{r.transferCode}</div>
                      <div className="text-xs text-gray-500">{r.externalTransferId || '—'}</div>
                    </td>
                    <td className="px-3 py-2">
                      <DepotArrow source={r.sourceDepot} dest={r.destDepot} />
                    </td>
                    <td className="px-3 py-2 font-medium text-gray-900">{r.storeName}</td>
                    <td className="px-3 py-2">
                      <StatusPill status={r.status} label={t(`transfersPage.statusLabels.${r.status}`)} />
                    </td>
                    <td className="px-3 py-2">
                      {r.crewCount > 0 ? (
                        <span className="inline-flex items-center rounded border px-2 py-0.5 text-[11px] text-gray-700">
                          <Users className="mr-1 h-3.5 w-3.5" />
                          {r.crewCount} {t('transfersPage.crew.assigned')}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button onClick={() => navigate(`/app/transfers/${r.id}`)} className="text-xs font-medium text-primary-600 hover:text-primary-800">
                          {t('transfersPage.actions.view')}
                        </button>
                        <button onClick={() => setEditingId(r.id as UUID)} className="inline-flex items-center gap-1 rounded border border-primary-200 bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700 hover:bg-primary-100">
                          <Edit3 className="h-3.5 w-3.5" />
                          {t('transfersPage.actions.edit')}
                        </button>
                        {isAdmin ? (
                          <button onClick={() => void handleDelete(r.id)} disabled={deletingId === r.id} className={cn('inline-flex items-center gap-1 rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 hover:bg-rose-100', deletingId === r.id && 'opacity-50')}>
                            <Trash2 className="h-3.5 w-3.5" />
                            {t('transfersPage.actions.delete')}
                          </button>
                        ) : canCancelTransfer(r.status) ? (
                          <button onClick={() => void handleCancel(r.id)} disabled={cancelingId === r.id} className={cn('inline-flex items-center gap-1 rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100', cancelingId === r.id && 'opacity-50')}>
                            <XCircle className="h-3.5 w-3.5" />
                            {t('transfersPage.actions.cancel')}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        }
      />

      <EditTransferModal
        transferId={editingId}
        open={Boolean(editingId)}
        onClose={() => setEditingId(null)}
      />
    </div>
  );
}

function DepotArrow({ source, dest }: { source: string; dest: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-gray-800">
      <span className="font-medium">{source}</span>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
      <span className="font-medium">{dest}</span>
    </span>
  );
}

function StatusPill({ status, label }: { status: TransferStatus; label: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]', transferStatusBadgeClass(status))}>
      {label}
    </span>
  );
}

function Th({
  label,
  onClick,
  active,
  dir,
}: {
  label: string;
  onClick: () => void;
  active: boolean;
  dir: 'asc' | 'desc';
}) {
  const { t } = useTranslation('common');
  return (
    <th className="px-3 py-2 text-left font-semibold text-gray-700">
      <button
        onClick={onClick}
        className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-gray-100', active && 'text-primary-700')}
        title={t('transfersPage.sort')}
      >
        {label}{' '}
        <ArrowUpDown className={cn('h-3.5 w-3.5', active && dir === 'asc' && 'rotate-180')} />
      </button>
    </th>
  );
}

function QuickChip({
  label,
  value,
  active,
  onClick,
  icon,
  tone = 'gray',
}: {
  label: string;
  value: number;
  active?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
  tone?: 'gray' | 'amber' | 'emerald' | 'rose' | 'zinc';
}) {
  const tones: Record<string, string> = {
    gray: 'border-gray-200 bg-white text-gray-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
    zinc: 'border-zinc-200 bg-zinc-50 text-zinc-700',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'mx-1 inline-flex max-w-[min(100%,18rem)] shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-left text-sm sm:max-w-none sm:gap-2 sm:px-3',
        tones[tone],
        active && 'ring-2 ring-primary-500 ring-offset-1'
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
      <span className="shrink-0 rounded-full bg-white/90 px-2 py-0.5 text-xs tabular-nums text-gray-800 shadow-sm">
        {value}
      </span>
    </button>
  );
}
