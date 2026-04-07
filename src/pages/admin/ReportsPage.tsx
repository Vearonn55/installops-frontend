// src/pages/admin/ReportsPage.tsx
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import {
  listInstallations,
  type Installation,
} from '../../api/installations';
import { listStores, type Store as ApiStore } from '../../api/stores';
import { useTranslation } from 'react-i18next';
import { defaultDateRangeOneMonthAhead } from '../../lib/date-range';

/* ---------- Local filter types ---------- */

type Difficulty = 'Easy' | 'Intermediate' | 'Hard';

// City filter is "All Cities" or any real city string
type CityFilter = 'All Cities' | string;

// Store filter is "All Stores" or a real store_id (UUID)
type StoreFilter = 'All Stores' | string;

/* ---------- Helpers that interpret backend data ---------- */

// get YYYY-MM-DD from ISO
function toLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isoDateOnly(iso: string | null | undefined): string | null {
  if (!iso) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return toLocalYmd(d);
}

// which date we treat as "installation date" for reports
function installationDate(inst: Installation): string | null {
  return (
    isoDateOnly(inst.scheduled_start ?? null) ||
    isoDateOnly(inst.created_at ?? null)
  );
}

// extract city from nested store/address if backend included it
function installationCity(inst: Installation): string | null {
  const anyInst = inst as any;
  const city =
    anyInst.store?.address?.city ??
    anyInst.store?.address?.town ??
    null;
  return city ?? null;
}

// difficulty meta encoded in notes like: [Difficulty: Easy]
function extractDifficulty(notes?: string | null): Difficulty | null {
  if (!notes) return null;
  const m = notes.match(/Difficulty:\s*(Easy|Intermediate|Hard)/i);
  if (!m) return null;
  const val = m[1].toLowerCase();
  if (val === 'easy') return 'Easy';
  if (val === 'intermediate') return 'Intermediate';
  if (val === 'hard') return 'Hard';
  return null;
}

// Service After Installation flag, based on notes convention
// Example: [ServiceAfter: yes]
function hasServiceAfter(inst: Installation): boolean {
  const notes = inst.notes ?? '';
  return /\[ServiceAfter:\s*(yes|true|1)\]/i.test(notes);
}

/* ---------- Component ---------- */

