export const INSTALLATION_ZONES = [
  { value: 'lefkosa', label: 'Lefkoşa' },
  { value: 'gazimagusa', label: 'Gazimağusa' },
  { value: 'girne', label: 'Girne (Kyrenia)' },
  { value: 'guzelyurt', label: 'Güzelyurt' },
  { value: 'iskele', label: 'İskele (Famagusta District)' },
  { value: 'lefke', label: 'Lefke' },
] as const;

export function zoneLabelFromValue(value: string): string | null {
  if (!value) return null;
  return INSTALLATION_ZONES.find((z) => z.value === value)?.label ?? null;
}

export function zoneValueFromLocation(location: string | null | undefined): string {
  const raw = (location || '').trim();
  if (!raw) return '';
  const byLabel = INSTALLATION_ZONES.find((z) => z.label === raw);
  if (byLabel) return byLabel.value;
  const byValue = INSTALLATION_ZONES.find((z) => z.value === raw);
  return byValue?.value ?? '';
}
