import { apiGet, apiPost, UUID } from './http';

export type SoftwareIssueCreator = {
  id: UUID;
  name: string;
  email?: string;
  role: string | null;
};

export type SoftwareIssueStore = {
  id: UUID;
  name: string;
};

export type SoftwareIssue = {
  id: UUID;
  store_id: UUID | null;
  created_by_user_id: UUID;
  subject: string;
  body: string;
  created_at: string;
  updated_at: string;
  creator?: SoftwareIssueCreator;
  store?: SoftwareIssueStore;
};

export type SoftwareIssueCreateResponse = {
  id: UUID;
  subject: string;
  created_at: string;
};

export async function createSoftwareIssue(payload: {
  subject: string;
  body: string;
}): Promise<SoftwareIssueCreateResponse> {
  return apiPost<SoftwareIssueCreateResponse>('/software-issues', payload);
}

export async function listSoftwareIssues(params?: {
  limit?: number;
  offset?: number;
  store_id?: UUID;
  q?: string;
}): Promise<{ data: SoftwareIssue[]; total: number; limit: number; offset: number }> {
  const search = new URLSearchParams();
  if (params?.limit != null) search.set('limit', String(params.limit));
  if (params?.offset != null) search.set('offset', String(params.offset));
  if (params?.store_id) search.set('store_id', params.store_id);
  if (params?.q) search.set('q', params.q);
  const qs = search.toString();
  return apiGet(`/software-issues${qs ? `?${qs}` : ''}`);
}
