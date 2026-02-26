// src/pages/manager/InstallationDetailPage.tsx
import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  Package,
  Users,
  Info,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';

import type { Installation } from '../../types';
import { cn } from '../../lib/utils';
import { apiGet } from '../../api/http';
import { useTranslation } from 'react-i18next';
import {
  listInstallationMedia,
  type MediaAsset,
} from '../../api/media';

// Minimal types from OpenAPI we actually use here
type StoreDto = {
  id: string;
  name: string;
};

type UserDto = {
  id: string;
  name: string;
  email: string;
};

type InstallationItemDto = {
  id: string;
  external_product_id: string;
  room_tag?: string | null;
  special_instructions?: string | null;
};

type CrewAssignmentDto = {
  id: string;
  crew_user_id: string;
  role: string | null;
  accepted_at?: string | null;
  declined_at?: string | null;
};

type InstallationWithRelations = Installation & {
  items?: InstallationItemDto[];
  crew?: CrewAssignmentDto[];
  external_order_id?: string;
};

const badge = (s: Installation['status']) =>
  s === 'completed'
    ? 'bg-emerald-100 text-emerald-800'
    : s === 'in_progress' || s === 'accepted'
    ? 'bg-blue-100 text-blue-800'
    : s === 'failed'
    ? 'bg-red-100 text-red-800'
    : s === 'cancelled'
    ? 'bg-yellow-100 text-yellow-800'
    : 'bg-gray-100 text-gray-800';

