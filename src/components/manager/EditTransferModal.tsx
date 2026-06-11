import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Loader2, X } from 'lucide-react';

import type { UUID } from '../../api/http';
import { getTransfer, updateTransfer, type Transfer } from '../../api/transfers';
import { ScheduleDateTimeInput } from '../../components/schedule/ScheduleDateTimeInput';
import {
  finalizeScheduleDateTimeInput,
  formatScheduleDateTimeInput,
  parseScheduleDateTimeInput,
} from '../../lib/schedule-input';

type FormState = {
  scheduled_start: string;
  scheduled_end: string;
  notes: string;
  location: string;
  source_depot_label: string;
  dest_depot_label: string;
};

type Props = {
  transferId: UUID | null;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

function formFromTransfer(tr: Transfer): FormState {
  return {
    scheduled_start: formatScheduleDateTimeInput(tr.scheduled_start ?? null),
    scheduled_end: formatScheduleDateTimeInput(tr.scheduled_end ?? null),
    notes: tr.notes?.trim() ?? '',
    location: tr.location?.trim() ?? '',
    source_depot_label: tr.source_depot_label?.trim() ?? '',
    dest_depot_label: tr.dest_depot_label?.trim() ?? '',
  };
}

export default function EditTransferModal({
  transferId,
  open,
  onClose,
  onSaved,
}: Props) {
  const { t } = useTranslation('common');
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  const trQuery = useQuery({
    queryKey: ['transfer', transferId, 'edit'],
    queryFn: () => getTransfer(transferId as UUID),
    enabled: open && !!transferId,
  });

  const tr = trQuery.data;

  useEffect(() => {
    if (!open) {
      setForm(null);
      return;
    }
    if (trQuery.data) {
      setForm(formFromTransfer(trQuery.data));
    }
  }, [open, trQuery.data]);

  const handleSave = async () => {
    if (!transferId || !form) return;

    if (!form.scheduled_start) {
      toast.error(t('transfersPage.editModal.validation.startRequired'));
      return;
    }

    setSaving(true);
    try {
      const scheduledStartIso = parseScheduleDateTimeInput(form.scheduled_start);
      if (!scheduledStartIso) {
        toast.error(t('transfersPage.editModal.validation.startInvalid'));
        setSaving(false);
        return;
      }
      const scheduledEndIso = form.scheduled_end.trim()
        ? parseScheduleDateTimeInput(form.scheduled_end)
        : null;
      if (form.scheduled_end.trim() && !scheduledEndIso) {
        toast.error(t('transfersPage.editModal.validation.endInvalid'));
        setSaving(false);
        return;
      }

      await updateTransfer(transferId, {
        scheduled_start: scheduledStartIso,
        scheduled_end: scheduledEndIso,
        notes: form.notes.trim() || null,
        location: form.location.trim() || null,
        source_depot_label: form.source_depot_label.trim() || null,
        dest_depot_label: form.dest_depot_label.trim() || null,
      });

      await queryClient.invalidateQueries({ queryKey: ['transfers'] });
      await queryClient.invalidateQueries({ queryKey: ['transfer', transferId] });

      toast.success(t('transfersPage.editModal.saved'));
      onSaved?.();
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : t('transfersPage.editModal.saveFailed');
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="flex max-h-[min(100dvh,720px)] w-full max-w-2xl flex-col rounded-t-2xl bg-white shadow-xl sm:max-h-[90vh] sm:rounded-2xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900">{t('transfersPage.editModal.title')}</h2>
            <p className="mt-0.5 text-xs text-gray-500">{t('transfersPage.editModal.subtitle')}</p>
            {tr ? (
              <p className="mt-1 font-mono text-xs text-gray-600">
                {tr.transfer_code || tr.id.slice(0, 8)} · {tr.external_transfer_id}
                {tr.store?.name ? ` · ${tr.store.name}` : ''}
              </p>
            ) : null}
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg hover:bg-gray-100 disabled:opacity-50" aria-label={t('transfersPage.editModal.cancel')}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {trQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              {t('transfersPage.editModal.loading')}
            </div>
          ) : trQuery.isError ? (
            <p className="py-8 text-center text-sm text-red-600">{t('transfersPage.editModal.loadError')}</p>
          ) : form ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">{t('transfersPage.editModal.scheduledStart')}</label>
                  <ScheduleDateTimeInput
                    placeholder={t('createTransferPage.schedule.dateTimePlaceholder')}
                    value={form.scheduled_start}
                    onChange={(next) => setForm((p) => (p ? { ...p, scheduled_start: next } : p))}
                    onBlur={() => setForm((p) => (p ? { ...p, scheduled_start: finalizeScheduleDateTimeInput(p.scheduled_start) } : p))}
                    calendarAriaLabel={t('createTransferPage.schedule.openCalendarAria')}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">{t('transfersPage.editModal.scheduledEnd')}</label>
                  <ScheduleDateTimeInput
                    placeholder={t('createTransferPage.schedule.dateTimePlaceholder')}
                    value={form.scheduled_end}
                    onChange={(next) => setForm((p) => (p ? { ...p, scheduled_end: next } : p))}
                    onBlur={() => setForm((p) => (p ? { ...p, scheduled_end: finalizeScheduleDateTimeInput(p.scheduled_end) } : p))}
                    calendarAriaLabel={t('createTransferPage.schedule.openCalendarAria')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">{t('transfersPage.editModal.sourceDepotLabel')}</label>
                  <input className="input w-full" value={form.source_depot_label} onChange={(e) => setForm((p) => (p ? { ...p, source_depot_label: e.target.value } : p))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">{t('transfersPage.editModal.destDepotLabel')}</label>
                  <input className="input w-full" value={form.dest_depot_label} onChange={(e) => setForm((p) => (p ? { ...p, dest_depot_label: e.target.value } : p))} />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">{t('transfersPage.editModal.location')}</label>
                <input className="input w-full" value={form.location} onChange={(e) => setForm((p) => (p ? { ...p, location: e.target.value } : p))} />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">{t('transfersPage.editModal.notes')}</label>
                <textarea rows={3} className="input w-full" value={form.notes} onChange={(e) => setForm((p) => (p ? { ...p, notes: e.target.value } : p))} />
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t px-4 py-3">
          <button type="button" onClick={onClose} disabled={saving} className="min-h-10 rounded-lg border px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60">
            {t('transfersPage.editModal.cancel')}
          </button>
          <button type="button" onClick={() => void handleSave()} disabled={saving || trQuery.isLoading || !form} className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary-600 px-4 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('transfersPage.editModal.saving')}
              </>
            ) : (
              t('transfersPage.editModal.save')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
