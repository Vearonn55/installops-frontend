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
      const res = await listStores({ limit: 100, offset: 0, reveal_netsis_secrets: true });
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
            Configure each store&apos;s Netsis base URL and search path. Passwords are stored encrypted;
            on this admin page they are loaded in plain text for editing.
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
                  void qc.invalidateQueries({ queryKey: ['stores', 'admin'] });
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
  const [useHostHeader, setUseHostHeader] = useState(Boolean(store.netsis_request_host));
  const [requestHost, setRequestHost] = useState(store.netsis_request_host || '');
  const [pingPath, setPingPath] = useState(
    store.netsis_ping_path || '/api/v2/public/Ping'
  );
  const [authMode, setAuthMode] = useState<'basic' | 'token_password'>(
    store.netsis_auth_mode === 'token_password' ? 'token_password' : 'basic'
  );
  const [tokenPath, setTokenPath] = useState(store.netsis_token_path || '/api/v2/token');
  const [branchCode, setBranchCode] = useState(store.netsis_branch_code || '0');
  const [dbName, setDbName] = useState(store.netsis_db_name || '');
  const [dbUser, setDbUser] = useState(store.netsis_db_user || '');
  const [dbPassword, setDbPassword] = useState('');
  const [dbType, setDbType] = useState(store.netsis_db_type || '0');

  useEffect(() => {
    setBaseUrl(store.netsis_base_url || '');
    setPathTpl(store.netsis_order_search_path || '');
    setUsername(store.netsis_username || '');
    setTimeoutMs(String(store.netsis_timeout_ms ?? 15000));
    setUseHostHeader(Boolean(store.netsis_request_host));
    setRequestHost(store.netsis_request_host || '');
    setPingPath(store.netsis_ping_path || '/api/v2/public/Ping');
    setAuthMode(store.netsis_auth_mode === 'token_password' ? 'token_password' : 'basic');
    setTokenPath(store.netsis_token_path || '/api/v2/token');
    setBranchCode(store.netsis_branch_code || '0');
    setDbName(store.netsis_db_name || '');
    setDbUser(store.netsis_db_user || '');
    setPassword(store.netsis_password ?? '');
    setDbPassword(store.netsis_db_password ?? '');
    setDbType(store.netsis_db_type || '0');
  }, [store]);

  const hadApiPwStored =
    Boolean(store.netsis_password_configured) || Boolean(String(store.netsis_password ?? '').length);
  const hadDbPwStored =
    Boolean(store.netsis_db_password_configured) ||
    Boolean(String(store.netsis_db_password ?? '').length);

  const applyStoreFromServer = (s: Store) => {
    setPassword(s.netsis_password ?? '');
    setDbPassword(s.netsis_db_password ?? '');
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const to = Number(timeoutMs);
      const apiPwTrim = password.trim();
      const dbPwTrim = dbPassword.trim();
      return patchStoreNetsis(store.id, {
        netsis_base_url: baseUrl || null,
        netsis_order_search_path: pathTpl || null,
        netsis_username: username || null,
        netsis_password:
          apiPwTrim !== '' ? apiPwTrim : hadApiPwStored ? null : undefined,
        netsis_timeout_ms: Number.isFinite(to) ? to : undefined,
        netsis_request_host: useHostHeader ? (requestHost.trim() || null) : null,
        netsis_ping_path: pingPath.trim() || null,
        netsis_auth_mode: authMode,
        netsis_token_path: tokenPath.trim() || null,
        netsis_branch_code: branchCode.trim() || null,
        netsis_db_name: dbName.trim() || null,
        netsis_db_user: dbUser.trim() || null,
        ...(authMode === 'token_password'
          ? {
              netsis_db_password:
                dbPwTrim !== '' ? dbPwTrim : hadDbPwStored ? null : undefined,
            }
          : {}),
        netsis_db_type: dbType.trim() || null,
      });
    },
    onSuccess: (updated: Store) => {
      toast.success('Netsis settings saved');
      applyStoreFromServer(updated);
      onSaved();
      void qc.invalidateQueries({ queryKey: ['stores', 'for-installation-create'] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || e?.message || 'Save failed'),
  });

  const clearApiPwMut = useMutation({
    mutationFn: () => patchStoreNetsis(store.id, { netsis_clear_password: true }),
    onSuccess: (updated: Store) => {
      toast.success('Saved Netsis API password removed');
      applyStoreFromServer(updated);
      onSaved();
      void qc.invalidateQueries({ queryKey: ['stores', 'for-installation-create'] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || e?.message || 'Clear failed'),
  });

  const clearDbPwMut = useMutation({
    mutationFn: () => patchStoreNetsis(store.id, { netsis_clear_db_password: true }),
    onSuccess: (updated: Store) => {
      toast.success('Saved DB password removed');
      applyStoreFromServer(updated);
      onSaved();
      void qc.invalidateQueries({ queryKey: ['stores', 'for-installation-create'] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || e?.message || 'Clear failed'),
  });

  const testMut = useMutation({
    mutationFn: () => testStoreNetsis(store.id),
    onSuccess: (data) =>
      toast.success(
        data?.message === 'token_ok' ? 'Netsis token OK' : 'Netsis reachable'
      ),
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
          <span className="font-mono text-xs text-gray-500">
            {store.netsis_auth_mode === 'token_password' ? 'token' : 'basic'}
          </span>
          {store.netsis_username ? ` · ${store.netsis_username}` : ''}
          {store.netsis_password_configured ? ' · pwd' : ''}
          {store.netsis_auth_mode === 'token_password' && store.netsis_db_password_configured
            ? ' · db-pwd'
            : ''}
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
              <label className="block text-xs font-medium text-gray-600 md:col-span-2">
                Netsis auth
                <select
                  className="mt-1 w-full max-w-md rounded-md border px-2 py-1.5 text-sm"
                  value={authMode}
                  onChange={(e) =>
                    setAuthMode(e.target.value === 'token_password' ? 'token_password' : 'basic')
                  }
                >
                  <option value="basic">HTTP Basic on each request</option>
                  <option value="token_password">Logo token (POST /api/v2/token, then Bearer)</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Use <strong>Logo token</strong> when login is a form to <code className="rounded bg-gray-100 px-1">/api/v2/token</code> with{' '}
                  <code className="rounded bg-gray-100 px-1">grant_type=password</code>, branch, DB fields — not HTTP Basic.
                </p>
              </label>
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
                {authMode === 'token_password' ? 'Token: username (form field)' : 'HTTP Basic username'}
                <input
                  className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </label>
              <label className="block text-xs font-medium text-gray-600 md:col-span-2">
                {authMode === 'token_password'
                  ? 'Token: password (form field)'
                  : 'HTTP Basic password'}
                <p className="mt-1 text-xs text-gray-500">
                  Clear button, or delete the value and Save — removes the stored password when one exists. If none is
                  stored yet, Save leaves it empty.
                </p>
                <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    className="w-full flex-1 rounded-md border px-2 py-1.5 font-mono text-sm"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {hadApiPwStored || password.trim() !== '' ? (
                    <button
                      type="button"
                      disabled={clearApiPwMut.isPending}
                      onClick={() => clearApiPwMut.mutate()}
                      className="shrink-0 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                    >
                      Clear saved API password
                    </button>
                  ) : null}
                </div>
              </label>
              {authMode === 'token_password' ? (
                <>
                  <label className="block text-xs font-medium text-gray-600">
                    Token path
                    <input
                      className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm font-mono"
                      placeholder="/api/v2/token"
                      value={tokenPath}
                      onChange={(e) => setTokenPath(e.target.value)}
                    />
                  </label>
                  <label className="block text-xs font-medium text-gray-600">
                    Branch code
                    <input
                      className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
                      placeholder="0"
                      value={branchCode}
                      onChange={(e) => setBranchCode(e.target.value)}
                    />
                  </label>
                  <label className="block text-xs font-medium text-gray-600">
                    DB name (dbname)
                    <input
                      className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
                      value={dbName}
                      onChange={(e) => setDbName(e.target.value)}
                    />
                  </label>
                  <label className="block text-xs font-medium text-gray-600">
                    DB user (dbuser)
                    <input
                      className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
                      value={dbUser}
                      onChange={(e) => setDbUser(e.target.value)}
                    />
                  </label>
                  <label className="block text-xs font-medium text-gray-600 md:col-span-2">
                    DB password (dbpassword)
                    <p className="mt-1 font-normal text-gray-500">
                      Clear button or empty field + Save removes a stored DB password. Leave empty if the SQL user has
                      no password (e.g. TEMELSET) — the token request still sends{' '}
                      <code className="rounded bg-gray-100 px-1">dbpassword=</code> empty.
                    </p>
                    <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        type="text"
                        className="w-full flex-1 rounded-md border px-2 py-1.5 font-mono text-sm"
                        value={dbPassword}
                        onChange={(e) => setDbPassword(e.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                      />
                      {hadDbPwStored || dbPassword.trim() !== '' ? (
                        <button
                          type="button"
                          disabled={clearDbPwMut.isPending}
                          onClick={() => clearDbPwMut.mutate()}
                          className="shrink-0 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                        >
                          Clear saved DB password
                        </button>
                      ) : null}
                    </div>
                  </label>
                  <label className="block text-xs font-medium text-gray-600">
                    DB type (dbtype)
                    <input
                      className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
                      placeholder="0"
                      value={dbType}
                      onChange={(e) => setDbType(e.target.value)}
                    />
                  </label>
                </>
              ) : null}
              <label className="block text-xs font-medium text-gray-600 md:col-span-2">
                Timeout (ms)
                <input
                  className="mt-1 w-full max-w-xs rounded-md border px-2 py-1.5 text-sm"
                  value={timeoutMs}
                  onChange={(e) => setTimeoutMs(e.target.value)}
                />
              </label>

              <div className="flex flex-col gap-2 rounded-md border border-gray-200 bg-white p-3 md:col-span-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-800">
                  <input
                    type="checkbox"
                    checked={useHostHeader}
                    onChange={(e) => setUseHostHeader(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Custom HTTP Host header (Netsis / Windows)
                </label>
                <p className="text-xs text-gray-500">
                  Use when the API only responds with a specific <code className="rounded bg-gray-100 px-1">Host</code> (e.g.{' '}
                  <code className="rounded bg-gray-100 px-1">localhost:7072</code>,{' '}
                  <code className="rounded bg-gray-100 px-1">192.168.250.11:7072</code>) while TCP goes to the
                  base URL host (same as <code className="rounded bg-gray-100 px-1">curl -H &quot;Host: …&quot;</code>).
                </p>
                {useHostHeader ? (
                  <label className="text-xs font-medium text-gray-600">
                    Host header value
                    <input
                      className="mt-1 w-full max-w-md rounded-md border px-2 py-1.5 text-sm font-mono"
                      placeholder="localhost:7072"
                      value={requestHost}
                      onChange={(e) => setRequestHost(e.target.value)}
                    />
                  </label>
                ) : null}
              </div>

              <label className="block text-xs font-medium text-gray-600 md:col-span-2">
                Ping / health path (used by &quot;Test connection&quot; only — skipped for Logo token mode)
                <input
                  className="mt-1 w-full max-w-xl rounded-md border px-2 py-1.5 text-sm font-mono"
                  placeholder="/api/v2/public/Ping"
                  value={pingPath}
                  onChange={(e) => setPingPath(e.target.value)}
                  disabled={authMode === 'token_password'}
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