export default function InstallationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  // ---- Main installation (with items + crew embedded) ----
  const query = useQuery({
    queryKey: ['installation', id],
    enabled: !!id,
    queryFn: async (): Promise<InstallationWithRelations> => {
      if (!id) {
        throw new Error('Missing installation id');
      }
      const installation = await apiGet<InstallationWithRelations>(
        `/installations/${id}`
      );
      return installation;
    },
  });

  const inst = query.data;
  const items = useMemo<InstallationItemDto[]>(() => inst?.items ?? [], [inst]);
  const crew = useMemo<CrewAssignmentDto[]>(() => inst?.crew ?? [], [inst]);

  // ---- Store name lookup (instead of raw store_id) ----
  const storeQuery = useQuery({
    queryKey: ['store', inst?.store_id],
    enabled: !!inst?.store_id,
    queryFn: async () => {
      return apiGet<StoreDto>(`/stores/${inst!.store_id}`);
    },
  });

  // ---- Crew user names lookup (instead of raw crew_user_id) ----
  const crewUsersQuery = useQuery({
    queryKey: ['installationCrewUsers', inst?.id],
    enabled: !!inst && Array.isArray(inst.crew) && inst.crew.length > 0,
    queryFn: async () => {
      const map: Record<string, UserDto> = {};
      if (!inst?.crew) return map;

      const uniqueIds = Array.from(
        new Set(inst.crew.map((c) => c.crew_user_id).filter(Boolean))
      );

      for (const uid of uniqueIds) {
        try {
          const user = await apiGet<UserDto>(`/users/${uid}`);
          map[uid] = user;
        } catch {
          // skip failed lookups; fall back to raw ID
        }
      }

      return map;
    },
  });

  const crewUsers = crewUsersQuery.data ?? {};

  // ---- Installation media (photos) ----
  const mediaQuery = useQuery({
    queryKey: ['installationMedia', id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) throw new Error('Missing installation id');
      const list = await listInstallationMedia(id, { limit: 50, offset: 0 });
      return list;
    },
  });

  const photos: MediaAsset[] = useMemo(
    () =>
      (mediaQuery.data?.data ?? []).filter((m) => m.type === 'photo'),
    [mediaQuery.data]
  );

  const statusLabel =
    inst?.status != null
      ? t(`installationsPage.statusLabels.${inst.status}` as any)
      : '—';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-md border px-2 py-1.5 text-sm hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('installationDetailPage.header.title')} #{id}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {t('installationDetailPage.header.subtitle')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/app/calendar"
            className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50 inline-flex items-center gap-2"
          >
            <CalendarDays className="h-4 w-4" />
            {t('installationDetailPage.buttons.openCalendar')}
          </Link>
          {inst?.external_order_id && (
            <Link
              to={`/app/orders/${inst.external_order_id}`}
              className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50 inline-flex items-center gap-2"
            >
              <ClipboardList className="h-4 w-4" />
              {t('installationDetailPage.buttons.viewOrder')}
            </Link>
          )}
        </div>
      </div>

      {/* Meta cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Status + store + schedule */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <Info className="h-4 w-4" />
              {t('installationDetailPage.statusCard.title')}
            </h3>
            <p className="card-description">
              {t('installationDetailPage.statusCard.subtitle')}
            </p>
          </div>
          <div className="card-content space-y-2 text-sm">
            <div>
              <span
                className={cn(
                  'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                  inst ? badge(inst.status) : 'bg-gray-100 text-gray-800'
                )}
              >
                {inst ? statusLabel : '—'}
              </span>
            </div>
            <div>
              {t('installationDetailPage.statusCard.store')}{' '}
              <span className="text-gray-700">
                {storeQuery.data?.name ?? inst?.store_id ?? '—'}
              </span>
            </div>
            <div>
              {t('installationDetailPage.statusCard.start')}{' '}
              <span className="text-gray-700">
                {inst?.scheduled_start
                  ? new Date(inst.scheduled_start).toLocaleString()
                  : '—'}
              </span>
            </div>
            <div>
              {t('installationDetailPage.statusCard.end')}{' '}
              <span className="text-gray-700">
                {inst?.scheduled_end
                  ? new Date(inst.scheduled_end).toLocaleString()
                  : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Crew */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('installationDetailPage.crewCard.title')}
            </h3>
            <p className="card-description">
              {t('installationDetailPage.crewCard.subtitle')}
            </p>
          </div>
          <div className="card-content">
            {crew.length === 0 ? (
              <div className="text-sm text-gray-500">
                {t('installationDetailPage.crewCard.none')}
              </div>
            ) : (
              <ul className="space-y-2">
                {crew.map((c) => {
                  const user = crewUsers[c.crew_user_id];
                  const statusKey = c.accepted_at
                    ? 'accepted'
                    : c.declined_at
                    ? 'declined'
                    : 'pending';
                  const statusLabel = t(
                    `installationDetailPage.crewCard.status.${statusKey}`
                  );

                  return (
                    <li
                      key={c.id}
                      className="rounded-md border px-3 py-2 text-sm flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium text-gray-900">
                          {user?.name ??
                            t('installationDetailPage.crewCard.memberFallback')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {c.role ||
                            t('installationDetailPage.crewCard.roleFallback')}{' '}
                          · {statusLabel}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {user?.email ?? c.crew_user_id}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t('installationDetailPage.notesCard.title')}
            </h3>
            <p className="card-description">
              {t('installationDetailPage.notesCard.subtitle')}
            </p>
          </div>
          <div className="card-content">
            <div className="rounded-md border bg-white p-3 text-sm text-gray-800 min-h-[64px]">
              {inst?.notes?.trim() ? (
                inst.notes
              ) : (
                <span className="text-gray-400">
                  {t('installationDetailPage.notesCard.none')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title flex items-center gap-2">
            <Package className="h-4 w-4" />
            {t('installationDetailPage.itemsCard.title')}
          </h3>
          <p className="card-description">
            {t('installationDetailPage.itemsCard.subtitle')}
          </p>
        </div>
        <div className="card-content overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('installationDetailPage.itemsCard.table.product')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('installationDetailPage.itemsCard.table.room')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('installationDetailPage.itemsCard.table.instructions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {items.map((it) => (
                <tr key={it.id}>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {it.external_product_id}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {it.room_tag ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {it.special_instructions ?? '—'}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-6 text-center text-sm text-gray-500"
                  >
                    {t('installationDetailPage.itemsCard.none')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {query.isLoading && (
            <div className="px-4 py-6 text-sm text-gray-500">
              {t('installationDetailPage.loading')}
            </div>
          )}
          {query.isError && (
            <div className="px-4 py-6 text-sm text-red-600">
              {t('installationDetailPage.loadError')}
            </div>
          )}
        </div>
      </div>

      {/* Media / Photos */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Photos
          </h3>
          <p className="card-description">
            Photos captured by the crew for this installation.
          </p>
        </div>
        <div className="card-content">
          {mediaQuery.isLoading && (
            <div className="text-sm text-gray-500">Loading photos…</div>
          )}

          {mediaQuery.isError && (
            <div className="text-sm text-red-600">
              Could not load photos for this installation.
            </div>
          )}

          {!mediaQuery.isLoading && !mediaQuery.isError && photos.length === 0 && (
            <div className="text-sm text-gray-500">
              No photos have been uploaded for this installation yet.
            </div>
          )}

          {photos.length > 0 && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
              {photos.map((m) => (
                <a
                  key={m.id}
                  href={m.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group block overflow-hidden rounded-md border bg-gray-50"
                >
                  <img
                    src={m.url}
                    alt="Installation photo"
                    className="h-32 w-full object-cover transition-transform group-hover:scale-105"
                  />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
