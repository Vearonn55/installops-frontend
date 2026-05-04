import type { OrderTimelineAuditRow } from '../api/orders';

export type OrderTimelineTone = 'success' | 'warning' | 'danger' | 'info';

export type OrderTimelineViewEvent = {
  id: string;
  date: string;
  tone: OrderTimelineTone;
  headline: string;
  detail?: string;
};

function formatJsonSnippet(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  try {
    const s = JSON.stringify(data);
    return s.length > 280 ? `${s.slice(0, 277)}…` : s;
  } catch {
    return undefined;
  }
}

export function auditRowToOrderTimelineViewEvent(
  row: OrderTimelineAuditRow
): OrderTimelineViewEvent {
  const action = String(row.action || '');
  const a = action.toLowerCase();
  const data = row.data as Record<string, unknown> | null | undefined;
  const code = row.install_code ? ` (${row.install_code})` : '';

  if (a === 'installation.update_status') {
    const before = (data?.before as { status?: string } | undefined)?.status;
    const after = (data?.after as { status?: string } | undefined)?.status;
    const afterLower = String(after || '').toLowerCase();
    const tone: OrderTimelineTone =
      afterLower === 'failed' || afterLower === 'canceled'
        ? 'danger'
        : afterLower === 'completed'
          ? 'success'
          : 'info';
    return {
      id: String(row.id),
      date: row.at,
      tone,
      headline: `Installation status${code}`,
      detail: `Changed from "${String(before ?? '—')}" to "${String(after ?? '—')}"`,
    };
  }

  if (a === 'installation.update') {
    const before = data?.before as Record<string, unknown> | undefined;
    const after = data?.after as Record<string, unknown> | undefined;
    const bits: string[] = [];
    if (before && after) {
      for (const key of ['scheduled_start', 'scheduled_end', 'notes', 'location']) {
        if (before[key] !== after[key]) bits.push(`${key} changed`);
      }
    }
    return {
      id: String(row.id),
      date: row.at,
      tone: 'info',
      headline: `Installation updated${code}`,
      detail: bits.length ? bits.join(' · ') : formatJsonSnippet(data),
    };
  }

  if (a === 'installation.create') {
    return {
      id: String(row.id),
      date: row.at,
      tone: 'success',
      headline: `Installation created${code}`,
      detail: formatJsonSnippet(data),
    };
  }

  if (a.includes('crew_after')) {
    const note =
      typeof data?.crew_after_installation_notes === 'string'
        ? data.crew_after_installation_notes
        : undefined;
    return {
      id: String(row.id),
      date: row.at,
      tone: 'info',
      headline: `Crew customer notes${code}`,
      detail: note || formatJsonSnippet(data),
    };
  }

  if (a.includes('crew_assignment') && a.includes('create')) {
    return {
      id: String(row.id),
      date: row.at,
      tone: 'info',
      headline: `Crew assignment${code}`,
      detail: formatJsonSnippet(data),
    };
  }

  if (a.includes('fail') || a.includes('cancel') || a.includes('decline')) {
    return {
      id: String(row.id),
      date: row.at,
      tone: 'danger',
      headline: action,
      detail: formatJsonSnippet(data),
    };
  }

  return {
    id: String(row.id),
    date: row.at,
    tone: 'info',
    headline: action,
    detail: formatJsonSnippet(data),
  };
}

export function orderTimelineTonePillClass(t: OrderTimelineTone) {
  switch (t) {
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'danger':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700';
  }
}

export function orderTimelineToneShortLabel(t: OrderTimelineTone) {
  switch (t) {
    case 'success':
      return 'OK';
    case 'danger':
      return 'Attention';
    case 'warning':
      return 'Warning';
    default:
      return 'Info';
  }
}
