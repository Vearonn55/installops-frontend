// /api/users.ts
import { apiDelete, apiGet, apiPost, apiPatch, UUID } from './http';

import type { Store } from './stores';

export type UserStatus = 'active' | 'disabled';

export type RoleSummary = {
  id: UUID;
  name: string;
  permissions: string[];
};

export type User = {
  id: UUID;
  name: string;
  email: string;
  phone?: string | null;
  role_id: UUID;
  store_id?: UUID | null;
  status: UserStatus;
  created_at: string;
  updated_at: string;
  role?: RoleSummary | null;
  store?: Pick<Store, 'id' | 'name'> | null;
};

export type UserList = {
  data: User[];
  limit: number;
  offset: number;
};

export type UserCreate = {
  name: string;
  email: string;
  password: string;
  role_id: UUID;
  phone?: string | null;
  store_id?: UUID | null;
};

export type UserUpdate = {
  name?: string;
  email?: string;
  role_id?: UUID;
  status?: UserStatus;
  phone?: string | null;
  store_id?: UUID | null;
};

export type UserPasswordUpdate = {
  new_password: string;
  /** Required when changing your own password. */
  current_password?: string;
};

export type ListUsersParams = {
  q?: string;
  role_id?: UUID;
  store_id?: UUID;
  status?: UserStatus;
  limit?: number;
  offset?: number;
};

export async function listUsers(
  params?: ListUsersParams
): Promise<UserList> {
  return apiGet<UserList>('/users', { params });
}

export async function createUser(payload: UserCreate): Promise<User> {
  return apiPost<User>('/users', payload);
}

export async function getUser(id: UUID): Promise<User> {
  return apiGet<User>(`/users/${id}`);
}

export async function updateUser(
  id: UUID,
  payload: UserUpdate
): Promise<User> {
  return apiPatch<User>(`/users/${id}`, payload);
}

export type PasswordUpdateResponse = {
  message: string; // "password_updated"
  user_id: UUID;
};

export async function updateUserPassword(
  id: UUID,
  payload: UserPasswordUpdate
): Promise<PasswordUpdateResponse> {
  return apiPatch<PasswordUpdateResponse>(`/users/${id}/password`, payload);
}

export async function deleteUser(id: UUID): Promise<void> {
  await apiDelete<void>(`/users/${id}`);
}
