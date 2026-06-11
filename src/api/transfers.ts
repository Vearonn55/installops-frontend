// /api/transfers.ts
import { apiGet, apiPost, apiPatch, apiDelete, UUID } from './http';
import type { Store } from './stores';
import type { User } from './users';

export type TransferStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'canceled';

export type TransferItem = {
  id: UUID;
  transfer_id: UUID;
  external_product_id: string;
  quantity: number;
  room_tag?: string | null;
  special_instructions?: string | null;
  created_at: string;
  updated_at: string;
};

export type TransferItemCreate = {
  external_product_id: string;
  quantity?: number;
  room_tag?: string | null;
  special_instructions?: string | null;
};

export type TransferCrewAssignment = {
  id: UUID;
  transfer_id: UUID;
  crew_user_id: UUID;
  role?: string | null;
  accepted_at?: string | null;
  declined_at?: string | null;
  created_at: string;
  updated_at: string;
  crew?: { id: UUID; name: string; email?: string };
};

export type TransferCrewAssignmentCreate = {
  crew_user_id: UUID;
  role?: string | null;
};

export type Transfer = {
  id: UUID;
  transfer_code?: string;
  external_transfer_id: string;
  store_id: UUID;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  status: TransferStatus;
  notes?: string | null;
  location?: string | null;
  erp_date?: string | null;
  source_depot_code?: number | null;
  dest_depot_code?: number | null;
  source_depot_label?: string | null;
  dest_depot_label?: string | null;
  failure_reason?: string | null;
  crew_notes?: string | null;
  created_by?: UUID;
  updated_by?: UUID;
  created_at: string;
  updated_at: string;
  items?: TransferItem[];
  crew?: TransferCrewAssignment[];
  store?: Store;
  created_by_user?: User;
};

export type TransferList = {
  data: Transfer[];
  limit: number;
  offset: number;
};

export type TransferCreate = {
  external_transfer_id: string;
  store_id: string;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  status?: TransferStatus;
  notes?: string | null;
  location?: string | null;
  erp_date?: string | null;
  source_depot_code?: number | null;
  dest_depot_code?: number | null;
  items?: TransferItemCreate[];
};

export type ListTransfersParams = {
  external_transfer_id?: string;
  store_id?: UUID;
  status?: TransferStatus;
  q?: string;
  limit?: number;
  offset?: number;
};

export type UpdateTransferPayload = {
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  notes?: string | null;
  location?: string | null;
  erp_date?: string | null;
  source_depot_code?: number | null;
  dest_depot_code?: number | null;
  source_depot_label?: string | null;
  dest_depot_label?: string | null;
};

export type UpdateTransferStatusPayload = {
  status: TransferStatus;
};

export type PaginatedTransferItems = {
  data: TransferItem[];
  total: number;
  limit: number;
  offset: number;
};

export type PaginatedTransferCrew = {
  data: TransferCrewAssignment[];
  total: number;
  limit: number;
  offset: number;
};

export type TransferTimelineRow = {
  id: string;
  at: string;
  action: string;
  entity?: string;
  entity_id?: string;
  data?: Record<string, unknown> | null;
  actor_id?: string | null;
  transfer_id?: string;
  transfer_code?: string;
};

export type TransferTimelineResponse = {
  transfer_id: UUID;
  transfer_code?: string;
  status: TransferStatus;
  timeline: {
    data: TransferTimelineRow[];
    total: number;
    limit: number;
    offset: number;
  };
};

export type TransferMediaAsset = {
  id: UUID;
  transfer_id: UUID;
  url: string;
  type: 'photo' | 'signature';
  tags?: Record<string, unknown> | string[];
  sha256?: string | null;
  metadata?: Record<string, unknown> | null;
  created_by?: UUID;
  created_at: string;
};

export type PaginatedTransferMedia = {
  data: TransferMediaAsset[];
  total: number;
  limit: number;
  offset: number;
};

export async function listTransfers(
  params?: ListTransfersParams
): Promise<TransferList> {
  return apiGet<TransferList>('/transfers', { params });
}

export async function createTransfer(payload: TransferCreate): Promise<Transfer> {
  return apiPost<Transfer>('/transfers', payload);
}

export async function getTransfer(id: UUID): Promise<Transfer> {
  return apiGet<Transfer>(`/transfers/${id}`);
}

export async function updateTransfer(
  id: UUID,
  payload: UpdateTransferPayload
): Promise<Transfer> {
  return apiPatch<Transfer>(`/transfers/${id}`, payload);
}

export async function updateTransferStatus(
  id: UUID,
  payload: UpdateTransferStatusPayload
): Promise<Transfer> {
  return apiPatch<Transfer>(`/transfers/${id}/status`, payload);
}

export async function deleteTransfer(id: UUID): Promise<void> {
  await apiDelete<void>(`/transfers/${id}`);
}

export async function getTransferTimeline(
  id: UUID,
  params?: { limit?: number; offset?: number }
): Promise<TransferTimelineResponse> {
  return apiGet<TransferTimelineResponse>(`/transfers/${id}/timeline`, { params });
}

export async function listTransferItems(
  transferId: UUID,
  params?: { limit?: number; offset?: number }
): Promise<PaginatedTransferItems> {
  return apiGet<PaginatedTransferItems>(`/transfers/${transferId}/items`, { params });
}

export async function addTransferItem(
  transferId: UUID,
  payload: TransferItemCreate
): Promise<TransferItem> {
  return apiPost<TransferItem>(`/transfers/${transferId}/items`, payload);
}

export async function listTransferCrew(
  transferId: UUID,
  params?: { limit?: number; offset?: number }
): Promise<PaginatedTransferCrew> {
  return apiGet<PaginatedTransferCrew>(`/transfers/${transferId}/crew`, { params });
}

export async function assignTransferCrew(
  transferId: UUID,
  payload: TransferCrewAssignmentCreate
): Promise<TransferCrewAssignment> {
  return apiPost<TransferCrewAssignment>(`/transfers/${transferId}/crew`, payload);
}

export async function deleteTransferCrewAssignment(
  transferId: UUID,
  assignmentId: UUID
): Promise<void> {
  await apiDelete<void>(`/transfers/${transferId}/crew/${assignmentId}`);
}

export async function listTransferMedia(
  transferId: UUID,
  params?: { limit?: number; offset?: number }
): Promise<PaginatedTransferMedia> {
  return apiGet<PaginatedTransferMedia>(`/transfers/${transferId}/media`, { params });
}

export async function updateTransferFailureReason(
  id: UUID,
  payload: { failure_reason: string | null }
): Promise<Transfer> {
  return apiPatch<Transfer>(`/transfers/${id}/failure-reason`, payload);
}

export async function upsertTransferCrewNotes(
  id: UUID,
  payload: { crew_notes: string | null }
): Promise<Transfer> {
  return apiPatch<Transfer>(`/transfers/${id}/crew-notes`, payload);
}
