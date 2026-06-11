// src/pages/manager/CreateTransferPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar as CalendarIcon, Clock, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import { cn } from '../../lib/utils';
import { useAuthStore } from '../../stores/auth';
import {
  createTransfer,
  assignTransferCrew,
  type TransferCreate,
} from '../../api/transfers';
import { getNetsisTransferDetail } from '../../api/integrations';
import { listUsers } from '../../api/users';
import { listRoles } from '../../api/roles';
import { listStores, type Store } from '../../api/stores';
import { crewPickerLabel, filterCrewUsersForPicker } from '../../lib/crew-users';
import { defaultDateRangeOneMonthAhead } from '../../lib/date-range';
import {
  finalizeScheduleDateInput,
  finalizeScheduleTimeInput,
  formatScheduleDateInput,
  normalizeScheduleTimeInput,
  parseScheduleDateInput,
  parseScheduleTimeInput,
} from '../../lib/schedule-input';
import { TransferIdSearchCombobox } from '../../components/TransferIdSearchCombobox';
import { ScheduleDateInput } from '../../components/schedule/ScheduleDateInput';
import type { UUID } from '../../api/http';

const toISODateTime = (date: string, time: string) => {
  if (!date || !time) return '';
  const [y, mo, d] = date.split('-').map((v) => parseInt(v, 10));
  const [h, m] = time.split(':').map((v) => parseInt(v, 10));
  if (Number.isNaN(y) || Number.isNaN(mo) || Number.isNaN(d) || Number.isNaN(h) || Number.isNaN(m)) {
    return '';
  }
  return new Date(y, mo - 1, d, h, m, 0, 0).toISOString();
};

const addMinutesToIso = (iso: string, minutes: number) => {
  if (!iso) return '';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  dt.setMinutes(dt.getMinutes() + minutes);
  return dt.toISOString();
};

