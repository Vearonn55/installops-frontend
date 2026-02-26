// src/pages/admin/AdminDashboard.tsx
import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import {
  Package,
  Users,
  Calendar as CalendarIcon,
  TrendingUp,
  CheckCircle,
  XCircle,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Wrench,  
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import {
  listInstallations,
  type Installation,
  type InstallStatus,
} from '../../api/installations';
import { listStores, type Store } from '../../api/stores';
import { apiGet } from '../../api/http';

/* ---------- Types for metrics / filters ---------- */

type PeriodMetrics = {
  success: number;
  total: number;
  prevSuccess: number;
  prevTotal: number;
};

type StoreId = 'ALL' | string;

type StoreMetricsRaw = {
  weekly: Record<StoreId, PeriodMetrics>;
  monthly: Record<StoreId, PeriodMetrics>;
};

type StoreOption = {
  id: StoreId;
  label: string;
};

/* ---------- Audit log types (from OpenAPI) ---------- */

type AuditLog = {
  id: number;
  actor_id: string;
  action: string;
  entity: string;
  entity_id: string;
  created_at: string;
  // we ignore other fields for now
};

type AuditLogList = {
  data: AuditLog[];
  total: number;
  limit: number;
  offset: number;
};

/* ---------------------- Date helpers ---------------------- */

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const dow = x.getDay() || 7; // Sunday -> 7
  const diff = dow - 1; // Monday=1
  x.setDate(x.getDate() - diff);
  return x;
}
function endOfWeek(d: Date) {
  const x = startOfWeek(d);
  x.setDate(x.getDate() + 6);
  return endOfDay(x);
}
function startOfMonth(d: Date) {
  return startOfDay(new Date(d.getFullYear(), d.getMonth(), 1));
}
function endOfMonth(d: Date) {
  return endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}
function inRange(dt: Date, from: Date, to: Date) {
  return dt >= from && dt <= to;
}

/* -------------------- KPI compute helpers -------------------- */

function pct(n: number) {
  return Math.round(n * 100);
}
function safeRate(success: number, total: number) {
  return total > 0 ? success / total : 0;
}
function kpiFrom(metrics: PeriodMetrics) {
  const rateNow = safeRate(metrics.success, metrics.total);
  const ratePrev = safeRate(metrics.prevSuccess, metrics.prevTotal);
  const delta = rateNow - ratePrev;
  return {
    successCount: metrics.success,
    totalCount: metrics.total,
    ratePct: pct(rateNow),
    deltaPctPoints: Math.round(delta * 1000) / 10,
    isUp: delta >= 0,
  };
}

const EMPTY_METRICS: PeriodMetrics = {
  success: 0,
  total: 0,
  prevSuccess: 0,
  prevTotal: 0,
};

function ensureMetrics(
  bucket: Record<StoreId, PeriodMetrics>,
  key: StoreId
): PeriodMetrics {
  if (!bucket[key]) {
    bucket[key] = { ...EMPTY_METRICS };
  }
  return bucket[key];
}

function isSuccessStatus(status: InstallStatus | string) {
  return status === 'completed';
}

/** Build metrics per store (and ALL) from installations list */
function computeStoreMetrics(installations?: Installation[]): StoreMetricsRaw {
  const result: StoreMetricsRaw = {
    weekly: {},
    monthly: {},
  };

  if (!installations || installations.length === 0) return result;

  const now = new Date();

  // Weekly ranges
  const thisWeekStart = startOfWeek(now);
  const thisWeekEnd = endOfWeek(now);
  const prevWeekEnd = new Date(thisWeekStart);
  prevWeekEnd.setMilliseconds(prevWeekEnd.getMilliseconds() - 1);
  const prevWeekStart = startOfWeek(
    new Date(prevWeekEnd.getFullYear(), prevWeekEnd.getMonth(), prevWeekEnd.getDate())
  );

  // Monthly ranges
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const prevMonthEnd = new Date(thisMonthStart);
  prevMonthEnd.setMilliseconds(prevMonthEnd.getMilliseconds() - 1);
  const prevMonthStart = startOfMonth(
    new Date(prevMonthEnd.getFullYear(), prevMonthEnd.getMonth(), prevMonthEnd.getDate())
  );

  for (const inst of installations) {
    if (!inst.scheduled_start) continue;
    const scheduleDt = new Date(inst.scheduled_start);
    const storeId: StoreId = inst.store_id;
    const completed = isSuccessStatus(inst.status);

    // Weekly
    if (inRange(scheduleDt, thisWeekStart, thisWeekEnd)) {
      const mStore = ensureMetrics(result.weekly, storeId);
      const mAll = ensureMetrics(result.weekly, 'ALL');
      mStore.total += 1;
      mAll.total += 1;
      if (completed) {
        mStore.success += 1;
        mAll.success += 1;
      }
    } else if (inRange(scheduleDt, prevWeekStart, prevWeekEnd)) {
      const mStore = ensureMetrics(result.weekly, storeId);
      const mAll = ensureMetrics(result.weekly, 'ALL');
      mStore.prevTotal += 1;
      mAll.prevTotal += 1;
      if (completed) {
        mStore.prevSuccess += 1;
        mAll.prevSuccess += 1;
      }
    }

    // Monthly
    if (inRange(scheduleDt, thisMonthStart, thisMonthEnd)) {
      const mStore = ensureMetrics(result.monthly, storeId);
      const mAll = ensureMetrics(result.monthly, 'ALL');
      mStore.total += 1;
      mAll.total += 1;
      if (completed) {
        mStore.success += 1;
        mAll.success += 1;
      }
    } else if (inRange(scheduleDt, prevMonthStart, prevMonthEnd)) {
      const mStore = ensureMetrics(result.monthly, storeId);
      const mAll = ensureMetrics(result.monthly, 'ALL');
      mStore.prevTotal += 1;
      mAll.prevTotal += 1;
      if (completed) {
        mStore.prevSuccess += 1;
        mAll.prevSuccess += 1;
      }
    }
  }

  return result;
}

