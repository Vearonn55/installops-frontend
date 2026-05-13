import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Loader2, X } from 'lucide-react';

import { cn } from '../../lib/utils';
import type { UUID } from '../../api/http';
import {
  assignCrew,
  deleteCrewAssignment,
  getInstallation,
  updateInstallationSchedule,
  updateInstallationStatus,
  type InstallStatus,
  type Installation,
} from '../../api/installations';
import { listUsers, type User } from '../../api/users';
import { isoToLocalInput, localInputToIso } from '../../lib/installation-datetime';
import {
  INSTALLATION_ZONES,
  zoneLabelFromValue,
  zoneValueFromLocation,
} from '../../lib/installation-zones';

type DifficultyValue = 'easy' | 'intermediate' | 'hard';

type FormState = {
  status: InstallStatus;
  scheduled_start: string;
  scheduled_end: string;
  zone: string;
  difficulty: DifficultyValue | '';
  customer_name: string;
  customer_phone: string;
  notes: string;
  customer_payment_note: string;
  crewIds: string[];
};

const DIFFICULTIES: DifficultyValue[] = ['easy', 'intermediate', 'hard'];

type Props = {
  installationId: UUID | null;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

function formFromInstallation(inst: Installation): FormState {
  return {
    status: inst.status,
    scheduled_start: isoToLocalInput(inst.scheduled_start ?? null),
    scheduled_end: isoToLocalInput(inst.scheduled_end ?? null),
    zone: zoneValueFromLocation(inst.location),
    difficulty: (inst.difficulty as DifficultyValue | null) ?? '',
    customer_name: inst.customer_name?.trim() ?? '',
    customer_phone: inst.customer_phone?.trim() ?? '',
    notes: inst.notes?.trim() ?? '',
    customer_payment_note: inst.customer_payment_note?.trim() ?? '',
    crewIds: (inst.crew ?? []).map((c) => c.crew_user_id),
  };
}

export default function EditInstallationModal({
  installationId,
  open,
  onClose,
  onSaved,
}: Props) {
  const { t } = useTranslation('common');
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState | null>(null);
  const [baselineCrew, setBaselineCrew] = useState<Installation['crew']>([]);
  const [saving, setSaving] = useState(false);

  const instQuery = useQuery({
    queryKey: ['installation', installationId, 'edit'],
    queryFn: () => getInstallation(installationId as UUID),
    enabled: open && !!installationId,
  });

  const crewQuery = useQuery({
    queryKey: ['users', 'crew-edit'],
    queryFn: async () => {
      const res = await listUsers({ limit: 200, offset: 0 });
      return res.data as User[];
    },
    enabled: open,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!open) {
      setForm(null);
      setBaselineCrew([]);
      return;
    }
    if (instQuery.data) {
      setForm(formFromInstallation(instQuery.data));
      setBaselineCrew(instQuery.data.crew ?? []);
    }
  }, [open, instQuery.data]);

  const inst = instQuery.data;
  const loading = instQuery.isLoading;
  const loadError = instQuery.isError;

  const toggleCrew = (userId: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const has = prev.crewIds.includes(userId);
      if (has) {
        return { ...prev, crewIds: prev.crewIds.filter((id) => id !== userId) };
      }
      if (prev.crewIds.length >= 3) {
        toast.error(t('createInstallationPage.toasts.maxCrew'));
        return prev;
      }
      return { ...prev, crewIds: [...prev.crewIds, userId] };
    });
  };

  const handleSave = async () => {
    if (!installationId || !form || !inst) return;

    if (!form.scheduled_start) {
      toast.error(t('installationsPage.editModal.validation.startRequired'));
      return;
    }
    if (!form.difficulty) {
      toast.error(t('installationsPage.editModal.validation.difficultyRequired'));
      return;
    }

    setSaving(true);
    try {
      const zoneLabel = zoneLabelFromValue(form.zone);

      await updateInstallationSchedule(installationId, {
        scheduled_start: localInputToIso(form.scheduled_start),
        scheduled_end: localInputToIso(form.scheduled_end),
        notes: form.notes.trim() || null,
        location: zoneLabel,
        difficulty: form.difficulty,
        customer_name: form.customer_name.trim() || null,
        customer_phone: form.customer_phone.trim() || null,
        customer_payment_note: form.customer_payment_note.trim() || null,
      });

      if (form.status !== inst.status) {
        await updateInstallationStatus(installationId, { status: form.status });
      }

      const baselineIds = new Set((baselineCrew ?? []).map((c) => c.crew_user_id));
      const nextIds = new Set(form.crewIds);

      for (const assignment of baselineCrew ?? []) {
        if (!nextIds.has(assignment.crew_user_id)) {
          await deleteCrewAssignment(installationId, assignment.id);
        }
      }
      for (const userId of form.crewIds) {
        if (!baselineIds.has(userId)) {
          await assignCrew(installationId, { crew_user_id: userId as UUID });
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['installations'] });
      await queryClient.invalidateQueries({ queryKey: ['installation', installationId] });
      await queryClient.invalidateQueries({ queryKey: ['calendar'] });

      toast.success(t('installationsPage.editModal.saved'));
      onSaved?.();
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : t('installationsPage.editModal.saveFailed');
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[min(100dvh,720px)] w-full max-w-2xl flex-col rounded-t-2xl bg-white shadow-xl sm:max-h-[90vh] sm:rounded-2xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900">
              {t('installationsPage.editModal.title')}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {t('installationsPage.editModal.subtitle')}
            </p>
            {inst ? (
              <p className="mt-1 font-mono text-xs text-gray-600">
                {inst.install_code || inst.id.slice(0, 8)} · {inst.external_order_id}
                {inst.store?.name ? ` · ${inst.store.name}` : ''}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg hover:bg-gray-100 disabled:opacity-50"
            aria-label={t('installationsPage.editModal.cancel')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              {t('installationsPage.editModal.loading')}
            </div>
          ) : loadError ? (
            <p className="py-8 text-center text-sm text-red-600">
              {t('installationsPage.editModal.loadError')}
            </p>
          ) : form ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    {t('installationsPage.editModal.scheduledStart')}
                  </label>
                  <input
                    type="datetime-local"
                    className="input w-full"
                    value={form.scheduled_start}
                    onChange={(e) =>
                      setForm((p) => (p ? { ...p, scheduled_start: e.target.value } : p))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    {t('installationsPage.editModal.scheduledEnd')}
                  </label>
                  <input
                    type="datetime-local"
                    className="input w-full"
                    value={form.scheduled_end}
                    onChange={(e) =>
                      setForm((p) => (p ? { ...p, scheduled_end: e.target.value } : p))
                    }
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  {t('installationsPage.editModal.status')}
                </label>
                <select
                  className="input w-full"
                  value={form.status}
                  onChange={(e) =>
                    setForm((p) =>
                      p ? { ...p, status: e.target.value as InstallStatus } : p
                    )
                  }
                >
                  <option value="scheduled">{t('installationsPage.statusLabels.scheduled')}</option>
                  <option value="staged">{t('installationsPage.filters.status.staged')}</option>
                  <option value="in_progress">
                    {t('installationsPage.filters.status.in_progress')}
                  </option>
                  <option value="completed">
                    {t('installationsPage.filters.status.completed')}
                  </option>
                  <option value="failed">{t('installationsPage.filters.status.failed')}</option>
                  <option value="canceled">{t('installationsPage.statusLabels.canceled')}</option>
                  <option value="after_sale_service">
                    {t('installationsPage.filters.status.after_sale_service')}
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  {t('createInstallationPage.zone.title')}
                </label>
                <select
                  className="input-select-chevron-only w-full"
                  value={form.zone}
                  onChange={(e) =>
                    setForm((p) => (p ? { ...p, zone: e.target.value } : p))
                  }
                >
                  <option value="">{t('createInstallationPage.zone.selectPlaceholder')}</option>
                  {INSTALLATION_ZONES.map((z) => (
                    <option key={z.value} value={z.value}>
                      {z.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-gray-600">
                  {t('createInstallationPage.difficulty.title')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {DIFFICULTIES.map((value) => {
                    const selected = form.difficulty === value;
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
                        onClick={() => setForm((p) => (p ? { ...p, difficulty: value } : p))}
                        className={cn(
                          'min-h-11 rounded-lg border px-2 text-center text-xs font-medium sm:text-sm',
                          selected
                            ? 'border-primary-600 bg-primary-600 text-white'
                            : 'border-gray-300 bg-white hover:bg-gray-50'
                        )}
                      >
                        {t(labelKey)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    {t('installationsPage.editModal.customerName')}
                  </label>
                  <input
                    className="input w-full"
                    value={form.customer_name}
                    onChange={(e) =>
                      setForm((p) => (p ? { ...p, customer_name: e.target.value } : p))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    {t('installationsPage.editModal.customerPhone')}
                  </label>
                  <input
                    className="input w-full"
                    type="tel"
                    value={form.customer_phone}
                    onChange={(e) =>
                      setForm((p) => (p ? { ...p, customer_phone: e.target.value } : p))
                    }
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  {t('createInstallationPage.notes.title')}
                </label>
                <textarea
                  rows={3}
                  className="input w-full"
                  placeholder={t('createInstallationPage.notes.placeholder')}
                  value={form.notes}
                  onChange={(e) =>
                    setForm((p) => (p ? { ...p, notes: e.target.value } : p))
                  }
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  {t('createInstallationPage.paymentNote.title')}
                </label>
                <textarea
                  rows={3}
                  className="input w-full"
                  placeholder={t('createInstallationPage.paymentNote.placeholder')}
                  value={form.customer_payment_note}
                  onChange={(e) =>
                    setForm((p) =>
                      p ? { ...p, customer_payment_note: e.target.value } : p
                    )
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-gray-600">
                  {t('createInstallationPage.crew.title')}
                </label>
                <p className="mb-2 text-xs text-gray-500">
                  {t('createInstallationPage.crew.subtitle')}
                </p>
                {crewQuery.isLoading ? (
                  <p className="text-sm text-gray-500">{t('createInstallationPage.crew.loading')}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(crewQuery.data ?? []).map((c) => {
                      const selected = form.crewIds.includes(c.id);
                      const atLimit = form.crewIds.length >= 3 && !selected;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleCrew(c.id)}
                          disabled={atLimit}
                          className={cn(
                            'rounded-lg border px-3 py-2 text-sm transition',
                            selected
                              ? 'border-primary-600 bg-primary-600 text-white'
                              : 'border-gray-300 bg-white hover:bg-gray-50',
                            atLimit && 'cursor-not-allowed opacity-50'
                          )}
                        >
                          {c.name ?? c.email ?? c.id}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="min-h-10 rounded-lg border px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {t('installationsPage.editModal.cancel')}
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || loading || !form}
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary-600 px-4 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('installationsPage.editModal.saving')}
              </>
            ) : (
              t('installationsPage.editModal.save')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
