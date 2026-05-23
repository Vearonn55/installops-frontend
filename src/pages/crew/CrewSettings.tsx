// src/pages/crew/CrewSettings.tsx
import type { ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogOut, User } from 'lucide-react';

import { formatDatePatternPreview } from '../../lib/date-display';
import { useDateDisplayStore, type DatePattern } from '../../stores/date-display';
import { useThemeStore, type ThemePreference } from '../../stores/theme';
import { useAuthStore } from '../../stores/auth';

export default function CrewSettings() {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { datePattern, setDatePattern } = useDateDisplayStore();
  const { theme, setTheme } = useThemeStore();

  const handleLanguageChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value as 'en' | 'tr';
    i18n.changeLanguage(lang);
    localStorage.setItem('lang', lang);
  };

  const handleDatePatternChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setDatePattern(e.target.value as DatePattern);
  };

  const handleThemeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setTheme(e.target.value as ThemePreference);
  };

  const handleSignOut = () => {
    logout();
    navigate('/auth/login', { replace: true });
  };

  const currentLang = i18n.language.startsWith('tr') ? 'tr' : 'en';

  const initial =
    (user?.name?.trim() || user?.email?.trim() || '?').charAt(0).toUpperCase();

  const sectionCls = 'mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800';

  return (
    <div className="crew-page max-w-md">
      <div className="mb-4">
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          {t('settings.crewSettingsTitle')}
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('settings.crewSettingsSubtitle')}
        </p>
      </div>

      <section className={sectionCls}>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {t('settings.accountSectionTitle')}
        </h2>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {t('settings.accountSectionDescription')}
        </p>
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/80 p-3 dark:border-gray-600 dark:bg-gray-700/50">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/50">
            {user?.name?.trim() ? (
              <span className="text-sm font-semibold text-primary-700 dark:text-primary-300">
                {initial}
              </span>
            ) : (
              <User className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
              {user?.name?.trim() || user?.email || '—'}
            </div>
            {user?.name?.trim() && user?.email ? (
              <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                {user.email}
              </div>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-white py-2.5 text-sm font-medium text-red-700 transition-colors active:bg-red-50 dark:border-red-800 dark:bg-gray-800 dark:text-red-400 dark:active:bg-red-950/40"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {t('settings.signOutButton')}
        </button>
      </section>

      <section className={sectionCls}>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {t('settings.languageSectionTitle')}
        </h2>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {t('settings.languageSectionDescription')}
        </p>
        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
            {t('settings.languageLabel')}
          </label>
          <select
            value={currentLang}
            onChange={handleLanguageChange}
            className="settings-select"
          >
            <option value="en">{t('settings.english')}</option>
            <option value="tr">{t('settings.turkish')}</option>
          </select>
        </div>
      </section>

      <section className={sectionCls}>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {t('settings.themeSectionTitle')}
        </h2>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {t('settings.themeSectionDescription')}
        </p>
        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
            {t('settings.themeLabel')}
          </label>
          <select value={theme} onChange={handleThemeChange} className="settings-select">
            <option value="light">{t('settings.themeLight')}</option>
            <option value="dark">{t('settings.themeDark')}</option>
            <option value="system">{t('settings.themeSystem')}</option>
          </select>
        </div>
      </section>

      <section className={sectionCls}>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {t('settings.dateFormatSectionTitle')}
        </h2>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {t('settings.dateFormatSectionDescription')}
        </p>
        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
            {t('settings.dateFormatLabel')}
          </label>
          <select
            value={datePattern}
            onChange={handleDatePatternChange}
            className="settings-select"
          >
            <option value="DMY">
              {t('settings.dateFormatDmy')} — {formatDatePatternPreview('DMY')}
            </option>
            <option value="MDY">
              {t('settings.dateFormatMdy')} — {formatDatePatternPreview('MDY')}
            </option>
            <option value="YMD">
              {t('settings.dateFormatYmd')} — {formatDatePatternPreview('YMD')}
            </option>
          </select>
        </div>
      </section>
    </div>
  );
}
