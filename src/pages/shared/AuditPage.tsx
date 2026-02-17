// src/pages/shared/AuditPage.tsx
import { useState, useMemo } from 'react';
import type { MouseEvent } from 'react';
import {
  RefreshCw,
  Search,
  Calendar,
  User,
  Shield,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Copy,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { listAuditLogs, type AuditLog } from '../../api/auditLogs';

const PAGE_SIZE = 20;

type SortKey = 'created_at' | 'actor_id' | 'entity' | 'action' | 'ip';
type SortDir = 'asc' | 'desc';

export default function AuditPage() {
  const { t } = useTranslation('common');

  // Force-open date picker (Chrome / Edge / Safari)
  const handleDateClick = (e: MouseEvent<HTMLInputElement>) => {
    const input = e.currentTarget as HTMLInputElement;
    if (typeof (input as any).showPicker === 'function') {
      (input as any).showPicker();
    }
  };

  /* ------------------ Filters ------------------ */
  const [search, setSearch] = useState('');
  const [actor, setActor] = useState('');
  const [entity, setEntity] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  /* ------------------ Sorting & Pagination ------------------ */
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);

  const offset = (page - 1) * PAGE_SIZE;

  /* ------------------ Query: fetch audit logs ------------------ */
  const query = useQuery({
    queryKey: [
      'auditLogs',
      { search, actor, entity, from, to, offset, limit: PAGE_SIZE },
    ],
    queryFn: async () =>
      listAuditLogs({
        q: search || undefined,
        actor_id: actor || undefined,
        entity: entity || undefined,
        date_from: from || undefined,
        date_to: to || undefined,
        limit: PAGE_SIZE,
        offset,
      }),
    placeholderData: keepPreviousData,
  });

  const logs = query.data?.data ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  /* ------------------ Sorting (client-side) ------------------ */
  const sortedLogs = useMemo(() => {
    const list = [...logs];
    const dir = sortDir === 'asc' ? 1 : -1;

    list.sort((a, b) => {
      switch (sortKey) {
        case 'created_at':
          return (
            (new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()) * dir
          );
        case 'actor_id':
          return ((a.actor_id || '').localeCompare(b.actor_id || '')) * dir;
        case 'entity':
          return ((a.entity || '').localeCompare(b.entity || '')) * dir;
        case 'action':
          return ((a.action || '').localeCompare(b.action || '')) * dir;
        case 'ip':
          return ((a.ip || '').localeCompare(b.ip || '')) * dir;
        default:
          return 0;
      }
    });

    return list;
  }, [logs, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    setPage(1);
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  /* ------------------ Detail Drawer ------------------ */
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const copyJSON = (obj: Record<string, unknown> | null | undefined) => {
    try {
      navigator.clipboard.writeText(JSON.stringify(obj ?? {}, null, 2));
      toast.success(t('audit.buttons.copyJson'));
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('audit.title')}
          </h1>
        </div>

        <button
          onClick={() => query.refetch()}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
        >
          {query.isFetching ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {t('audit.buttons.refresh')}
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 gap-3 p-6 md:grid-cols-12 md:items-center">
          {/* Search */}
          <div className="relative min-w-0 md:col-span-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className="input w-full pl-9"
              placeholder={t('audit.filters.searchPlaceholder')}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Actor */}
          <div className="relative min-w-0 md:col-span-2">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className="input w-full pl-9"
              placeholder={t('audit.filters.actorPlaceholder')}
              value={actor}
              onChange={(e) => {
                setActor(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Entity */}
          <div className="relative min-w-0 md:col-span-3">
            <Shield className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className="input w-full pl-9"
              placeholder={t('audit.filters.entityPlaceholder')}
              value={entity}
              onChange={(e) => {
                setEntity(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Date range */}
          <div className="min-w-0 md:col-span-3">
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  className="input w-full pl-9"
                  value={from}
                  onClick={handleDateClick}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              <span className="text-center text-xs text-gray-500">
                {t('audit.filters.dateTo')}
              </span>

              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  className="input w-full pl-9"
                  value={to}
                  onClick={handleDateClick}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <Th
                label={t('audit.table.timestamp')}
                active={sortKey === 'created_at'}
                dir={sortDir}
                onClick={() => toggleSort('created_at')}
              />
              <Th
                label={t('audit.table.actor')}
                active={sortKey === 'actor_id'}
                dir={sortDir}
                onClick={() => toggleSort('actor_id')}
              />
              <Th
                label={t('audit.table.action')}
                active={sortKey === 'action'}
                dir={sortDir}
                onClick={() => toggleSort('action')}
              />
              <Th
                label={t('audit.table.entity')}
                active={sortKey === 'entity'}
                dir={sortDir}
                onClick={() => toggleSort('entity')}
              />
              <Th label={t('audit.table.entityId')} />
              <Th
                label={t('audit.table.ip')}
                active={sortKey === 'ip'}
                dir={sortDir}
                onClick={() => toggleSort('ip')}
              />
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                {t('audit.table.payload')}
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200 bg-white">
            {sortedLogs.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-700">
                  {new Date(row.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {row.actor_id || '—'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {row.action}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {row.entity || '—'}
                </td>
                <td className="px-4 py-3 text-sm font-mono">
                  {row.entity_id || '—'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {row.ip || '—'}
                </td>

                <td className="px-4 py-3 text-right text-sm">
                  <button
                    className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                    onClick={() => setSelected(row)}
                  >
                    {t('audit.buttons.viewJson')}
                  </button>
                </td>
              </tr>
            ))}

            {sortedLogs.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={7}>
                  {t('audit.table.noLogs')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {t('audit.pagination.page')}{' '}
          <span className="font-medium">{page}</span>
          {t('audit.pagination.of')}
          {totalPages}
        </div>
        <div className="inline-flex gap-2">
          <button
            className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Drawer */}
      {selected && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center sm:justify-center">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setSelected(null)}
          />

          <div className="relative z-50 w-full sm:max-w-2xl rounded-lg bg-white shadow-lg">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <div className="text-lg font-semibold">
                  {selected.action}
                </div>
                <div className="text-xs text-gray-500">
                  {selected.entity} • {selected.entity_id} •{' '}
                  {new Date(selected.created_at).toLocaleString()}
                </div>
              </div>

              <button
                className="rounded-full p-1 hover:bg-gray-100"
                onClick={() => setSelected(null)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Payload */}
            <div className="p-4 space-y-3">
              <InfoRow
                label={t('audit.drawer.actor')}
                value={selected.actor_id || '—'}
              />
              <InfoRow
                label={t('audit.drawer.ip')}
                value={selected.ip || '—'}
              />

              <div className="flex items-center justify-between">
                <div className="text-xs uppercase text-gray-500">
                  {t('audit.drawer.payload')}
                </div>

                <button
                  className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                  onClick={() => copyJSON(selected.data)}
                >
                  <Copy className="h-3.5 w-3.5" /> {t('audit.buttons.copyJson')}
                </button>
              </div>

              <pre className="max-h-80 overflow-auto rounded bg-gray-50 p-3 text-xs leading-relaxed text-gray-800">
                {JSON.stringify(selected.data ?? {}, null, 2)}
              </pre>
            </div>

            <div className="border-t px-4 py-3 text-right">
              <button
                className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
                onClick={() => setSelected(null)}
              >
                {t('audit.buttons.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------ Subcomponents ------------------ */

function Th({
  label,
  onClick,
  active,
  dir,
}: {
  label: string;
  onClick?: () => void;
  active?: boolean;
  dir?: 'asc' | 'desc';
}) {
  const clickable = !!onClick;
  return (
    <th
      className={cn(
        'px-4 py-3 text-left text-xs font-medium uppercase text-gray-500',
        clickable && 'cursor-pointer select-none'
      )}
      onClick={onClick}
    >
      <span className="inline-flex items-center gap-1">
        {label}{' '}
        {active && (
          <ArrowUpDown
            className={cn('h-3.5 w-3.5', dir === 'desc' && 'rotate-180')}
          />
        )}
      </span>
    </th>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-sm">
      <div className="text-xs uppercase text-gray-500 col-span-1">
        {label}
      </div>
      <div className="col-span-2 text-gray-900">{value}</div>
    </div>
  );
}
