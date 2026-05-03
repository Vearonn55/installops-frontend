import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, RefreshCw, Save, FlaskConical } from 'lucide-react';
import toast from 'react-hot-toast';

import {
  listStores,
  patchStoreNetsis,
  testStoreNetsis,
  type Store,
} from '../../api/stores';
import type { UUID } from '../../api/http';
import { cn } from '../../lib/utils';

export default function StoresAdminPage() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<UUID | null>(null);

  const storesQuery = useQuery({
    queryKey: ['stores', 'admin'],
    queryFn: async () => {
      const res = await listStores({ limit: 100, offset: 0 });
      return res.data as Store[];
    },
  });

  const stores = storesQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stores & Netsis</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure each store&apos;s Netsis base URL and search path. Passwords are stored
            encrypted and never shown again.
          </p>
        </div>
        <button
          type="button"
          onClick={() => storesQuery.refetch()}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
          disabled={storesQuery.isFetching}
        >
          <RefreshCw className={cn('h-4 w-4', storesQuery.isFetching && 'animate-spin')} />
          Refresh
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Store
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Netsis URL
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Auth
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {stores.map((s) => (
              <StoreRow
                key={s.id}
                store={s}
                expanded={expanded === s.id}
                onToggle={() => setExpanded((v) => (v === s.id ? null : s.id))}
                onSaved={() => {
                  void qc.invalidateQueries({ queryKey: ['stores'] });
                }}
              />
            ))}
            {!storesQuery.isLoading && stores.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                  No stores found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {storesQuery.isLoading && (
          <div className="px-4 py-6 text-sm text-gray-500">Loading…</div>
        )}
        {storesQuery.isError && (
          <div className="px-4 py-6 text-sm text-red-600">Failed to load stores.</div>
        )}
      </div>
    </div>
  );
}

function StoreRow({
  store,
  expanded,
  onToggle,
  onSaved,
}: {
  store: Store;
  expanded: boolean;
  onToggle: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const [baseUrl, setBaseUrl] = useState(store.netsis_base_url || '');
  const [pathTpl, setPathTpl] = useState(store.netsis_order_search_path || '');
  const [username, setUsername] = useState(store.netsis_username || '');
  const [password, setPassword] = useState('');
  const [timeoutMs, setTimeoutMs] = useState(String(store.netsis_timeout_ms ?? 15000));

  useEffect(() => {
    setBaseUrl(store.netsis_base_url || '');
    setPathTpl(store.netsis_order_search_path || '');
    setUsername(store.netsis_username || '');
    setPassword('');
    setTimeoutMs(String(store.netsis_timeout_ms ?? 15000));
  }, [store]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const to = Number(timeoutMs);
      return patchStoreNetsis(store.id, {
        netsis_base_url: baseUrl || null,
        netsis_order_search_path: pathTpl || null,
        netsis_username: username || null,
        netsis_password: password || undefined,
        netsis_timeout_ms: Number.isFinite(to) ? to : undefined,
      });
    },
    onSuccess: () => {
      toast.success('Netsis settings saved');
      setPassword('');
      onSaved();
      void qc.invalidateQueries({ queryKey: ['stores', 'for-installation-create'] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || e?.message || 'Save failed'),
  });

  const testMut = useMutation({
    mutationFn: () => testStoreNetsis(store.id),
    onSuccess: () => toast.success('Netsis reachable'),
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || e?.message || 'Test failed'),
  });

  return (
    <>
      <tr className="hover:bg-gray-50">
        <td className="px-4 py-3 text-sm font-medium text-gray-900">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary-600" />
            {store.name}
          </div>
        </td>
        <td className="max-w-xs truncate px-4 py-3 text-sm text-gray-600">
          {store.netsis_base_url || '—'}
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">
          {store.netsis_username ? `${store.netsis_username} / ****` : '—'}
          {store.netsis_password_configured ? ' (password set)' : ''}
        </td>
        <td className="px-4 py-3 text-right text-sm">
          <button
            type="button"
            className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
            onClick={onToggle}
          >
            {expanded ? 'Close' : 'Configure'}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={4} className="bg-gray-50 px-4 py-4">
            <div className="mx-auto grid max-w-3xl gap-3 md:grid-cols-2">
              <label className="block text-xs font-medium text-gray-600">
                Netsis base URL
                <input
                  className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
                  placeholder="https://192.168.1.10:8443"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                />
              </label>
              <label className="block text-xs font-medium text-gray-600">
                Order search path (optional, use {'{'}query{'}'} )
                <input
                  className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
                  placeholder="/orders/search?q={query}"
                  value={pathTpl}
                  onChange={(e) => setPathTpl(e.target.value)}
                />
              </label>
              <label className="block text-xs font-medium text-gray-600">
                HTTP Basic username
                <input
                  className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </label>
              <label className="block text-xs font-medium text-gray-600">
                HTTP Basic password (leave blank to keep)
                <input
                  type="password"
                  className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </label>
              <label className="block text-xs font-medium text-gray-600 md:col-span-2">
                Timeout (ms)
                <input
                  className="mt-1 w-full max-w-xs rounded-md border px-2 py-1.5 text-sm"
                  value={timeoutMs}
                  onChange={(e) => setTimeoutMs(e.target.value)}
                />
              </label>
              <div className="flex flex-wrap gap-2 md:col-span-2">
                <button
                  type="button"
                  disabled={saveMut.isPending}
                  onClick={() => saveMut.mutate()}
                  className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-3 py-2 text-sm text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  Save
                </button>
                <button
                  type="button"
                  disabled={testMut.isPending}
                  onClick={() => testMut.mutate()}
                  className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-white disabled:opacity-50"
                >
                  <FlaskConical className="h-4 w-4" />
                  Test connection
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
