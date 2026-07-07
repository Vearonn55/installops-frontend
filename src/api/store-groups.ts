import { apiDelete, apiGet, apiPatch, apiPost, UUID } from './http';

export type StoreGroupStore = {
  id: UUID;
  name: string;
};

export type StoreGroup = {
  id: UUID;
  name: string;
  created_at: string;
  updated_at: string;
  store_count: number;
  stores: StoreGroupStore[];
};

export type StoreGroupList = {
  data: StoreGroup[];
};

export async function listStoreGroups(): Promise<StoreGroupList> {
  return apiGet<StoreGroupList>('/store-groups');
}

export async function createStoreGroup(payload: { name: string }): Promise<StoreGroup> {
  return apiPost<StoreGroup>('/store-groups', payload);
}

export async function updateStoreGroup(
  id: UUID,
  payload: { name: string }
): Promise<StoreGroup> {
  return apiPatch<StoreGroup>(`/store-groups/${id}`, payload);
}

export async function deleteStoreGroup(id: UUID): Promise<void> {
  await apiDelete(`/store-groups/${id}`);
}
