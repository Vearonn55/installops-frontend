import { useCallback, useEffect, useMemo, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { isAxiosError } from "../api/http";
import { searchNetsisOrders, type NetsisOrderHit } from "../api/integrations";
import { listOrders, type Order } from "../api/orders";
import { listStores, type Store as StoreType } from "../api/stores";
import type { UUID } from "../api/http";
import { defaultDateRangeOrdersList, parseOrderDate } from "../lib/date-range";
import {
  type OrderSortKey,
  type SortDir,
  nextSortState,
  sortOrders,
} from "../lib/orders-sort";
import { queryKeys } from "../lib/query-client";
import { useAuthStore } from "../stores/auth";
import { useManagerStoreScope } from './use-manager-store-scope';

const NETSIS_PAGE_SIZE = 50;
const PAGE_SIZE = 10;

type StoreFetchCursor = { offset: number; lastPageFull: boolean };

function storeUsesNetsisItemSlipsList(s: StoreType): boolean {
  if (s.netsis_configured !== true) return false;
  return s.netsis_orders_search_source !== "sql";
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

export function useOrdersListState() {
  const isAdmin = useAuthStore((s) => s.hasRole("ADMIN"));
  const sessionValidated = useAuthStore((s) => s.sessionValidated);
  const ordersRangeDefault = useMemo(() => defaultDateRangeOrdersList(), []);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "pending" | "confirmed" | "cancelled">("all");
  const [store, setStore] = useState("");
  const [from, setFrom] = useState(ordersRangeDefault.from);
  const [to, setTo] = useState(ordersRangeDefault.to);
  const [sortBy, setSortBy] = useState<OrderSortKey>("placed_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [debouncedFilterQ, setDebouncedFilterQ] = useState("");
  const [netsisDateFilterActive, setNetsisDateFilterActive] = useState(false);

  useEffect(() => {
    const trimmed = q.trim();
    const timer = window.setTimeout(() => {
      setDebouncedFilterQ((prev) => (prev === trimmed ? prev : trimmed));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    setPage(1);
  }, [store, debouncedFilterQ, from, to, status]);

  useEffect(() => {
    setPage(1);
  }, [sortBy, sortDir]);

  const storesQuery = useQuery({
    queryKey: queryKeys.stores,
    queryFn: () => listStores({ limit: 200 }),
    staleTime: 5 * 60 * 1000,
  });

  const stores = storesQuery.data?.data ?? [];
  const { homeStoreId: managerStoreId } = useManagerStoreScope();

  const effectiveStoreId = useMemo((): string | null => {
    if (isAdmin) {
      const id = store || stores[0]?.id;
      return id || null;
    }
    return managerStoreId;
  }, [isAdmin, store, stores, managerStoreId]);

  const selectedStore = useMemo(
    () => (effectiveStoreId ? stores.find((s) => s.id === effectiveStoreId) : undefined),
    [stores, effectiveStoreId]
  );

  const useNetsisList = Boolean(selectedStore && storeUsesNetsisItemSlipsList(selectedStore));

  useEffect(() => {
    if (!isAdmin && managerStoreId && store !== managerStoreId) {
      setStore(managerStoreId);
    }
  }, [isAdmin, managerStoreId, store]);

  useEffect(() => {
    if (!isAdmin || store || stores.length === 0) return;
    setStore(stores[0].id);
  }, [isAdmin, store, stores]);

  useEffect(() => {
    setNetsisDateFilterActive(false);
  }, [effectiveStoreId, debouncedFilterQ]);

  const fetchNetsisForStores = useCallback(
    async (
      targetStores: StoreType[],
      searchQ: string,
      offsets: Record<string, number>
    ) => {
      const results = await Promise.allSettled(
        targetStores.map(async (s) => {
          const detailOffset = offsets[s.id] ?? 0;
          const res = await searchNetsisOrders({
            store_id: s.id as UUID,
            ...(searchQ ? { q: searchQ } : {}),
            limit: NETSIS_PAGE_SIZE,
            offset: detailOffset,
          });

          const hits = res.data ?? [];
          const total = res.total;
          const hasMore =
            res.has_more === true ||
            (res.has_more == null &&
              !searchQ.trim() &&
              typeof total === "number" &&
              detailOffset + hits.length < total) ||
            (res.has_more == null && hits.length >= NETSIS_PAGE_SIZE);

          return { store: s, hits, hasMore, total };
        })
      );

      const nextOrders: Order[] = [];
      const nextCursors: Record<string, StoreFetchCursor> = {};
      const totalsByStore: Record<string, number> = {};
      let anyFull = false;

      for (const r of results) {
        if (r.status !== "fulfilled") {
          console.error("searchNetsisOrders failed for store:", r.reason);
          continue;
        }
        const { store: st, hits, hasMore: storeHasMore, total } = r.value;
        if (typeof total === "number") totalsByStore[st.id] = total;
        if (storeHasMore) anyFull = true;
        nextCursors[st.id] = {
          offset: (offsets[st.id] ?? 0) + hits.length,
          lastPageFull: storeHasMore,
        };
        nextOrders.push(...netsisHitsToOrders(hits, st));
      }

      if (targetStores.length && !nextOrders.length) {
        const fail = results.find((r) => r.status === "rejected");
        if (fail?.status === "rejected") throw fail.reason;
      }

      return {
        orders: dedupeOrders(nextOrders),
        cursors: nextCursors,
        hasMore: anyFull,
        totalsByStore,
      };
    },
    []
  );

  const storesReady = !storesQuery.isPending;
  const listEnabled = sessionValidated && storesReady && Boolean(effectiveStoreId);

  const netsisOrdersQuery = useInfiniteQuery({
    queryKey: queryKeys.netsisOrdersList(effectiveStoreId ?? "_pending", debouncedFilterQ),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      if (!selectedStore) {
        return {
          orders: [] as Order[],
          cursors: {} as Record<string, StoreFetchCursor>,
          hasMore: false,
          totalsByStore: {} as Record<string, number>,
        };
      }
      const offsets = { [selectedStore.id]: pageParam as number };
      return fetchNetsisForStores([selectedStore], debouncedFilterQ, offsets);
    },
    getNextPageParam: (lastPage) => {
      if (!selectedStore) return undefined;
      const cursor = lastPage.cursors[selectedStore.id];
      if (!cursor?.lastPageFull) return undefined;
      return cursor.offset;
    },
    enabled: listEnabled && useNetsisList && Boolean(selectedStore) && Boolean(effectiveStoreId),
    staleTime: 60_000,
    retry: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const installationsOrdersQuery = useQuery({
    queryKey: ["orders", "installations", effectiveStoreId, debouncedFilterQ],
    queryFn: () =>
      listOrders({
        limit: 300,
        ...(isAdmin && effectiveStoreId ? { store_id: effectiveStoreId as UUID } : {}),
        ...(debouncedFilterQ ? { q: debouncedFilterQ } : {}),
      }),
    enabled: !useNetsisList && listEnabled,
    staleTime: 60_000,
  });

  const ordersSource: "installations" | "netsis" = useNetsisList ? "netsis" : "installations";

  const orders = useMemo(() => {
    if (useNetsisList && netsisOrdersQuery.data) {
      return dedupeOrders(netsisOrdersQuery.data.pages.flatMap((p) => p.orders));
    }
    return installationsOrdersQuery.data?.data ?? [];
  }, [useNetsisList, netsisOrdersQuery.data, installationsOrdersQuery.data]);

  const netsisTotalsByStore = useMemo(() => {
    const pages = netsisOrdersQuery.data?.pages;
    if (!pages?.length) return {};
    return pages[pages.length - 1].totalsByStore;
  }, [netsisOrdersQuery.data]);

  const needsStorePick = isAdmin && !store;
  const searchPending = q.trim() !== debouncedFilterQ;

  const isInitialLoading =
    storesQuery.isLoading ||
    (needsStorePick
      ? false
      : useNetsisList
        ? netsisOrdersQuery.isLoading && orders.length === 0
        : installationsOrdersQuery.isLoading && orders.length === 0);

  const isListRefetching =
    !needsStorePick &&
    (useNetsisList
      ? netsisOrdersQuery.isFetching &&
        !netsisOrdersQuery.isLoading &&
        !netsisOrdersQuery.isFetchingNextPage
      : installationsOrdersQuery.isFetching &&
        !installationsOrdersQuery.isLoading);

  const showLoadingBar = isInitialLoading || isListRefetching || searchPending;
  const loadingMore = netsisOrdersQuery.isFetchingNextPage;
  const hasMore = useNetsisList ? Boolean(netsisOrdersQuery.hasNextPage) : false;

  const ordersFetchError = useMemo(() => {
    const err = useNetsisList ? netsisOrdersQuery.error : installationsOrdersQuery.error;
    if (!err) return null;
    const statusCode = isAxiosError(err) ? err.response?.status : undefined;
    const msg =
      (isAxiosError(err) && (err.response?.data as { message?: string })?.message) ||
      (err instanceof Error ? err.message : "Request failed");
    if (statusCode === 404 && !useNetsisList) {
      return "Orders list is not available on this API (404). Deploy the latest installops-backend (GET /orders) and restart Node, or fix nginx so /api/v1 is proxied to the app.";
    }
    return msg;
  }, [useNetsisList, netsisOrdersQuery.error, installationsOrdersQuery.error]);

  const storeOptions = useMemo(() => {
    const all = stores.map((s) => ({
      id: s.id,
      value: s.id,
      label: s.name?.trim() || s.id,
    }));
    if (isAdmin) return all;
    if (managerStoreId) {
      const one = all.find((s) => s.id === managerStoreId);
      return one ? [one] : all;
    }
    return all;
  }, [stores, isAdmin, managerStoreId]);

  const netsisCatalogTotal = useMemo(() => {
    const vals = Object.values(netsisTotalsByStore);
    if (!vals.length) return null;
    return vals.reduce((sum, n) => sum + n, 0);
  }, [netsisTotalsByStore]);

  const filtered = useMemo(() => {
    let list = orders.slice();

    const applyDateFilter = ordersSource !== "netsis" || netsisDateFilterActive;
    if (applyDateFilter && from && to) {
      const fromD = new Date(from + "T00:00:00");
      const toD = new Date(to + "T23:59:59");
      list = list.filter((o) => {
        const dt = parseOrderDate(o.placed_at ?? o.created_at);
        if (!dt) return false;
        return dt >= fromD && dt <= toD;
      });
    }

    if (ordersSource !== "netsis" && status !== "all") {
      list = list.filter((o) => o.status === status);
    }

    if (store) {
      list = list.filter((o) => orderMatchesStoreFilter(o, store));
    }

    const trustApiOrder =
      ordersSource === "netsis" && sortBy === "placed_at" && sortDir === "desc";

    if (!trustApiOrder) {
      list = sortOrders(list, sortBy, sortDir);
    }

    return list;
  }, [orders, status, store, from, to, sortBy, sortDir, ordersSource, netsisDateFilterActive]);

  const netsisFilteredEmpty =
    ordersSource === "netsis" &&
    netsisDateFilterActive &&
    orders.length > 0 &&
    filtered.length === 0;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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

  const toggleSort = (key: OrderSortKey) => {
    const next = nextSortState(sortBy, sortDir, key);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
  };

  return {
    isAdmin,
    q,
    setQ,
    status,
    setStatus,
    store,
    setStore,
    from,
    to,
    setFromClamped,
    setToClamped,
    sortBy,
    sortDir,
    toggleSort,
    page,
    setPage,
    pageSize: PAGE_SIZE,
    useNetsisList,
    ordersSource,
    orders,
    filtered,
    paged,
    totalPages,
    netsisFilteredEmpty,
    netsisCatalogTotal,
    netsisDateFilterActive,
    storeOptions,
    managerStoreId,
    isInitialLoading,
    isListRefetching,
    showLoadingBar,
    loadingMore,
    hasMore,
    ordersFetchError,
    netsisOrdersQuery,
    searchPending,
  };
}
