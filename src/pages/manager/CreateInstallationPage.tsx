// src/pages/manager/CreateInstallationPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  Calendar as CalendarIcon,
  Clock,
  Save,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { cn } from '../../lib/utils';
import { useAuthStore } from '../../stores/auth';

import {
  createInstallation,
  assignCrew,
  type InstallationCreate,
} from '../../api/installations';
import { listUsers, type User } from '../../api/users';
import { listStores, type Store } from '../../api/stores';
import { useTranslation } from 'react-i18next';

// ---------- helpers ----------
const toISODateTime = (date: string, time: string) => {
  if (!date || !time) return '';
  const [h, m] = time.split(':').map((v) => parseInt(v, 10));
  const dt = new Date(date);
  dt.setHours(h, m, 0, 0);
  return dt.toISOString();
};

// scheduled_end = scheduled_start + 2.5 hours (150 minutes)
const addMinutesToIso = (iso: string, minutes: number) => {
  if (!iso) return '';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  dt.setMinutes(dt.getMinutes() + minutes);
  return dt.toISOString();
};

const ZONES = [
  { value: 'lefkosa', label: 'Lefkoşa' },
  { value: 'gazimagusa', label: 'Gazimağusa' },
  { value: 'girne', label: 'Girne (Kyrenia)' },
  { value: 'guzelyurt', label: 'Güzelyurt' },
  { value: 'iskele', label: 'İskele (Famagusta District)' },
  { value: 'lefke', label: 'Lefke' },
];

const DIFFICULTIES = ['easy', 'intermediate', 'hard'] as const;
type DifficultyValue = (typeof DIFFICULTIES)[number];

