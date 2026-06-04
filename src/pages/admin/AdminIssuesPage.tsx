import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, RefreshCw, Search } from 'lucide-react';

import { listSoftwareIssues } from '../../api/software-issues';
import { listStores } from '../../api/stores';
import { formatUiDateTime } from '../../lib/date-display';
import { pageHeaderClass } from '../../lib/responsive-layout';
import { useDateDisplayStore } from '../../stores/date-display';
import type { UUID } from '../../api/http';
import { cn } from '../../lib/utils';

const PAGE_SIZE = 20;

export default function AdminIssuesPage() {
  const { t } = useTranslation('common');
  useDateDisplayStore((s) => s.datePattern);

  const [search, setSearch] = useState('');
  const [storeId, setStoreId] = useState('');
  const [page, setPage] = useState(1);
  const offset = (page - 1) * PAGE_SIZE;

  const storesQuery = useQuery({
    queryKey: ['stores', 'issues-filter'],
    queryFn: async () => {
      const res = await listStores({ limit: 100, offset: 0 });
      return res.data;
    },
  });

  const issuesQuery = useQuery({
    queryKey: ['software-issues', { search, storeId, offset }],
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
          className="rounded-md border px-3 py-2 text-sm"
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

      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                {t('issuesPage.admin.colDate')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                {t('issuesPage.admin.colSubject')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                {t('issuesPage.admin.colReporter')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                {t('issuesPage.admin.colStore')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                {t('issuesPage.admin.colBody')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {issues.map((row) => (
              <tr key={row.id} className="align-top hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                  {formatUiDateTime(row.created_at)}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.subject}</td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  <div>{row.creator?.name ?? '—'}</div>
                  <div className="text-xs text-gray-500">
                    {row.creator?.role
                      ? t(`issuesPage.admin.role.${row.creator.role}`, {
                          defaultValue: row.creator.role,
                        })
                      : '—'}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{row.store?.name ?? '—'}</td>
                <td className="max-w-md px-4 py-3 text-sm text-gray-700">
                  <p className="whitespace-pre-wrap break-words">{row.body}</p>
                </td>
              </tr>
            ))}
            {!issuesQuery.isLoading && issues.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-500">
                  {t('issuesPage.admin.empty')}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        {issuesQuery.isLoading ? (
          <div className="px-4 py-6 text-sm text-gray-500">{t('issuesPage.admin.loading')}</div>
        ) : null}
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            {t('issuesPage.admin.pageInfo', { page, totalPages, total })}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-md border px-3 py-1 disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {t('issuesPage.admin.prev')}
            </button>
            <button
              type="button"
              className="rounded-md border px-3 py-1 disabled:opacity-40"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              {t('issuesPage.admin.next')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
