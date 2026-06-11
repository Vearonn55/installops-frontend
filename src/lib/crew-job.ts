import type { Installation, CrewAssignment } from '../api/installations';
import type { Transfer, TransferCrewAssignment } from '../api/transfers';
import type { Store } from '../api/stores';
import type { NetsisOrderDetailData } from '../api/integrations';
import { isoToLocalYmd } from './local-date';
import {
  mapBackendInstallationToCrewUiStatus,
  pickInstallationRecordStatus,
  type CrewJobsUiStatus,
} from './installation-status';
import { mapTransferToCrewUiStatus, normalizeTransferStatus } from './transfer-status';
import { formatUiTime } from './date-display';

export type CrewWorkKind = 'installation' | 'transfer';

export type CrewJobView = {
  kind: CrewWorkKind;
  id: string;
  installCode: string;
  orderId: string;
  customerName: string;
  storeName: string;
  address: string;
  phone: string;
  crewNames: string[];
  start: string;
  end: string;
  status: CrewJobsUiStatus;
  notes?: string;
  customerPaymentNote?: string;
  /** Transfers only */
  transferCode?: string;
  externalTransferId?: string;
  sourceDepotCode?: number | null;
  destDepotCode?: number | null;
  sourceDepotLabel?: string | null;
  destDepotLabel?: string | null;
};

export function isCrewAssigned(inst: Installation, userId: string | undefined): boolean {
  if (!userId) return false;
  const crew = (inst.crew || []) as CrewAssignment[];
  return crew.some((c) => c.crew_user_id === userId);
}

export function isCrewCancelledRawStatus(raw: string): boolean {
  const s = (raw || '').trim().toLowerCase();
  return s === 'canceled' || s === 'cancelled';
}

/** Crew may view all assigned jobs except canceled installations. */
export function isCrewVisibleInstallation(inst: Installation): boolean {
  const raw = pickInstallationRecordStatus(inst as unknown as Record<string, unknown>);
  return !isCrewCancelledRawStatus(raw);
}

/** Staged: crew may press Start (→ in_progress). */
export function isCrewStartableStatus(status: CrewJobsUiStatus): boolean {
  return status === 'staged';
}

/** Checklist only after the job has been started (installations only). */
export function isCrewChecklistAllowedStatus(status: CrewJobsUiStatus): boolean {
  return status === 'in_progress';
}

export function isCrewChecklistAllowedForJob(job: Pick<CrewJobView, 'kind' | 'status'>): boolean {
  return job.kind === 'installation' && isCrewChecklistAllowedStatus(job.status);
}

/** Highlight / prioritize on home: work that can still be acted on. */
export function isCrewActionableStatus(status: CrewJobsUiStatus): boolean {
  return status === 'staged' || status === 'in_progress';
}

export function isCrewPendingStatus(status: CrewJobsUiStatus): boolean {
  return status === 'pending';
}

export function isCrewTerminalStatus(status: CrewJobsUiStatus): boolean {
  return status === 'completed' || status === 'failed' || status === 'after_sale';
}

/** View-only cards (pending or finished). */
export function isCrewPreviewOnlyStatus(status: CrewJobsUiStatus): boolean {
  return isCrewPendingStatus(status) || isCrewTerminalStatus(status);
}

/** i18n key for read-only banner on job detail, or null. */
export function crewReadOnlyBannerKey(status: CrewJobsUiStatus): string | null {
  if (status === 'pending') return 'crewPages.readOnlyPending';
  if (isCrewTerminalStatus(status)) return 'crewPages.readOnlyClosed';
  if (status === 'staged') return 'crewPages.readOnlyStaged';
  return null;
}

/** @deprecated Use isCrewChecklistAllowedStatus */
export function isCrewInteractiveStatus(status: CrewJobsUiStatus): boolean {
  return isCrewChecklistAllowedStatus(status);
}

export function installationAnchorIso(inst: Installation): string | null {
  return inst.scheduled_start || inst.created_at || null;
}

export function installationDayKey(inst: Installation): string | null {
  const anchor = installationAnchorIso(inst);
  return anchor ? isoToLocalYmd(anchor) : null;
}

export function isCrewAssignedTransfer(
  transfer: Transfer,
  userId: string | undefined
): boolean {
  if (!userId) return false;
  const crew = (transfer.crew || []) as TransferCrewAssignment[];
  return crew.some((c) => c.crew_user_id === userId);
}

export function isCrewVisibleTransfer(transfer: Transfer): boolean {
  return normalizeTransferStatus(transfer.status) !== 'canceled';
}

export function transferAnchorIso(transfer: Transfer): string | null {
  return transfer.scheduled_start || transfer.created_at || null;
}

export function transferDayKey(transfer: Transfer): string | null {
  const anchor = transferAnchorIso(transfer);
  return anchor ? isoToLocalYmd(anchor) : null;
}

function transferCrewMemberNames(transfer: Transfer): string[] {
  const crew = (transfer.crew || []) as TransferCrewAssignment[];
  return crew
    .map((c) => c.crew?.name?.trim() || c.crew_user_id)
    .filter(Boolean);
}

function formatDepotLabel(code?: number | null, label?: string | null): string {
  if (label?.trim()) return label.trim();
  if (code != null && !Number.isNaN(code)) return String(code);
  return '—';
}

