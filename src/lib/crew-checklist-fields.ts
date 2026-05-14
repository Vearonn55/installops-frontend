/** Stable keys for the crew on-site checklist (backend catalog). */
export const CREW_CHECKLIST_FIELD_KEYS = [
  'arrived_on_time',
  'handover_docs',
  'google_reco_given',
  'mark_after_sale',
] as const;

export type CrewChecklistFieldKey = (typeof CREW_CHECKLIST_FIELD_KEYS)[number];

export type CrewChecklistDraft = {
  arrived_on_time?: boolean;
  handover_docs?: boolean;
  google_reco_given?: boolean;
  mark_after_sale?: boolean;
};

export function buildCrewChecklistResponsePayload(
  values: CrewChecklistDraft
): { key: CrewChecklistFieldKey; value: boolean }[] {
  const out: { key: CrewChecklistFieldKey; value: boolean }[] = [];
  for (const key of CREW_CHECKLIST_FIELD_KEYS) {
    const v = values[key];
    if (v !== undefined) out.push({ key, value: v });
  }
  return out;
}

export function crewChecklistLabelKey(key: string): string {
  const map: Record<string, string> = {
    arrived_on_time: 'crewPages.checklist.arrivedOnTime',
    handover_docs: 'crewPages.checklist.handoverDocs',
    google_reco_given: 'crewPages.checklist.googleReco',
    mark_after_sale: 'crewPages.checklist.markAfterSale',
  };
  return map[key] ?? key;
}

export function formatChecklistBooleanValue(
  value: unknown,
  yes: string,
  no: string,
  empty = '—'
): string {
  if (value === true) return yes;
  if (value === false) return no;
  if (value && typeof value === 'object' && 'checked' in value) {
    return (value as { checked?: boolean }).checked ? yes : no;
  }
  return empty;
}
