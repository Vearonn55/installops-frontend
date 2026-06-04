import { apiGet, apiPost, UUID } from './http';

export type InstallationIssueCreator = {
  id: UUID;
  name: string;
  email?: string;
  role: string | null;
};

export type InstallationIssueInstallation = {
  id: UUID;
  external_order_id: string;
  install_code?: string;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
};

export type InstallationIssueStore = {
  id: UUID;
  name: string;
};

export type InstallationIssue = {
  id: UUID;
  installation_id: UUID;
  store_id: UUID;
  created_by_user_id: UUID;
  body: string;
  created_at: string;
  updated_at: string;
  creator?: InstallationIssueCreator;
  installation?: InstallationIssueInstallation;
  store?: InstallationIssueStore;
};

export type InstallationIssueCreateResponse = {
  id: UUID;
  installation_id: UUID;
  created_at: string;
};

export async function createInstallationIssue(payload: {
  installation_id: UUID;
  body: string;
}): Promise<InstallationIssueCreateResponse> {
  return apiPost<InstallationIssueCreateResponse>('/installation-issues', payload);
}

export async function listInstallationIssues(params?: {
  limit?: number;
  offset?: number;
  store_id?: UUID;
  q?: string;
}): Promise<{ data: InstallationIssue[]; total: number; limit: number; offset: number }> {
  const search = new URLSearchParams();
  if (params?.limit != null) search.set('limit', String(params.limit));
  if (params?.offset != null) search.set('offset', String(params.offset));
  if (params?.store_id) search.set('store_id', params.store_id);
  if (params?.q) search.set('q', params.q);
  const qs = search.toString();
  return apiGet(`/installation-issues${qs ? `?${qs}` : ''}`);
}
