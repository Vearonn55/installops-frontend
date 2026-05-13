// src/pages/manager/OrdersPage.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { formatUiDateTime } from "../../lib/date-display";
import { defaultDateRangeOrdersList, parseOrderDate } from "../../lib/date-range";
// real API
import { listOrders, type Order } from "../../api/orders";
import { listStores, type Store as StoreType } from "../../api/stores";
import { searchNetsisOrders, type NetsisOrderHit } from "../../api/integrations";
import type { UUID } from "../../api/http";
import { isAxiosError } from "../../api/http";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../stores/auth";
import { useManagerStoreId } from "../../hooks/use-manager-store-id";
import { inferManagerStoreId } from "../../lib/manager-store";
import { textMatchesSearch, netsisApiSearchQ } from "../../lib/search-text";

const NETSIS_PAGE_SIZE = 50;

type StoreFetchCursor = { offset: number; lastPageFull: boolean };

export default function OrdersPage() {
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const user = useAuthStore((s) => s.user);
  const isAdmin = useAuthStore((s) => s.hasRole("ADMIN"));

  // 🔹 Local UI state — date range includes past orders (placed_at = installation created_at)
  const ordersRangeDefault = useMemo(() => defaultDateRangeOrdersList(), []);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "pending" | "confirmed" | "cancelled">("all");
  const [store, setStore] = useState<string>("all");
  const [from, setFrom] = useState<string>(ordersRangeDefault.from);
  const [to, setTo] = useState<string>(ordersRangeDefault.to);

  const setFromClamped = (val: string) => {
    setFrom(val);
    if (to && val > to) setTo(val);
    setPage(1);
    setNetsisDateFilterActive(true);
  };
  const setToClamped = (val: string) => {
    setTo(val);
    if (from && val < from) setFrom(val);
    setPage(1);
    setNetsisDateFilterActive(true);
  };


  const [sortBy, setSortBy] = useState<"placed_at" | "id" | "customer" | "store" | "items_count" | "status">("placed_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [page, setPage] = useState(1);
  const pageSize = 10;

  // 🔹 Data state
  const [orders, setOrders] = useState<Order[]>([]);
  const [stores, setStores] = useState<StoreType[]>([]);
  const [ordersSource, setOrdersSource] = useState<"installations" | "netsis">("installations");
  const [loading, setLoading] = useState(true);
  const [ordersFetchError, setOrdersFetchError] = useState<string | null>(null);
  const [debouncedFilterQ, setDebouncedFilterQ] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [netsisCursors, setNetsisCursors] = useState<Record<string, StoreFetchCursor>>({});
  /** Netsis ItemSlips are not date-scoped at the API; only filter by date after the user changes pickers. */
  const [netsisDateFilterActive, setNetsisDateFilterActive] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedFilterQ(q.trim()), 400);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setPage(1);
  }, [store, debouncedFilterQ, from, to, status]);

  const managerStoreId = useManagerStoreId(stores);

  const netsisApiQ = useMemo(() => netsisApiSearchQ(debouncedFilterQ), [debouncedFilterQ]);

  const ordersFetchKey = useMemo(() => {
    const effectiveStoreId =
      isAdmin && store !== "all" ? store : !isAdmin ? managerStoreId : store !== "all" ? store : null;
    const sel = effectiveStoreId ? stores.find((s) => s.id === effectiveStoreId) : null;
    const netsisStores = stores.filter(storeUsesNetsisItemSlipsList);
    const useNetsis =
      (isAdmin && store === "all" && netsisStores.length > 0) ||
      Boolean(sel && storeUsesNetsisItemSlipsList(sel));
    const searchPart = useNetsis ? netsisApiQ : debouncedFilterQ;
    return `${store}:${effectiveStoreId ?? "all"}:${searchPart}`;
  }, [store, stores, isAdmin, managerStoreId, netsisApiQ, debouncedFilterQ]);

  useEffect(() => {
    if (!isAdmin && managerStoreId && store === "all") {
      setStore(managerStoreId);
    }
  }, [isAdmin, managerStoreId, store]);

  const fetchNetsisForStores = useCallback(
    async (
      targetStores: StoreType[],
      q: string,
      offsets: Record<string, number>
    ): Promise<{
      orders: Order[];
      cursors: Record<string, StoreFetchCursor>;
      hasMore: boolean;
    }> => {
      const results = await Promise.allSettled(
        targetStores.map(async (s) => {
          const res = await searchNetsisOrders({
            store_id: s.id as UUID,
            ...(q ? { q } : {}),
            limit: NETSIS_PAGE_SIZE,
            offset: offsets[s.id] ?? 0,
          });
          return { store: s, hits: res.data ?? [] };
        })
      );

      const nextOrders: Order[] = [];
      const nextCursors: Record<string, StoreFetchCursor> = {};
      let anyFull = false;

      for (const r of results) {
        if (r.status !== "fulfilled") continue;
        const { store: st, hits } = r.value;
        const full = hits.length >= NETSIS_PAGE_SIZE;
        if (full) anyFull = true;
        nextCursors[st.id] = {
          offset: offsets[st.id] ?? 0,
          lastPageFull: full,
        };
        nextOrders.push(...netsisHitsToOrders(hits, st));
      }

      return {
        orders: dedupeOrders(nextOrders),
        cursors: nextCursors,
        hasMore: anyFull,
      };
    },
    []
  );

  // Stores + orders: NetOpenX ItemSlips for Netsis stores; managers are single-store scoped.
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setOrdersFetchError(null);
      setHasMore(false);
      setNetsisCursors({});
      setNetsisDateFilterActive(false);
      setOrders([]);

      let nextStores: StoreType[] = [];
      try {
        const storeRes = await listStores({ limit: 200 });
        if (!cancelled) nextStores = storeRes.data ?? [];
      } catch (err) {
        console.error("listStores failed:", err);
        if (!cancelled) nextStores = [];
      }
      if (!cancelled) setStores(nextStores);

      const mgrStoreId = !isAdmin
        ? inferManagerStoreId(nextStores, user?.email, user?.store_id)
        : null;
      if (!isAdmin && !mgrStoreId) {
        if (!cancelled) {
          setOrders([]);
          setOrdersSource("installations");
          setLoading(false);
        }
        return;
      }

      const effectiveStoreId = isAdmin
        ? store !== "all"
          ? store
          : null
        : mgrStoreId;
      const sel = effectiveStoreId
        ? nextStores.find((s) => s.id === effectiveStoreId)
        : null;
      const netsisStores = nextStores.filter(storeUsesNetsisItemSlipsList);
      const useNetsisSingle = Boolean(sel && storeUsesNetsisItemSlipsList(sel));
      const useNetsisAll = isAdmin && store === "all" && netsisStores.length > 0;

      try {
        if (useNetsisAll) {
          const batch = await fetchNetsisForStores(netsisStores, netsisApiQ, {});
          if (!cancelled) {
            setOrders(batch.orders);
            setNetsisCursors(batch.cursors);
            setHasMore(batch.hasMore);
            setOrdersSource("netsis");
            setOrdersFetchError(null);
          }
        } else if (useNetsisSingle && sel) {
          const batch = await fetchNetsisForStores([sel], netsisApiQ, {});
          if (!cancelled) {
            setOrders(batch.orders);
            setNetsisCursors(batch.cursors);
            setHasMore(batch.hasMore);
            setOrdersSource("netsis");
            setOrdersFetchError(null);
          }
        } else {
          const orderRes = await listOrders({
            limit: 300,
            ...(effectiveStoreId ? { store_id: effectiveStoreId as UUID } : {}),
            ...(debouncedFilterQ ? { q: debouncedFilterQ } : {}),
          });
          if (!cancelled) {
            setOrders(orderRes.data ?? []);
            setOrdersSource("installations");
            setOrdersFetchError(null);
            setHasMore(false);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setOrders([]);
          setOrdersSource("installations");
          const statusCode = isAxiosError(err) ? err.response?.status : undefined;
          const msg =
            (isAxiosError(err) && (err.response?.data as { message?: string })?.message) ||
            (err instanceof Error ? err.message : "Request failed");
          if (statusCode === 404 && !useNetsisSingle && !useNetsisAll) {
            setOrdersFetchError(
              "Orders list is not available on this API (404). Deploy the latest installops-backend (GET /orders) and restart Node, or fix nginx so /api/v1 is proxied to the app."
            );
          } else {
            setOrdersFetchError(msg);
          }
          console.error(
            useNetsisSingle || useNetsisAll ? "searchNetsisOrders failed:" : "listOrders failed:",
            err
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData().catch((err) => {
      console.error("OrdersPage fetchData:", err);
      if (!cancelled) {
        setLoading(false);
        setOrdersFetchError(
          err instanceof Error ? err.message : "Failed to load orders page data."
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [ordersFetchKey, isAdmin, user?.email, user?.store_id, fetchNetsisForStores, netsisApiQ, debouncedFilterQ]);

  const loadMoreNetsis = useCallback(async () => {
    if (!hasMore || loadingMore || loading) return;

    const netsisStores = stores.filter(storeUsesNetsisItemSlipsList);
    const effectiveStoreId =
      !isAdmin && managerStoreId ? managerStoreId : store !== "all" ? store : null;
    const targetStores =
      isAdmin && store === "all"
        ? netsisStores.filter((s) => netsisCursors[s.id]?.lastPageFull)
        : effectiveStoreId
          ? netsisStores.filter((s) => s.id === effectiveStoreId)
          : [];

    if (!targetStores.length) return;

    const offsets: Record<string, number> = {};
    for (const s of targetStores) {
      const cur = netsisCursors[s.id];
      offsets[s.id] = (cur?.offset ?? 0) + NETSIS_PAGE_SIZE;
    }

    setLoadingMore(true);
    try {
      const batch = await fetchNetsisForStores(targetStores, netsisApiQ, offsets);
      setOrders((prev) => dedupeOrders([...prev, ...batch.orders]));
      setNetsisCursors((prev) => ({ ...prev, ...batch.cursors }));
      setHasMore(batch.hasMore);
    } catch (err) {
      console.error("loadMoreNetsis failed:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [
    hasMore,
    loadingMore,
    loading,
    stores,
    isAdmin,
    managerStoreId,
    store,
    netsisCursors,
    netsisApiQ,
    fetchNetsisForStores,
  ]);

  // Derived store dropdown
  const storeOptions = useMemo(() => {
    const all = stores.map((s) => ({
      id: s.id,
      label: s.name?.trim() || s.id,
    }));
    if (isAdmin) return all;
    if (managerStoreId) {
      const one = all.find((s) => s.id === managerStoreId);
      return one ? [one] : all;
    }
    return all;
  }, [stores, isAdmin, managerStoreId]);

  const storeFilterOptions = useMemo(() => {
    const opts = storeOptions.map((s) => ({ value: s.id, label: s.label }));
    if (isAdmin) {
      return [{ value: "all", label: t("ordersPage.filters.storeAll") }, ...opts];
    }
    return opts;
  }, [storeOptions, isAdmin, t]);

  // 🔹 Filter + search + store filter
  const filtered = useMemo(() => {
    let list = orders.slice();

    // Date filtering (installations always; Netsis only after user adjusts dates — API pages are not date-scoped)
    const applyDateFilter =
      ordersSource !== "netsis" || netsisDateFilterActive;
    if (applyDateFilter && from && to) {
      const fromD = new Date(from + "T00:00:00");
      const toD = new Date(to + "T23:59:59");
      list = list.filter((o) => {
        const dt = parseOrderDate(o.placed_at ?? o.created_at);
        if (!dt) return false;
        return dt >= fromD && dt <= toD;
      });
    }

    // Status filter (Netsis slips are shown as confirmed; skip so filters do not hide the whole list)
    if (ordersSource !== "netsis" && status !== "all") {
      list = list.filter((o) => o.status === status);
    }

    // Store filter (match top-level id or nested store; UUID serialization can differ)
    if (store !== "all") {
      list = list.filter((o) => orderMatchesStoreFilter(o, store));
    }

    if (q.trim()) {
      list = list.filter(
        (o) =>
          textMatchesSearch(o.id, q) ||
          textMatchesSearch(o.customer_name, q) ||
          textMatchesSearch(o.store?.name, q)
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
          return dir * (statusRank(String(a.status)) - statusRank(String(b.status)));
      }
    });

    return list;
  }, [orders, q, status, store, from, to, sortBy, sortDir, ordersSource, netsisDateFilterActive]);

  const netsisFilteredEmpty =
    ordersSource === "netsis" &&
    netsisDateFilterActive &&
    orders.length > 0 &&
    filtered.length === 0;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (k: typeof sortBy) => {
    if (sortBy === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortBy(k);
      setSortDir("asc");
    }
  };

  const openDetail = (id: string, storeId?: string | null) => {
    const q = storeId ? `?store_id=${encodeURIComponent(storeId)}` : "";
    navigate(`/app/orders/${encodeURIComponent(id)}${q}`);
  };

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

      {ordersFetchError ? (
        <div
          className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="alert"
        >
          {ordersFetchError}
        </div>
      ) : null}

      {ordersSource === "netsis" && !ordersFetchError ? (
        <div
          className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950"
          role="status"
        >
          {t("ordersPage.netsisListBanner")}
        </div>
      ) : null}

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border bg-white p-3 shadow-sm md:grid-cols-6 md:items-end">
        {/* Search */}
        <div className="min-w-0 md:col-span-2">
          <label className="text-xs text-gray-600 mb-1 block">
            {t("ordersPage.filters.searchLabel")}
          </label>
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className="input-search-field w-full"
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
          value={isAdmin ? store : managerStoreId ?? store}
          onChange={(v: string) => {
            setStore(v);
            setPage(1);
          }}
          options={storeFilterOptions}
          disabled={!isAdmin && Boolean(managerStoreId)}
        />

        {/* Dates */}
        <DateFilter
          label={t("ordersPage.filters.from")}
          value={from}
          max={to}
          onChange={setFromClamped}
        />
        <DateFilter
          label={t("ordersPage.filters.to")}
          value={to}
          min={from}
          onChange={setToClamped}
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
                  {netsisFilteredEmpty
                    ? t("ordersPage.noResultsInDateRange", { loaded: orders.length })
                    : t("ordersPage.noResults")}
                </td>
              </tr>
            ) : (
              paged.map((o) => (
                <tr key={`${o.store_id ?? ""}:${o.id}`} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {formatUiDateTime(o.placed_at ?? o.created_at ?? undefined)}
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
                    <StatusPill status={String(o.status)} />
                  </td>

                  <td className="px-3 py-2 text-right">
                    <button
                      className="text-primary-600 hover:text-primary-800"
                      onClick={() => openDetail(o.id, o.store_id)}
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
        <div className="flex flex-wrap items-center justify-between gap-2 border-t p-3 text-sm">
          <div className="text-gray-600">
            {t("ordersPage.pagination.showing")} <b>{paged.length}</b>{" "}
            {t("ordersPage.pagination.of")}{" "}
            <b>{ordersSource === "netsis" ? orders.length : filtered.length}</b>
            {ordersSource === "netsis" && netsisDateFilterActive && filtered.length !== orders.length ? (
              <span className="text-gray-500">
                {" "}
                · {t("ordersPage.pagination.filtered", { count: filtered.length })}
              </span>
            ) : null}
            {ordersSource === "netsis" && hasMore ? (
              <span className="text-gray-500"> · {t("ordersPage.pagination.moreAvailable")}</span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {ordersSource === "netsis" && hasMore ? (
              <button
                type="button"
                onClick={() => void loadMoreNetsis()}
                disabled={loadingMore}
                className={cn(
                  "rounded-md border border-primary-300 bg-primary-50 px-3 py-1.5 text-primary-800",
                  loadingMore && "opacity-50"
                )}
              >
                {loadingMore ? t("ordersPage.pagination.loadingMore") : t("ordersPage.pagination.loadMore")}
              </button>
            ) : null}
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

function dedupeOrders(list: Order[]): Order[] {
  const seen = new Set<string>();
  const out: Order[] = [];
  for (const o of list) {
    const key = `${o.store_id ?? ""}:${o.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(o);
  }
  return out;
}


function orderMatchesStoreFilter(o: Order, storeId: string): boolean {
  const sid = String(storeId).trim();
  if (o.store_id != null && String(o.store_id) === sid) return true;
  if (o.store?.id != null && String(o.store.id) === sid) return true;
  return false;
}

function statusRank(s: string) {
  const ix = ["pending", "confirmed", "cancelled"].indexOf(s);
  return ix === -1 ? 1 : ix;
}

function StatusPill({ status }: { status: string }) {
  const { t } = useTranslation("common");

  const styles: Record<string, string> = {
    pending: "border-amber-200 bg-amber-50 text-amber-700",
    confirmed: "border-emerald-200 bg-emerald-50 text-emerald-700",
    cancelled: "border-rose-200 bg-rose-50 text-rose-700",
    default: "border-gray-200 bg-gray-50 text-gray-700",
  };

  const key =
    status === "pending" || status === "confirmed" || status === "cancelled"
      ? status
      : "default";
  const labelMap: Record<"pending" | "confirmed" | "cancelled", string> = {
    pending: t("ordersPage.status.pending"),
    confirmed: t("ordersPage.status.confirmed"),
    cancelled: t("ordersPage.status.cancelled"),
  };
  const label =
    key === "default" ? status || "—" : labelMap[key as "pending" | "confirmed" | "cancelled"];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
        styles[key]
      )}
    >
      {label}
    </span>
  );
}

function storeUsesNetsisItemSlipsList(s: StoreType): boolean {
  const src = String(s.netsis_orders_search_source || "http").trim().toLowerCase();
  if (src === "sql") return false;
  return Boolean(s.netsis_base_url?.trim() && s.netsis_order_search_path?.trim());
}

function netsisHitsToOrders(hits: NetsisOrderHit[], store: StoreType): Order[] {
  return hits.map((h) => ({
    id: h.order_id,
    external_order_id: h.order_id,
    store_id: store.id,
    store,
    customer_name: h.customer_name ?? null,
    status: "confirmed",
    items_count: h.items_count ?? null,
    placed_at: h.placed_at ?? undefined,
    created_at: h.placed_at ?? undefined,
  }));
}

function FilterSelect({ label, icon: Icon, value, onChange, options, disabled }: any) {
  return (
    <div>
      <label className="text-xs text-gray-600 mb-1 block">{label}</label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <select
          className="input-select-with-icon w-full"
          value={value}
          disabled={disabled}
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

function DateFilter({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
}) {
  return (
    <div>
      <label className="text-xs text-gray-600 mb-1 block">{label}</label>
      <div className="relative">
        <CalendarIcon className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="date"
          className="input w-full min-w-0 pl-9 pr-10 [color-scheme:light]"
          value={value}
          min={min || undefined}
          max={max || undefined}
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
