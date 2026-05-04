import type { OrderTimelineAuditRow } from '../api/orders';

export type OrderTimelineTone = 'success' | 'warning' | 'danger' | 'info';

/** One row in the order “Installation tracking” card — no raw payloads. */
export type OrderTimelineViewEvent = {
  id: string;
  date: string;
  tone: OrderTimelineTone;
  headline: string;
  /** Optional short human line (e.g. truncated crew note). Never JSON. */
  detail?: string;
};

const MAX_NOTE_PREVIEW = 140;

function prettyInstallStatus(raw: string | undefined): string {
  if (!raw || typeof raw !== 'string') return '—';
  const k = raw.trim().toLowerCase();
  const map: Record<string, string> = {
    scheduled: 'Scheduled',
    in_progress: 'In progress',
    completed: 'Completed',
    failed: 'Failed',
    canceled: 'Canceled',
    cancelled: 'Canceled',
    staged: 'Staged',
    after_sale_service: 'After-sale',
  };
  return map[k] ?? raw.replace(/_/g, ' ');
}

function prefix(row: OrderTimelineAuditRow): string {
  return row.install_code ? `${row.install_code} · ` : '';
}

function truncateNote(text: string): string {
  const t = text.trim();
  if (t.length <= MAX_NOTE_PREVIEW) return t;
  return `${t.slice(0, MAX_NOTE_PREVIEW - 1)}…`;
}

/**
 * Maps audit rows to short, tracking-oriented lines for the order page.
 * Full payloads and technical fields stay in Audit.
 */
export function auditRowToOrderTrackingEvent(row: OrderTimelineAuditRow): OrderTimelineViewEvent {
  const action = String(row.action || '');
  const a = action.toLowerCase();
  const data = row.data as Record<string, unknown> | null | undefined;
  const p = prefix(row);

  if (a === 'installation.update_status') {
    const before = (data?.before as { status?: string } | undefined)?.status;
    const after = (data?.after as { status?: string } | undefined)?.status;
    const afterLower = String(after || '').toLowerCase();
    const tone: OrderTimelineTone =
      afterLower === 'failed' || afterLower === 'canceled' || afterLower === 'cancelled'
        ? 'danger'
        : afterLower === 'completed'
          ? 'success'
          : 'info';
    const headline = `${p}Status: ${prettyInstallStatus(before)} → ${prettyInstallStatus(after)}`;
    return { id: String(row.id), date: row.at, tone, headline };
  }

  if (a === 'installation.update') {
    const before = data?.before as Record<string, unknown> | undefined;
    const after = data?.after as Record<string, unknown> | undefined;
    const parts: string[] = [];
    if (before && after) {
      if (before.scheduled_start !== after.scheduled_start || before.scheduled_end !== after.scheduled_end) {
        parts.push('Visit window');
      }
      if (before.notes !== after.notes) parts.push('Manager notes');
      if (before.location !== after.location) parts.push('Site location');
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

  if (a === 'installation.create') {
    return {
      id: String(row.id),
      date: row.at,
      tone: 'success',
      headline: `${p}Installation created`,
    };
  }

  if (a.includes('crew_after')) {
    const note =
      typeof data?.crew_after_installation_notes === 'string'
        ? data.crew_after_installation_notes.trim()
        : '';
    return {
      id: String(row.id),
      date: row.at,
      tone: 'info',
      headline: `${p}Crew saved customer notes`,
      detail: note ? truncateNote(note) : undefined,
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

  if (a.startsWith('installation_item.')) {
    return {
      id: String(row.id),
      date: row.at,
      tone: 'info',
      headline: `${p}Product lines updated`,
    };
  }

  if (a.startsWith('media.')) {
    const tone: OrderTimelineTone = a.includes('delete') ? 'warning' : 'info';
    const verb = a.includes('delete') ? 'File removed' : 'Photo or file added';
    return { id: String(row.id), date: row.at, tone, headline: `${p}${verb}` };
  }

  if (a.startsWith('checklist_response.')) {
    return {
      id: String(row.id),
      date: row.at,
      tone: 'info',
      headline: `${p}Checklist updated`,
    };
  }

  if (a.includes('fail') || a.includes('cancel') || a.includes('decline')) {
    return {
      id: String(row.id),
      date: row.at,
      tone: 'danger',
      headline: `${p}Issue or cancellation recorded`,
    };
  }

  return {
    id: String(row.id),
    date: row.at,
    tone: 'info',
    headline: `${p}Update recorded`,
  };
}

/** Left accent for tracking list rows */
export function orderTrackingAccentClass(t: OrderTimelineTone): string {
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
