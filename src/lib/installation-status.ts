/**
 * Normalize installation status from API payloads (handles odd casings / keys).
 */
export function pickInstallationRecordStatus(
  inst: Record<string, unknown> | null | undefined
): string {
  if (!inst || typeof inst !== 'object') return '';
  const candidates = [
    inst.status,
    inst.installation_status,
    inst.installationStatus,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim().toLowerCase();
  }
  return '';
}

export type CrewJobsUiStatus =
  | 'pending'
  | 'staged'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'after_sale';

export function mapBackendInstallationToCrewUiStatus(raw: string): CrewJobsUiStatus {
  const s = (raw || '').trim().toLowerCase();
  switch (s) {
    case 'staged':
      return 'staged';
    case 'in_progress':
      return 'in_progress';
    case 'completed':
      return 'completed';
    case 'failed':
      return 'failed';
    case 'after_sale_service':
      return 'after_sale';
    case 'canceled':
    case 'cancelled':
      return 'failed';
    case 'scheduled':
      return 'pending';
    default:
      return 'pending';
  }
}
