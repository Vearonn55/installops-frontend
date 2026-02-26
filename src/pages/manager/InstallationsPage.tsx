// src/pages/manager/InstallationsPage.tsx
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Calendar as CalendarIcon,
  MapPin,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Wrench,
  Edit3,
  Package,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import { cn } from '../../lib/utils';
import { useAuthStore } from '../../stores/auth-simple';
import {
  listInstallations,
  type Installation,
  type InstallStatus,
  updateInstallationSchedule,
  updateInstallationStatus,
} from '../../api/installations';
import { listStores, type Store } from '../../api/stores';
import type { UUID } from '../../api/http';

/* -------------------------------- Types -------------------------------- */
// UI status (we map backend → UI)
type InstallationStatus =
  | 'pending'
  | 'staged'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'after_sale_service';

// "Zone" here is effectively city name coming from store.address.city
type Zone = string;

type Row = {
  id: string;
  status: InstallationStatus;
  start: string | null;
  end: string | null;
  externalOrderId: string;
  storeName: string;
  city?: string;
  addressLine?: string;
  crewCount: number;
};

/* ----------------------------- Helpers ---------------------------- */
const isTr =
  typeof navigator !== 'undefined' &&
  navigator.language.toLowerCase().startsWith('tr');

function ymd(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function ymdFromIso(iso: string) {
  return iso.split('T')[0] ?? '';
}

function fmt(dtIso: string | null) {
  if (!dtIso) return '—';
  const d = new Date(dtIso);

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year}, ${hours}:${minutes}`;
}

function isoToLocalInput(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16); // yyyy-MM-ddTHH:mm
}

function localInputToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function mapBackendStatusToUi(status: InstallStatus | string): InstallationStatus {
  const normalized = String(status ?? '').toLowerCase().replace(/-/g, '_').trim();
  switch (normalized) {
    case 'staged':
      return 'staged';
    case 'in_progress':
      return 'in_progress';
    case 'completed':
      return 'completed';
    case 'failed':
      return 'failed';
    case 'canceled':
    case 'cancelled':
      return 'cancelled';
    case 'after_sale_service':
      return 'after_sale_service';
    case 'scheduled':
      return 'pending';
    default:
      return 'pending';
  }
}

function makeRow(inst: Installation, store?: Store): Row {
  const uiStatus = mapBackendStatusToUi(inst.status);
  const addr = store?.address;

  return {
    id: inst.id,
    status: uiStatus,
    start: inst.scheduled_start ?? null,
    end: inst.scheduled_end ?? null,
    externalOrderId: inst.external_order_id,
    storeName: store?.name ?? inst.store_id,
    city: addr?.city,
    addressLine: addr?.line1,
    // if backend later embeds crew array, we’ll pick it up here
    crewCount: Array.isArray(inst.crew) ? inst.crew.length : 0,
  };
}

/* ----------------------------- Edit state ---------------------------- */
type EditState = {
  id: UUID;
  status: InstallStatus;
  scheduled_start: string; // datetime-local
  scheduled_end: string;
  notes: string;
};

/* --------------------------------- Page -------------------------------- */
export default function InstallationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation('common');
  const { hasRole } = useAuthStore();
  const isAdmin = hasRole('ADMIN');

  // Force-open date picker (Chrome / Edge / Safari)
  const handleDateClick = (e: React.MouseEvent<HTMLInputElement>) => {
    const input = e.currentTarget as HTMLInputElement;
    if (typeof (input as any).showPicker === 'function') {
      (input as any).showPicker();
    }
  };

  // compute today and 1 month ago
  const today = new Date();
  const todayISO = ymd(today);

  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const oneMonthAgoISO = ymd(oneMonthAgo);

  // Filters
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<InstallationStatus | 'all'>('all');
  const [zone, setZone] = useState<Zone | 'all'>('all');

  // Set default range: from = 1 month ago, to = today
  const [from, setFrom] = useState<string>(oneMonthAgoISO);
  const [to, setTo] = useState<string>(todayISO);

  // Sort & pagination
  const [sortBy, setSortBy] = useState<'start' | 'customer' | 'zone' | 'status'>('start');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 6;

  // Edit modal
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetch installations (we use a reasonable limit and filter locally by date/search)
  const installationsQuery = useQuery({
    queryKey: ['installations'],
    queryFn: async () => {
      // listInstallations returns InstallationList { data, limit, offset }
      const res = await listInstallations({ limit: 200, offset: 0 });
      return res;
    },
  });

  // Fetch stores (for name + address.city)
  const storesQuery = useQuery({
    queryKey: ['stores'],
    queryFn: async () => {
      const res = await listStores({ limit: 200, offset: 0 });
      return res;
    },
  });

  const storesById = useMemo(() => {
    const m = new Map<string, Store>();
    (storesQuery.data?.data ?? []).forEach((s) => m.set(s.id, s));
    return m;
  }, [storesQuery.data]);

  // Build row objects from API data
  const allRows: Row[] = useMemo(() => {
    const insts: Installation[] = installationsQuery.data?.data ?? [];
    return insts.map((inst) => makeRow(inst, storesById.get(inst.store_id)));
  }, [installationsQuery.data, storesById]);

  // Zone options from store.address.city
  const zoneOptions: Zone[] = useMemo(() => {
    const set = new Set<string>();
    for (const r of allRows) {
      if (r.city) set.add(r.city);
    }
    return Array.from(set).sort();
  }, [allRows]);

  const filtered = useMemo(() => {
    let list = allRows.slice();

    // Date filter (by scheduled_start)
    if (from) {
      list = list.filter((r) => !r.start || ymdFromIso(r.start) >= from);
    }
    if (to) {
      list = list.filter((r) => !r.start || ymdFromIso(r.start) <= to);
    }

    // Search text
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter((r) => {
        return (
          r.id.toLowerCase().includes(s) ||
          r.externalOrderId.toLowerCase().includes(s) ||
          r.storeName.toLowerCase().includes(s) ||
          (r.addressLine ?? '').toLowerCase().includes(s) ||
          (r.city ?? '').toLowerCase().includes(s)
        );
      });
    }

    // Status filter
    if (status !== 'all') {
      list = list.filter((r) => r.status === status);
    }

    // Zone filter (by city)
    if (zone !== 'all') {
      list = list.filter((r) => r.city === zone);
    }

    // Sorting
    list.sort((a, b) => {
      switch (sortBy) {
        case 'start': {
          const as = a.start ?? '';
          const bs = b.start ?? '';
          return sortDir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
        }
        case 'customer': {
          const an = a.storeName;
          const bn = b.storeName;
          return sortDir === 'asc' ? an.localeCompare(bn) : bn.localeCompare(an);
        }
        case 'zone': {
          const az = a.city ?? '';
          const bz = b.city ?? '';
          return sortDir === 'asc' ? az.localeCompare(bz) : bz.localeCompare(az);
        }
        case 'status': {
          return sortDir === 'asc'
            ? statusRank(a.status) - statusRank(b.status)
            : statusRank(b.status) - statusRank(a.status);
        }
      }
    });

    return list;
  }, [allRows, q, status, zone, sortBy, sortDir, from, to]);

  const counts = useMemo(() => {
    const c: Record<InstallationStatus | 'all', number> = {
      all: allRows.length,
      pending: allRows.filter((r) => r.status === 'pending').length,
      staged: allRows.filter((r) => r.status === 'staged').length,
      in_progress: allRows.filter((r) => r.status === 'in_progress').length,
      completed: allRows.filter((r) => r.status === 'completed').length,
      failed: allRows.filter((r) => r.status === 'failed').length,
      cancelled: allRows.filter((r) => r.status === 'cancelled').length,
      after_sale_service: allRows.filter((r) => r.status === 'after_sale_service').length,
    };
    return c;
  }, [allRows]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (k: typeof sortBy) => {
    if (sortBy === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(k);
      setSortDir('asc');
    }
  };

  const goDetail = (id: string) => navigate(`/app/installations/${id}`);
  const goCreate = () => navigate('/app/installations/new');

  /* --------------------------- Edit helpers --------------------------- */
  const openEdit = (id: string) => {
    const insts: Installation[] = installationsQuery.data?.data ?? [];
    const inst = insts.find((i) => i.id === id);
    if (!inst) return;

    setEditState({
      id: inst.id as UUID,
      status: inst.status,
      scheduled_start: isoToLocalInput(inst.scheduled_start ?? null),
      scheduled_end: isoToLocalInput(inst.scheduled_end ?? null),
      notes: inst.notes ?? '',
    });
  };

  const closeEdit = () => {
    if (saving) return;
    setEditState(null);
  };

  const handleSaveEdit = async () => {
    if (!editState) return;
    setSaving(true);
    try {
      const schedulePayload = {
        scheduled_start: localInputToIso(editState.scheduled_start),
        scheduled_end: localInputToIso(editState.scheduled_end),
        notes: editState.notes.trim() || null,
      };

      await updateInstallationSchedule(editState.id, schedulePayload);
      await updateInstallationStatus(editState.id, {
        status: editState.status,
      });

      await queryClient.invalidateQueries({ queryKey: ['installations'] });

      toast.success(isTr ? 'Kurulum güncellendi' : 'Installation updated');
      setEditState(null);
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.message ||
          (isTr ? 'Kurulum güncellenemedi' : 'Failed to update installation')
      );
    } finally {
      setSaving(false);
    }
  };

  const [stagingId, setStagingId] = useState<string | null>(null);
  const handleStageInstallation = async (id: string) => {
    setStagingId(id);
    try {
      await updateInstallationStatus(id as UUID, { status: 'staged' });
      await queryClient.invalidateQueries({ queryKey: ['installations'] });
      toast.success(isTr ? 'Kurulum hazırlandı' : 'Installation staged');
    } catch (err: any) {
      toast.error(
        err?.message ||
          (isTr ? 'Kurulum hazırlanamadı' : 'Failed to stage installation')
      );
    } finally {
      setStagingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('installationsPage.title')}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('installationsPage.subtitle')}
          </p>
        </div>
        <button
          onClick={goCreate}
          className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          {t('installationsPage.createButton')}
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border bg-white p-3 shadow-sm md:grid-cols-5">
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs text-gray-600">
            {t('installationsPage.filters.searchLabel')}
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <input
              className="input w-full pl-8"
              placeholder={t('installationsPage.filters.searchPlaceholder')}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-600">
            {t('installationsPage.filters.statusLabel')}
          </label>
          <div className="relative">
            <Filter className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <select
              className="input w-full pl-8"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as any);
                setPage(1);
              }}
            >
              <option value="all">
                {t('installationsPage.filters.status.all')}
              </option>
              <option value="pending">
                {t('installationsPage.filters.status.pending')}
              </option>
              <option value="staged">
                {t('installationsPage.filters.status.staged')}
              </option>
              <option value="in_progress">
                {t('installationsPage.filters.status.in_progress')}
              </option>
              <option value="completed">
                {t('installationsPage.filters.status.completed')}
              </option>
              <option value="failed">
                {t('installationsPage.filters.status.failed')}
              </option>
              <option value="cancelled">
                {t('installationsPage.filters.status.cancelled')}
              </option>
              <option value="after_sale_service">
                {t('installationsPage.filters.status.after_sale_service')}
              </option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-600">
            {t('installationsPage.filters.zoneLabel')}
          </label>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <select
              className="input w-full pl-8"
              value={zone}
              onChange={(e) => {
                setZone(e.target.value as any);
                setPage(1);
              }}
            >
              <option value="all">
                {t('installationsPage.filters.allZones')}
              </option>
              {zoneOptions.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs text-gray-600">
              {t('installationsPage.filters.from')}
            </label>
            <div className="relative">
              <CalendarIcon className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="date"
                className="input w-full pl-8"
                value={from}
                onClick={handleDateClick}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">
              {t('installationsPage.filters.to')}
            </label>
            <div className="relative">
              <CalendarIcon className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="date"
                className="input w-full pl-8"
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

      {/* Status quick filters */}
      <div className="flex flex-wrap gap-2">
        <QuickChip
          label={t('installationsPage.chips.all')}
          value={counts.all}
          active={status === 'all'}
          onClick={() => {
            setStatus('all');
            setPage(1);
          }}
        />
        <QuickChip
          label={t('installationsPage.chips.pending')}
          value={counts.pending}
          tone="gray"
          icon={<Clock className="h-3.5 w-3.5" />}
          active={status === 'pending'}
          onClick={() => {
            setStatus('pending');
            setPage(1);
          }}
        />
        <QuickChip
          label={t('installationsPage.chips.staged')}
          value={counts.staged}
          tone="blue"
          icon={<Wrench className="h-3.5 w-3.5" />}
          active={status === 'staged'}
          onClick={() => {
            setStatus('staged');
            setPage(1);
          }}
        />
        <QuickChip
          label={t('installationsPage.chips.in_progress')}
          value={counts.in_progress}
          tone="amber"
          icon={<Clock className="h-3.5 w-3.5" />}
          active={status === 'in_progress'}
          onClick={() => {
            setStatus('in_progress');
            setPage(1);
          }}
        />
        <QuickChip
          label={t('installationsPage.chips.completed')}
          value={counts.completed}
          tone="emerald"
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          active={status === 'completed'}
          onClick={() => {
            setStatus('completed');
            setPage(1);
          }}
        />
        <QuickChip
          label={t('installationsPage.chips.failed')}
          value={counts.failed}
          tone="rose"
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          active={status === 'failed'}
          onClick={() => {
            setStatus('failed');
            setPage(1);
          }}
        />
        <QuickChip
          label={t('installationsPage.chips.cancelled')}
          value={counts.cancelled}
          tone="zinc"
          icon={<XCircle className="h-3.5 w-3.5" />}
          active={status === 'cancelled'}
          onClick={() => {
            setStatus('cancelled');
            setPage(1);
          }}
        />
        <QuickChip
          label={t('installationsPage.chips.after_sale_service')}
          value={counts.after_sale_service}
          tone="sky"
          icon={<Wrench className="h-3.5 w-3.5" />}
          active={status === 'after_sale_service'}
          onClick={() => {
            setStatus('after_sale_service');
            setPage(1);
          }}
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-600">
            <tr>
              <Th
                label={t('installationsPage.table.start')}
                active={sortBy === 'start'}
                dir={sortDir}
                onClick={() => toggleSort('start')}
              />
              <th className="px-3 py-2 text-left">
                {t('installationsPage.table.installation')}
              </th>
              <Th
                label={t('installationsPage.table.store')}
                active={sortBy === 'customer'}
                dir={sortDir}
                onClick={() => toggleSort('customer')}
              />
              <Th
                label={t('installationsPage.table.zone')}
                active={sortBy === 'zone'}
                dir={sortDir}
                onClick={() => toggleSort('zone')}
              />
              <Th
                label={t('installationsPage.table.status')}
                active={sortBy === 'status'}
                dir={sortDir}
                onClick={() => toggleSort('status')}
              />
              <th className="w-28 px-3 py-2 text-left">Crew</th>
              <th className="w-32 px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {installationsQuery.isLoading ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                  {t('installationsPage.loading')}
                </td>
              </tr>
            ) : installationsQuery.isError ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-red-600">
                  {t('installationsPage.loadError')}
                </td>
              </tr>
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                  {t('installationsPage.noResults')}
                </td>
              </tr>
            ) : (
              paged.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {fmt(r.start)}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-900">
                      {r.externalOrderId || r.id}
                    </div>
                    <div className="text-xs text-gray-500">
                      {t('installationsPage.table.idPrefix')} {r.id}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-900">{r.storeName}</div>
                    <div className="text-xs text-gray-500 truncate max-w-[220px]">
                      {r.addressLine || r.city || '—'}
                    </div>
                  </td>
                  <td className="px-3 py-2">{r.city ?? '—'}</td>
                  <td className="px-3 py-2">
                    <StatusPill
                      status={r.status}
                      labelOverride={t(
                        `installationsPage.statusLabels.${r.status}`
                      )}
                    />
                  </td>
                  <td className="px-3 py-2">
                    {r.crewCount > 0 ? (
                      <span className="inline-flex items-center rounded border px-2 py-0.5 text-[11px] text-gray-700">
                        <Users className="mr-1 h-3.5 w-3.5" />
                        {r.crewCount}{' '}
                        {t('installationsPage.crew.assigned')}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => goDetail(r.id)}
                        className="text-primary-600 hover:text-primary-800 text-xs font-medium"
                      >
                        {t('installationsPage.actions.view')}
                      </button>
                      {isAdmin ? (
                        <button
                          onClick={() => openEdit(r.id)}
                          className="inline-flex items-center gap-1 rounded border border-primary-200 bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700 hover:bg-primary-100"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          {t('installationsPage.actions.edit')}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStageInstallation(r.id)}
                          disabled={r.status !== 'pending' || stagingId === r.id}
                          className={cn(
                            'inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium',
                            r.status === 'pending' && stagingId !== r.id
                              ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                              : 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
                          )}
                        >
                          <Package className="h-3.5 w-3.5" />
                          {t('installationsPage.actions.stageInstallation')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between border-top p-3 text-sm border-t">
          <div className="text-gray-600">
            {t('installationsPage.pagination.showing')}{' '}
            <span className="font-medium text-gray-900">{paged.length}</span>{' '}
            {t('installationsPage.pagination.of')}{' '}
            <span className="font-medium text-gray-900">{filtered.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className={cn(
                'rounded-md border px-3 py-1.5',
                page === 1 ? 'opacity-50' : 'hover:bg-gray-50'
              )}
            >
              {t('installationsPage.pagination.prev')}
            </button>
            <div>
              {t('installationsPage.pagination.page')}{' '}
              <span className="font-medium">{page}</span> / {totalPages}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className={cn(
                'rounded-md border px-3 py-1.5',
                page === totalPages ? 'opacity-50' : 'hover:bg-gray-50'
              )}
            >
              {t('installationsPage.pagination.next')}
            </button>
          </div>
        </div>
      </div>

      {/* Edit modal */}
      {editState && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-900">
                {isTr ? 'Kurulumu düzenle' : 'Edit installation'}
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                {isTr
                  ? 'Takvim, durum ve notları güncelleyin.'
                  : 'Update schedule, status and notes.'}
              </p>
            </div>

            <div className="space-y-4 px-4 py-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-gray-600">
                    {isTr ? 'Planlanan başlangıç' : 'Scheduled start'}
                  </label>
                  <input
                    type="datetime-local"
                    className="input w-full"
                    value={editState.scheduled_start}
                    onChange={(e) =>
                      setEditState((prev) =>
                        prev
                          ? { ...prev, scheduled_start: e.target.value }
                          : prev
                      )
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-600">
                    {isTr ? 'Planlanan bitiş' : 'Scheduled end'}
                  </label>
                  <input
                    type="datetime-local"
                    className="input w-full"
                    value={editState.scheduled_end}
                    onChange={(e) =>
                      setEditState((prev) =>
                        prev
                          ? { ...prev, scheduled_end: e.target.value }
                          : prev
                      )
                    }
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-600">
                  {isTr ? 'Durum' : 'Status'}
                </label>
                <select
                  className="input w-full"
                  value={editState.status}
                  onChange={(e) =>
                    setEditState((prev) =>
                      prev
                        ? { ...prev, status: e.target.value as InstallStatus }
                        : prev
                    )
                  }
                >
                  <option value="scheduled">
                    {isTr ? 'Planlandı' : 'Scheduled'}
                  </option>
                  <option value="staged">
                    {t('installationsPage.filters.status.staged')}
                  </option>
                  <option value="in_progress">
                    {isTr ? 'Devam ediyor' : 'In progress'}
                  </option>
                  <option value="completed">
                    {isTr ? 'Tamamlandı' : 'Completed'}
                  </option>
                  <option value="failed">
                    {isTr ? 'Başarısız' : 'Failed'}
                  </option>
                  <option value="canceled">
                    {isTr ? 'İptal edildi' : 'Cancelled'}
                  </option>
                  <option value="after_sale_service">
                    {isTr ? 'Satış sonrası servis' : 'After-sale service'}
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-600">
                  {isTr ? 'Notlar' : 'Notes'}
                </label>
                <textarea
                  rows={3}
                  className="input w-full"
                  value={editState.notes}
                  onChange={(e) =>
                    setEditState((prev) =>
                      prev ? { ...prev, notes: e.target.value } : prev
                    )
                  }
                  placeholder={
                    isTr ? 'Ekip için ek notlar…' : 'Additional notes for the crew…'
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
              <button
                onClick={closeEdit}
                disabled={saving}
                className="rounded-md border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                {isTr ? 'İptal' : 'Cancel'}
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="inline-flex items-center rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-70"
              >
                {saving
                  ? isTr
                    ? 'Kaydediliyor…'
                    : 'Saving…'
                  : isTr
                  ? 'Değişiklikleri kaydet'
                  : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------- Bits -------------------------------- */
function statusRank(s: InstallationStatus | string): number {
  const order: InstallationStatus[] = [
    'pending',
    'staged',
    'in_progress',
    'after_sale_service',
    'completed',
    'failed',
    'cancelled',
  ];
  const i = order.indexOf(s as InstallationStatus);
  return i >= 0 ? i : order.length;
}

const STATUS_PILL_CFG: Record<
  InstallationStatus,
  { tone: string; Icon: (props: { className?: string }) => JSX.Element; label: string }
> = {
  pending: {
    tone: 'border-gray-200 bg-gray-50 text-gray-700',
    Icon: Clock,
    label: 'Pending',
  },
  staged: {
    tone: 'border-blue-200 bg-blue-50 text-blue-700',
    Icon: Wrench,
    label: 'Staged',
  },
  in_progress: {
    tone: 'border-amber-200 bg-amber-50 text-amber-700',
    Icon: Clock,
    label: 'In progress',
  },
  completed: {
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    Icon: CheckCircle2,
    label: 'Completed',
  },
  failed: {
    tone: 'border-rose-200 bg-rose-50 text-rose-700',
    Icon: AlertTriangle,
    label: 'Failed',
  },
  cancelled: {
    tone: 'border-zinc-200 bg-zinc-50 text-zinc-700',
    Icon: XCircle,
    label: 'Cancelled',
  },
  after_sale_service: {
    tone: 'border-sky-200 bg-sky-50 text-sky-700',
    Icon: Wrench,
    label: 'After-sale service',
  },
};

const FALLBACK_PILL = {
  tone: 'border-gray-200 bg-gray-100 text-gray-600',
  Icon: Clock,
  label: '—',
};

function StatusPill({
  status,
  labelOverride,
}: {
  status: InstallationStatus | string;
  labelOverride?: string;
}) {
  const normalized = String(status ?? '').toLowerCase().replace(/-/g, '_').trim() as InstallationStatus;
  const cfg = STATUS_PILL_CFG[normalized] ?? FALLBACK_PILL;
  const { tone, Icon, label } = cfg;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]',
        tone
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {labelOverride ?? label}
    </span>
  );
}

function Th({
  label,
  onClick,
  active,
  dir,
  className,
}: {
  label: string;
  onClick: () => void;
  active: boolean;
  dir: 'asc' | 'desc';
  className?: string;
}) {
  const { t } = useTranslation('common');
  return (
    <th className={cn('px-3 py-2 text-left font-semibold text-gray-700', className)}>
      <button
        onClick={onClick}
        className={cn(
          'inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-gray-100',
          active && 'text-primary-700'
        )}
        title={t('installationsPage.sort')}
      >
        {label}{' '}
        <ArrowUpDown
          className={cn(
            'h-3.5 w-3.5',
            active && dir === 'asc' && 'rotate-180'
          )}
        />
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
  tone?: 'gray' | 'blue' | 'sky' | 'amber' | 'emerald' | 'rose' | 'zinc';
}) {
  const tones: Record<string, string> = {
    gray: 'border-gray-200 bg-white text-gray-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    sky: 'border-sky-200 bg-sky-50 text-sky-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
    zinc: 'border-zinc-200 bg-zinc-50 text-zinc-700',
  };
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm',
        tones[tone],
        active && 'ring-2 ring-primary-200'
      )}
    >
      {icon}
      <span className="font-medium">{label}</span>
      <span className="rounded-full bg-white px-2 py-0.5 text-xs text-gray-700">
        {value}
      </span>
    </button>
  );
}
