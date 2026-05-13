/** Whether a DB role name requires a store assignment. */
export function roleNeedsStore(roleName: string | null | undefined): boolean {
  const n = String(roleName || '').toLowerCase();
  return n === 'manager' || n === 'crew';
}
