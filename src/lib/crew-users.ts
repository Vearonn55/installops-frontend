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

export function filterCrewUsersForPicker(users: User[]): User[] {
  return users.filter((u) => isCrewUser(u) && crewDisplayName(u));
}