/* ---------------- Recent activity from audit logs ---------------- */

type Activity = {
  id: number;
  title: string;
  subtitle: string;
  time: string;
  storeLabel: string | null;
  icon: JSX.Element;
  iconBgClass: string;
};

function buildActivityIcon(log: AuditLog): {
  icon: JSX.Element;
  iconBgClass: string;
} {
  // specific mapping for installation-related actions
  if (log.entity === 'installation') {
    switch (log.action) {
      case 'installation.create':
        return {
          icon: <Package className="h-4 w-4 text-blue-600" />,
          iconBgClass: 'bg-blue-100',
        };
      case 'installation.update':
        return {
          icon: <Wrench className="h-4 w-4 text-indigo-600" />,
          iconBgClass: 'bg-indigo-100',
        };
      case 'installation.update_status': // shows as "installation.update status" in UI
        return {
          icon: <Wrench className="h-4 w-4 text-amber-600" />,
          iconBgClass: 'bg-amber-100',
        };
      default:
        break;
    }
  }

  // very lightweight heuristic based on action / entity (keep your existing code)
  const a = log.action.toLowerCase();
  if (a.includes('completed') || a.includes('success')) {
    return {
      icon: <CheckCircle className="h-4 w-4 text-green-600" />,
      iconBgClass: 'bg-green-100',
    };
  }
  if (a.includes('failed') || a.includes('error')) {
    return {
      icon: <XCircle className="h-4 w-4 text-red-600" />,
      iconBgClass: 'bg-red-100',
    };
  }
  if (a.includes('schedule')) {
    return {
      icon: <CalendarIcon className="h-4 w-4 text-amber-600" />,
      iconBgClass: 'bg-amber-100',
    };
  }
  if (a.includes('warning') || a.includes('alert')) {
    return {
      icon: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
      iconBgClass: 'bg-yellow-100',
    };
  }
  return {
    icon: <Package className="h-4 w-4 text-blue-600" />,
    iconBgClass: 'bg-blue-100',
  };
}


/* --------------------------- Component --------------------------- */