export function buildCrewTransferView(transfer: Transfer): CrewJobView {
  const store = transfer.store;
  const status = mapTransferToCrewUiStatus(transfer.status) as CrewJobsUiStatus;
  const source = formatDepotLabel(transfer.source_depot_code, transfer.source_depot_label);
  const dest = formatDepotLabel(transfer.dest_depot_code, transfer.dest_depot_label);
  const start = transfer.scheduled_start ?? transfer.created_at;
  const end = transfer.scheduled_end ?? start;

  return {
    kind: 'transfer',
    id: transfer.id,
    installCode:
      transfer.transfer_code?.trim() || transfer.id.slice(0, 8).toUpperCase(),
    transferCode: transfer.transfer_code ?? undefined,
    externalTransferId: transfer.external_transfer_id,
    orderId: transfer.external_transfer_id,
    customerName: `${source} → ${dest}`,
    storeName: store?.name?.trim() || '—',
    address: transfer.location?.trim() || storeAddressLine(store) || '—',
    phone: '',
    sourceDepotCode: transfer.source_depot_code,
    destDepotCode: transfer.dest_depot_code,
    sourceDepotLabel: transfer.source_depot_label,
    destDepotLabel: transfer.dest_depot_label,
    crewNames: transferCrewMemberNames(transfer),
    start,
    end,
    status,
    notes: transfer.notes ?? undefined,
  };
}

export function crewJobDetailPath(job: Pick<CrewJobView, 'id' | 'kind'>): string {
  if (job.kind === 'transfer') {
    return `/crew/jobs/${job.id}?kind=transfer`;
  }
  return `/crew/jobs/${job.id}`;
}

export function crewMemberNames(inst: Installation): string[] {
  const crew = (inst.crew || []) as CrewAssignment[];
  return crew
    .map((c) => c.crew?.name?.trim() || c.crew_user_id)
    .filter(Boolean);
}

function storeAddressLine(store: Store | undefined): string {
  const addr = store?.address;
  if (!addr) return '';
  return [addr.line1, addr.line2, addr.city, addr.region, addr.postal_code]
    .filter(Boolean)
    .join(', ');
}

export function buildCrewJobView(
  inst: Installation,
  netsis?: NetsisOrderDetailData | null
): CrewJobView {
  const nc = netsis?.customer;
  const store = inst.store;
  const rawStatus = pickInstallationRecordStatus(inst as unknown as Record<string, unknown>);
  const status = mapBackendInstallationToCrewUiStatus(rawStatus);

  const customerName =
    inst.customer_name?.trim() ||
    (nc?.full_name && nc.full_name !== '—' ? nc.full_name : '') ||
    '—';

  const phone =
    inst.customer_phone?.trim() ||
    (nc?.phone && nc.phone !== '—' ? nc.phone : '') ||
    '';

  const address =
    inst.location?.trim() ||
    (nc?.address && nc.address !== '—' ? nc.address : '') ||
    storeAddressLine(store) ||
    (nc?.region && nc.region !== '—' ? nc.region : '') ||
    '—';

  const start = inst.scheduled_start ?? inst.created_at;
  const end = inst.scheduled_end ?? start;

  return {
    kind: 'installation',
    id: inst.id,
    installCode: inst.install_code?.trim() || inst.id.slice(0, 8).toUpperCase(),
    orderId: inst.external_order_id,
    customerName,
    storeName: store?.name?.trim() || '—',
    address,
    phone,
    crewNames: crewMemberNames(inst),
    start,
    end,
    status,
    notes: inst.notes ?? undefined,
    customerPaymentNote: inst.customer_payment_note?.trim() || undefined,
  };
}

export function crewJobCardClass(status: CrewJobsUiStatus): string {
  switch (status) {
    case 'staged':
      return 'border-blue-400 bg-blue-50';
    case 'in_progress':
      return 'border-amber-400 bg-amber-50';
    case 'completed':
      return 'border-emerald-300 bg-emerald-50';
    case 'failed':
      return 'border-red-300 bg-red-50';
    case 'after_sale':
      return 'border-violet-300 bg-violet-50';
    default:
      return 'border-gray-200 bg-white';
  }
}

export function crewStatusPillClass(status: CrewJobsUiStatus): string {
  switch (status) {
    case 'staged':
      return 'border-blue-300 bg-blue-100 text-blue-800';
    case 'in_progress':
      return 'border-amber-300 bg-amber-100 text-amber-900';
    case 'completed':
      return 'border-emerald-200 bg-emerald-100 text-emerald-800';
    case 'failed':
      return 'border-red-200 bg-red-100 text-red-800';
    case 'after_sale':
      return 'border-violet-200 bg-violet-100 text-violet-800';
    default:
      return 'border-gray-200 bg-gray-100 text-gray-700';
  }
}

export function crewStatusLabelKey(status: CrewJobsUiStatus): string {
  return `crewPages.status.${status}`;
}

export function mergeArpIntoCrewJobView(
  job: CrewJobView,
  arp: {
    full_name: string;
    phone: string;
    address: string;
    region: string;
  } | null | undefined
): CrewJobView {
  if (!arp) return job;
  return {
    ...job,
    customerName: arp.full_name !== '—' ? arp.full_name : job.customerName,
    phone: arp.phone !== '—' ? arp.phone : job.phone,
    address:
      arp.address !== '—'
        ? [arp.address, arp.region !== '—' ? arp.region : ''].filter(Boolean).join(', ')
        : job.address,
  };
}

export function fmtTimeRange(startISO: string, endISO: string): string {
  const f = (iso: string) => formatUiTime(iso);
  return `${f(startISO)}–${f(endISO)}`;
}
