export type TransferStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'canceled';

export const TRANSFER_STATUSES: TransferStatus[] = [
  'scheduled',
  'in_progress',
  'completed',
  'failed',
  'canceled',
];

export function normalizeTransferStatus(raw: string | null | undefined): TransferStatus {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
  if (s === 'cancelled') return 'canceled';
  if ((TRANSFER_STATUSES as string[]).includes(s)) return s as TransferStatus;
  return 'scheduled';
}

export function transferStatusRank(status: TransferStatus | string): number {
  const order: TransferStatus[] = [
    'scheduled',
    'in_progress',
    'completed',
    'failed',
    'canceled',
  ];
  const normalized = normalizeTransferStatus(status);
  const i = order.indexOf(normalized);
  return i >= 0 ? i : order.length;
}

export function transferStatusBadgeClass(status: TransferStatus | string): string {
  const s = normalizeTransferStatus(status);
  switch (s) {
    case 'completed':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'in_progress':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'failed':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    case 'canceled':
      return 'border-zinc-200 bg-zinc-50 text-zinc-700';
    default:
      return 'border-gray-200 bg-gray-50 text-gray-700';
  }
}

export function canCancelTransfer(status: TransferStatus | string): boolean {
  const s = normalizeTransferStatus(status);
  return s !== 'canceled' && s !== 'completed';
}

export function canStartTransfer(status: TransferStatus | string): boolean {
  return normalizeTransferStatus(status) === 'scheduled';
}

export function canCompleteTransfer(status: TransferStatus | string): boolean {
  const s = normalizeTransferStatus(status);
  return s === 'scheduled' || s === 'in_progress';
}

/** Crew Jobs list uses installation-style UI statuses; scheduled transfers are startable like staged installs. */
export function mapTransferToCrewUiStatus(
  status: TransferStatus | string
): 'staged' | 'in_progress' | 'completed' | 'failed' | 'pending' {
  const s = normalizeTransferStatus(status);
  switch (s) {
    case 'scheduled':
      return 'staged';
    case 'in_progress':
      return 'in_progress';
    case 'completed':
      return 'completed';
    case 'failed':
      return 'failed';
    default:
      return 'pending';
  }
}
