import { apiGet, UUID } from './http';

export type NetsisOrderHit = {
  order_id: string;
  label: string;
};

export type NetsisOrderSearchResponse = {
  data: NetsisOrderHit[];
  source?: 'http' | 'sql';
};

export async function searchNetsisOrders(params: {
  store_id: UUID;
  q: string;
  limit?: number;
}): Promise<NetsisOrderSearchResponse> {
  return apiGet<NetsisOrderSearchResponse>('/integrations/netsis/orders/search', {
    params: {
      store_id: params.store_id,
      q: params.q,
      limit: params.limit,
    },
  });
}
