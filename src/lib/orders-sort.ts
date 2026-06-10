import type { Order } from "../api/orders";
import { compareNetsisOrderIds, compareOrdersByRecency } from "./netsis-order-id";

export type OrderSortKey =
  | "placed_at"
  | "id"
  | "customer"
  | "store"
  | "items_count"
  | "status";

export type SortDir = "asc" | "desc";

export const DEFAULT_SORT_DIR: Record<OrderSortKey, SortDir> = {
  placed_at: "desc",
  id: "desc",
  customer: "asc",
  store: "asc",
  items_count: "asc",
  status: "asc",
};

function statusRank(s: string): number {
  const ix = ["pending", "confirmed", "cancelled"].indexOf(s);
  return ix === -1 ? 1 : ix;
}

function itemsCountValue(count: number | null | undefined): number {
  return count ?? -1;
}

/** Ascending compare (a before b when negative). */
export function compareOrdersByKey(a: Order, b: Order, sortBy: OrderSortKey): number {
  switch (sortBy) {
    case "placed_at":
      return -compareOrdersByRecency(a, b);
    case "id":
      return compareNetsisOrderIds(a.id, b.id);
    case "customer":
      return (a.customer_name ?? "").localeCompare(b.customer_name ?? "", "tr");
    case "store":
      return (a.store?.name ?? "").localeCompare(b.store?.name ?? "", "tr");
    case "items_count":
      return itemsCountValue(a.items_count) - itemsCountValue(b.items_count);
    case "status":
      return statusRank(String(a.status)) - statusRank(String(b.status));
  }
}

export function sortOrders<T extends Order>(
  list: T[],
  sortBy: OrderSortKey,
  sortDir: SortDir
): T[] {
  const dir = sortDir === "asc" ? 1 : -1;
  return [...list].sort((a, b) => dir * compareOrdersByKey(a, b, sortBy));
}

export function nextSortState(
  currentBy: OrderSortKey,
  currentDir: SortDir,
  clicked: OrderSortKey
): { sortBy: OrderSortKey; sortDir: SortDir } {
  if (currentBy === clicked) {
    return { sortBy: clicked, sortDir: currentDir === "asc" ? "desc" : "asc" };
  }
  return { sortBy: clicked, sortDir: DEFAULT_SORT_DIR[clicked] };
}
