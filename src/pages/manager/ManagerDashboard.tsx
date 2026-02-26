// src/pages/manager/ManagerDashboard.tsx
import type { JSX } from 'react';
import { useMemo } from 'react';
import {
  Package,
  Calendar as CalendarIcon,
  CheckCircle,
  XCircle,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import {
  listInstallations,
  type Installation,
  type InstallStatus,
} from '../../api/installations';
import { listStores, type Store as ApiStore } from '../../api/stores';
import { apiGet } from '../../api/http';

/* ---------- Period metrics & KPI helpers ---------- */

type PeriodMetrics = {
  success: number;
  total: number;
  prevSuccess: number;
  prevTotal: number;
};

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
    deltaPct: Math.round(delta * 1000) / 10,
    isUp: delta >= 0,
  };
}

const EMPTY_METRICS: PeriodMetrics = {
  success: 0,
  total: 0,
  prevSuccess: 0,
  prevTotal: 0,
};

/* ---------- Date helpers (same logic as admin) ---------- */

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

/* ---------- Installation metrics by store ---------- */

type StoreId = string;

function isSuccessStatus(status: InstallStatus | string) {
  return status === 'completed';
}

type StoreMetricsRaw = {
  weekly: Record<StoreId, PeriodMetrics>;
  monthly: Record<StoreId, PeriodMetrics>;
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

function computeStoreMetrics(
  installations?: Installation[]
): StoreMetricsRaw {
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
    new Date(
      prevWeekEnd.getFullYear(),
      prevWeekEnd.getMonth(),
      prevWeekEnd.getDate()
    )
  );

  // Monthly ranges
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const prevMonthEnd = new Date(thisMonthStart);
  prevMonthEnd.setMilliseconds(prevMonthEnd.getMilliseconds() - 1);
  const prevMonthStart = startOfMonth(
    new Date(
      prevMonthEnd.getFullYear(),
      prevMonthEnd.getMonth(),
      prevMonthEnd.getDate()
    )
  );

  for (const inst of installations) {
    if (!inst.scheduled_start) continue;
    const scheduleDt = new Date(inst.scheduled_start);
    const storeId: StoreId = inst.store_id;
    const completed = isSuccessStatus(inst.status);

    // Weekly
    if (inRange(scheduleDt, thisWeekStart, thisWeekEnd)) {
      const mStore = ensureMetrics(result.weekly, storeId);
      mStore.total += 1;
      if (completed) mStore.success += 1;
    } else if (inRange(scheduleDt, prevWeekStart, prevWeekEnd)) {
      const mStore = ensureMetrics(result.weekly, storeId);
      mStore.prevTotal += 1;
      if (completed) mStore.prevSuccess += 1;
    }

    // Monthly
    if (inRange(scheduleDt, thisMonthStart, thisMonthEnd)) {
      const mStore = ensureMetrics(result.monthly, storeId);
      mStore.total += 1;
      if (completed) mStore.success += 1;
    } else if (inRange(scheduleDt, prevMonthStart, prevMonthEnd)) {
      const mStore = ensureMetrics(result.monthly, storeId);
      mStore.prevTotal += 1;
      if (completed) mStore.prevSuccess += 1;
    }
  }

  return result;
}

/* ---------- Audit log → activity mapping ---------- */

type AuditLog = {
  id: number;
  actor_id: string;
  action: string;
  entity: string;
  entity_id: string;
  created_at: string;
};

type AuditLogList = {
  data: AuditLog[];
  total: number;
  limit: number;
  offset: number;
};

type Activity = {
  id: number;
  title: string;
  subtitle: string;
  time: string;
  iconBgClass: string;
  icon: JSX.Element;
  storeId: string | null;
};

