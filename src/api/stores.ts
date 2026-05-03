// /api/stores.ts
import { apiGet, apiPost, apiPatch, UUID } from './http';
import type { Address } from './addresses';

export type Store = {
  id: UUID;
  name: string;
  external_store_id?: string | null;
  address_id?: UUID | null;
  phone?: string | null;
  timezone?: string | null;
  netsis_base_url?: string | null;
  netsis_order_search_path?: string | null;
  netsis_username?: string | null;
  netsis_password_configured?: boolean;
  netsis_timeout_ms?: number;
  /** HTTP Host header override, e.g. localhost:7072 */
  netsis_request_host?: string | null;
  /** Path for connectivity test only (default /api/v2/public/Ping) */
  netsis_ping_path?: string | null;
  created_at: string;
  updated_at: string;
  address?: Address;
};

export type StoreList = {
  data: Store[];
  limit: number;
  offset: number;
};

export type StoreCreate = {
  name: string;
  external_store_id?: string | null;
  address_id: UUID;
  phone?: string | null;
};

export type StoreUpdate = Partial<StoreCreate>;

export type ListStoresParams = {
  q?: string;
  external_store_id?: string;
  limit?: number;
  offset?: number;
};

export async function listStores(
  params?: ListStoresParams
): Promise<StoreList> {
  return apiGet<StoreList>('/stores', { params });
}

export async function createStore(payload: StoreCreate): Promise<Store> {
  return apiPost<Store>('/stores', payload);
}

export async function getStore(id: UUID): Promise<Store> {
  return apiGet<Store>(`/stores/${id}`);
}

export async function updateStore(
  id: UUID,
  payload: StoreUpdate
): Promise<Store> {
  return apiPatch<Store>(`/stores/${id}`, payload);
}

export type StoreNetsisUpdate = {
  netsis_base_url?: string | null;
  netsis_order_search_path?: string | null;
  netsis_username?: string | null;
  netsis_password?: string | null;
  netsis_timeout_ms?: number;
  netsis_request_host?: string | null;
  netsis_ping_path?: string | null;
};

export async function patchStoreNetsis(
  id: UUID,
  payload: StoreNetsisUpdate
): Promise<Store> {
  return apiPatch<Store>(`/stores/${id}/netsis`, payload);
}

export type NetsisTestResponse = { ok: boolean; message: string };

export async function testStoreNetsis(id: UUID): Promise<NetsisTestResponse> {
  return apiPost<NetsisTestResponse>(`/stores/${id}/netsis/test`);
}
