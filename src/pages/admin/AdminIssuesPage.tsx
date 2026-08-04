import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react';

import { listSoftwareIssues } from '../../api/software-issues';
import { listStores } from '../../api/stores';
import { formatUiDateTime } from '../../lib/date-display';
import { pageHeaderClass } from '../../lib/responsive-layout';
import { useDateDisplayStore } from '../../stores/date-display';
import { useSessionState } from '../../hooks/use-session-state';
import type { UUID } from '../../api/http';
import { cn } from '../../lib/utils';

const PAGE_SIZE = 20;

function shortIssueId(id: string) {
  const s = id.replace(/-/g, '');
  return s.length > 8 ? s.slice(0, 8) : s;
}

export default function AdminIssuesPage() {
  const { t } = useTranslation('common');
  useDateDisplayStore((s) => s.datePattern);

  const [search, setSearch] = useSessionState<string>('adminIssues.search', '');
  const [storeId, setStoreId] = useSessionState<string>('adminIssues.storeId', '');
  const [page, setPage] = useSessionState<number>('adminIssues.page', 1);
  const offset = (page - 1) * PAGE_SIZE;

  const storesQuery = useQuery({
    queryKey: ['stores', 'issues-filter'],
    queryFn: async () => {
      const res = await listStores({ limit: 100, offset: 0 });
      return res.data;
    },
  });

  const issuesQuery = useQuery({
    queryKey: ['software-issues', { search, storeId, page, offset }],
    queryFn: () =>
      listSoftwareIssues({
        limit: PAGE_SIZE,
        offset,
        store_id: (storeId || undefined) as UUID | undefined,
        q: search.trim() || undefined,
      }),
    keepPreviousData: true,
  });

  const issues = issuesQuery.data?.data ?? [];
  const total = issuesQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeFrom = total === 0 ? 0 : offset + 1;
  const rangeTo = total === 0 ? 0 : Math.min(offset + issues.length, total);

  const storeOptions = useMemo(() => storesQuery.data ?? [], [storesQuery.data]);

  return (
    <div className="space-y-6">
      <div className={cn(pageHeaderClass, 'flex flex-wrap items-start justify-between gap-4')}>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-7 w-7 text-amber-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('issuesPage.admin.title')}</h1>
            <p className="mt-1 text-sm text-gray-500">{t('issuesPage.admin.subtitle')}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => issuesQuery.refetch()}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
          disabled={issuesQuery.isFetching}
        >
          <RefreshCw className={cn('h-4 w-4', issuesQuery.isFetching && 'animate-spin')} />
          {t('issuesPage.admin.refresh')}
        </button>
      </div>

      <div className="flex flex-wrap gap-3 rounded-lg border bg-white p-4 shadow-sm">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full rounded-md border py-2 pl-9 pr-3 text-sm"
            placeholder={t('issuesPage.admin.searchPlaceholder')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          className="max-w-full rounded-md border px-3 py-2 text-sm"
          value={storeId}
          onChange={(e) => {
            setStoreId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">{t('issuesPage.admin.allStores')}</option>
          {storeOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-left">
            <colgroup>
              <col className="w-[112px]" />
              <col className="w-[148px]" />
              <col className="w-[140px]" />
              <col className="w-[120px]" />
              <col />
            </colgroup>
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                  {t('issuesPage.admin.colId')}
                </th>
                <th className="px-3 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                  {t('issuesPage.admin.colDate')}
                </th>
                <th className="px-3 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                  {t('issuesPage.admin.colActor')}
                </th>
                <th className="px-3 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                  {t('issuesPage.admin.colStore')}
                </th>
                <th className="px-3 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                  {t('issuesPage.admin.colContent')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {issuesQuery.isLoading && issues.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-500">
                    {t('issuesPage.admin.loading')}
                  </td>
                </tr>
              ) : null}
              {!issuesQuery.isLoading && issues.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-500">
                    {t('issuesPage.admin.empty')}
                  </td>
                </tr>
              ) : null}
              {issues.map((row) => {
                const actorName = row.creator?.name?.trim() || '—';
                const storeName = row.store?.name?.trim() || '—';
                const contentTitle = `${row.subject}\n\n${row.body}`;

                return (
                  <tr key={row.id} className="align-top hover:bg-gray-50">
                    <td className="px-3 py-3">
                      <span
                        className="inline-block max-w-full truncate font-mono text-xs text-gray-700"
                        title={row.id}
                      >
                        {shortIssueId(row.id)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-600">
                      <span
                        className="block truncate"
                        title={formatUiDateTime(row.created_at)}
                      >
                        {formatUiDateTime(row.created_at)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900">
                      <span className="block truncate" title={actorName}>
                        {actorName}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-600">
                      <span className="block truncate" title={storeName}>
                        {storeName}
                      </span>
                    </td>
                    <td className="min-w-0 px-3 py-3">
                      <div className="min-w-0 overflow-hidden" title={contentTitle}>
                        <p className="truncate text-sm font-medium text-gray-900">
                          {row.subject}
                        </p>
                        <p className="mt-1 line-clamp-3 break-words text-xs leading-relaxed text-gray-600">
                          {row.body}
                        </p>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">
            {t('issuesPage.admin.showingRange', {
              from: rangeFrom,
              to: rangeTo,
              total,
            })}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-600">
              {t('issuesPage.admin.pageInfo', { page, totalPages, total })}
            </span>
            <button
              type="button"
              className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md border text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={page <= 1 || issuesQuery.isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label={t('issuesPage.admin.prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md border text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={page >= totalPages || issuesQuery.isFetching}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label={t('issuesPage.admin.next')}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
