// src/pages/manager/OrdersPage.tsx
import { useNavigate } from "react-router-dom";
import {
  ArrowUpDown,
  Calendar as CalendarIcon,
  User2,
  Package,
  Store,
} from "lucide-react";

import { cn } from "../../lib/utils";
import { formatUiDateTime } from "../../lib/date-display";
import { useTranslation } from "react-i18next";
import ResponsiveDataView, {
  MobileCardActions,
  MobileCardField,
} from "../../components/ui/ResponsiveDataView";
import { pageHeaderClass } from "../../lib/responsive-layout";
import OrdersFilters from "../../components/orders/OrdersFilters";
import OrdersLoadingPlaceholder from "../../components/orders/OrdersLoadingPlaceholder";
import IndeterminateProgressBar from "../../components/ui/IndeterminateProgressBar";
import { useOrdersListState } from "../../hooks/useOrdersListState";
import type { OrderSortKey, SortDir } from "../../lib/orders-sort";

export default function OrdersPage() {
  const navigate = useNavigate();
  const { t } = useTranslation("common");

  const {
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
    showLoadingBar,
    loadingMore,
    hasMore,
    ordersFetchError,
    netsisOrdersQuery,
  } = useOrdersListState();

  const showTableLoading = isInitialLoading;
  const showTableRows = !isInitialLoading;

  const openDetail = (id: string, storeId?: string | null) => {
    const qs = storeId ? `?store_id=${encodeURIComponent(storeId)}` : "";
    navigate(`/app/orders/${encodeURIComponent(id)}${qs}`);
  };

  const loadingMessage = t("ordersPage.loading");

  return (
    <div className="space-y-6">
      <div className={pageHeaderClass}>
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">{t("ordersPage.title")}</h1>
          <p className="mt-1 text-sm text-gray-500">{t("ordersPage.subtitle")}</p>
        </div>
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

      <OrdersFilters
        q={q}
        onQChange={(val) => {
          setQ(val);
          setPage(1);
        }}
        status={status}
        onStatusChange={(val) => {
          setStatus(val);
          setPage(1);
        }}
        store={isAdmin ? store : managerStoreId ?? store}
        onStoreChange={(val) => {
          setStore(val);
          setPage(1);
        }}
        storeOptions={storeOptions}
        storeDisabled={!isAdmin && Boolean(managerStoreId)}
        showStatusFilter={!useNetsisList}
        from={from}
        to={to}
        onFromChange={setFromClamped}
        onToChange={setToClamped}
        showNetsisDateHint={useNetsisList}
        netsisDateFilterActive={netsisDateFilterActive}
      />

      <div className="relative">
        {showLoadingBar && !isInitialLoading ? (
          <IndeterminateProgressBar className="absolute inset-x-0 top-0 z-10 rounded-t-xl" />
        ) : null}

        <ResponsiveDataView
          rows={paged}
          keyExtractor={(o) => `${o.store_id ?? ""}:${o.id}`}
          loading={showTableLoading}
          loadingContent={
            <OrdersLoadingPlaceholder message={loadingMessage} showBar={showLoadingBar} />
          }
          empty={showTableRows && paged.length === 0}
          emptyContent={
            <p className="px-4 py-8 text-center text-sm text-gray-500">
              {netsisFilteredEmpty
                ? t("ordersPage.noResultsInDateRange", { loaded: orders.length })
                : t("ordersPage.noResults")}
            </p>
          }
          renderMobileCard={(o) => (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{o.id}</p>
                  <p className="text-xs tabular-nums text-gray-500">
                    {formatUiDateTime(o.placed_at ?? o.created_at ?? undefined)}
                  </p>
                </div>
                <StatusPill status={String(o.status)} />
              </div>
              <dl className="grid grid-cols-1 gap-2">
                <MobileCardField label={t("ordersPage.table.customer")}>
                  {o.customer_name ?? "—"}
                </MobileCardField>
                <MobileCardField label={t("ordersPage.table.store")}>
                  {o.store?.name ?? "—"}
                </MobileCardField>
                <MobileCardField label={t("ordersPage.table.items")}>
                  {o.items_count ?? 0}
                </MobileCardField>
              </dl>
              <MobileCardActions>
                <button
                  type="button"
                  onClick={() => openDetail(o.id, o.store_id)}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-primary-600 px-3 text-sm font-medium text-white hover:bg-primary-700"
                >
                  {t("ordersPage.actions.view")}
                </button>
              </MobileCardActions>
            </div>
          )}
          footer={
            <div className="flex flex-wrap items-center justify-between gap-2 border-t p-3 text-sm">
              <div className="text-gray-600">
                {t("ordersPage.pagination.showing")} <b>{paged.length}</b>{" "}
                {t("ordersPage.pagination.of")}{" "}
                <b>{ordersSource === "netsis" ? orders.length : filtered.length}</b>
                {ordersSource === "netsis" && netsisCatalogTotal != null ? (
                  <span className="text-gray-500"> / {netsisCatalogTotal}</span>
                ) : null}
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
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
                {loadingMore ? (
                  <div className="w-full sm:w-32">
                    <IndeterminateProgressBar className="rounded-full" />
                  </div>
                ) : null}
                {ordersSource === "netsis" && hasMore ? (
                  <button
                    type="button"
                    onClick={() => void netsisOrdersQuery.fetchNextPage()}
                    disabled={loadingMore || !netsisOrdersQuery.hasNextPage}
                    className={cn(
                      "min-h-11 rounded-md border border-primary-300 bg-primary-50 px-3 py-2 text-primary-800",
                      loadingMore && "opacity-50"
                    )}
                  >
                    {loadingMore
                      ? t("ordersPage.pagination.loadingMore")
                      : t("ordersPage.pagination.loadMore")}
                  </button>
                ) : null}
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={cn("min-h-11 rounded-md border px-3 py-2", page === 1 && "opacity-50")}
                >
                  {t("ordersPage.pagination.prev")}
                </button>
                <div className="flex min-h-11 items-center justify-center">
                  {t("ordersPage.pagination.page")} <b>{page}</b> / {totalPages}
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className={cn(
                    "min-h-11 rounded-md border px-3 py-2",
                    page === totalPages && "opacity-50"
                  )}
                >
                  {t("ordersPage.pagination.next")}
                </button>
              </div>
            </div>
          }
          desktop={
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-600">
                <tr>
                  <SortTh
                    label={t("ordersPage.table.placed")}
                    sortKey="placed_at"
                    activeKey={sortBy}
                    dir={sortDir}
                    onClick={() => toggleSort("placed_at")}
                  />
                  <SortTh
                    label={t("ordersPage.table.order")}
                    sortKey="id"
                    activeKey={sortBy}
                    dir={sortDir}
                    onClick={() => toggleSort("id")}
                  />
                  <SortTh
                    label={t("ordersPage.table.customer")}
                    sortKey="customer"
                    activeKey={sortBy}
                    dir={sortDir}
                    onClick={() => toggleSort("customer")}
                  />
                  <SortTh
                    label={t("ordersPage.table.store")}
                    sortKey="store"
                    activeKey={sortBy}
                    dir={sortDir}
                    onClick={() => toggleSort("store")}
                  />
                  <SortTh
                    label={t("ordersPage.table.items")}
                    sortKey="items_count"
                    activeKey={sortBy}
                    dir={sortDir}
                    onClick={() => toggleSort("items_count")}
                  />
                  <SortTh
                    label={t("ordersPage.table.status")}
                    sortKey="status"
                    activeKey={sortBy}
                    dir={sortDir}
                    onClick={() => toggleSort("status")}
                  />
                  <th className="w-24 px-3 py-2" />
                </tr>
              </thead>

              <tbody className="divide-y">
                {showTableLoading ? (
                  <tr>
                    <td colSpan={7} className="p-0">
                      <OrdersLoadingPlaceholder message={loadingMessage} showBar={showLoadingBar} />
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
                        <div className="flex items-center gap-1 text-xs tabular-nums text-gray-600">
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
          }
        />
      </div>
    </div>
  );
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

function SortTh({
  label,
  sortKey,
  activeKey,
  dir,
  onClick,
}: {
  label: string;
  sortKey: OrderSortKey;
  activeKey: OrderSortKey;
  dir: SortDir;
  onClick: () => void;
}) {
  const active = activeKey === sortKey;
  return (
    <th className="px-3 py-2 text-left font-semibold text-gray-700">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-gray-100",
          active && "bg-primary-50 text-primary-700"
        )}
        aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      >
        {label}
        <ArrowUpDown
          className={cn(
            "h-3.5 w-3.5 transition-transform",
            active && dir === "asc" && "rotate-180",
            active ? "text-primary-600" : "text-gray-400"
          )}
        />
      </button>
    </th>
  );
}
