// src/pages/crew/CrewSettings.tsx
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { formatUiDate, formatUiDateTime } from '../../lib/date-display';
import { useDateDisplayStore, type DatePattern } from '../../stores/date-display';

const selectCls =
  'mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500';

export default function CrewSettings() {
  const { t, i18n } = useTranslation('common');
  const { datePattern, setDatePattern } = useDateDisplayStore();

  const handleLanguageChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value as 'en' | 'tr';
    i18n.changeLanguage(lang);
    localStorage.setItem('lang', lang);
  };

  const handleDatePatternChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setDatePattern(e.target.value as DatePattern);
  };

  const currentLang = i18n.language.startsWith('tr') ? 'tr' : 'en';
  const previewInstant = new Date('2026-04-08T14:30:00');

  return (
    <div className="mx-auto w-full max-w-md px-3 pb-[calc(env(safe-area-inset-bottom)+88px)] pt-3">
      <div className="mb-4">
        <h1 className="text-lg font-bold text-gray-900">
          {t('settings.crewSettingsTitle')}
        </h1>
        <p className="text-xs text-gray-500">{t('settings.crewSettingsSubtitle')}</p>
      </div>

      <section className="mb-4 rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">
          {t('settings.languageSectionTitle')}
        </h2>
        <p className="mt-0.5 text-xs text-gray-500">
          {t('settings.languageSectionDescription')}
        </p>
        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-gray-700">
            {t('settings.languageLabel')}
          </label>
          <select
            value={currentLang}
            onChange={handleLanguageChange}
            className={selectCls}
          >
            <option value="en">{t('settings.english')}</option>
            <option value="tr">{t('settings.turkish')}</option>
          </select>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">
          {t('settings.dateFormatSectionTitle')}
        </h2>
        <p className="mt-0.5 text-xs text-gray-500">
          {t('settings.dateFormatSectionDescription')}
        </p>
        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-gray-700">
            {t('settings.dateFormatLabel')}
          </label>
          <select
            value={datePattern}
            onChange={handleDatePatternChange}
            className={selectCls}
          >
            <option value="DMY">{t('settings.dateFormatDmy')}</option>
            <option value="MDY">{t('settings.dateFormatMdy')}</option>
            <option value="YMD">{t('settings.dateFormatYmd')}</option>
          </select>
        </div>
        <p className="mt-3 text-xs text-gray-600">
          <span className="font-medium text-gray-800">
            {t('settings.dateFormatPreview')}:
          </span>{' '}
          {formatUiDate(previewInstant)} · {formatUiDateTime(previewInstant)}
        </p>
      </section>
    </div>
  );
}
