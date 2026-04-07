// src/pages/admin/RolesPage.tsx
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Shield, Users, RefreshCw, Search, Check } from 'lucide-react';
import toast from 'react-hot-toast';

import type { User, UserRole } from '../../types';
import { apiClient } from '../../lib/api';
import { cn } from '../../lib/utils';

const ROLES: UserRole[] = ['ADMIN', 'STORE_MANAGER', 'CREW'];

const CAPABILITIES: Record<UserRole, string[]> = {
  ADMIN: [
    'Full access to all modules',
    'Manage users & roles',
    'Configure integrations & capacity',
    'View audit logs',
  ],
  STORE_MANAGER: [
    'Manage orders & installations for assigned store',
    'View reports & calendar',
    'Create customers & installations',
  ],
  CREW: [
    'View assigned jobs in PWA',
    'Submit checklists & media',
    'Accept/Start/Complete jobs',
  ],
};

export default function RolesPage() {
  const qc = useQueryClient();

  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');

  const usersQuery = useQuery({
    queryKey: ['users', { role: roleFilter }],
    queryFn: async () => {
      const res = await apiClient.getUsers({
        role: roleFilter || undefined,
      });
      return res.data as User[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: UserRole }) => {
      return apiClient.updateUser(id, { role });
    },
    onSuccess: () => {
      toast.success('Role updated');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to update role'),
  });

  const list = useMemo(() => {
    let l = usersQuery.data ?? [];
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      l = l.filter(
        (u) => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s) || u.id.toLowerCase().includes(s)
      );
    }
    return l;
  }, [usersQuery.data, q]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
          <p className="mt-1 text-sm text-gray-500">Assign and understand role capabilities</p>
        </div>
        <button
          onClick={() => usersQuery.refetch()}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
          disabled={usersQuery.isFetching}
        >
          <RefreshCw className={cn('h-4 w-4', usersQuery.isFetching && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Role cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {ROLES.map((r) => (
          <div key={r} className="card">
            <div className="card-content">
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary-600" />
                <div className="text-lg font-semibold text-gray-900">{r}</div>
              </div>
              <ul className="mt-3 space-y-1 text-sm text-gray-600">
                {CAPABILITIES[r].map((cap) => (
                  <li key={cap} className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 text-emerald-600" />
                    <span>{cap}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Users by role */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </h3>
          <p className="card-description">Search, filter, and update user roles</p>
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
              {ROLES.map((r) => (
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Role</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Change</th>
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
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <select
                        className="input"
                        defaultValue={u.role}
                        onChange={(e) =>
                          updateMutation.mutate({ id: u.id, role: e.target.value as UserRole })
                        }
                        disabled={updateMutation.isPending}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
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
    </div>
  );
}
