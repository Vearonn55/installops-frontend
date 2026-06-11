import type { TransferTimelineRow } from '../api/transfers';
import { normalizeTransferStatus } from './transfer-status';

export type TransferTimelineTone = 'success' | 'warning' | 'danger' | 'info';

export type TransferTimelineViewEvent = {
  id: string;
  date: string;
  tone: TransferTimelineTone;
  headline: string;
  detail?: string;
};

const MAX_NOTE_PREVIEW = 140;

function prettyTransferStatus(raw: string | undefined): string {
  if (!raw || typeof raw !== 'string') return '—';
  const k = normalizeTransferStatus(raw);
  const map: Record<typeof k, string> = {
    scheduled: 'Scheduled',
    in_progress: 'In progress',
    completed: 'Completed',
    failed: 'Failed',
    canceled: 'Canceled',
  };
  return map[k] ?? raw.replace(/_/g, ' ');
}

function prefix(row: TransferTimelineRow): string {
  return row.transfer_code ? `${row.transfer_code} · ` : '';
}

function truncateNote(text: string): string {
  const t = text.trim();
  if (t.length <= MAX_NOTE_PREVIEW) return t;
  return `${t.slice(0, MAX_NOTE_PREVIEW - 1)}…`;
}

export function auditRowToTransferTimelineEvent(
  row: TransferTimelineRow
): TransferTimelineViewEvent {
  const action = String(row.action || '');
  const a = action.toLowerCase();
  const data = row.data as Record<string, unknown> | null | undefined;
  const p = prefix(row);

  if (a === 'transfer.update_status') {
    const before = (data?.before as { status?: string } | undefined)?.status;
    const after = (data?.after as { status?: string } | undefined)?.status;
    const afterLower = normalizeTransferStatus(after);
    const tone: TransferTimelineTone =
      afterLower === 'failed' || afterLower === 'canceled'
        ? 'danger'
        : afterLower === 'completed'
          ? 'success'
          : 'info';
    return {
      id: String(row.id),
      date: row.at,
      tone,
      headline: `${p}Status: ${prettyTransferStatus(before)} → ${prettyTransferStatus(after)}`,
    };
  }

  if (a === 'transfer.update') {
    const before = data?.before as Record<string, unknown> | undefined;
    const after = data?.after as Record<string, unknown> | undefined;
    const parts: string[] = [];
    if (before && after) {
      if (before.scheduled_start !== after.scheduled_start || before.scheduled_end !== after.scheduled_end) {
        parts.push('Schedule');
      }
      if (before.notes !== after.notes) parts.push('Notes');
      if (before.location !== after.location) parts.push('Location');
      if (
        before.source_depot_label !== after.source_depot_label ||
        before.dest_depot_label !== after.dest_depot_label
      ) {
        parts.push('Depot labels');
      }
    }
    const summary =
      parts.length === 0
        ? 'Details updated'
        : parts.length === 1
          ? `${parts[0]} updated`
          : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]} updated`;
    return {
      id: String(row.id),
      date: row.at,
      tone: 'info',
      headline: `${p}${summary}`,
    };
  }

  if (a === 'transfer.create') {
    return {
      id: String(row.id),
      date: row.at,
      tone: 'success',
      headline: `${p}Transfer created`,
    };
  }

  if (a.includes('crew_notes')) {
    const note =
      typeof data?.crew_notes === 'string' ? data.crew_notes.trim() : '';
    return {
      id: String(row.id),
      date: row.at,
      tone: 'info',
      headline: `${p}Crew notes updated`,
      detail: note ? truncateNote(note) : undefined,
    };
  }

  if (a.includes('failure_reason')) {
    const reason =
      typeof (data?.after as { failure_reason?: string } | undefined)?.failure_reason === 'string'
        ? String((data?.after as { failure_reason?: string }).failure_reason).trim()
        : '';
    return {
      id: String(row.id),
      date: row.at,
      tone: 'danger',
      headline: `${p}Failure reason recorded`,
      detail: reason ? truncateNote(reason) : undefined,
    };
  }

  if (a.includes('crew_assignment') && a.includes('create')) {
    return {
      id: String(row.id),
      date: row.at,
      tone: 'info',
      headline: `${p}Crew member assigned`,
    };
  }

  if (a.includes('crew_assignment') && a.includes('delete')) {
    return {
      id: String(row.id),
      date: row.at,
      tone: 'info',
      headline: `${p}Crew assignment removed`,
    };
  }

  if (a.startsWith('transfer_item.')) {
    return {
      id: String(row.id),
      date: row.at,
      tone: 'info',
      headline: `${p}Product lines updated`,
    };
  }

  if (a.startsWith('media.')) {
    const tone: TransferTimelineTone = a.includes('delete') ? 'warning' : 'info';
    const verb = a.includes('delete') ? 'File removed' : 'Photo or file added';
    return { id: String(row.id), date: row.at, tone, headline: `${p}${verb}` };
  }

  return {
    id: String(row.id),
    date: row.at,
    tone: 'info',
    headline: `${p}Update recorded`,
  };
}

export function transferTimelineAccentClass(t: TransferTimelineTone): string {
  switch (t) {
    case 'success':
      return 'border-l-emerald-500';
    case 'danger':
      return 'border-l-rose-500';
    case 'warning':
      return 'border-l-amber-500';
    default:
      return 'border-l-slate-300';
  }
}
