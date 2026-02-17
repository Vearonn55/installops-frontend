// src/pages/admin/UsersPage.tsx
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw, Search, Filter, Shield, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import type { UUID } from '../../api/http';
import type { User as ApiUser, UserStatus as ApiUserStatus } from '../../api/users';
import type { Role as ApiRole } from '../../api/roles';
import * as usersApi from '../../api/users';
import * as rolesApi from '../../api/roles';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../stores/auth-simple';

/** ---------- Types aligned with OpenAPI ---------- */

export type ID = string;

export type Role = {
  id: ID;
  name: string;
  permissions?: string[];
  created_at?: string;
  updated_at?: string;
};

export type UserStatus = 'active' | 'disabled';

export type User = {
  id: ID;
  name: string;
  email: string;
  phone?: string | null;
  role_id: ID;
  status: UserStatus;
  created_at: string;
  updated_at: string;
  role?: {
    id: ID;
    name: string;
    permissions?: string[];
  } | null;
};

type UserListResponse = {
  data: User[];
  limit: number;
  offset: number;
};

type RoleListResponse = {
  data: Role[];
  limit: number;
  offset: number;
};

/** ---------- Component ---------- */

export default function UsersPage() {
  const qc = useQueryClient();
  const { user: me } = useAuthStore();
  const { t } = useTranslation();

  // Filters
  const [roleIdFilter, setRoleIdFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>(''); // '', 'active', 'disabled'
  const [q, setQ] = useState('');

  // Create/Edit state
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);

  /** ----- Queries ----- */

  // Roles (for select + mapping)
  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await rolesApi.listRoles();
      const body = res as any;
      if (Array.isArray(body)) return body as Role[];
      if (Array.isArray(body.data)) return body.data as Role[];
      return [] as Role[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await usersApi.listUsers();
      const body = res as any;
      if (Array.isArray(body)) return body as User[];
      if (Array.isArray(body.data)) return body.data as User[];
      return [] as User[];
    },
  });

  const roles = rolesQuery.data ?? [];
  const users = usersQuery.data ?? [];

  /** ----- Derived list with client-side filters ----- */

  const list = useMemo(() => {
    let l = users.slice();

    if (roleIdFilter) {
      l = l.filter((u) => u.role_id === roleIdFilter);
    }
    if (statusFilter) {
      l = l.filter((u) => u.status === statusFilter);
    }
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      l = l.filter(
        (u) =>
          u.name.toLowerCase().includes(s) ||
          u.email.toLowerCase().includes(s) ||
          (u.phone ?? '').toLowerCase().includes(s) ||
          u.id.toLowerCase().includes(s)
      );
    }
    return l;
  }, [users, roleIdFilter, statusFilter, q]);

  /** ----- Mutations ----- */

  const createMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      email: string;
      phone?: string;
      password: string;
      role_id: ID;
    }) => {
      return usersApi.createUser({
        name: payload.name,
        email: payload.email,
        password: payload.password,
        phone: payload.phone ?? null,
        role_id: payload.role_id as UUID,
      });
    },
    onSuccess: () => {
      toast.success(t('usersPage.toasts.userCreated'));
      setShowCreate(false);
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) =>
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          t('usersPage.toasts.createFailed')
      ),
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: ID; data: Partial<User> }) => {
      // Only send fields allowed by UserUpdate schema
      const { id, data } = payload;
      const updateBody: any = {};
      if (data.name !== undefined) updateBody.name = data.name;
      if (data.email !== undefined) updateBody.email = data.email;
      if (data.phone !== undefined) updateBody.phone = data.phone;
      if (data.role_id !== undefined) updateBody.role_id = data.role_id as UUID;
      if (data.status !== undefined) updateBody.status = data.status; // 'active' | 'disabled'

      return usersApi.updateUser(id as UUID, updateBody);
    },
    onSuccess: () => {
      toast.success(t('usersPage.toasts.userUpdated'));
      setEditUser(null);
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) =>
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          t('usersPage.toasts.updateFailed')
      ),
  });

  const toggleStatus = (u: User) => {
    const nextStatus: UserStatus = u.status === 'active' ? 'disabled' : 'active';
    updateMutation.mutate({
      id: u.id,
      data: { status: nextStatus },
    });
  };

  /** ----- Handlers ----- */

  const handleCreate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name') || '').trim();
    const email = String(fd.get('email') || '').trim();
    const phone = String(fd.get('phone') || '').trim();
    const password = String(fd.get('password') || '').trim();
    const role_id = String(fd.get('role_id') || '');

    if (!name || !email || !password || !role_id) {
      toast.error(t('usersPage.validation.missingRequired'));
      return;
    }

    createMutation.mutate({
      name,
      email,
      password,
      phone: phone || undefined,
      role_id,
    });
  };

  const handleEdit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editUser) return;
    const fd = new FormData(e.currentTarget);

    const name = String(fd.get('name') || '').trim();
    const email = String(fd.get('email') || '').trim();
    const phone = String(fd.get('phone') || '').trim();
    const role_id = String(fd.get('role_id') || editUser.role_id);
    const status = String(fd.get('status') || editUser.status) as UserStatus;

    const data: Partial<User> = {
      name: name || editUser.name,
      email: email || editUser.email,
      phone: phone || '',
      role_id,
      status,
    };

    updateMutation.mutate({ id: editUser.id, data });
  };

  const findRoleName = (user: User): string => {
    // Prefer embedded role object from API
    if (user.role && typeof user.role === 'object' && 'name' in user.role) {
      return user.role.name || '—';
    }
    // Fallback: match by role_id against rolesQuery data
    const r = roles.find((role) => role.id === user.role_id);
    return r?.name ?? '—';
  };

  /** ----- UI ----- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('usersPage.title')}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('usersPage.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => usersQuery.refetch()}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
            disabled={usersQuery.isFetching}
          >
            <RefreshCw
              className={cn('h-4 w-4', usersQuery.isFetching && 'animate-spin')}
            />
            {t('usersPage.refresh')}
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-3 py-2 text-sm text-white hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            {t('usersPage.newUserButton')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 gap-3 p-6 md:grid-cols-12 md:items-center">
          <div className="relative md:col-span-6">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className="input w-full pl-9"
              placeholder={t('usersPage.searchPlaceholder')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="relative md:col-span-3">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <select
              className="input w-full pl-9"
              value={roleIdFilter}
              onChange={(e) => setRoleIdFilter(e.target.value)}
            >
              <option value="">{t('usersPage.filters.allRoles')}</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative md:col-span-3">
            <select
              className="input w-full"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">{t('usersPage.filters.allStatuses')}</option>
              <option value="active">{t('usersPage.status.active')}</option>
              <option value="disabled">{t('usersPage.status.disabled')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                {t('usersPage.table.name')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                {t('usersPage.table.email')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                {t('usersPage.table.role')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                {t('usersPage.table.status')}
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                {t('usersPage.table.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {list.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {u.name}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{u.email}</td>
                <td className="px-4 py-3 text-sm">
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
                    <Shield className="h-3.5 w-3.5" />
                    {findRoleName(u)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                      u.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-gray-100 text-gray-800'
                    )}
                  >
                    {t(`usersPage.status.${u.status}`)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  <div className="inline-flex gap-2">
                    <button
                      className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                      onClick={() => setEditUser(u)}
                    >
                      {t('usersPage.actions.edit')}
                    </button>
                    {u.id !== me?.id && (
                      <button
                        className={cn(
                          'rounded-md border px-2 py-1 text-xs hover:bg-gray-50',
                          u.status === 'active'
                            ? 'text-red-600'
                            : 'text-emerald-600'
                        )}
                        onClick={() => toggleStatus(u)}
                        disabled={updateMutation.isPending}
                      >
                        {u.status === 'active'
                          ? t('usersPage.actions.disable')
                          : t('usersPage.actions.activate')}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {!usersQuery.isLoading && list.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-sm text-gray-500"
                >
                  {t('usersPage.noUsers')}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {usersQuery.isLoading && (
          <div className="px-4 py-6 text-sm text-gray-500">
            {t('usersPage.loading')}
          </div>
        )}
        {usersQuery.isError && (
          <div className="px-4 py-6 text-sm text-red-600">
            {t('usersPage.loadError')}
          </div>
        )}
      </div>

      {/* Create Drawer */}
      {showCreate && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center sm:justify-center">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowCreate(false)}
          />
          <div className="relative z-50 w-full rounded-lg bg-white shadow-lg sm:max-w-lg">
            <form onSubmit={handleCreate}>
              <div className="border-b p-4">
                <div className="text-lg font-semibold">
                  {t('usersPage.create.title')}
                </div>
                <div className="text-sm text-gray-500">
                  {t('usersPage.create.subtitle')}
                </div>
              </div>
              <div className="space-y-3 p-4">
                <input
                  name="name"
                  className="input w-full"
                  placeholder={t('usersPage.form.fullName')}
                />
                <input
                  name="email"
                  className="input w-full"
                  placeholder={t('usersPage.form.email')}
                  type="email"
                />
                <input
                  name="phone"
                  className="input w-full"
                  placeholder={t('usersPage.form.phoneOptional')}
                />
                <input
                  name="password"
                  className="input w-full"
                  placeholder={t('usersPage.form.initialPassword')}
                  type="password"
                />
                <select
                  name="role_id"
                  className="input w-full"
                  defaultValue=""
                >
                  <option value="">
                    {t('usersPage.form.selectRolePlaceholder')}
                  </option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 border-t p-4">
                <button
                  type="button"
                  className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
                  onClick={() => setShowCreate(false)}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary inline-flex items-center gap-2"
                  disabled={createMutation.isPending}
                >
                  <Plus className="h-4 w-4" /> {t('usersPage.actions.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Drawer */}
      {editUser && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center sm:justify-center">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setEditUser(null)}
          />
          <div className="relative z-50 w-full rounded-lg bg-white shadow-lg sm:max-w-lg">
            <form onSubmit={handleEdit}>
              <div className="border-b p-4">
                <div className="text-lg font-semibold">
                  {t('usersPage.edit.title')}
                </div>
                <div className="text-sm text-gray-500">
                  {t('usersPage.edit.subtitle')}
                </div>
              </div>
              <div className="space-y-3 p-4">
                <input
                  name="name"
                  className="input w-full"
                  defaultValue={editUser.name}
                />
                <input
                  name="email"
                  className="input w-full"
                  type="email"
                  defaultValue={editUser.email}
                />
                <input
                  name="phone"
                  className="input w-full"
                  defaultValue={editUser.phone ?? ''}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <select
                    name="role_id"
                    className="input w-full"
                    defaultValue={editUser.role_id}
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <select
                    name="status"
                    className="input w-full"
                    defaultValue={editUser.status}
                  >
                    <option value="active">
                      {t('usersPage.status.active')}
                    </option>
                    <option value="disabled">
                      {t('usersPage.status.disabled')}
                    </option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between border-t p-4">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
                  onClick={() => setEditUser(null)}
                >
                  <X className="h-4 w-4" />
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary inline-flex items-center gap-2"
                  disabled={updateMutation.isPending}
                >
                  <Check className="h-4 w-4" />
                  {t('usersPage.actions.saveChanges')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
