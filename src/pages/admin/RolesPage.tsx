import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Shield, Users, RefreshCw, Search, Check, ListTree } from 'lucide-react';
import toast from 'react-hot-toast';

import type { UserRole } from '../../types';
import * as usersApi from '../../api/users';
import * as rolesApi from '../../api/roles';
import type { Role as ApiRole } from '../../api/roles';
import { cn } from '../../lib/utils';

const UI_ROLES: UserRole[] = ['ADMIN', 'STORE_MANAGER', 'CREW'];

const CAPABILITIES: Record<UserRole, string[]> = {
  ADMIN: [
    'Full access to all modules',
    'Manage users & roles',
    'Configure stores & Netsis',
    'View audit logs',
  ],
  STORE_MANAGER: [
    'Manage orders & installations for assigned store',
    'View reports & calendar',
  ],
  CREW: [
    'View assigned jobs in PWA',
    'Submit checklists & media',
  ],
};

function uiRoleFromBackend(name: string | undefined | null): UserRole {
  const n = String(name || '').toLowerCase();
  if (n === 'admin') return 'ADMIN';
  if (n === 'manager') return 'STORE_MANAGER';
  return 'CREW';
}

export default function RolesPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'users' | 'definitions'>('users');
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');

  const apiRolesQuery = useQuery({
    queryKey: ['roles', 'definitions'],
    queryFn: () => rolesApi.listRoles({ limit: 100, offset: 0 }),
    staleTime: 60_000,
  });

  const apiRoles = apiRolesQuery.data?.data ?? [];

  const usersQuery = useQuery({
    queryKey: ['users', { role: roleFilter }],
    queryFn: () => usersApi.listUsers({ limit: 200, offset: 0 }),
  });

  const users = usersQuery.data?.data ?? [];

  const updateUserRole = useMutation({
    mutationFn: async ({ id, role_id }: { id: string; role_id: string }) =>
      usersApi.updateUser(id, { role_id }),
    onSuccess: () => {
      toast.success('User role updated');
      void qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || e?.message || 'Update failed'),
  });

  const createRole = useMutation({
    mutationFn: (payload: rolesApi.RoleCreate) => rolesApi.createRole(payload),
    onSuccess: () => {
      toast.success('Role created');
      void qc.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || e?.message || 'Create failed'),
  });

  const list = useMemo(() => {
    let l = users.slice();
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      l = l.filter(
        (u) =>
          u.name.toLowerCase().includes(s) ||
          u.email.toLowerCase().includes(s) ||
          u.id.toLowerCase().includes(s)
      );
    }
    if (roleFilter) {
      l = l.filter((u) => uiRoleFromBackend(u.role?.name) === roleFilter);
    }
    return l;
  }, [users, q, roleFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles & permissions</h1>
          <p className="mt-1 text-sm text-gray-500">
            Assign users to database roles, or define custom roles (requires{' '}
            <code className="rounded bg-gray-100 px-1">roles:write</code> — admin).
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className={cn(
              'rounded-md border px-3 py-2 text-sm',
              tab === 'users' ? 'border-primary-600 bg-primary-50' : 'hover:bg-gray-50'
            )}
            onClick={() => setTab('users')}
          >
            <Users className="mr-1 inline h-4 w-4" />
            Users
          </button>
          <button
            type="button"
            className={cn(
              'rounded-md border px-3 py-2 text-sm',
              tab === 'definitions' ? 'border-primary-600 bg-primary-50' : 'hover:bg-gray-50'
            )}
            onClick={() => setTab('definitions')}
          >
            <ListTree className="mr-1 inline h-4 w-4" />
            API roles
          </button>
        </div>
      </div>

      {tab === 'users' && (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {UI_ROLES.map((r) => (
              <div key={r} className="card">
                <div className="card-content">
                  <div className="flex items-center gap-2">
                    <Shield className="h-6 w-6 text-primary-600" />
                    <div className="text-lg font-semibold text-gray-900">{r}</div>
                  </div>
                  <ul className="mt-3 space-y-1 text-sm text-gray-600">
                    {CAPABILITIES[r].map((cap) => (
                      <li key={cap} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
                        <span>{cap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-header flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="card-title flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Users
                </h3>
                <p className="card-description">Map each user to a database role (by ID).</p>
              </div>
              <button
                type="button"
                onClick={() => usersQuery.refetch()}
                className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
                disabled={usersQuery.isFetching}
              >
                <RefreshCw className={cn('h-4 w-4', usersQuery.isFetching && 'animate-spin')} />
                Refresh
              </button>
            </div>
            <div className="card-content space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:items-end">
                <div className="relative min-w-0">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    className="input-search-field w-full"
                    placeholder="Search users…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>
                <select
                  className="input-select-chevron-only min-w-0 w-full"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="">All roles</option>
                  {UI_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="overflow-hidden rounded-lg border bg-white">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        User
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Role
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                        Change
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {list.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{u.email}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
                            <Shield className="h-3.5 w-3.5" />
                            {u.role?.name ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <select
                            className="input"
                            value={u.role_id}
                            onChange={(e) =>
                              updateUserRole.mutate({ id: u.id, role_id: e.target.value })
                            }
                            disabled={updateUserRole.isPending}
                          >
                            {apiRoles.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                    {!usersQuery.isLoading && list.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">
                          No users found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {usersQuery.isLoading && (
                  <div className="px-4 py-6 text-sm text-gray-500">Loading users…</div>
                )}
                {usersQuery.isError && (
                  <div className="px-4 py-6 text-sm text-red-600">Failed to load users.</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'definitions' && (
        <RoleDefinitionsPanel
          roles={apiRoles}
          loading={apiRolesQuery.isLoading}
          error={apiRolesQuery.isError}
          onRefresh={() => apiRolesQuery.refetch()}
          onCreate={(name, perms) =>
            createRole.mutate({ name, permissions: perms })
          }
          creating={createRole.isPending}
        />
      )}
    </div>
  );
}

function RoleDefinitionsPanel({
  roles,
  loading,
  error,
  onRefresh,
  onCreate,
  creating,
}: {
  roles: ApiRole[];
  loading: boolean;
  error: boolean;
  onRefresh: () => void;
  onCreate: (name: string, perms: string[]) => void;
  creating: boolean;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [permsText, setPermsText] = useState('custom:read');
  const [edits, setEdits] = useState<Record<string, string>>({});

  const patchRole = useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: string[] }) =>
      rolesApi.updateRole(id, { permissions }),
    onSuccess: () => {
      toast.success('Role updated');
      void qc.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || e?.message || 'Update failed'),
  });

  return (
    <div className="card">
      <div className="card-header flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="card-title">API roles</h3>
          <p className="card-description">
            Permissions are string tokens (e.g. <code>roles:write</code>, <code>manager:*</code>).
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>
      <div className="card-content space-y-6">
        <form
          className="grid gap-3 rounded-lg border border-dashed border-gray-200 p-4 md:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            const perms = permsText
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
            if (!name.trim()) {
              toast.error('Role name required');
              return;
            }
            onCreate(name.trim(), perms);
            setName('');
          }}
        >
          <label className="text-sm font-medium text-gray-700">
            New role name
            <input
              className="input mt-1 w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. readonly_auditor"
            />
          </label>
          <label className="md:col-span-2 text-sm font-medium text-gray-700">
            Permissions (comma-separated)
            <input
              className="input mt-1 w-full"
              value={permsText}
              onChange={(e) => setPermsText(e.target.value)}
              placeholder="stores:read, users:read"
            />
          </label>
          <button
            type="submit"
            disabled={creating}
            className="rounded-md bg-primary-600 px-3 py-2 text-sm text-white hover:bg-primary-700 disabled:opacity-50 md:col-span-3"
          >
            Create role
          </button>
        </form>

        <div className="overflow-hidden rounded-lg border">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                  Name
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                  Permissions
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">
                  Save
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {roles.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2 text-sm font-medium text-gray-900">{r.name}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">
                    <textarea
                      className="input min-h-[4rem] w-full font-mono text-xs"
                      value={
                        edits[r.id] !== undefined
                          ? edits[r.id]
                          : (r.permissions || []).join(', ')
                      }
                      onChange={(e) => setEdits((m) => ({ ...m, [r.id]: e.target.value }))}
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                      disabled={patchRole.isPending}
                      onClick={() => {
                        const raw =
                          edits[r.id] !== undefined
                            ? edits[r.id]
                            : (r.permissions || []).join(', ');
                        const permissions = raw
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean);
                        patchRole.mutate({ id: r.id, permissions });
                      }}
                    >
                      Save
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <div className="px-4 py-4 text-sm text-gray-500">Loading…</div>}
          {error && <div className="px-4 py-4 text-sm text-red-600">Failed to load roles.</div>}
        </div>
      </div>
    </div>
  );
}
