// /api/stores.ts
import { apiGet, apiPost, apiPatch, UUID } from './http';
import type { Address } from './addresses';

/** Store list/detail — no Netsis credentials or infrastructure. */
export type Store = {
  id: UUID;
  name: string;
  external_store_id?: string | null;
  address_id?: UUID | null;
  phone?: string | null;
  timezone?: string | null;
  /** True when store has enough Netsis config to search orders. */
  netsis_configured?: boolean;
  /** Order combobox mode without exposing hosts or credentials. */
  netsis_orders_search_source?: 'http' | 'sql';
  created_at: string;
  updated_at: string;
  address?: Address;
  /** Public Google review link for crew QR on checklist (when configured). */
  google_review_url?: string | null;
};

/** Admin-only Netsis config (GET/PATCH /stores/:id/netsis). */
export type StoreNetsisConfig = Store & {
  netsis_base_url?: string | null;
  netsis_order_search_path?: string | null;
  netsis_order_detail_path?: string | null;
  netsis_order_lines_path?: string | null;
  /** NetOpenX: column for {query_sql} LIKE fragment (server default FISNO). */
  netsis_search_q_like_column?: string | null;
  netsis_username?: string | null;
  netsis_password_configured?: boolean;
  netsis_timeout_ms?: number;
  /** HTTP Host header override, e.g. localhost:7072 */
  netsis_request_host?: string | null;
  /** Path for connectivity test only (default /api/v2/public/Ping) */
  netsis_ping_path?: string | null;
  netsis_auth_mode?: 'basic' | 'token_password' | null;
  netsis_token_path?: string | null;
  netsis_branch_code?: string | null;
  netsis_db_name?: string | null;
  netsis_db_user?: string | null;
  netsis_db_password_configured?: boolean;
  netsis_db_type?: string | null;
  netsis_sql_host?: string | null;
  netsis_sql_port?: number | null;
  netsis_sql_encrypt?: boolean | null;
  netsis_sql_trust_server_certificate?: boolean | null;
  netsis_order_sql?: string | null;
  /** When true, order detail lines enriched from TBLSSATIRAC via SQL Server. */
  netsis_sql_line_aciklama?: boolean | null;
  /** When true, parse kalem Ekalan (#name# #K:code#) on HTTP order detail. */
  netsis_ekalan_parse?: boolean | null;
};

export type StoreList = {
  data: Store[];
  limit: number;
  offset: number;
};

export type StoreCreate = {
  name: string;
  external_store_id?: string | null;
  address_id?: UUID | null;
  phone?: string | null;
  timezone?: string | null;
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

export async function getStoreNetsis(id: UUID): Promise<StoreNetsisConfig> {
  return apiGet<StoreNetsisConfig>(`/stores/${id}/netsis`);
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
  netsis_order_detail_path?: string | null;
  netsis_order_lines_path?: string | null;
  netsis_search_q_like_column?: string | null;
  netsis_username?: string | null;
  netsis_password?: string | null;
  netsis_timeout_ms?: number;
  netsis_request_host?: string | null;
  netsis_ping_path?: string | null;
  netsis_auth_mode?: 'basic' | 'token_password' | null;
  netsis_token_path?: string | null;
  netsis_branch_code?: string | null;
  netsis_db_name?: string | null;
  netsis_db_user?: string | null;
  netsis_db_password?: string | null;
  /** When true, removes stored SQL dbpassword (use after a mistaken save). */
  netsis_clear_db_password?: boolean;
  /** When true, removes stored Netsis API / token form password. */
  netsis_clear_password?: boolean;
  netsis_db_type?: string | null;
  netsis_orders_search_source?: 'http' | 'sql' | null;
  netsis_sql_host?: string | null;
  netsis_sql_port?: number | null;
  netsis_sql_encrypt?: boolean | null;
  netsis_sql_trust_server_certificate?: boolean | null;
  netsis_order_sql?: string | null;
  /** When true, order detail lines enriched from TBLSSATIRAC via SQL Server. */
  netsis_sql_line_aciklama?: boolean | null;
  /** When true, parse kalem Ekalan (#name# #K:code#) on HTTP order detail. */
  netsis_ekalan_parse?: boolean | null;
};

export async function patchStoreNetsis(
  id: UUID,
  payload: StoreNetsisUpdate
): Promise<StoreNetsisConfig> {
  return apiPatch<StoreNetsisConfig>(`/stores/${id}/netsis`, payload);
}

export type NetsisTestResponse = { ok: boolean; message: string };

export async function testStoreNetsis(id: UUID): Promise<NetsisTestResponse> {
  return apiPost<NetsisTestResponse>(`/stores/${id}/netsis/test`);
}

export type StoreGoogleReviewConfig = {
  id: UUID;
  name: string;
  google_review_url: string | null;
};

export async function getStoreGoogleReview(id: UUID): Promise<StoreGoogleReviewConfig> {
  return apiGet<StoreGoogleReviewConfig>(`/stores/${id}/google-review`);
}

export async function patchStoreGoogleReview(
  id: UUID,
  payload: { google_review_url: string | null }
): Promise<Store> {
  return apiPatch<Store>(`/stores/${id}/google-review`, payload);
}
