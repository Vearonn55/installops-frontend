// /api/installations.ts
import { apiGet, apiPost, apiPatch, apiDelete, UUID } from './http';
import type { Store } from './stores';
import type { User } from './users';

export type InstallStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'canceled'
  | 'staged'
  | 'after_sale_service';

export type InstallationItem = {
  id: UUID;
  installation_id: UUID;
  external_product_id: string;
  quantity: number;
  room_tag?: string | null;
  special_instructions?: string | null;
  created_at: string;
  updated_at: string;
};

export type InstallationItemCreate = {
  external_product_id: string;
  quantity?: number;
  room_tag?: string | null;
  special_instructions?: string | null;
};

export type CrewAssignment = {
  id: UUID;
  installation_id: UUID;
  crew_user_id: UUID;
  role?: string | null;
  accepted_at?: string | null;
  declined_at?: string | null;
  created_at: string;
  updated_at: string;
  // Note: schema does not embed User, but you might join on backend later
};

export type CrewAssignmentCreate = {
  crew_user_id: UUID;
  role?: string | null;
};

export type Installation = {
  id: UUID;
  // human-readable code like "INST-00004" (returned by backend)
  install_code?: string;
  external_order_id: string;
  store_id: UUID;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  status: InstallStatus;
  notes?: string | null;
  created_by?: UUID;
  updated_by?: UUID;
  created_at: string;
  updated_at: string;
  items?: InstallationItem[];
  crew?: CrewAssignment[];
  store?: Store;
  created_by_user?: User;
};

export type InstallationList = {
  data: Installation[];
  limit: number;
  offset: number;
};

export type InstallationCreate = {
  external_order_id: string;
  store_id: string;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  status?: InstallStatus;
  difficulty?: 'easy' | 'intermediate' | 'hard' | null;
  notes?: string | null;
};

export type ListInstallationsParams = {
  external_order_id?: string;
  store_id?: UUID;
  status?: InstallStatus;
  limit?: number;
  offset?: number;
};

export type UpdateSchedulePayload = {
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  notes?: string | null;
};

export type UpdateStatusPayload = {
  status: InstallStatus;
};

export type PaginatedInstallationItems = {
  data: InstallationItem[];
  total: number;
  limit: number;
  offset: number;
};

export type PaginatedCrewAssignments = {
  data: CrewAssignment[];
  total: number;
  limit: number;
  offset: number;
};

export type UpdateInstallationItemPayload = {
  quantity?: number;
  room_tag?: string | null;
  special_instructions?: string | null;
};

export type UpdateCrewAssignmentPayload = {
  role?: string | null;
  accepted?: boolean;
  declined?: boolean;
};

// core installation endpoints
export async function listInstallations(
  params?: ListInstallationsParams
): Promise<InstallationList> {
  return apiGet<InstallationList>('/installations', { params });
}

export async function createInstallation(
  payload: InstallationCreate
): Promise<Installation> {
  return apiPost<Installation>('/installations', payload);
}

export async function getInstallation(id: UUID): Promise<Installation> {
  return apiGet<Installation>(`/installations/${id}`);
}

export async function updateInstallationSchedule(
  id: UUID,
  payload: UpdateSchedulePayload
): Promise<Installation> {
  return apiPatch<Installation>(`/installations/${id}`, payload);
}

export async function updateInstallationStatus(
  id: UUID,
  payload: UpdateStatusPayload
): Promise<Installation> {
  return apiPatch<Installation>(`/installations/${id}/status`, payload);
}

// items
export async function listInstallationItems(
  installationId: UUID,
  params?: { limit?: number; offset?: number }
): Promise<PaginatedInstallationItems> {
  return apiGet<PaginatedInstallationItems>(
    `/installations/${installationId}/items`,
    { params }
  );
}

export async function addInstallationItem(
  installationId: UUID,
  payload: InstallationItemCreate
): Promise<InstallationItem> {
  return apiPost<InstallationItem>(
    `/installations/${installationId}/items`,
    payload
  );
}

export async function updateInstallationItem(
  installationId: UUID,
  itemId: UUID,
  payload: UpdateInstallationItemPayload
): Promise<InstallationItem> {
  return apiPatch<InstallationItem>(
    `/installations/${installationId}/items/${itemId}`,
    payload
  );
}

export async function deleteInstallationItem(
  installationId: UUID,
  itemId: UUID
): Promise<void> {
  await apiDelete<void>(`/installations/${installationId}/items/${itemId}`);
}

// crew
export async function listInstallationCrew(
  installationId: UUID,
  params?: { limit?: number; offset?: number }
): Promise<PaginatedCrewAssignments> {
  return apiGet<PaginatedCrewAssignments>(
    `/installations/${installationId}/crew`,
    { params }
  );
}

export async function assignCrew(
  installationId: UUID,
  payload: CrewAssignmentCreate
): Promise<CrewAssignment> {
  return apiPost<CrewAssignment>(
    `/installations/${installationId}/crew`,
    payload
  );
}

export async function updateCrewAssignment(
  installationId: UUID,
  assignmentId: UUID,
  payload: UpdateCrewAssignmentPayload
): Promise<CrewAssignment> {
  return apiPatch<CrewAssignment>(
    `/installations/${installationId}/crew/${assignmentId}`,
    payload
  );
}

export async function deleteCrewAssignment(
  installationId: UUID,
  assignmentId: UUID
): Promise<void> {
  await apiDelete<void>(`/installations/${installationId}/crew/${assignmentId}`);
}
