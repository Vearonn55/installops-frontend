// /api/checklists.ts
import { apiGet, apiPost, apiPatch, UUID } from './http';

export type ChecklistItem = {
  id: UUID;
  template_id: UUID;
  key: string;
  label: string;
  type: string;
  required: boolean;
  order_index: number;
  rules?: Record<string, unknown> | null;
  help_text?: string | null;
  options?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type ChecklistItemCreate = {
  key: string;
  label: string;
  type?: string;
  required?: boolean;
  order_index?: number;
  rules?: Record<string, unknown> | null;
  help_text?: string | null;
  options?: Record<string, unknown> | null;
};

export type ChecklistItemUpdate = {
  key?: string;
  label?: string;
  type?: string;
  required?: boolean;
  order_index?: number;
  rules?: Record<string, unknown> | null;
  help_text?: string | null;
  options?: Record<string, unknown> | null;
};

export type ChecklistTemplate = {
  id: UUID;
  name: string;
  version?: string | null;
  description?: string | null;
  rules?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  items?: ChecklistItem[];
};

export type ChecklistTemplateCreate = {
  name: string;
  version?: string | null;
  description?: string | null;
  rules?: Record<string, unknown> | null;
};

export type ChecklistTemplateUpdate = Partial<ChecklistTemplateCreate>;

export type ChecklistTemplateList = {
  data: ChecklistTemplate[];
  total: number;
  limit: number;
  offset: number;
};

export type ChecklistResponse = {
  id: UUID;
  installation_id: UUID;
  item_id: UUID;
  value?: unknown;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  item?: ChecklistItem;
};

export type ChecklistResponseList = {
  // spec does not define shape in detail, so we keep generic
  data?: ChecklistResponse[];
  limit?: number;
  offset?: number;
  total?: number;
};

// list templates
export async function listChecklistTemplates(params?: {
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<ChecklistTemplateList> {
  return apiGet<ChecklistTemplateList>('/checklist-templates', { params });
}

export async function createChecklistTemplate(
  payload: ChecklistTemplateCreate
): Promise<void> {
  await apiPost<unknown>('/checklist-templates', payload);
}

export async function getChecklistTemplate(
  id: UUID
): Promise<ChecklistTemplate> {
  return apiGet<ChecklistTemplate>(`/checklist-templates/${id}`);
}

export async function updateChecklistTemplate(
  id: UUID,
  payload: ChecklistTemplateUpdate
): Promise<void> {
  await apiPatch<unknown>(`/checklist-templates/${id}`, payload);
}

export async function listChecklistTemplateItems(
  templateId: UUID,
  params?: { limit?: number; offset?: number }
): Promise<unknown> {
  // response schema is not detailed; keep as unknown and cast in components if needed
  return apiGet<unknown>(`/checklist-templates/${templateId}/items`, {
    params,
  });
}

export async function createChecklistTemplateItem(
  templateId: UUID,
  payload: ChecklistItemCreate
): Promise<void> {
  await apiPost<unknown>(`/checklist-templates/${templateId}/items`, payload);
}

export async function updateChecklistItem(
  itemId: UUID,
  payload: ChecklistItemUpdate
): Promise<void> {
  await apiPatch<unknown>(`/checklist-items/${itemId}`, payload);
}

// responses per installation
export type UpsertChecklistResponsePayload = {
  item_id: UUID;
  value?: unknown;
  completed_at?: string | null;
};

export type BulkChecklistResponseEntry = {
  key: string;
  value?: unknown;
};

export type BulkUpsertChecklistResponsesPayload = {
  responses: BulkChecklistResponseEntry[];
  completed_at?: string | null;
};

export type UpdateChecklistResponsePayload = {
  value?: Record<string, unknown> | null;
  completed_at?: string | null;
};

export async function listChecklistResponsesForInstallation(
  installationId: UUID,
  params?: { limit?: number; offset?: number }
): Promise<ChecklistResponseList> {
  return apiGet<ChecklistResponseList>(
    `/installations/${installationId}/checklist-responses`,
    { params }
  );
}

export async function upsertChecklistResponse(
  installationId: UUID,
  payload: UpsertChecklistResponsePayload
): Promise<void> {
  await apiPost<unknown>(
    `/installations/${installationId}/checklist-responses`,
    payload
  );
}

export async function bulkUpsertChecklistResponses(
  installationId: UUID,
  payload: BulkUpsertChecklistResponsesPayload
): Promise<ChecklistResponseList> {
  return apiPost<ChecklistResponseList>(
    `/installations/${installationId}/checklist-responses/bulk`,
    payload
  );
}

export async function updateChecklistResponse(
  responseId: UUID,
  payload: UpdateChecklistResponsePayload
): Promise<void> {
  await apiPatch<unknown>(`/checklist-responses/${responseId}`, payload);
}
