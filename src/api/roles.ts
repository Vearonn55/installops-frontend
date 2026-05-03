// src/api/roles.ts
import { apiGet, apiPost, apiPatch, UUID } from './http';

export type Role = {
  id: UUID;
  name: string;
  permissions: string[];
  created_at: string;
  updated_at: string;
};

export type RoleList = {
  data: Role[];
  limit: number;
  offset: number;
};

export type ListRolesParams = {
  q?: string;
  limit?: number;
  offset?: number;
};

export async function listRoles(
  params?: ListRolesParams
): Promise<RoleList> {
  return apiGet<RoleList>('/roles', { params });
}

export type RoleCreate = {
  name: string;
  permissions: string[];
};

export type RoleUpdate = {
  name?: string;
  permissions?: string[];
};

export async function createRole(payload: RoleCreate): Promise<Role> {
  return apiPost<Role>('/roles', payload);
}

export async function updateRole(id: UUID, payload: RoleUpdate): Promise<Role> {
  return apiPatch<Role>(`/roles/${id}`, payload);
}
