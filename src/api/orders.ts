// /api/orders.ts
import { apiGet, UUID } from './http';
import type { Store } from './stores';
import type { Installation } from './installations';

export type OrderStatus = 'pending' | 'confirmed' | 'cancelled';

export type Order = {
  id: string;
  external_order_id?: string | null;

  store_id?: UUID | null;
  store?: Store;

  customer_name?: string | null;
  customer?: string | null;

  status: OrderStatus | string;

  items_count?: number | null;
  items?: Array<{
    id: UUID;
    external_product_id?: string | null;
    quantity?: number | null;
  }>;

  created_at?: string;
  placed_at?: string;
};

export type OrderList = {
  data: Order[];
  limit: number;
  offset: number;
};

export type ListOrdersParams = {
  store_id?: UUID;
  status?: OrderStatus | string;
  external_order_id?: string;
  q?: string;
  limit?: number;
  offset?: number;
};

/**
 * List orders (read-only).
 * Backend should expose GET /orders with pagination + optional filters.
 */
export async function listOrders(
  params?: ListOrdersParams
): Promise<OrderList> {
  return apiGet<OrderList>('/orders', { params });
}

export type OrderInstallationsResponse = {
  order_id: string;
  data: Installation[];
  total: number;
  limit: number;
  offset: number;
};

export type OrderTimelineAuditRow = {
  id: string;
  at: string;
  action: string;
  entity: string;
  entity_id: string | null;
  data?: Record<string, unknown> | null;
  actor_id?: string | null;
  installation_id?: string | null;
  install_code?: string | null;
};

export type OrderTimelineResponse = {
  order_id: string;
  installations: Array<{
    id: string;
    install_code: string | null;
    status: string;
    created_at: string;
  }>;
  timeline: {
    data: OrderTimelineAuditRow[];
    total: number;
    limit: number;
    offset: number;
  };
};

export async function getOrderInstallations(
  externalOrderId: string,
  params?: { limit?: number; offset?: number }
): Promise<OrderInstallationsResponse> {
  const enc = encodeURIComponent(externalOrderId);
  return apiGet<OrderInstallationsResponse>(`/orders/${enc}/installations`, {
    params,
  });
}

export async function getOrderTimeline(
  externalOrderId: string,
  params?: { limit?: number; offset?: number }
): Promise<OrderTimelineResponse> {
  const enc = encodeURIComponent(externalOrderId);
  return apiGet<OrderTimelineResponse>(`/orders/${enc}/timeline`, { params });
}
