// src/pages/manager/YourProfile.tsx
import { useEffect, useState } from 'react';
import {
  User as UserIcon,
  Shield,
  KeyRound,
  Mail,
  Hash,
  AlertCircle,
} from 'lucide-react';

import { apiGet, isAxiosError } from '../../api/http';
import { useTranslation } from 'react-i18next';

type MeResponse = {
  id: string;
  name?: string;
  email?: string;
  role_id?: string;
  role?: string;
  permissions?: string[];
  created_at?: string;
  updated_at?: string;
};

const roleLabel = (role?: string, t?: (key: string) => string) => {
  if (!role) return '';
  switch (role.toUpperCase()) {
    case 'ADMIN':
      return t ? t('profilePage.roleLabels.admin') : 'Administrator';
    case 'STORE_MANAGER':
      return t ? t('profilePage.roleLabels.storeManager') : 'Store Manager';
    case 'CREW':
      return t ? t('profilePage.roleLabels.crew') : 'Installation Crew';
    default:
      return role;
  }
};

export default function YourProfile() {
  const { t } = useTranslation('common');

  const [profile, setProfile] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        // Adjust the URL if your Swagger path is different
        const data = await apiGet<MeResponse>('/auth/me');
        if (!cancelled) {
          setProfile(data);
        }
      } catch (err) {
        if (!cancelled) {
          if (isAxiosError(err)) {
            const apiMessage =
              (err.response?.data as any)?.message ||
              (err.response?.data as any)?.error;
            setError(apiMessage || err.message || 'Failed to load profile');
          } else {
            setError('Failed to load profile');
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  const permissions = profile?.permissions ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
            {t('profilePage.header.title')}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('profilePage.header.subtitle')}
          </p>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          <div>
            <p className="font-medium">
              {t('profilePage.error.title')}
            </p>
            <p className="text-xs text-red-600/80">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Account info */}
        <div className="card lg:col-span-2">
          <div className="card-header flex flex-col items-center text-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-50">
              <UserIcon className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h2 className="card-title">
                {t('profilePage.accountCard.title')}
              </h2>
            </div>
          </div>

          <div className="card-content">
            {loading && !profile ? (
              <div className="space-y-3 text-sm text-gray-500">
                <div className="h-4 w-40 animate-pulse rounded bg-gray-100" />
                <div className="h-4 w-56 animate-pulse rounded bg-gray-100" />
                <div className="h-4 w-32 animate-pulse rounded bg-gray-100" />
                <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
              </div>
            ) : (
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                    <Hash className="h-3 w-3" />
                    {t('profilePage.accountCard.fields.userId')}
                  </dt>
                  <dd className="mt-1 font-mono text-xs text-gray-900 break-all">
                    {profile?.id ?? '—'}
                  </dd>
                </div>

                <div>
                  <dt className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                    <Shield className="h-3 w-3" />
                    {t('profilePage.accountCard.fields.role')}
                  </dt>
                  <dd className="mt-1 text-gray-900">
                    {profile?.role ? (
                      <>
                        <span className="font-medium">
                          {roleLabel(profile.role, (key) => t(key))}
                        </span>
                        <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-mono uppercase text-gray-600">
                          {profile.role}
                        </span>
                      </>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>

                <div>
                  <dt className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                    <Hash className="h-3 w-3" />
                    {t('profilePage.accountCard.fields.roleId')}
                  </dt>
                  <dd className="mt-1 font-mono text-xs text-gray-900 break-all">
                    {profile?.role_id ?? '—'}
                  </dd>
                </div>

                <div>
                  <dt className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                    <Mail className="h-3 w-3" />
                    {t('profilePage.accountCard.fields.email')}
                  </dt>
                  <dd className="mt-1 text-gray-900">
                    {profile?.email ?? '—'}
                  </dd>
                </div>
              </dl>
            )}
          </div>
        </div>

        {/* Permissions */}
        <div className="card">
          <div className="card-header flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50">
              <KeyRound className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="card-title">
                {t('profilePage.permissionsCard.title')}
              </h2>
            </div>
          </div>

          <div className="card-content">
            {loading && !profile ? (
              <div className="space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-gray-100" />
                <div className="h-4 w-40 animate-pulse rounded bg-gray-100" />
                <div className="h-4 w-28 animate-pulse rounded bg-gray-100" />
              </div>
            ) : permissions.length === 0 ? (
              <p className="text-sm text-gray-500">
                {t('profilePage.permissionsCard.noPermissions')}
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {permissions.map((perm) => (
                  <span
                    key={perm}
                    className="inline-flex items-center rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700"
                  >
                    {perm}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