function buildActivityIcon(log: AuditLog): {
  icon: JSX.Element;
  iconBgClass: string;
} {
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

/* ===================== COMPONENT ===================== */

export default function ManagerDashboard() {
  // 1) Load installations visible to the manager (backend should scope by store)
  const installationsQuery = useQuery({
    queryKey: ['manager-dashboard', 'installations'],
    queryFn: async () => {
      const res = await listInstallations({ limit: 1000, offset: 0 });
      return res.data as Installation[];
    },
  });

  // 2) Load stores (to resolve store name)
  const storesQuery = useQuery({
    queryKey: ['manager-dashboard', 'stores'],
    queryFn: async () => {
      const res = await listStores({ limit: 200, offset: 0 });
      return res.data as ApiStore[];
    },
  });

  // 3) Load audit logs (backend should already restrict to this manager's domain)
  const auditLogsQuery = useQuery({
    queryKey: ['manager-dashboard', 'audit-logs'],
    queryFn: async () =>
      apiGet<AuditLogList>('/audit-logs', {
        params: { limit: 20, offset: 0 },
      }),
  });

  // Map store_id → store name
  const storeNameById = useMemo(() => {
    const m = new Map<string, string>();
    if (storesQuery.data) {
      for (const s of storesQuery.data) {
        m.set(s.id, s.name);
      }
    }
    return m;
  }, [storesQuery.data]);

  // Determine manager's primary store:
  //  - If only one store exists, use that
  //  - Else use store_id from the first installation
  const primaryStoreId: string | null = useMemo(() => {
    if (storesQuery.data && storesQuery.data.length === 1) {
      return storesQuery.data[0].id;
    }
    if (installationsQuery.data && installationsQuery.data.length > 0) {
      return installationsQuery.data[0].store_id;
    }
    return null;
  }, [storesQuery.data, installationsQuery.data]);

  const primaryStoreName =
    (primaryStoreId && storeNameById.get(primaryStoreId)) ||
    'Your store';

  // Metrics per store
  const storeMetrics = useMemo(
    () => computeStoreMetrics(installationsQuery.data),
    [installationsQuery.data]
  );

  const monthlyKpi = useMemo(() => {
    if (!primaryStoreId) return kpiFrom(EMPTY_METRICS);
    const metricsForStore =
      storeMetrics.monthly[primaryStoreId] ?? EMPTY_METRICS;
    return kpiFrom(metricsForStore);
  }, [storeMetrics.monthly, primaryStoreId]);

  const weeklyKpi = useMemo(() => {
    if (!primaryStoreId) return kpiFrom(EMPTY_METRICS);
    const metricsForStore =
      storeMetrics.weekly[primaryStoreId] ?? EMPTY_METRICS;
    return kpiFrom(metricsForStore);
  }, [storeMetrics.weekly, primaryStoreId]);

  // Installation lookup for audit log → store mapping
  const installationById = useMemo(() => {
    const m = new Map<string, Installation>();
    if (installationsQuery.data) {
      for (const inst of installationsQuery.data) {
        m.set(inst.id, inst);
      }
    }
    return m;
  }, [installationsQuery.data]);

  // Activities: audit logs filtered to this manager's store
  const activities: Activity[] = useMemo(() => {
    const logs = auditLogsQuery.data?.data ?? [];
    return logs
      .map((log) => {
        const inst =
          log.entity === 'installation'
            ? installationById.get(log.entity_id)
            : undefined;
        const storeId = inst?.store_id ?? null;

        const { icon, iconBgClass } = buildActivityIcon(log);
        const title = log.action.replace(/_/g, ' ');
        const subtitleParts: string[] = [];
        if (log.entity) subtitleParts.push(`${log.entity} #${log.entity_id}`);
        if (storeId && storeNameById.get(storeId)) {
          subtitleParts.push(storeNameById.get(storeId)!);
        }

        return {
          id: log.id,
          title,
          subtitle: subtitleParts.join(' • '),
          time: new Date(log.created_at).toLocaleString(),
          icon,
          iconBgClass,
          storeId,
        };
      })
      .filter((a) => {
        // If we know manager's store, only show activity for that store
        if (!primaryStoreId) return true;
        return a.storeId === primaryStoreId;
      });
  }, [
    auditLogsQuery.data,
    installationById,
    storeNameById,
    primaryStoreId,
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Manager Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Overview of {primaryStoreName} installation operations
          </p>

          {(installationsQuery.isLoading ||
            storesQuery.isLoading ||
            auditLogsQuery.isLoading) && (
            <p className="mt-1 text-xs text-gray-400">Loading live data…</p>
          )}
          {(installationsQuery.isError ||
            storesQuery.isError ||
            auditLogsQuery.isError) && (
            <p className="mt-1 text-xs text-red-500">
              Failed to load some data from the API.
            </p>
          )}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Monthly */}
        <div className="card shadow-sm hover:shadow-md transition-shadow">
          <div className="card-content py-6 px-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900 tracking-tight mb-3">
                  Monthly Installations
                </h3>
                <div className="flex items-end gap-3">
                  <div className="text-4xl font-extrabold text-gray-900 leading-none">
                    {monthlyKpi.successCount}
                  </div>
                  <div className="text-base text-gray-500 mb-1">
                    successful installations{' '}
                    <span className="hidden sm:inline">•</span> of{' '}
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
                    title="Change vs last month (percentage)"
                  >
                    {monthlyKpi.isUp ? (
                      <ArrowUpRight className="h-4 w-4 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 mr-1" />
                    )}
                    {monthlyKpi.deltaPct}%
                  </div>
                </div>
                <div className="text-sm text-gray-500">vs last month</div>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly */}
        <div className="card shadow-sm hover:shadow-md transition-shadow">
          <div className="card-content py-6 px-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900 tracking-tight mb-3">
                  Weekly Installations
                </h3>
                <div className="flex items-end gap-3">
                  <div className="text-4xl font-extrabold text-gray-900 leading-none">
                    {weeklyKpi.successCount}
                  </div>
                  <div className="text-base text-gray-500 mb-1">
                    successful installations{' '}
                    <span className="hidden sm:inline">•</span> of{' '}
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
                    title="Change vs last week (percentage)"
                  >
                    {weeklyKpi.isUp ? (
                      <ArrowUpRight className="h-4 w-4 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 mr-1" />
                    )}
                    {weeklyKpi.deltaPct}%
                  </div>
                </div>
                <div className="text-sm text-gray-500">vs last week</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity (live from audit logs) */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Activity</h3>
          <p className="card-description">
            Latest updates from your installation operations
          </p>
        </div>
        <div className="card-content">
          <div className="flow-root">
            <ul className="-mb-8">
              {activities.map((activity, idx) => (
                <li key={activity.id}>
                  <div className="relative pb-8">
                    {idx !== activities.length - 1 ? (
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
                        <div className="text-right text-sm whitespace-nowrap text-gray-500">
                          {activity.time}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}

              {activities.length === 0 && (
                <li className="py-6 text-sm text-gray-500">
                  No recent activity for this store.
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-2">
        <a
          href="/app/orders"
          className="card hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="card-content text-center">
            <ShoppingCart className="h-8 w-8 text-primary-600 mx-auto mb-2" />
            <h3 className="text-sm font-medium text-gray-900">View Orders</h3>
            <p className="text-xs text-gray-500 mt-1">
              Manage and track orders
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
              View Installations
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Manage all installations
            </p>
          </div>
        </a>
      </div>
    </div>
  );
}
