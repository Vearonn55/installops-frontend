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

/** Snapshot answers at submit time (successful installs always persist handover/reco booleans). */
export function crewChecklistAnswersFromValues(
  values: CrewChecklistDraft,
  installStatus?: 'successful' | 'failed'
): Record<string, boolean> | null {
  const answers: Record<string, boolean> = {};
  if (typeof values.arrived_on_time === 'boolean') {
    answers.arrived_on_time = values.arrived_on_time;
  }
  if (installStatus === 'successful') {
    answers.handover_docs = Boolean(values.handover_docs);
    answers.google_reco_given = Boolean(values.google_reco_given);
  }
  if (installStatus === 'failed' && typeof values.mark_after_sale === 'boolean') {
    answers.mark_after_sale = values.mark_after_sale;
  }
  return Object.keys(answers).length ? answers : null;
}

export function parseChecklistAnswersFromInstallation(
  inst?: Record<string, unknown> | null
): ChecklistAnswersMap | null {
  if (!inst) return null;
  const raw = inst.checklist_answers ?? inst.checklistAnswers;
  if (raw == null) return null;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as ChecklistAnswersMap;
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as ChecklistAnswersMap;
  }
  return null;
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

export type ChecklistAnswersMap = Partial<Record<CrewChecklistFieldKey, boolean>>;

export function resolveChecklistAnswersForDisplay(
  fromInstallation?: ChecklistAnswersMap | null,
  fromResponses?: Array<{ item?: { key?: string | null } | null; value?: unknown }>
): ChecklistAnswersMap {
  const out: ChecklistAnswersMap = {};
  for (const key of CREW_CHECKLIST_FIELD_KEYS) {
    const instVal = fromInstallation?.[key];
    if (instVal === true || instVal === false) {
      out[key] = instVal;
      continue;
    }
    const row = fromResponses?.find((r) => r.item?.key === key);
    if (row?.value === true || row?.value === false) {
      out[key] = row.value;
    }
  }
  return out;
}
