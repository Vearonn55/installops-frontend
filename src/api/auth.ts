// /api/auth.ts
import { apiGet, apiPost, UUID } from './http';

export type AuthLoginRequest = {
  email: string;
  password: string;
};

export type AuthTokenResponse = {
  message?: string; // "login_ok"
  user?: {
    id: UUID;
    name: string;
    email: string;
    role: string; // "admin" etc
  };
};

export type AuthMeResponse = {
  id: UUID;
  role_id: UUID;
  role: string;
  permissions: string[];
  name?: string | null;
  email?: string | null;
};

export type LogoutResponse = {
  message: string; // "logged_out"
};

export type BootstrapRegisterRequest = {
  name: string;
  email: string;
  password: string;
};

export async function login(
  payload: AuthLoginRequest
): Promise<AuthTokenResponse> {
  return apiPost<AuthTokenResponse>('/auth/login', payload);
}

export async function getCurrentUser(): Promise<AuthMeResponse> {
  return apiGet<AuthMeResponse>('/auth/me');
}

export async function logout(): Promise<LogoutResponse> {
  return apiPost<LogoutResponse>('/auth/logout');
}

// First-user bootstrap registration (201, likely no body, so we use unknown/void)
export async function bootstrapRegister(
  payload: BootstrapRegisterRequest
): Promise<void> {
  await apiPost<unknown>('/auth/register', payload);
}
