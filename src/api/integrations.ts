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

function netsisSearchRequestKey(params: {
  store_id: UUID;
  q?: string;
  limit?: number;
  offset?: number;
}): string {
  return JSON.stringify({
    store_id: params.store_id,
    q: params.q ?? '',
    limit: params.limit ?? null,
    offset: params.offset ?? 0,
  });
}

const inflightNetsisSearch = new Map<string, Promise<NetsisOrderSearchResponse>>();

export async function searchNetsisOrders(params: {
  store_id: UUID;
  /** Optional for HTTP search when the store path lists slips without a `q` filter (e.g. ItemSlips?docType=7). */
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<NetsisOrderSearchResponse> {
  const key = netsisSearchRequestKey(params);
  const existing = inflightNetsisSearch.get(key);
  if (existing) return existing;

  const request = apiGet<NetsisOrderSearchResponse>('/integrations/netsis/orders/search', {
    params: {
      store_id: params.store_id,
      ...(params.q !== undefined && params.q !== '' ? { q: params.q } : {}),
      limit: params.limit,
      offset: params.offset,
    },
  }).finally(() => {
    if (inflightNetsisSearch.get(key) === request) {
      inflightNetsisSearch.delete(key);
    }
  });

  inflightNetsisSearch.set(key, request);
  return request;
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

export type NetsisTransferHit = {
  id: string;
  external_transfer_id: string;
  label?: string;
  placed_at?: string | null;
  erp_date?: string | null;
  line_count?: number | null;
  source_depot_code?: number | null;
  dest_depot_code?: number | null;
};

export type NetsisTransferSearchResponse = {
  data: NetsisTransferHit[];
  total?: number;
  limit?: number;
  offset?: number;
  browse_mode?: string;
};

export type NetsisTransferLineView = {
  external_product_id: string;
  quantity: number;
  name?: string;
  special_instructions?: string | null;
};

export type NetsisTransferDetailData = {
  transfer_id: string;
  external_transfer_id: string;
  erp_date?: string | null;
  source_depot_code?: number | null;
  dest_depot_code?: number | null;
  items: NetsisTransferLineView[];
};

export type NetsisTransferDetailResponse = {
  data: NetsisTransferDetailData;
  source: 'http';
};

function netsisTransferSearchRequestKey(params: {
  store_id: UUID;
  q?: string;
  limit?: number;
  offset?: number;
}): string {
  return JSON.stringify({
    store_id: params.store_id,
    q: params.q ?? '',
    limit: params.limit ?? null,
    offset: params.offset ?? 0,
  });
}

const inflightNetsisTransferSearch = new Map<
  string,
  Promise<NetsisTransferSearchResponse>
>();

export async function searchNetsisTransfers(params: {
  store_id: UUID;
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<NetsisTransferSearchResponse> {
  const key = netsisTransferSearchRequestKey(params);
  const existing = inflightNetsisTransferSearch.get(key);
  if (existing) return existing;

  const request = apiGet<NetsisTransferSearchResponse>(
    '/integrations/netsis/transfers/search',
    {
      params: {
        store_id: params.store_id,
        ...(params.q !== undefined && params.q !== '' ? { q: params.q } : {}),
        limit: params.limit,
        offset: params.offset,
      },
    }
  ).finally(() => {
    if (inflightNetsisTransferSearch.get(key) === request) {
      inflightNetsisTransferSearch.delete(key);
    }
  });

  inflightNetsisTransferSearch.set(key, request);
  return request;
}

export async function getNetsisTransferDetail(params: {
  store_id: UUID;
  transfer_id: string;
}): Promise<NetsisTransferDetailResponse> {
  return apiGet<NetsisTransferDetailResponse>('/integrations/netsis/transfers/detail', {
    params: {
      store_id: params.store_id,
      transfer_id: params.transfer_id,
    },
  });
}
