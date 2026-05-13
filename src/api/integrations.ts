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

/** NetOpenX slip header + merged Cari/FatUst; optional `ARP` after server-side cari lookup. */
export type NetsisOrderDocument = Record<string, unknown>;

/** One kalem row (Kalems / ItemSlipLines / …), with optional nested `Stok` from Items merge. */
export type NetsisOrderLine = Record<string, unknown>;

/**
 * Live Netsis order detail: native NetOpenX field names (no InstallOps `product_id` / `full_name` remap).
 * Use `src/lib/netsis-native.ts` to read common fields for UI.
 */
export type NetsisOrderDetailData = {
  document: NetsisOrderDocument;
  lines: NetsisOrderLine[];
  /** Resolved document id (FATIRS_NO / INCKEYNO / …) for display and links. */
  order_id: string;
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

/** Raw ARPs / Cari row from NetOpenX (field names as returned by the API). */
export type NetsisCustomerDetailData = Record<string, unknown>;

export type NetsisCustomerDetailResponse = {
  data: NetsisCustomerDetailData;
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
