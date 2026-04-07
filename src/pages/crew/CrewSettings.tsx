// src/pages/crew/CrewSettings.tsx
import type { ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogOut, User } from 'lucide-react';

import { formatUiDate, formatUiDateTime } from '../../lib/date-display';
import { useDateDisplayStore, type DatePattern } from '../../stores/date-display';
import { useAuthStore } from '../../stores/auth';

const selectCls =
  'mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500';

export default function CrewSettings() {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { datePattern, setDatePattern } = useDateDisplayStore();

  const handleLanguageChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value as 'en' | 'tr';
    i18n.changeLanguage(lang);
    localStorage.setItem('lang', lang);
  };

  const handleDatePatternChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setDatePattern(e.target.value as DatePattern);
  };

  const handleSignOut = () => {
    logout();
    navigate('/auth/login', { replace: true });
  };

  const currentLang = i18n.language.startsWith('tr') ? 'tr' : 'en';
  const previewInstant = new Date('2026-04-08T14:30:00');

  const initial =
    (user?.name?.trim() || user?.email?.trim() || '?').charAt(0).toUpperCase();

  return (
    <div className="mx-auto w-full max-w-md px-3 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] pt-3 sm:pb-[calc(env(safe-area-inset-bottom)+4.5rem)]">
      <div className="mb-4">
        <h1 className="text-lg font-bold text-gray-900">
          {t('settings.crewSettingsTitle')}
        </h1>
        <p className="text-xs text-gray-500">{t('settings.crewSettingsSubtitle')}</p>
      </div>

      <section className="mb-4 rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">
          {t('settings.accountSectionTitle')}
        </h2>
        <p className="mt-0.5 text-xs text-gray-500">
          {t('settings.accountSectionDescription')}
        </p>
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/80 p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100">
            {user?.name?.trim() ? (
              <span className="text-sm font-semibold text-primary-700">{initial}</span>
            ) : (
              <User className="h-5 w-5 text-primary-600" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-gray-900">
              {user?.name?.trim() || user?.email || '—'}
            </div>
            {user?.name?.trim() && user?.email ? (
              <div className="truncate text-xs text-gray-500">{user.email}</div>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-white py-2.5 text-sm font-medium text-red-700 transition-colors active:bg-red-50"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {t('settings.signOutButton')}
        </button>
      </section>

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
