// src/pages/admin/UsersPage.tsx
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw, Search, Filter, Shield, Check, X, Store } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import type { UUID } from '../../api/http';
import * as usersApi from '../../api/users';
import * as rolesApi from '../../api/roles';
import { listStores } from '../../api/stores';
import { cn } from '../../lib/utils';
import { roleNeedsStore } from '../../lib/user-roles';
import { useAuthStore } from '../../stores/auth';

type Role = {
  id: string;
  name: string;
};

type UserRow = usersApi.User;

type UserForm = {
  name: string;
  email: string;
  phone: string;
  password: string;
  role_id: string;
  store_id: string;
  status: usersApi.UserStatus;
};

const emptyForm = (): UserForm => ({
  name: '',
  email: '',
  phone: '',
  password: '',
  role_id: '',
  store_id: '',
  status: 'active',
});

function formFromUser(u: UserRow): UserForm {
  return {
    name: u.name,
    email: u.email,
    phone: u.phone ?? '',
    password: '',
    role_id: u.role_id,
    store_id: u.store_id ?? '',
    status: u.status,
  };
}

export default function UsersPage() {
  const qc = useQueryClient();
  const { user: me } = useAuthStore();
  const { t } = useTranslation('common');

  const [roleIdFilter, setRoleIdFilter] = useState('');
  const [storeIdFilter, setStoreIdFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [q, setQ] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [createForm, setCreateForm] = useState<UserForm>(emptyForm);
  const [editForm, setEditForm] = useState<UserForm>(emptyForm);

  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await rolesApi.listRoles();
      const body = res as { data?: Role[] } | Role[];
      if (Array.isArray(body)) return body;
      return body.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const storesQuery = useQuery({
    queryKey: ['stores', 'users-admin'],
    queryFn: async () => {
      const res = await listStores({ limit: 200, offset: 0 });
      return res.data;
    },
    staleTime: 60_000,
  });

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await usersApi.listUsers({ limit: 200, offset: 0 });
      return res.data;
    },
  });

  const roles = rolesQuery.data ?? [];
  const stores = storesQuery.data ?? [];
  const users = usersQuery.data ?? [];

  useEffect(() => {
    if (editUser) setEditForm(formFromUser(editUser));
  }, [editUser]);

  const createRole = roles.find((r) => r.id === createForm.role_id);
  const editRole = roles.find((r) => r.id === editForm.role_id);
  const createNeedsStore = roleNeedsStore(createRole?.name);
  const editNeedsStore = roleNeedsStore(editRole?.name);

  const list = useMemo(() => {
    let l = users.slice();
    if (roleIdFilter) l = l.filter((u) => u.role_id === roleIdFilter);
    if (storeIdFilter) l = l.filter((u) => u.store_id === storeIdFilter);
    if (statusFilter) l = l.filter((u) => u.status === statusFilter);
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      l = l.filter(
        (u) =>
          u.name.toLowerCase().includes(s) ||
          u.email.toLowerCase().includes(s) ||
          (u.phone ?? '').toLowerCase().includes(s) ||
          (u.store?.name ?? '').toLowerCase().includes(s) ||
          u.id.toLowerCase().includes(s)
      );
    }
    return l;
  }, [users, roleIdFilter, storeIdFilter, statusFilter, q]);

  const findRoleName = (user: UserRow): string =>
    user.role?.name ?? roles.find((r) => r.id === user.role_id)?.name ?? '—';

  const findStoreName = (user: UserRow): string =>
    user.store?.name ?? stores.find((s) => s.id === user.store_id)?.name ?? '—';

  const createMutation = useMutation({
    mutationFn: (payload: UserForm) => {
      const role = roles.find((r) => r.id === payload.role_id);
      if (!payload.name || !payload.email || !payload.password || !payload.role_id) {
        throw new Error(t('usersPage.validation.missingRequired'));
      }
      if (roleNeedsStore(role?.name) && !payload.store_id) {
        throw new Error(t('usersPage.validation.storeRequired'));
      }
      return usersApi.createUser({
        name: payload.name,
        email: payload.email,
        password: payload.password,
        phone: payload.phone.trim() || null,
        role_id: payload.role_id as UUID,
        store_id: roleNeedsStore(role?.name) ? (payload.store_id as UUID) : null,
      });
    },
    onSuccess: () => {
      toast.success(t('usersPage.toasts.userCreated'));
      setShowCreate(false);
      setCreateForm(emptyForm());
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response
          ?.data?.message ||
        (err as Error)?.message ||
        t('usersPage.toasts.createFailed');
      toast.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; form: UserForm }) => {
      const role = roles.find((r) => r.id === payload.form.role_id);
      if (roleNeedsStore(role?.name) && !payload.form.store_id) {
        throw new Error(t('usersPage.validation.storeRequired'));
      }
      return usersApi.updateUser(payload.id as UUID, {
        name: payload.form.name,
        email: payload.form.email,
        phone: payload.form.phone.trim() || null,
        role_id: payload.form.role_id as UUID,
        status: payload.form.status,
        store_id: roleNeedsStore(role?.name)
          ? (payload.form.store_id as UUID)
          : null,
      });
    },
    onSuccess: () => {
      toast.success(t('usersPage.toasts.userUpdated'));
      setEditUser(null);
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response
          ?.data?.message ||
        (err as Error)?.message ||
        t('usersPage.toasts.updateFailed');
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.deleteUser(id as UUID),
    onSuccess: () => {
      toast.success(t('usersPage.toasts.userDeleted'));
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response
          ?.data?.message ||
        (err as Error)?.message ||
        t('usersPage.toasts.deleteFailed');
      toast.error(msg);
    },
  });

  const toggleStatus = (u: UserRow) => {
    const nextStatus: usersApi.UserStatus = u.status === 'active' ? 'disabled' : 'active';
    updateMutation.mutate({
      id: u.id,
      form: { ...formFromUser(u), status: nextStatus },
    });
  };

  function StoreSelect({
    value,
    onChange,
    required,
  }: {
    value: string;
    onChange: (v: string) => void;
    required?: boolean;
  }) {
    return (
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">
          {t('usersPage.form.store')}
          {required ? ' *' : ''}
        </label>
        <select
          className="input-select-chevron-only w-full"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        >
          <option value="">{t('usersPage.form.selectStorePlaceholder')}</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('usersPage.title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('usersPage.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => usersQuery.refetch()}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
            disabled={usersQuery.isFetching}
          >
            <RefreshCw className={cn('h-4 w-4', usersQuery.isFetching && 'animate-spin')} />
            {t('usersPage.refresh')}
          </button>
          <button
            type="button"
            onClick={() => {
              setCreateForm(emptyForm());
              setShowCreate(true);
            }}
            className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-3 py-2 text-sm text-white hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            {t('usersPage.newUserButton')}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-content grid grid-cols-1 gap-3 md:grid-cols-4 md:items-end">
          <div className="min-w-0 md:col-span-2">
            <label className="mb-1 block text-xs text-gray-600">
              {t('usersPage.filters.searchLabel')}
            </label>
            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                className="input-search-field w-full"
                placeholder={t('usersPage.searchPlaceholder')}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>
          <div className="min-w-0">
            <label className="mb-1 block text-xs text-gray-600">
              {t('usersPage.filters.roleLabel')}
            </label>
            <div className="relative min-w-0">
              <Filter className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select
                className="input-select-with-icon w-full"
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
          </div>
          <div className="min-w-0">
            <label className="mb-1 block text-xs text-gray-600">
              {t('usersPage.filters.storeLabel')}
            </label>
            <select
              className="input-select-chevron-only w-full"
              value={storeIdFilter}
              onChange={(e) => setStoreIdFilter(e.target.value)}
            >
              <option value="">{t('usersPage.filters.allStores')}</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
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
                {t('usersPage.table.store')}
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
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.name}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{u.email}</td>
                <td className="px-4 py-3 text-sm">
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
                    <Shield className="h-3.5 w-3.5" />
                    {findRoleName(u)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {u.store_id ? (
                    <span className="inline-flex items-center gap-1 text-xs">
                      <Store className="h-3.5 w-3.5 text-gray-500" />
                      {findStoreName(u)}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
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
                  <div className="inline-flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                      onClick={() => setEditUser(u)}
                    >
                      {t('usersPage.actions.edit')}
                    </button>
                    {u.id !== me?.id ? (
                      <>
                        <button
                          type="button"
                          className={cn(
                            'rounded-md border px-2 py-1 text-xs hover:bg-gray-50',
                            u.status === 'active' ? 'text-red-600' : 'text-emerald-600'
                          )}
                          onClick={() => toggleStatus(u)}
                          disabled={updateMutation.isPending}
                        >
                          {u.status === 'active'
                            ? t('usersPage.actions.disable')
                            : t('usersPage.actions.activate')}
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                          onClick={() => {
                            if (!window.confirm(t('usersPage.confirmDelete', { name: u.name }))) {
                              return;
                            }
                            deleteMutation.mutate(u.id);
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          {t('usersPage.actions.delete')}
                        </button>
                      </>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {!usersQuery.isLoading && list.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                  {t('usersPage.noUsers')}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        {usersQuery.isLoading ? (
          <div className="px-4 py-6 text-sm text-gray-500">{t('usersPage.loading')}</div>
        ) : null}
        {usersQuery.isError ? (
          <div className="px-4 py-6 text-sm text-red-600">{t('usersPage.loadError')}</div>
        ) : null}
      </div>

      {showCreate ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
          <div className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:max-w-lg sm:rounded-2xl">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(createForm);
              }}
            >
              <div className="border-b p-4">
                <h2 className="text-lg font-semibold">{t('usersPage.create.title')}</h2>
                <p className="text-sm text-gray-500">{t('usersPage.create.subtitle')}</p>
              </div>
              <div className="space-y-3 p-4">
                <input
                  className="input w-full"
                  placeholder={t('usersPage.form.fullName')}
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
                <input
                  className="input w-full"
                  placeholder={t('usersPage.form.email')}
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
                <input
                  className="input w-full"
                  placeholder={t('usersPage.form.phoneOptional')}
                  value={createForm.phone}
                  onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                />
                <input
                  className="input w-full font-mono"
                  placeholder={t('usersPage.form.initialPassword')}
                  type="text"
                  autoComplete="new-password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                  required
                />
                <select
                  className="input w-full"
                  value={createForm.role_id}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      role_id: e.target.value,
                      store_id: roleNeedsStore(
                        roles.find((r) => r.id === e.target.value)?.name
                      )
                        ? f.store_id
                        : '',
                    }))
                  }
                  required
                >
                  <option value="">{t('usersPage.form.selectRolePlaceholder')}</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                {createNeedsStore ? (
                  <StoreSelect
                    value={createForm.store_id}
                    onChange={(store_id) => setCreateForm((f) => ({ ...f, store_id }))}
                    required
                  />
                ) : null}
              </div>
              <div className="flex justify-end gap-2 border-t p-4">
                <button
                  type="button"
                  className="rounded-md border px-3 py-2 text-sm"
                  onClick={() => setShowCreate(false)}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary inline-flex items-center gap-2"
                  disabled={createMutation.isPending}
                >
                  <Plus className="h-4 w-4" />
                  {t('usersPage.actions.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editUser ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
          <div className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:max-w-lg sm:rounded-2xl">
            <form
              key={editUser.id}
              onSubmit={(e) => {
                e.preventDefault();
                updateMutation.mutate({ id: editUser.id, form: editForm });
              }}
            >
              <div className="border-b p-4">
                <h2 className="text-lg font-semibold">{t('usersPage.edit.title')}</h2>
                <p className="text-sm text-gray-500">{t('usersPage.edit.subtitle')}</p>
              </div>
              <div className="space-y-3 p-4">
                <input
                  className="input w-full"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
                <input
                  className="input w-full"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
                <input
                  className="input w-full"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder={t('usersPage.form.phoneOptional')}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <select
                    className="input w-full"
                    value={editForm.role_id}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        role_id: e.target.value,
                        store_id: roleNeedsStore(
                          roles.find((r) => r.id === e.target.value)?.name
                        )
                          ? f.store_id
                          : '',
                      }))
                    }
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <select
                    className="input w-full"
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        status: e.target.value as usersApi.UserStatus,
                      }))
                    }
                  >
                    <option value="active">{t('usersPage.status.active')}</option>
                    <option value="disabled">{t('usersPage.status.disabled')}</option>
                  </select>
                </div>
                {editNeedsStore ? (
                  <StoreSelect
                    value={editForm.store_id}
                    onChange={(store_id) => setEditForm((f) => ({ ...f, store_id }))}
                    required
                  />
                ) : null}
              </div>
              <div className="flex items-center justify-between border-t p-4">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm"
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
      ) : null}
    </div>
  );
}
