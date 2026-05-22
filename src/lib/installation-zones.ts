import { SETTLEMENTS_BY_MAIN } from './installation-settlements-data';

export type ZoneOption = { value: string; label: string };

export const INSTALLATION_MAIN_ZONES: readonly ZoneOption[] = [
  { value: 'lefkosa', label: 'Lefkoşa' },
  { value: 'gazimagusa', label: 'Gazimağusa' },
  { value: 'girne', label: 'Girne' },
  { value: 'guzelyurt', label: 'Güzelyurt' },
  { value: 'iskele', label: 'İskele' },
  { value: 'lefke', label: 'Lefke' },
] as const;

/** @deprecated Use INSTALLATION_MAIN_ZONES */
export const INSTALLATION_ZONES = INSTALLATION_MAIN_ZONES;

function slugify(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildSubZones(): Record<string, ZoneOption[]> {
  const out: Record<string, ZoneOption[]> = {};
  for (const [main, labels] of Object.entries(SETTLEMENTS_BY_MAIN)) {
    const seen = new Set<string>();
    out[main] = labels.map((label) => {
      let value = slugify(label);
      if (seen.has(value)) {
        let n = 2;
        while (seen.has(`${value}-${n}`)) n += 1;
        value = `${value}-${n}`;
      }
      seen.add(value);
      return { value, label };
    });
  }
  return out;
}

export const INSTALLATION_SUB_ZONES: Record<string, ZoneOption[]> = buildSubZones();

const subByLabel = new Map<string, { mainValue: string; sub: ZoneOption }>();
const subByValue = new Map<string, { mainValue: string; sub: ZoneOption }>();

for (const main of INSTALLATION_MAIN_ZONES) {
  for (const sub of INSTALLATION_SUB_ZONES[main.value] ?? []) {
    subByLabel.set(sub.label, { mainValue: main.value, sub });
    subByValue.set(sub.value, { mainValue: main.value, sub });
  }
}

const legacyMainLabels: Record<string, string> = {
  'Girne (Kyrenia)': 'girne',
  'İskele (Famagusta District)': 'iskele',
};

export function mainZoneLabelFromValue(value: string): string | null {
  if (!value) return null;
  return INSTALLATION_MAIN_ZONES.find((z) => z.value === value)?.label ?? null;
}

export function subZoneLabelFromValue(
  mainValue: string,
  subValue: string
): string | null {
  if (!mainValue || !subValue) return null;
  return (
    INSTALLATION_SUB_ZONES[mainValue]?.find((z) => z.value === subValue)?.label ??
    null
  );
}

export function installationLocationLabel(
  mainValue: string,
  subValue?: string
): string | null {
  if (!mainValue) return null;
  const subLabel = subValue ? subZoneLabelFromValue(mainValue, subValue) : null;
  if (subLabel) return subLabel;
  return mainZoneLabelFromValue(mainValue);
}

export function parseInstallationLocation(
  location: string | null | undefined
): { mainValue: string; subValue: string } {
  const raw = (location || '').trim();
  if (!raw) return { mainValue: '', subValue: '' };

  const bySubLabel = subByLabel.get(raw);
  if (bySubLabel) {
    return { mainValue: bySubLabel.mainValue, subValue: bySubLabel.sub.value };
  }

  const legacyMain = legacyMainLabels[raw];
  if (legacyMain) return { mainValue: legacyMain, subValue: '' };

  const byMainLabel = INSTALLATION_MAIN_ZONES.find((z) => z.label === raw);
  if (byMainLabel) return { mainValue: byMainLabel.value, subValue: '' };

  const byMainValue = INSTALLATION_MAIN_ZONES.find((z) => z.value === raw);
  if (byMainValue) return { mainValue: byMainValue.value, subValue: '' };

  return { mainValue: '', subValue: '' };
}

export function mainZoneLabelFromLocation(
  location: string | null | undefined
): string | null {
  const { mainValue } = parseInstallationLocation(location);
  return mainValue ? mainZoneLabelFromValue(mainValue) : null;
}

export function zoneLabelFromValue(value: string): string | null {
  return mainZoneLabelFromValue(value);
}

export function zoneValueFromLocation(location: string | null | undefined): string {
  return parseInstallationLocation(location).mainValue;
}