export default function AdminDashboard() {
  const [selectedStoreId, setSelectedStoreId] = useState<StoreId>('ALL');
  const { t } = useTranslation();

  // Load installations (for metrics)
  const installationsQuery = useQuery({
    queryKey: ['admin-dashboard', 'installations'],
    queryFn: async () => {
      const res = await listInstallations({ limit: 1000, offset: 0 });
      return res.data as Installation[];
    },
  });

  // Load stores for dropdown + activity mapping
  const storesQuery = useQuery({
    queryKey: ['admin-dashboard', 'stores'],
    queryFn: async () => {
      const res = await listStores({ limit: 200, offset: 0 });
      return res.data as Store[];
    },
  });

  // Load audit logs for recent activity (real data, no mocks)
  const auditLogsQuery = useQuery({
    queryKey: ['admin-dashboard', 'audit-logs'],
    queryFn: async () =>
      apiGet<AuditLogList>('/audit-logs', {
        params: { limit: 20, offset: 0 },
      }),
  });

  const storeOptions: StoreOption[] = useMemo(() => {
    const opts: StoreOption[] = [{ id: 'ALL', label: t('adminDashboard.allStores') }];
    if (storesQuery.data) {
      for (const s of storesQuery.data) {
        opts.push({ id: s.id, label: s.name });
      }
    }
    return opts;
  }, [storesQuery.data, t]);

  const metrics = useMemo(
    () => computeStoreMetrics(installationsQuery.data),
    [installationsQuery.data]
  );

  const monthlyKpi = useMemo(() => {
    const m =
      metrics.monthly[selectedStoreId] ??
      (selectedStoreId === 'ALL'
        ? metrics.monthly['ALL']
        : EMPTY_METRICS) ??
      EMPTY_METRICS;
    return kpiFrom(m);
  }, [metrics.monthly, selectedStoreId]);

  const weeklyKpi = useMemo(() => {
    const m =
      metrics.weekly[selectedStoreId] ??
      (selectedStoreId === 'ALL'
        ? metrics.weekly['ALL']
        : EMPTY_METRICS) ??
      EMPTY_METRICS;
    return kpiFrom(m);
  }, [metrics.weekly, selectedStoreId]);

  // Map store_id -> store name for activities
  const storeNameById = useMemo(() => {
    const m = new Map<string, string>();
    if (storesQuery.data) {
      for (const s of storesQuery.data) {
        m.set(s.id, s.name);
      }
    }
    return m;
  }, [storesQuery.data]);

  const installationById = useMemo(() => {
    const m = new Map<string, Installation>();
    if (installationsQuery.data) {
      for (const inst of installationsQuery.data) {
        m.set(inst.id, inst);
      }
    }
    return m;
  }, [installationsQuery.data]);

  const activities: Activity[] = useMemo(() => {
    const logs = auditLogsQuery.data?.data ?? [];

    // ONLY show activities related to installations
    return logs
      .filter((log) => log.entity === 'installation')
      .map((log) => {
        const inst =
          log.entity === 'installation'
            ? installationById.get(log.entity_id)
            : undefined;
        const storeLabel = inst
          ? storeNameById.get(inst.store_id) ?? null
          : null;

        const { icon, iconBgClass } = buildActivityIcon(log);

        const title = log.action.replace(/_/g, ' ');
        const subtitleParts: string[] = [];
        if (log.entity) subtitleParts.push(`${log.entity} #${log.entity_id}`);
        if (storeLabel) subtitleParts.push(storeLabel);

        return {
          id: log.id,
          title,
          subtitle: subtitleParts.join(' • '),
          time: new Date(log.created_at).toLocaleString(),
          storeLabel,
          icon,
          iconBgClass,
        };
      });
  }, [auditLogsQuery.data, installationById, storeNameById]);

  const filteredActivities = useMemo(
    () =>
      selectedStoreId === 'ALL'
        ? activities
        : activities.filter(
            (a) =>
              a.storeLabel &&
              storeOptions.find(
                (o) => o.id === selectedStoreId && o.label === a.storeLabel
              )
          ),
    [activities, selectedStoreId, storeOptions]
  );

  return (
    <div className="space-y-6">
      {/* Header + Store Filter */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('pages.adminDashboard')}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('adminDashboard.subtitle')}
          </p>
          {(installationsQuery.isLoading ||
            storesQuery.isLoading ||
            auditLogsQuery.isLoading) && (
            <p className="mt-1 text-xs text-gray-400">
              {t('adminDashboard.loading')}
            </p>
          )}
          {(installationsQuery.isError ||
            storesQuery.isError ||
            auditLogsQuery.isError) && (
            <p className="mt-1 text-xs text-red-500">
              {t('adminDashboard.loadError')}
            </p>
          )}
        </div>

        {/* Store dropdown */}
        <div className="flex items-center gap-2">
          <label htmlFor="storeFilter" className="text-sm text-gray-600">
            {t('adminDashboard.storeLabel')}
          </label>
          <select
            id="storeFilter"
            value={selectedStoreId}
            onChange={(e) => setSelectedStoreId(e.target.value as StoreId)}
            className="block rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {storeOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ===== KPI Cards Row (live) ===== */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Monthly Success */}
        <div className="card shadow-sm hover:shadow-md transition-shadow">
          <div className="card-content py-6 px-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900 tracking-tight mb-3">
                  {t('adminDashboard.monthlyTitle')}
                </h3>
                <div className="flex items-end gap-3">
                  <div className="text-4xl font-extrabold text-gray-900 leading-none">
                    {monthlyKpi.successCount}
                  </div>
                  <div className="text-base text-gray-500 mb-1">
                    {t('adminDashboard.successfulInstallations')}{' '}
                    <span className="hidden sm:inline">•</span> {t('adminDashboard.of')}{' '}
                    {monthlyKpi.totalCount}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="flex items-center justify-end gap-3 mb-1">
                  <div className="text-3xl font-bold text-gray-900">
                    {monthlyKpi.ratePct}%
                  </div>
                  <div
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium ${
                      monthlyKpi.isUp
                        ? 'text-green-700 bg-green-100'
                        : 'text-red-700 bg-red-100'
                    }`}
                    title={t('adminDashboard.changeVsLastMonth')}
                  >
                    {monthlyKpi.isUp ? (
                      <ArrowUpRight className="h-4 w-4 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 mr-1" />
                    )}
                    {monthlyKpi.deltaPctPoints}%
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {t('adminDashboard.vsLastMonth')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Success */}
        <div className="card shadow-sm hover:shadow-md transition-shadow">
          <div className="card-content py-6 px-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900 tracking-tight mb-3">
                  {t('adminDashboard.weeklyTitle')}
                </h3>
                <div className="flex items-end gap-3">
                  <div className="text-4xl font-extrabold text-gray-900 leading-none">
                    {weeklyKpi.successCount}
                  </div>
                  <div className="text-base text-gray-500 mb-1">
                    {t('adminDashboard.successfulInstallations')}{' '}
                    <span className="hidden sm:inline">•</span> {t('adminDashboard.of')}{' '}
                    {weeklyKpi.totalCount}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="flex items-center justify-end gap-3 mb-1">
                  <div className="text-3xl font-bold text-gray-900">
                    {weeklyKpi.ratePct}%
                  </div>
                  <div
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium ${
                      weeklyKpi.isUp
                        ? 'text-green-700 bg-green-100'
                        : 'text-red-700 bg-red-100'
                    }`}
                    title={t('adminDashboard.changeVsLastWeek')}
                  >
                    {weeklyKpi.isUp ? (
                      <ArrowUpRight className="h-4 w-4 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 mr-1" />
                    )}
                    {weeklyKpi.deltaPctPoints}%
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {t('adminDashboard.vsLastWeek')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity (from audit logs) */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            {t('adminDashboard.recentActivityTitle')}
          </h3>
          <p className="card-description">
            {t('adminDashboard.recentActivityDescription')}
          </p>
        </div>
        <div className="card-content">
          {/* Added max height + scrollbar here */}
          <div className="flow-root max-h-80 overflow-y-auto pr-2">
            <ul className="-mb-8">
              {filteredActivities.map((activity, idx) => (
                <li key={activity.id}>
                  <div className="relative pb-8">
                    {idx !== filteredActivities.length - 1 ? (
                      <span
                        className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                        aria-hidden="true"
                      />
                    ) : null}
                    <div className="relative flex space-x-3">
                      <div>
                        <span
                          className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${activity.iconBgClass}`}
                        >
                          {activity.icon}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm text-gray-900 font-medium">
                            {activity.title}
                          </p>
                          {activity.subtitle && (
                            <p className="mt-0.5 text-xs text-gray-500">
                              {activity.subtitle}
                            </p>
                          )}
                        </div>
                        <div className="text-right text-xs whitespace-nowrap text-gray-500">
                          {activity.time}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}

              {filteredActivities.length === 0 && (
                <li className="py-6 text-sm text-gray-500">
                  {t('adminDashboard.noRecentActivity')}
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <a
          href="/app/orders"
          className="card hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="card-content text-center">
            <ShoppingCart className="h-8 w-8 text-primary-600 mx-auto mb-2" />
            <h3 className="text-sm font-medium text-gray-900">
              {t('adminDashboard.quickViewOrdersTitle')}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {t('adminDashboard.quickViewOrdersSubtitle')}
            </p>
          </div>
        </a>

        <a
          href="/app/installations"
          className="card hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="card-content text-center">
            <Package className="h-8 w-8 text-primary-600 mx-auto mb-2" />
            <h3 className="text-sm font-medium text-gray-900">
              {t('adminDashboard.quickViewInstallationsTitle')}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {t('adminDashboard.quickViewInstallationsSubtitle')}
            </p>
          </div>
        </a>

        <a
          href="/app/admin/users"
          className="card hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="card-content text-center">
            <Users className="h-8 w-8 text-primary-600 mx-auto mb-2" />
            <h3 className="text-sm font-medium text-gray-900">
              {t('adminDashboard.quickManageUsersTitle')}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {t('adminDashboard.quickManageUsersSubtitle')}
            </p>
          </div>
        </a>

        <a
          href="/app/admin/reports"
          className="card hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="card-content text-center">
            <TrendingUp className="h-8 w-8 text-primary-600 mx-auto mb-2" />
            <h3 className="text-sm font-medium text-gray-900">
              {t('adminDashboard.quickViewReportsTitle')}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {t('adminDashboard.quickViewReportsSubtitle')}
            </p>
          </div>
        </a>
      </div>
    </div>
  );
}