export default function ReportsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  // default: today → one month ahead
  const reportRangeDefaults = useMemo(() => defaultDateRangeOneMonthAhead(), []);

  const [startDate, setStartDate] = useState<string>(reportRangeDefaults.from);
  const [endDate, setEndDate] = useState<string>(reportRangeDefaults.to);
  const [city, setCity] = useState<CityFilter>('All Cities');
  const [storeFilter, setStoreFilter] = useState<StoreFilter>('All Stores');

  // ensure start <= end
  const onStartChange = (val: string) => {
    if (endDate && val > endDate) setEndDate(val);
    setStartDate(val);
  };
  const onEndChange = (val: string) => {
    if (startDate && val < startDate) setStartDate(val);
    setEndDate(val);
  };

  const inDateRange = (iso: string | null, start: string, end: string) =>
    !!iso &&
    (!start || iso >= start) &&
    (!end || iso <= end);

  /* ---------- Queries ---------- */

  // Stores for dropdown + city list
  const storesQuery = useQuery({
    queryKey: ['stores', 'reports'],
    queryFn: async () => {
      const res = await listStores({ limit: 200, offset: 0 });
      return res.data as ApiStore[];
    },
    staleTime: 60_000,
  });

  // Installations: fetch and filter client-side
  const installationsQuery = useQuery({
    queryKey: ['installations', 'reports'],
    queryFn: async () => {
      const res = await listInstallations({
        limit: 1000,
        offset: 0,
      });
      return res.data as Installation[];
    },
    staleTime: 60_000,
  });

  const installations = installationsQuery.data ?? [];

  /* ---------- Derived city & store options ---------- */

  const allCities: CityFilter[] = useMemo(() => {
    const set = new Set<string>();
    for (const inst of installations) {
      const c = installationCity(inst);
      if (c) set.add(c);
    }
    return ['All Cities', ...Array.from(set)];
  }, [installations]);

  const allStoresForFilter: { id: string; name: string }[] = useMemo(() => {
    const s = storesQuery.data ?? [];
    return s.map((st) => ({ id: st.id, name: st.name }));
  }, [storesQuery.data]);

  /* ---------- Filtered installations ---------- */

  const filtered = useMemo(() => {
    return installations
      .filter((inst) => {
        const d = installationDate(inst);
        const matchDate = inDateRange(d, startDate, endDate);

        const c = installationCity(inst);
        const matchCity =
          city === 'All Cities' ? true : c === city;

        const matchStore =
          storeFilter === 'All Stores'
            ? true
            : inst.store_id === storeFilter;

        return matchDate && matchCity && matchStore;
      })
      .sort((a, b) => {
        const da = installationDate(a) ?? '';
        const db = installationDate(b) ?? '';
        return da < db ? 1 : -1; // newest first
      });
  }, [installations, startDate, endDate, city, storeFilter]);

  /* ---------- Success stats (REAL: based on status) ---------- */

  const totalInstallations = filtered.length;
  const successfulInstallations = filtered.filter(
    (inst) => inst.status === 'completed'
  ).length;

  const successRate =
    totalInstallations === 0
      ? 0
      : Math.round(
          (successfulInstallations / totalInstallations) * 100
        );

  /* ---------- Difficulty stats (from notes meta) ---------- */

  const weight: Record<Difficulty, number> = {
    Easy: 0,
    Intermediate: 0.5,
    Hard: 1,
  };

  let easyCount = 0,
    intermediateCount = 0,
    hardCount = 0,
    weightedSum = 0;

  for (const inst of filtered) {
    const diff = extractDifficulty(inst.notes);
    if (!diff) continue;

    if (diff === 'Easy') easyCount++;
    else if (diff === 'Intermediate') intermediateCount++;
    else hardCount++;

    weightedSum += weight[diff];
  }

  const totalForDifficulty =
    easyCount + intermediateCount + hardCount;
  const avgDifficulty = totalForDifficulty
    ? (weightedSum / totalForDifficulty) * 100
    : 0; // 0–100
  const avgMarkerLeft = `${Math.min(
    Math.max(avgDifficulty, 0),
    100
  )}%`;

  /* ---------- Service After Installation stats (from notes meta) ---------- */

  const serviceAfterCount = filtered.filter((inst) =>
    hasServiceAfter(inst)
  ).length;

  /* ---------- Date formatting ---------- */

  const fmt = (iso: string) =>
    new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });

  /* ---------- Render ---------- */

  return (
    <div className="p-4 md:p-6">
        {/* Page header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">
          {t('reportsPage.title')}
        </h1>
      </div>
      {/* Top controls: Start, End, City, Store */}
      <div className="rounded-lg border bg-white">
        <div className="border-b px-4 py-3">
          <h2 className="text-base font-semibold">
            {t('reportsPage.filtersTitle')}
          </h2>
        </div>
        <div className="px-4 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            {/* Start date */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="start-date"
                className="text-sm font-medium"
              >
                {t('reportsPage.startLabel')}
              </label>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => onStartChange(e.target.value)}
                className="min-w-0 rounded-md border px-2 py-1 pr-10 text-sm [color-scheme:light]"
                max={endDate || undefined}
              />
            </div>

            {/* End date */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="end-date"
                className="text-sm font-medium"
              >
                {t('reportsPage.endLabel')}
              </label>
              <input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => onEndChange(e.target.value)}
                className="min-w-0 rounded-md border px-2 py-1 pr-10 text-sm [color-scheme:light]"
                min={startDate || undefined}
              />
            </div>

            {/* City */}
            <div className="flex min-w-0 items-center gap-2">
              <label
                htmlFor="city"
                className="shrink-0 text-sm font-medium"
              >
                {t('reportsPage.cityLabel')}
              </label>
              <select
                id="city"
                value={city}
                onChange={(e) =>
                  setCity(e.target.value as CityFilter)
                }
                className="min-w-0 flex-1 cursor-pointer rounded-md border py-1 pl-2 pr-8 text-sm"
              >
                {allCities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Store */}
            <div className="flex min-w-0 items-center gap-2">
              <label
                htmlFor="store"
                className="shrink-0 text-sm font-medium"
              >
                {t('reportsPage.storeLabel')}
              </label>
              <select
                id="store"
                value={storeFilter}
                onChange={(e) =>
                  setStoreFilter(e.target.value as StoreFilter)
                }
                className="min-w-0 flex-1 cursor-pointer rounded-md border py-1 pl-2 pr-8 text-sm"
              >
                <option value="All Stores">
                  {t('reportsPage.allStores')}
                </option>
                {allStoresForFilter.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name?.trim() || s.id}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Card 1 - Installation Success Rate (REAL) */}
        <div className="rounded-lg border bg-white p-4">
          <h3 className="mb-2 text-sm font-medium text-gray-700">
            {t('reportsPage.installationsTitle')}
          </h3>

          {/* Successful installations number + label */}
          <div className="flex flex-col">
            <div className="text-5xl font-semibold leading-tight text-gray-900">
              {successfulInstallations}
            </div>
            <span className="mt-1 text-sm text-gray-500">
              {t('reportsPage.totalSuccessfulLabel')}
            </span>
          </div>

          <div className="my-3 border-t border-gray-200" />

          {/* Percentage + label */}
          <div className="flex items-end gap-2">
            <div
              className={`text-4xl font-semibold leading-none ${
                successRate >= 75
                  ? 'text-green-600'
                  : successRate >= 50
                  ? 'text-yellow-500'
                  : 'text-red-500'
              }`}
            >
              {successRate}%
            </div>
            <span className="mb-1 text-sm text-gray-500">
              {t('reportsPage.successRateLabel')}
            </span>
          </div>
        </div>

        {/* Card 2 - Installation Difficulty Total (from notes meta) */}
        <div className="rounded-lg border bg-white p-4 sm:col-span-1">
          <h3 className="text-sm font-medium text-gray-700">
            {t('reportsPage.difficultyTitle')}
          </h3>

          {/* Counts */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-md border p-2 text-center">
              <div className="text-xs font-medium text-gray-600">
                {t('reportsPage.easyLabel')}
              </div>
              <div className="mt-1 text-2xl font-semibold text-green-600">
                {easyCount}
              </div>
            </div>
            <div className="rounded-md border p-2 text-center">
              <div className="text-xs font-medium text-gray-600">
                {t('reportsPage.intermediateLabel')}
              </div>
              <div className="mt-1 text-2xl font-semibold text-yellow-500">
                {intermediateCount}
              </div>
            </div>
            <div className="rounded-md border p-2 text-center">
              <div className="text-xs font-medium text-gray-600">
                {t('reportsPage.hardLabel')}
              </div>
              <div className="mt-1 text-2xl font-semibold text-red-600">
                {hardCount}
              </div>
            </div>
          </div>

          {/* Difficulty bar with percentage indicator */}
          <div className="relative mt-5 h-5 w-full overflow-hidden rounded-full">
            {/* Segments */}
            <div className="absolute inset-0 flex">
              <div className="flex-1 bg-green-500" title="Easy" />
              <div
                className="flex-1 bg-yellow-400"
                title="Intermediate"
              />
              <div className="flex-1 bg-red-500" title="Hard" />
            </div>

            {/* Average indicator */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-gray-900"
              style={{ left: avgMarkerLeft }}
              title={`Average: ${avgDifficulty.toFixed(0)}%`}
            />

            {/* Overlayed percentage text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-medium text-white drop-shadow-sm">
                {avgDifficulty.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* Card 3 - Service After Installation (from notes meta) */}
        <div className="rounded-lg border bg-white p-4">
          <h3 className="text-sm font-medium text-gray-700">
            {t('reportsPage.serviceAfterTitle')}
          </h3>

          <div className="mt-2 text-3xl font-semibold text-gray-900">
            {totalInstallations} / {serviceAfterCount}
          </div>

          <p className="mt-1 text-xs text-gray-500">
            {t('reportsPage.serviceAfterDescription')}
          </p>
        </div>
      </div>

      {/* Big Installations Card */}
      <div className="mt-6 rounded-lg border bg-white">
        <div className="border-b px-4 py-3">
          <h2 className="text-base font-semibold">
            {t('reportsPage.installationsTitle')}
          </h2>
          <p className="text-xs text-gray-500">
            {t('reportsPage.showing')}
            {' '}
            {filtered.length}
            {' '}
            {filtered.length !== 1
              ? t('reportsPage.items')
              : t('reportsPage.item')}
            {' '}
            {t('reportsPage.for')}
            {' '}
            {city}
            {storeFilter !== 'All Stores'
              ? ` ${t('reportsPage.selectedStoreSuffix')}`
              : ''}
            {' '}
            {t('reportsPage.between')}
            {' '}
            {startDate}
            {' '}
            {t('reportsPage.and')}
            {' '}
            {endDate}
          </p>
        </div>

        {/* List */}
        <div className="divide-y">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-sm text-gray-500">
              {t('reportsPage.noInstallations')}
            </div>
          ) : (
            filtered.map((inst) => {
              const d = installationDate(inst);
              return (
                <div
                  key={inst.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {inst.id}
                    </div>
                    {d && (
                      <div className="text-xs text-gray-500">
                        {fmt(d)}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        navigate(`/app/installations/${inst.id}`)
                      }
                      className="rounded-md border px-3 py-1 text-xs font-medium hover:bg-gray-50"
                      title={t('reportsPage.viewInstallationTooltip')}
                      type="button"
                    >
                      {t('reportsPage.viewInstallation')}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Debug params (optional) */}
      <div className="mt-4 rounded-md border px-3 py-2 text-xs text-gray-500">
        {t('reportsPage.debugCurrentParams')}
        {' '}
        {t('reportsPage.startLabel')}
        : <b>{startDate}</b>, {t('reportsPage.endLabel')}
        : <b>{endDate}</b>, {t('reportsPage.cityLabel')}
        : <b>{city}</b>, {t('reportsPage.storeLabel')}
        : <b>{storeFilter}</b>
      </div>
    </div>
  );
}