export default function CreateInstallationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { t } = useTranslation('common');

  const myStoreId = (user as any)?.store_id as string | undefined;

  // ----- form state -----
  const [externalOrderId, setExternalOrderId] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [timeStart, setTimeStart] = useState<string>('09:00');
  const [zone, setZone] = useState<string>('');
  const [crewIds, setCrewIds] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [difficulty, setDifficulty] = useState<DifficultyValue | ''>('');
  const [selectedStoreId, setSelectedStoreId] = useState<string>(myStoreId ?? '');

  // ----- data: stores (for admins / multi-store setups) -----
  const storesQuery = useQuery({
    queryKey: ['stores', 'for-installation-create'],
    queryFn: async () => {
      const res = await listStores({ limit: 100, offset: 0 });
      return res.data as Store[];
    },
    staleTime: 60_000,
  });

  // auto-select first store for admins (no myStoreId) so button can enable
  useEffect(() => {
    if (
      !myStoreId &&
      !selectedStoreId &&
      !storesQuery.isLoading &&
      !storesQuery.isError
    ) {
      const first = (storesQuery.data ?? [])[0];
      if (first) {
        setSelectedStoreId(first.id);
      }
    }
  }, [myStoreId, selectedStoreId, storesQuery.isLoading, storesQuery.isError, storesQuery.data]);

  // ----- data: crew list -----
  const crewQuery = useQuery({
    queryKey: ['users', 'crew-picker'],
    queryFn: async () => {
      const res = await listUsers({ limit: 200, offset: 0 });
      return res.data as User[];
    },
    staleTime: 60_000,
  });

  const toggleCrew = (id: string) => {
    setCrewIds((prev) => {
      const already = prev.includes(id);
      if (already) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 3) {
        toast.error(t('createInstallationPage.toasts.maxCrew'));
        return prev;
      }
      return [...prev, id];
    });
  };

  // ----- mutation: create installation + assign crew -----
  const createMutation = useMutation({
    mutationFn: async () => {
      const storeId = selectedStoreId || myStoreId;
      if (!storeId) {
        throw new Error(t('createInstallationPage.validation.storeRequired'));
      }

      const scheduled_start = toISODateTime(date, timeStart);
      const scheduled_end = addMinutesToIso(scheduled_start, 150); // 2.5 hours later

      if (!externalOrderId) {
        throw new Error(t('createInstallationPage.validation.externalOrderIdRequired'));
      }
      if (!date) {
        throw new Error(t('createInstallationPage.validation.dateRequired'));
      }
      if (!timeStart) {
        throw new Error(t('createInstallationPage.validation.startTimeRequired'));
      }
      if (!difficulty) {
        throw new Error(t('createInstallationPage.validation.difficultyRequired'));
      }

      const payload: InstallationCreate = {
        external_order_id: externalOrderId,
        store_id: storeId,
        scheduled_start,
        scheduled_end,
        notes: notes || null,
        difficulty: difficulty as DifficultyValue,
      };

      // 1) Create the installation
      const inst = await createInstallation(payload);

      // 2) Assign crew (if any)
      if (crewIds.length) {
        await Promise.all(
          crewIds.map((crewId) =>
            assignCrew(inst.id, {
              crew_user_id: crewId,
              role: null,
            })
          )
        );
      }

      return inst;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['installations'] }),
        queryClient.invalidateQueries({
          queryKey: ['installations', { store_id: selectedStoreId || myStoreId }],
        }),
        queryClient.invalidateQueries({ queryKey: ['calendar', 'installations'] }),
      ]);

      toast.success(t('createInstallationPage.toasts.created'));
      navigate('/app/calendar');
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        t('createInstallationPage.toasts.createFailed');
      toast.error(msg);
    },
  });

  const canSubmit =
    !!externalOrderId &&
    !!date &&
    !!timeStart &&
    (!!selectedStoreId || !!myStoreId) &&
    !!difficulty &&
    !createMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t('createInstallationPage.header.title')}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {t('createInstallationPage.header.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column: main form */}
        <div className="space-y-6 lg:col-span-2">
          {/* Store selector (for admins) */}
          <section className="card">
            <div className="card-header">
              <h3 className="card-title">
                {t('createInstallationPage.store.title')}
              </h3>
              <p className="card-description">
                {t('createInstallationPage.store.subtitle')}
              </p>
            </div>
            <div className="card-content space-y-2">
              <select
                className="input w-full"
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                disabled={!!myStoreId && !storesQuery.isError && !storesQuery.isLoading}
              >
                <option value="">
                  {storesQuery.isLoading
                    ? t('createInstallationPage.store.loading')
                    : myStoreId
                    ? t('createInstallationPage.store.usingAssigned')
                    : t('createInstallationPage.store.selectPlaceholder')}
                </option>
                {(storesQuery.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {storesQuery.isError && (
                <p className="text-xs text-red-600">
                  {t('createInstallationPage.store.loadError')}
                </p>
              )}
            </div>
          </section>

          {/* External Order ID (manual input only) */}
          <section className="card">
            <div className="card-header">
              <h3 className="card-title">
                {t('createInstallationPage.order.title')}
              </h3>
              <p className="card-description">
                {t('createInstallationPage.order.subtitle')}
              </p>
            </div>
            <div className="card-content space-y-3">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-700">
                  {t('createInstallationPage.order.externalIdLabel')}
                </span>
                <input
                  type="text"
                  className="input"
                  placeholder={t('createInstallationPage.order.externalIdPlaceholder')}
                  value={externalOrderId}
                  onChange={(e) => setExternalOrderId(e.target.value)}
                />
              </label>
            </div>
          </section>

          {/* Schedule */}
          <section className="card">
            <div className="card-header">
              <h3 className="card-title">
                {t('createInstallationPage.schedule.title')}
              </h3>
            </div>
            <div className="card-content grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <CalendarIcon className="h-4 w-4 text-gray-500" />
                  {t('createInstallationPage.schedule.dateLabel')}
                </span>
                <input
                  type="date"
                  className="input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Clock className="h-4 w-4 text-gray-500" />
                  {t('createInstallationPage.schedule.timeLabel')}
                </span>
                <input
                  type="time"
                  className="input"
                  value={timeStart}
                  onChange={(e) => setTimeStart(e.target.value)}
                />
              </label>
            </div>
          </section>

          {/* Zone (front-end only for now) */}
          <section className="card">
            <div className="card-header">
              <h3 className="card-title">
                {t('createInstallationPage.zone.title')}
              </h3>
              <p className="card-description">
                {t('createInstallationPage.zone.subtitle')}
              </p>
            </div>
            <div className="card-content">
              <select
                className="input w-full"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
              >
                <option value="">
                  {t('createInstallationPage.zone.selectPlaceholder')}
                </option>
                {ZONES.map((z) => (
                  <option key={z.value} value={z.value}>
                    {z.label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* Installation Difficulty */}
          <section className="card">
            <div className="card-header">
              <h3 className="card-title">
                {t('createInstallationPage.difficulty.title')}
              </h3>
              <p className="card-description">
                {t('createInstallationPage.difficulty.subtitle')}
              </p>
            </div>
            <div className="card-content space-y-3">
              <div className="flex flex-wrap gap-2">
                {DIFFICULTIES.map((value) => {
                  const selected = difficulty === value;
                  const labelKey =
                    value === 'easy'
                      ? 'createInstallationPage.difficulty.options.easy'
                      : value === 'intermediate'
                      ? 'createInstallationPage.difficulty.options.intermediate'
                      : 'createInstallationPage.difficulty.options.hard';

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setDifficulty(value)}
                      className={cn(
                        'rounded-md border px-3 py-1.5 text-sm transition',
                        selected
                          ? 'border-primary-600 bg-primary-600 text-white'
                          : 'border-gray-300 bg-white hover:bg-gray-50'
                      )}
                      aria-pressed={selected}
                    >
                      {t(labelKey)}
                    </button>
                  );
                })}
              </div>

              <div className="mt-1">
                {difficulty ? (
                  <p className="text-sm text-gray-700">
                    {t('createInstallationPage.difficulty.selected')}{' '}
                    <span className="font-medium">
                      {difficulty === 'easy'
                        ? t('createInstallationPage.difficulty.options.easy')
                        : difficulty === 'intermediate'
                        ? t('createInstallationPage.difficulty.options.intermediate')
                        : t('createInstallationPage.difficulty.options.hard')}
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">
                    {t('createInstallationPage.difficulty.noneSelected')}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Notes */}
          <section className="card">
            <div className="card-header">
              <h3 className="card-title">
                {t('createInstallationPage.notes.title')}
              </h3>
              <p className="card-description">
                {t('createInstallationPage.notes.subtitle')}
              </p>
            </div>
            <div className="card-content">
              <textarea
                className="textarea w-full"
                rows={4}
                placeholder={t('createInstallationPage.notes.placeholder')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </section>
        </div>

        {/* Right column: crew & actions */}
        <div className="space-y-6">
          {/* Crew */}
          <section className="card">
            <div className="card-header">
              <h3 className="card-title">
                {t('createInstallationPage.crew.title')}
              </h3>
              <p className="card-description">
                {t('createInstallationPage.crew.subtitle')}
              </p>
            </div>
            <div className="card-content space-y-3">
              {crewQuery.isLoading && (
                <p className="text-sm text-gray-500">
                  {t('createInstallationPage.crew.loading')}
                </p>
              )}
              {crewQuery.isError && (
                <p className="text-sm text-red-600">
                  {t('createInstallationPage.crew.loadError')}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {(crewQuery.data ?? []).map((c) => {
                  const selected = crewIds.includes(c.id);
                  const atLimit = crewIds.length >= 3 && !selected;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCrew(c.id)}
                      className={cn(
                        'rounded-md border px-3 py-1.5 text-sm transition',
                        selected
                          ? 'border-primary-600 bg-primary-600 text-white'
                          : 'border-gray-300 bg-white hover:bg-gray-50',
                        atLimit && 'cursor-not-allowed opacity-50'
                      )}
                      disabled={atLimit}
                      title={
                        atLimit ? t('createInstallationPage.crew.maxTooltip') : undefined
                      }
                    >
                      {c.name ?? c.email ?? c.id}
                    </button>
                  );
                })}
              </div>

              <div className="mt-2">
                {crewIds.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    {t('createInstallationPage.crew.noneSelected')}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(crewQuery.data ?? [])
                      .filter((c) => crewIds.includes(c.id))
                      .map((c) => (
                        <span
                          key={c.id}
                          className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-sm"
                        >
                          {c.name ?? c.email ?? c.id}
                          <button
                            type="button"
                            onClick={() => toggleCrew(c.id)}
                            className="text-gray-500 hover:text-gray-700"
                            aria-label={t('createInstallationPage.crew.removeAria', {
                              name: c.name ?? c.email ?? c.id,
                            })}
                            title={t('createInstallationPage.crew.removeTitle')}
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Actions */}
          <section className="card">
            <div className="card-header">
              <h3 className="card-title">
                {t('createInstallationPage.actions.title')}
              </h3>
              <p className="card-description">
                {t('createInstallationPage.actions.subtitle')}
              </p>
            </div>
            <div className="card-content">
              <button
                className="btn btn-primary inline-flex w-full items-center justify-center gap-2"
                onClick={() => createMutation.mutate()}
                disabled={!canSubmit}
              >
                <Save
                  className={cn(
                    'h-4 w-4',
                    createMutation.isPending && 'animate-pulse'
                  )}
                />
                {createMutation.isPending
                  ? t('createInstallationPage.actions.scheduling')
                  : t('createInstallationPage.actions.submit')}
              </button>
              {!canSubmit && (
                <p className="mt-2 text-xs text-gray-500">
                  {t('createInstallationPage.actions.hint')}
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
