import type { User } from '../api/users';

export function isCrewUser(u: User): boolean {
  const role = (u.role?.name ?? '').toLowerCase();
  return role === 'crew' && u.status === 'active';
}

/** Display name for crew picker chips — never email or id. */
export function crewDisplayName(u: User): string | null {
  const name = (u.name ?? '').trim();
  return name || null;
}

/** Label for picker chip: name with optional store suffix. */
export function crewPickerLabel(u: User): string | null {
  const name = crewDisplayName(u);
  if (!name) return null;
  const storeName = (u.store?.name ?? '').trim();
  return storeName ? `${name} (${storeName})` : name;
}

export function filterCrewUsersForPicker(users: User[]): User[] {
  return users.filter((u) => isCrewUser(u) && crewDisplayName(u));
}
