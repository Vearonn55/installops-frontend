// /api/http.ts
import axios, { AxiosError } from 'axios';

const baseURL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '/api/v1';

export const apiClient = axios.create({
  baseURL,
  withCredentials: true, // required for cookie-based session (same origin)
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Ensure credentials are always sent (e.g. for cookie-based auth)
apiClient.defaults.withCredentials = true;

export type ApiErrorBody = {
  error: string;
  message: string;
  request_id?: string;
};

export function isAxiosError<T = unknown>(
  error: unknown
): error is AxiosError<T> {
  return axios.isAxiosError(error);
}

export async function apiGet<T>(url: string, config?: any): Promise<T> {
  const res = await apiClient.get<T>(url, config);
  return res.data;
}

export async function apiPost<T>(
  url: string,
  data?: any,
  config?: any
): Promise<T> {
  const res = await apiClient.post<T>(url, data, config);
  return res.data;
}

export async function apiPatch<T>(
  url: string,
  data?: any,
  config?: any
): Promise<T> {
  const res = await apiClient.patch<T>(url, data, config);
  return res.data;
}

export async function apiDelete<T = void>(
  url: string,
  config?: any
): Promise<T> {
  const res = await apiClient.delete<T>(url, config);
  return res.data;
}

// Type alias for IDs used in the API
export type UUID = string;

// Dummy runtime export so `import { UUID } from '../../api/http'`
// does not crash at module load. You will never actually use this as a value.
export const UUID = '' as unknown as UUID;