export default function CreateTransferPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { t } = useTranslation('common');

  const myStoreId = (user as { store_id?: string })?.store_id;

  const [externalTransferId, setExternalTransferId] = useState('');
  const initialDate = defaultDateRangeOneMonthAhead().from;
  const [date, setDate] = useState(initialDate);
  const [timeStart, setTimeStart] = useState('09:00');
  const [dateInput, setDateInput] = useState(() => formatScheduleDateInput(initialDate));
  const [timeInput, setTimeInput] = useState('09:00');
  const [crewIds, setCrewIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState<string>(myStoreId || '');
  const [sourceDepotCode, setSourceDepotCode] = useState<number | null>(null);
  const [destDepotCode, setDestDepotCode] = useState<number | null>(null);
  const [erpDate, setErpDate] = useState<string | null>(null);
  const [prefillItems, setPrefillItems] = useState<Array<{ external_product_id: string; quantity: number }>>([]);

  const handleDateBlur = () => {
    const finalized = finalizeScheduleDateInput(dateInput);
    const parsed = parseScheduleDateInput(finalized);
    if (parsed) {
      setDate(parsed);
      setDateInput(formatScheduleDateInput(parsed));
      return;
    }
    setDateInput(formatScheduleDateInput(date));
  };

  const handleTimeBlur = () => {
    const finalized = finalizeScheduleTimeInput(timeInput);
    const parsed = parseScheduleTimeInput(finalized);
    if (parsed) {
      setTimeStart(parsed);
      setTimeInput(parsed);
      return;
    }
    setTimeInput(timeStart);
  };

  const storesQuery = useQuery({
    queryKey: ['stores', 'for-transfer-create'],
    queryFn: async () => {
      const res = await listStores({ limit: 100, offset: 0 });
      return res.data as Store[];
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!myStoreId && !selectedStoreId && !storesQuery.isLoading && !storesQuery.isError) {
      const first = (storesQuery.data ?? [])[0];
      if (first) setSelectedStoreId(first.id);
    }
  }, [myStoreId, selectedStoreId, storesQuery.isLoading, storesQuery.isError, storesQuery.data]);

  const storeId = selectedStoreId || myStoreId || '';

  useEffect(() => {
    const fid = externalTransferId.trim();
    if (!storeId || !fid) {
      setSourceDepotCode(null);
      setDestDepotCode(null);
      setErpDate(null);
      setPrefillItems([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await getNetsisTransferDetail({
          store_id: storeId as UUID,
          transfer_id: fid,
        });
        if (cancelled) return;
        const data = res.data;
        setSourceDepotCode(data.source_depot_code ?? null);
        setDestDepotCode(data.dest_depot_code ?? null);
        setErpDate(data.erp_date ?? null);
        setPrefillItems(
          (data.items ?? [])
            .map((line) => ({
              external_product_id: line.external_product_id,
              quantity: line.quantity,
            }))
            .filter((it) => !!it.external_product_id)
        );
      } catch {
        if (!cancelled) {
          setSourceDepotCode(null);
          setDestDepotCode(null);
          setErpDate(null);
          setPrefillItems([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [externalTransferId, storeId]);

  const crewQuery = useQuery({
    queryKey: ['users', 'crew-picker', 'transfer-create'],
    queryFn: async () => {
      const rolesRes = await listRoles({ limit: 100, offset: 0 });
      const crewRole = rolesRes.data.find((r) => (r.name ?? '').toLowerCase() === 'crew');
      if (!crewRole) return [];
      const res = await listUsers({
        role_id: crewRole.id,
        status: 'active',
        limit: 200,
        offset: 0,
      });
      return filterCrewUsersForPicker(res.data);
    },
    staleTime: 60_000,
  });

  const toggleCrew = (id: string) => {
    setCrewIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!storeId) throw new Error(t('createTransferPage.validation.storeRequired'));
      if (!externalTransferId.trim()) {
        throw new Error(t('createTransferPage.validation.transferIdRequired'));
      }
      if (!date || !timeStart) {
        throw new Error(t('createTransferPage.validation.scheduleRequired'));
      }

      const scheduled_start = toISODateTime(date, timeStart);
      const scheduled_end = addMinutesToIso(scheduled_start, 120);

      const payload: TransferCreate = {
        external_transfer_id: externalTransferId.trim(),
        store_id: storeId,
        scheduled_start,
        scheduled_end,
        notes: notes.trim() || null,
        location: location.trim() || null,
        erp_date: erpDate,
        source_depot_code: sourceDepotCode,
        dest_depot_code: destDepotCode,
        items: prefillItems.length ? prefillItems : undefined,
      };

      const tr = await createTransfer(payload);

      if (crewIds.length) {
        await Promise.all(
          crewIds.map((crewId) =>
            assignTransferCrew(tr.id, { crew_user_id: crewId as UUID, role: null })
          )
        );
      }

      return tr;
    },
    onSuccess: async (tr) => {
      await queryClient.invalidateQueries({ queryKey: ['transfers'] });
      toast.success(t('createTransferPage.toasts.created'));
      navigate(`/app/transfers/${tr.id}`);
    },
    onError: (err: { response?: { data?: { message?: string } }; message?: string }) => {
      toast.error(
        err?.response?.data?.message || err?.message || t('createTransferPage.toasts.createFailed')
      );
    },
  });

  const canSubmit =
    !!externalTransferId.trim() &&
    !!date &&
    !!timeStart &&
    !!storeId &&
    !createMutation.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('createTransferPage.header.title')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('createTransferPage.header.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card">
            <div className="card-header">
              <h3 className="card-title">{t('createTransferPage.store.title')}</h3>
            </div>
            <div className="card-content">
              <select
                className="input-select-chevron-only w-full"
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                disabled={!!myStoreId && !storesQuery.isError && !storesQuery.isLoading}
              >
                <option value="">{t('createTransferPage.store.selectPlaceholder')}</option>
                {(storesQuery.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </section>

          <section className="card">
            <div className="card-header">
              <h3 className="card-title">{t('createTransferPage.transfer.title')}</h3>
              <p className="card-description">{t('createTransferPage.transfer.subtitle')}</p>
            </div>
            <div className="card-content space-y-3">
              <TransferIdSearchCombobox
                storeId={storeId as UUID}
                value={externalTransferId}
                onChange={setExternalTransferId}
                label={t('createTransferPage.transfer.externalIdLabel')}
                placeholder={t('createTransferPage.transfer.externalIdPlaceholder')}
              />
              {(sourceDepotCode != null || destDepotCode != null) && (
                <p className="text-sm text-gray-600">
                  {t('createTransferPage.transfer.depotsFromErp')}:{' '}
                  <span className="font-medium">{sourceDepotCode ?? '—'}</span>
                  {' → '}
                  <span className="font-medium">{destDepotCode ?? '—'}</span>
                  {prefillItems.length > 0 ? (
                    <span className="text-gray-500"> · {prefillItems.length} {t('createTransferPage.transfer.items')}</span>
                  ) : null}
                </p>
              )}
            </div>
          </section>

          <section className="card">
            <div className="card-header">
              <h3 className="card-title">{t('createTransferPage.schedule.title')}</h3>
            </div>
            <div className="card-content grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <CalendarIcon className="h-4 w-4 text-gray-500" />
                  {t('createTransferPage.schedule.dateLabel')}
                </span>
                <ScheduleDateInput
                  placeholder={t('createTransferPage.schedule.datePlaceholder')}
                  value={dateInput}
                  onChange={setDateInput}
                  onBlur={handleDateBlur}
                  onValidDate={setDate}
                  calendarAriaLabel={t('createTransferPage.schedule.openCalendarAria')}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Clock className="h-4 w-4 text-gray-500" />
                  {t('createTransferPage.schedule.timeLabel')}
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  className="input w-full tabular-nums"
                  placeholder={t('createTransferPage.schedule.timePlaceholder')}
                  value={timeInput}
                  onChange={(e) => setTimeInput(normalizeScheduleTimeInput(e.target.value))}
                  onBlur={handleTimeBlur}
                />
              </label>
            </div>
          </section>

          <section className="card">
            <div className="card-header">
              <h3 className="card-title">{t('createTransferPage.notes.title')}</h3>
            </div>
            <div className="card-content space-y-3">
              <input
                className="input w-full"
                placeholder={t('createTransferPage.location.placeholder')}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
              <textarea
                className="textarea w-full"
                rows={4}
                placeholder={t('createTransferPage.notes.placeholder')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="card">
            <div className="card-header">
              <h3 className="card-title">{t('createTransferPage.crew.title')}</h3>
            </div>
            <div className="card-content">
              <div className="flex flex-wrap gap-2">
                {(crewQuery.data ?? []).map((c) => {
                  const name = crewPickerLabel(c)!;
                  const selected = crewIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCrew(c.id)}
                      className={cn(
                        'rounded-md border px-3 py-1.5 text-sm transition',
                        selected
                          ? 'border-primary-600 bg-primary-600 text-white'
                          : 'border-gray-300 bg-white hover:bg-gray-50'
                      )}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="card">
            <div className="card-content">
              <button
                className="btn btn-primary inline-flex w-full items-center justify-center gap-2"
                onClick={() => createMutation.mutate()}
                disabled={!canSubmit}
              >
                <Save className={cn('h-4 w-4', createMutation.isPending && 'animate-pulse')} />
                {createMutation.isPending
                  ? t('createTransferPage.actions.scheduling')
                  : t('createTransferPage.actions.submit')}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
