// src/dev/mockAuth.ts
import type { User, UserRole } from '../types';
import { useAuthStore } from "../stores/auth-simple";

const makeUser = (role: UserRole): User => ({
  id: `mock_${role.toLowerCase()}`,
  name: `${role} Dev`,
  email: `${role.toLowerCase()}@dev.local`,
  role,
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  // Optional fields for your UI to behave:
  store_id: role === 'STORE_MANAGER' ? 'store_1' : undefined,
  phone: '000-000-0000',
});

export function setMockRole(role: UserRole) {
  // Zustand stores expose setState on the hook function
  (useAuthStore as any).setState({
    isAuthenticated: true,
    user: makeUser(role),
    accessToken: `dev-token-${role}`,
  });
  // Persist so refresh keeps role
  localStorage.setItem('mock_role', role);
}

export function clearMock() {
  (useAuthStore as any).setState({
    isAuthenticated: false,
    user: null,
    accessToken: null,
  });
  localStorage.removeItem('mock_role');
}

// Optional: auto-apply mock role on reload in dev
export function applyMockFromStorage() {
  const role = localStorage.getItem('mock_role') as UserRole | null;
  if (role) setMockRole(role);
}
