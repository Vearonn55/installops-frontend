// /api/users.ts
import { apiGet, apiPost, apiPatch, UUID } from './http';

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
  status: UserStatus;
  created_at: string;
  updated_at: string;
  role?: RoleSummary | null;
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
};

export type UserUpdate = {
  name?: string;
  email?: string;
  role_id?: UUID;
  status?: UserStatus;
  phone?: string | null;
};

export type UserPasswordUpdate = {
  new_password: string;
  /** Required when changing your own password. */
  current_password?: string;
};

export type ListUsersParams = {
  q?: string;
  role_id?: UUID;
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
