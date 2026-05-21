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
  has_more?: boolean;
  browse_mode?: string;
  total?: number;
};

export type NetsisOrderIndexResponse = {
  order_ids: string[];
  total: number;
  source?: 'http';
};

export async function fetchNetsisOrderIndex(params: {
  store_id: UUID;
}): Promise<NetsisOrderIndexResponse> {
  return apiGet<NetsisOrderIndexResponse>('/integrations/netsis/orders/index', {
    params: { store_id: params.store_id },
  });
}

export async function searchNetsisOrders(params: {
  store_id: UUID;
  /** Optional for HTTP search when the store path lists slips without a `q` filter (e.g. ItemSlips?docType=7). */
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<NetsisOrderSearchResponse> {
  return apiGet<NetsisOrderSearchResponse>('/integrations/netsis/orders/search', {
    params: {
      store_id: params.store_id,
      ...(params.q !== undefined && params.q !== '' ? { q: params.q } : {}),
      limit: params.limit,
      offset: params.offset,
    },
  });
}

export type NetsisCustomerFields = {
  full_name: string;
  phone: string;
  email: string;
  address: string;
  region: string;
  cari_kod: string | null;
};

export type NetsisOrderLineView = {
  id: string;
  sku: string;
  name: string;
  description: string;
  quantity: number;
};

/** Sanitized live Netsis order detail (no raw ERP document). */
export type NetsisOrderDetailData = {
  order_id: string;
  customer: NetsisCustomerFields;
  /** True when the slip header had no usable customer fields (client may call customers/detail). */
  customer_sparse?: boolean;
  placed_at?: string | null;
  status?: string | null;
  lines: NetsisOrderLineView[];
};

export type NetsisOrderDetailResponse = {
  data: NetsisOrderDetailData;
  source: 'http' | 'http+sql';
  /** Mirrors store `netsis_ekalan_parse` — informational only (lines are already parsed server-side). */
  ekalan_parse?: boolean;
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
  data: NetsisCustomerFields;
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
