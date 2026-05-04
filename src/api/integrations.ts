import { apiGet, UUID } from './http';

export type NetsisOrderHit = {
  order_id: string;
  label: string;
  placed_at?: string | null;
  customer_name?: string | null;
  cari_kod?: string | null;
  items_count?: number | null;
};

export type NetsisOrderSearchResponse = {
  data: NetsisOrderHit[];
  source?: 'http' | 'sql';
};

export async function searchNetsisOrders(params: {
  store_id: UUID;
  /** Optional for HTTP search when the store path lists slips without a `q` filter (e.g. ItemSlips?docType=7). */
  q?: string;
  limit?: number;
}): Promise<NetsisOrderSearchResponse> {
  return apiGet<NetsisOrderSearchResponse>('/integrations/netsis/orders/search', {
    params: {
      store_id: params.store_id,
      ...(params.q !== undefined && params.q !== '' ? { q: params.q } : {}),
      limit: params.limit,
    },
  });
}

export type NetsisOrderDetailCustomer = {
  full_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  region?: string | null;
  cari_kod?: string | null;
};

export type NetsisOrderDetailItem = {
  id: string;
  product_id: string;
  quantity: number;
  name?: string | null;
  description?: string | null;
  sku?: string | null;
  room_tag?: string | null;
};

export type NetsisOrderDetailData = {
  external_order_id: string;
  placed_at?: string | null;
  status?: string | null;
  customer: NetsisOrderDetailCustomer;
  items: NetsisOrderDetailItem[];
};

export type NetsisOrderDetailResponse = {
  data: NetsisOrderDetailData;
  source: 'http';
};

export async function getNetsisOrderDetail(params: {
  store_id: UUID;
  order_id: string;
}): Promise<NetsisOrderDetailResponse> {
  return apiGet<NetsisOrderDetailResponse>('/integrations/netsis/orders/detail', {
    params: {
      store_id: params.store_id,
      order_id: params.order_id,
    },
  });
}

export type NetsisCustomerDetailResponse = {
  data: NetsisOrderDetailCustomer;
  source: 'http';
};

export async function getNetsisCustomerDetail(params: {
  store_id: UUID;
  cari_kod: string;
}): Promise<NetsisCustomerDetailResponse> {
  return apiGet<NetsisCustomerDetailResponse>('/integrations/netsis/customers/detail', {
    params: {
      store_id: params.store_id,
      cari_kod: params.cari_kod,
    },
  });
}
