// src/pages/manager/OrdersPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Filter,
  ArrowUpDown,
  Calendar as CalendarIcon,
  User2,
  Package,
  Store,
} from "lucide-react";

import { cn } from "../../lib/utils";
import { useAuthStore } from "../../stores/auth-simple";

// real API
import { listOrders, type Order } from "../../api/orders";
import { listStores, type Store as StoreType } from "../../api/stores";
import { useTranslation } from "react-i18next";

export default function OrdersPage() {
  const navigate = useNavigate();
  useAuthStore();
  const { t } = useTranslation("common");

  // 🔹 Local UI state
  // Default date range: last 1 month
  const todayISO = ymd();
  const oneMonthAgoDate = new Date();
  oneMonthAgoDate.setMonth(oneMonthAgoDate.getMonth() - 1);
  const oneMonthAgoISO = ymd(oneMonthAgoDate);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "pending" | "confirmed" | "cancelled">("all");
  const [store, setStore] = useState<string>("all");
  const [from, setFrom] = useState<string>(oneMonthAgoISO);
  const [to, setTo] = useState<string>(todayISO);


  const [sortBy, setSortBy] = useState<"placed_at" | "id" | "customer" | "store" | "items_count" | "status">("placed_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [page, setPage] = useState(1);
  const pageSize = 10;

  // 🔹 Data state
  const [orders, setOrders] = useState<Order[]>([]);
  const [stores, setStores] = useState<StoreType[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch places & store
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        const [storeRes, orderRes] = await Promise.all([
          listStores({ limit: 200 }),
          listOrders({ limit: 300 }),
        ]);

        setStores(storeRes.data ?? []);
        setOrders(orderRes.data ?? []);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Derived store dropdown
  const storeOptions = useMemo(() => {
    return stores.map((s) => ({
      id: s.id,
      label: s.name,
    }));
  }, [stores]);

  // Helpers
  const fmt = (iso: string | undefined) =>
    iso
      ? new Date(iso).toLocaleString([], {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-";

  // 🔹 Filter + search + store filter
  const filtered = useMemo(() => {
    let list = orders.slice();

    // Date filtering
    const fromD = new Date(from + "T00:00:00");
    const toD = new Date(to + "T23:59:59");

    list = list.filter((o) => {
      const dt = new Date(o.placed_at ?? o.created_at ?? "");
      return dt >= fromD && dt <= toD;
    });

    // Status filter
    if (status !== "all") list = list.filter((o) => o.status === status);

    // Store filter
    if (store !== "all") list = list.filter((o) => o.store_id === store);

    // Search query
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter(
        (o) =>
          o.id.toLowerCase().includes(s) ||
          o.customer_name?.toLowerCase().includes(s) ||
          o.store?.name?.toLowerCase().includes(s)
      );
    }

    // Sorting
    list.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortBy) {
        case "placed_at": {
          const A = a.placed_at ?? a.created_at ?? "";
          const B = b.placed_at ?? b.created_at ?? "";
          return dir * A.localeCompare(B);
        }
        case "id":
          return dir * a.id.localeCompare(b.id);
        case "customer":
          return dir * (a.customer_name ?? "").localeCompare(b.customer_name ?? "");
        case "store":
          return dir * (a.store?.name ?? "").localeCompare(b.store?.name ?? "");
        case "items_count":
          return dir * ((a.items_count ?? 0) - (b.items_count ?? 0));
        case "status":
          return dir * (statusRank(a.status as any) - statusRank(b.status as any));
      }
    });

    return list;
  }, [orders, q, status, store, from, to, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (k: typeof sortBy) => {
    if (sortBy === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortBy(k);
      setSortDir("asc");
    }
  };

  const openDetail = (id: string) => navigate(`/app/orders/${id}`);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          {t("ordersPage.title")}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {t("ordersPage.subtitle")}
        </p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border bg-white p-3 shadow-sm md:grid-cols-6">
        {/* Search */}
        <div className="md:col-span-2">
          <label className="text-xs text-gray-600 mb-1 block">
            {t("ordersPage.filters.searchLabel")}
          </label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <input
              className="input w-full pl-8"
              placeholder={t("ordersPage.filters.searchPlaceholder")}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {/* Status */}
        <FilterSelect
          label={t("ordersPage.filters.statusLabel")}
          icon={Filter}
          value={status}
          onChange={(v: string) => {
            setStatus(v as any);
            setPage(1);
          }}
          options={[
            { value: "all", label: t("ordersPage.filters.status.all") },
            { value: "pending", label: t("ordersPage.filters.status.pending") },
            { value: "confirmed", label: t("ordersPage.filters.status.confirmed") },
            { value: "cancelled", label: t("ordersPage.filters.status.cancelled") },
          ]}
        />

        {/* Store */}
        <FilterSelect
          label={t("ordersPage.filters.storeLabel")}
          icon={Store}
          value={store}
          onChange={(v: string) => {
            setStore(v);
            setPage(1);
          }}
          options={[
            { value: "all", label: t("ordersPage.filters.storeAll") },
            ...storeOptions.map((s) => ({ value: s.id, label: s.label })),
          ]}
        />

        {/* Dates */}
        <DateFilter
          label={t("ordersPage.filters.from")}
          value={from}
          onChange={setFrom}
        />
        <DateFilter
          label={t("ordersPage.filters.to")}
          value={to}
          onChange={setTo}
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-600">
            <tr>
              <Th
                label={t("ordersPage.table.placed")}
                active={sortBy === "placed_at"}
                dir={sortDir}
                onClick={() => toggleSort("placed_at")}
              />
              <Th
                label={t("ordersPage.table.order")}
                active={sortBy === "id"}
                dir={sortDir}
                onClick={() => toggleSort("id")}
              />
              <Th
                label={t("ordersPage.table.customer")}
                active={sortBy === "customer"}
                dir={sortDir}
                onClick={() => toggleSort("customer")}
              />
              <Th
                label={t("ordersPage.table.store")}
                active={sortBy === "store"}
                dir={sortDir}
                onClick={() => toggleSort("store")}
              />
              <Th
                label={t("ordersPage.table.items")}
                active={sortBy === "items_count"}
                dir={sortDir}
                onClick={() => toggleSort("items_count")}
              />
              <Th
                label={t("ordersPage.table.status")}
                active={sortBy === "status"}
                dir={sortDir}
                onClick={() => toggleSort("status")}
              />
              <th className="w-24 px-3 py-2"></th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-500">
                  {t("ordersPage.loading")}
                </td>
              </tr>
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                  {t("ordersPage.noResults")}
                </td>
              </tr>
            ) : (
              paged.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {fmt(o.placed_at ?? o.created_at)}
                    </div>
                  </td>

                  <td className="px-3 py-2">
                    <div className="font-medium">{o.id}</div>
                  </td>

                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <User2 className="h-4 w-4 text-gray-400" />
                      <span>{o.customer_name ?? "-"}</span>
                    </div>
                  </td>

                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-gray-400" />
                      <span>{o.store?.name ?? "-"}</span>
                    </div>
                  </td>

                  <td className="px-3 py-2">
                    <div className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px]">
                      <Package className="h-3.5 w-3.5" />
                      {o.items_count ?? 0}
                    </div>
                  </td>

                  <td className="px-3 py-2">
                    <StatusPill status={o.status as any} />
                  </td>

                  <td className="px-3 py-2 text-right">
                    <button
                      className="text-primary-600 hover:text-primary-800"
                      onClick={() => openDetail(o.id)}
                    >
                      {t("ordersPage.actions.view")}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t p-3 text-sm">
          <div className="text-gray-600">
            {t("ordersPage.pagination.showing")} <b>{paged.length}</b>{" "}
            {t("ordersPage.pagination.of")} <b>{filtered.length}</b>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className={cn(
                "rounded-md border px-3 py-1.5",
                page === 1 && "opacity-50"
              )}
            >
              {t("ordersPage.pagination.prev")}
            </button>
            <div>
              {t("ordersPage.pagination.page")} <b>{page}</b> / {totalPages}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className={cn(
                "rounded-md border px-3 py-1.5",
                page === totalPages && "opacity-50"
              )}
            >
              {t("ordersPage.pagination.next")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------ Helpers & small components ------------------------ */

function ymd(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function statusRank(s: "pending" | "confirmed" | "cancelled") {
  return ["pending", "confirmed", "cancelled"].indexOf(s);
}

function StatusPill({ status }: { status: "pending" | "confirmed" | "cancelled" }) {
  const { t } = useTranslation("common");

  const styles: Record<string, string> = {
    pending: "border-amber-200 bg-amber-50 text-amber-700",
    confirmed: "border-emerald-200 bg-emerald-50 text-emerald-700",
    cancelled: "border-rose-200 bg-rose-50 text-rose-700",
  };

  const labelMap: Record<"pending" | "confirmed" | "cancelled", string> = {
    pending: t("ordersPage.status.pending"),
    confirmed: t("ordersPage.status.confirmed"),
    cancelled: t("ordersPage.status.cancelled"),
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
        styles[status]
      )}
    >
      {labelMap[status]}
    </span>
  );
}

function FilterSelect({ label, icon: Icon, value, onChange, options }: any) {
  return (
    <div>
      <label className="text-xs text-gray-600 mb-1 block">{label}</label>
      <div className="relative">
        <Icon className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
        <select
          className="input w-full pl-8"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((o: any) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function DateFilter({ label, value, onChange }: any) {
  return (
    <div>
      <label className="text-xs text-gray-600 mb-1 block">{label}</label>
      <div className="relative">
        <CalendarIcon className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
        <input
          type="date"
          className="input w-full pl-8"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

function Th({ label, onClick, active, dir }: any) {
  return (
    <th className="px-3 py-2 text-left font-semibold text-gray-700">
      <button
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 px-1.5 py-0.5 hover:bg-gray-100",
          active && "text-primary-700"
        )}
      >
        {label}
        <ArrowUpDown
          className={cn(
            "h-3.5 w-3.5",
            active && dir === "asc" && "rotate-180"
          )}
        />
      </button>
    </th>
  );
}
