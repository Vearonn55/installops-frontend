import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  applyThemeToDocument,
  getSystemTheme,
  type ResolvedTheme,
} from '../lib/apply-theme';

export type ThemePreference = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'installops-theme';

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') return getSystemTheme();
  return preference;
}

interface ThemeState {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
    }),
    { name: THEME_STORAGE_KEY },
  ),
);

/** Apply resolved theme to documentElement (ThemeSync and before first paint). */
export function syncThemeToDocument(preference?: ThemePreference): void {
  const pref = preference ?? useThemeStore.getState().theme;
  applyThemeToDocument(resolveTheme(pref));
}
