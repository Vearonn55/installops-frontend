import { applyThemeToDocument, getSystemTheme } from './apply-theme';
import { resolveTheme, THEME_STORAGE_KEY, type ThemePreference } from '../stores/theme';

/** Run before React paint to reduce theme flash. */
export function initThemeBeforeRender(): void {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) {
      applyThemeToDocument(getSystemTheme());
      return;
    }
    const parsed = JSON.parse(raw) as { state?: { theme?: ThemePreference } };
    const pref = parsed?.state?.theme ?? 'system';
    applyThemeToDocument(resolveTheme(pref));
  } catch {
    applyThemeToDocument(getSystemTheme());
  }
}
