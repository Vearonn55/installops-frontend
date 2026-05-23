// src/pages/shared/SettingsPage.tsx
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { formatDatePatternPreview } from '../../lib/date-display';
import { useDateDisplayStore, type DatePattern } from '../../stores/date-display';
import { useThemeStore, type ThemePreference } from '../../stores/theme';

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
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

  const currentLang = i18n.language.startsWith('tr') ? 'tr' : 'en';

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">
          {t('settings.title')}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">{t('settings.subtitle')}</p>
      </div>

      <section className="settings-section">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t('settings.languageSectionTitle')}
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t('settings.languageSectionDescription')}
        </p>

        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
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

      <section className="settings-section">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t('settings.themeSectionTitle')}
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t('settings.themeSectionDescription')}
        </p>

        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('settings.themeLabel')}
          </label>
          <select value={theme} onChange={handleThemeChange} className="settings-select">
            <option value="light">{t('settings.themeLight')}</option>
            <option value="dark">{t('settings.themeDark')}</option>
            <option value="system">{t('settings.themeSystem')}</option>
          </select>
        </div>
      </section>

      <section className="settings-section">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t('settings.dateFormatSectionTitle')}
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t('settings.dateFormatSectionDescription')}
        </p>

        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
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
