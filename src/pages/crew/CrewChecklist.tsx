// src/pages/crew/CrewChecklist.tsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Camera,
  Image as ImageIcon,
  Banknote,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { cn } from '../../lib/utils';
import { isAxiosError } from '../../api/http';
import type { UUID } from '../../api/http';
import {
  getInstallation,
  updateInstallationStatus,
  updateInstallationChecklistResult,
  updateCrewAfterInstallationNotes,
  type InstallStatus,
} from '../../api/installations';
import { uploadInstallationMedia } from '../../api/media';
import {
  mapBackendInstallationToCrewUiStatus,
  pickInstallationRecordStatus,
} from '../../lib/installation-status';
import { crewReadOnlyBannerKey, isCrewChecklistAllowedStatus } from '../../lib/crew-job';

function storageKey(jobId: string) {
  return `crew_checklist_${jobId}`;
}

type InstallOutcome = 'successful' | 'failed';

type Values = {
  arrived_on_time?: boolean;
  customer_notes?: string;
  install_status?: InstallOutcome;
  handover_docs?: boolean;
  google_reco_given?: boolean;
  failure_reason?: string;
  mark_after_sale?: boolean;
};

type LocalPhoto = {
  id: string;
  file: File;
  previewUrl: string;
  source: 'camera' | 'gallery';
};

export default function CrewChecklist() {
  const { id: jobId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation('common');

  const [values, setValues] = useState<Values>({});
  const [submitting, setSubmitting] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);

  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const instQuery = useQuery({
    queryKey: ['installation', jobId],
    queryFn: () => getInstallation(jobId as UUID),
    enabled: !!jobId,
  });

  const customerPaymentNote =
    instQuery.data?.customer_payment_note?.trim() || '';

  const checklistUiStatus = instQuery.data
    ? mapBackendInstallationToCrewUiStatus(
        pickInstallationRecordStatus(instQuery.data as unknown as Record<string, unknown>)
      )
    : null;

  const checklistLocked =
    checklistUiStatus !== null && !isCrewChecklistAllowedStatus(checklistUiStatus);

  const checklistLockMessageKey = checklistUiStatus
    ? crewReadOnlyBannerKey(checklistUiStatus)
    : null;

  const installStatus = values.install_status;
  const handoverDocs = values.handover_docs ?? false;
  const googleRecoGiven = values.google_reco_given ?? false;
  const failureReason = values.failure_reason ?? '';
  const markAfterSale = values.mark_after_sale ?? false;

  useEffect(() => {
    if (!jobId) return;
    try {
      const raw = localStorage.getItem(storageKey(jobId));
      if (raw) {
        const parsed = JSON.parse(raw) as Values;
        setValues(parsed ?? {});
      }
    } catch {
      // ignore malformed drafts
    } finally {
      setDraftHydrated(true);
    }
  }, [jobId]);

  useEffect(() => {
    if (!jobId || !draftHydrated) return;
    try {
      localStorage.setItem(storageKey(jobId), JSON.stringify(values));
    } catch {
      // ignore quota errors
    }
  }, [values, jobId, draftHydrated]);

  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, [photos]);

  function update<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function clearDraft() {
    if (!jobId) return;
    localStorage.removeItem(storageKey(jobId));
    setValues({});
    setDraftHydrated(true);
    setPhotos((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      return [];
    });
    toast(t('crewPages.checklist.draftCleared'));
  }

  function mapInstallStatusForApi(status: InstallOutcome): InstallStatus {
    return status === 'successful' ? 'completed' : 'failed';
  }

  function handleFilesSelected(fileList: FileList | null, source: 'camera' | 'gallery') {
    if (!fileList || fileList.length === 0) return;

    const next: LocalPhoto[] = [];
    for (let i = 0; i < fileList.length; i += 1) {
      const file = fileList.item(i);
      if (!file) continue;
      if (!file.type.startsWith('image/')) continue;

      const previewUrl = URL.createObjectURL(file);
      next.push({
        id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        file,
        previewUrl,
        source,
      });
    }

    if (next.length === 0) {
      toast.error(t('crewPages.checklist.noValidImages'));
      return;
    }

    setPhotos((prev) => [...prev, ...next]);
  }

  async function onSubmit() {
    if (!jobId) {
      toast.error(t('crewPages.checklist.missingJobId'));
      return;
    }
    if (checklistLocked) {
      toast.error(
        checklistLockMessageKey
          ? t(checklistLockMessageKey)
          : t('crewPages.checklist.locked')
      );
      return;
    }

    setSubmitting(true);
    try {
      if (installStatus === 'failed' && !String(failureReason).trim()) {
        toast.error(t('crewPages.checklist.failureRequired'));
        return;
      }

      if (installStatus === 'successful' || installStatus === 'failed') {
        const apiStatus =
          installStatus === 'failed' && markAfterSale
            ? ('after_sale_service' as InstallStatus)
            : mapInstallStatusForApi(installStatus);

        const inst = await getInstallation(jobId as UUID);
        const current = String(inst.status || '').toLowerCase();
        if (current === 'staged') {
          await updateInstallationStatus(jobId as UUID, { status: 'in_progress' });
        }
        await updateInstallationStatus(jobId, { status: apiStatus });
      }

      const siteNotes = String(values.customer_notes ?? '').trim();
      await updateCrewAfterInstallationNotes(jobId as UUID, {
        crew_after_installation_notes: siteNotes ? siteNotes : null,
      });
      await updateInstallationChecklistResult(jobId as UUID, {
        checklist_result:
          installStatus === 'successful'
            ? 'success'
            : installStatus === 'failed'
              ? 'failed'
              : null,
        checklist_failure_reason:
          installStatus === 'failed' ? String(failureReason).trim() || null : null,
        checklist_completed_at:
          installStatus === 'successful' || installStatus === 'failed'
            ? new Date().toISOString()
            : null,
      });

      if (photos.length > 0) {
        let uploaded = 0;
        for (const p of photos) {
          try {
            await uploadInstallationMedia(jobId as UUID, p.file, {
              type: 'photo',
              tags: { source: 'crew_checklist', capture: p.source },
            });
            uploaded += 1;
          } catch (uploadErr) {
            console.error('checklist photo upload failed:', uploadErr);
          }
        }
        if (uploaded === 0) {
          toast.error(t('crewPages.checklist.photosUploadFailed'));
        } else if (uploaded < photos.length) {
          toast.error(
            t('crewPages.checklist.photosUploadPartial', {
              uploaded,
              total: photos.length,
            })
          );
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['installation', jobId] });
      await queryClient.invalidateQueries({ queryKey: ['installationMedia', jobId] });
      await queryClient.invalidateQueries({ queryKey: ['crew-jobs-installations'] });
      await queryClient.invalidateQueries({ queryKey: ['crew-installations'] });

      toast.success(t('crewPages.checklist.submitSuccess'));
      localStorage.removeItem(storageKey(jobId));
      navigate(`/crew/jobs/${jobId}`);
    } catch (err) {
      if (isAxiosError(err)) {
        const body = err.response?.data as { message?: string; error?: string } | undefined;
        const msg = body?.message || body?.error || t('crewPages.checklist.submitFailed');
        toast.error(msg);
      } else {
        toast.error(t('crewPages.checklist.submitFailed'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-gray-50">
      <header className="sticky top-0 z-10 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-screen-sm items-center gap-2 px-3 py-3">
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl hover:bg-gray-100"
            onClick={() => navigate(-1)}
            aria-label={t('crewPages.backToJobs')}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-semibold text-gray-900">
              {t('crewPages.checklist.title')}
            </div>
            <div className="text-xs text-gray-500">{t('crewPages.checklist.subtitle')}</div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="crew-page crew-page-sticky-footer space-y-3">
          {checklistLocked && checklistLockMessageKey ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              {t(checklistLockMessageKey)}
            </div>
          ) : null}

          {customerPaymentNote ? (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <Banknote className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-amber-950">
                    {t('crewPages.checklist.paymentNoteTitle')}
                  </div>
                  <p className="mt-0.5 text-xs text-amber-800">
                    {t('crewPages.checklist.paymentNoteHint')}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-amber-950">
                    {customerPaymentNote}
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          <section className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-gray-900">
              {t('crewPages.checklist.arrivedOnTime')}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                className={cn(
                  'min-h-12 rounded-xl border px-3 text-sm font-medium',
                  values.arrived_on_time === true
                    ? 'border-primary-500 bg-primary-50 text-primary-800'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                )}
                onClick={() => update('arrived_on_time', true)}
              >
                {t('crewPages.checklist.yes')}
              </button>
              <button
                type="button"
                className={cn(
                  'min-h-12 rounded-xl border px-3 text-sm font-medium',
                  values.arrived_on_time === false
                    ? 'border-primary-500 bg-primary-50 text-primary-800'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                )}
                onClick={() => update('arrived_on_time', false)}
              >
                {t('crewPages.checklist.no')}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-gray-900">
              {t('crewPages.checklist.customerNotes')}
            </div>
            <p className="mt-0.5 text-xs text-gray-500">
              {t('crewPages.checklist.customerNotesHint')}
            </p>
            <textarea
              className="input mt-3 min-h-[88px] w-full rounded-xl text-base"
              placeholder={t('crewPages.checklist.customerNotesPlaceholder')}
              value={values.customer_notes ?? ''}
              onChange={(e) => update('customer_notes', e.target.value)}
            />
            <div className="mt-2 text-right">
              <button
                type="button"
                onClick={() => update('customer_notes', undefined)}
                className="min-h-10 rounded-lg border px-3 text-xs font-medium hover:bg-gray-50"
              >
                {t('crewPages.checklist.clear')}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-gray-900">
              {t('crewPages.checklist.photos')}
            </div>
            <p className="mt-0.5 text-xs text-gray-500">{t('crewPages.checklist.photosHint')}</p>

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                handleFilesSelected(e.target.files, 'camera');
                e.target.value = '';
              }}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                handleFilesSelected(e.target.files, 'gallery');
                e.target.value = '';
              }}
            />

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="flex min-h-[4.5rem] flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 px-3 text-center text-xs font-semibold text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="mb-1.5 h-6 w-6" />
                {t('crewPages.checklist.takePhoto')}
              </button>
              <button
                type="button"
                className="flex min-h-[4.5rem] flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 px-3 text-center text-xs font-semibold text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                onClick={() => galleryInputRef.current?.click()}
              >
                <ImageIcon className="mb-1.5 h-6 w-6" />
                {t('crewPages.checklist.selectGallery')}
              </button>
            </div>

            {photos.length > 0 ? (
              <div className="mt-3">
                <div className="text-xs font-medium text-gray-500">
                  {t('crewPages.checklist.selectedPhotos', { count: photos.length })}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {photos.map((p) => (
                    <div
                      key={p.id}
                      className="relative h-20 w-20 overflow-hidden rounded-xl border"
                    >
                      <img
                        src={p.previewUrl}
                        alt={p.file.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-semibold text-gray-900">
              {t('crewPages.checklist.installResult')}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={cn(
                  'min-h-12 rounded-xl border px-3 text-sm font-semibold',
                  installStatus === 'successful'
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                    : 'border-gray-200 hover:bg-gray-50'
                )}
                onClick={() => {
                  update('install_status', 'successful');
                  update('failure_reason', undefined);
                }}
              >
                {t('crewPages.checklist.successful')}
              </button>
              <button
                type="button"
                className={cn(
                  'min-h-12 rounded-xl border px-3 text-sm font-semibold',
                  installStatus === 'failed'
                    ? 'border-rose-400 bg-rose-50 text-rose-800'
                    : 'border-gray-200 hover:bg-gray-50'
                )}
                onClick={() => {
                  update('install_status', 'failed');
                  update('handover_docs', undefined);
                  update('google_reco_given', undefined);
                }}
              >
                {t('crewPages.checklist.failed')}
              </button>
            </div>
          </section>

          {installStatus === 'successful' ? (
            <>
              <section className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="text-sm font-semibold text-gray-900">
                  {t('crewPages.checklist.handoverDocs')}
                </div>
                <label className="mt-3 flex min-h-12 items-center gap-3 rounded-xl border border-gray-200 px-3 text-sm">
                  <input
                    type="checkbox"
                    className="h-5 w-5"
                    checked={handoverDocs}
                    onChange={(e) => update('handover_docs', e.target.checked)}
                  />
                  {t('crewPages.checklist.confirmed')}
                </label>
              </section>

              <section className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="text-sm font-semibold text-gray-900">
                  {t('crewPages.checklist.googleReco')}
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  {t('crewPages.checklist.googleRecoHint')}
                </p>
                <label className="mt-3 flex min-h-12 items-center gap-3 rounded-xl border border-gray-200 px-3 text-sm">
                  <input
                    type="checkbox"
                    className="h-5 w-5"
                    checked={googleRecoGiven}
                    onChange={(e) => update('google_reco_given', e.target.checked)}
                  />
                  {t('crewPages.checklist.confirmed')}
                </label>
              </section>
            </>
          ) : null}

          {installStatus === 'failed' ? (
            <section className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-gray-900">
                {t('crewPages.checklist.failureReason')}
              </div>
              <textarea
                className="input mt-3 min-h-[88px] w-full rounded-xl text-base"
                placeholder={t('crewPages.checklist.failurePlaceholder')}
                value={failureReason}
                onChange={(e) => update('failure_reason', e.target.value)}
              />
              <div className="mt-2 text-right">
                <button
                  type="button"
                  onClick={() => update('failure_reason', undefined)}
                  className="min-h-10 rounded-lg border px-3 text-xs font-medium hover:bg-gray-50"
                >
                  {t('crewPages.checklist.clear')}
                </button>
              </div>

              <label className="mt-3 flex min-h-12 items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <input
                  type="checkbox"
                  checked={markAfterSale}
                  onChange={(e) => update('mark_after_sale', e.target.checked)}
                  className="mt-1 h-5 w-5"
                />
                <span>{t('crewPages.checklist.markAfterSale')}</span>
              </label>
            </section>
          ) : null}
        </div>
      </main>

      <footer className="shrink-0 border-t bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-screen-sm gap-2 px-3 py-3">
          <button
            type="button"
            className="btn-soft min-h-12 flex-1 rounded-xl text-sm font-semibold"
            onClick={clearDraft}
          >
            {t('crewPages.checklist.clearAll')}
          </button>
          <button
            type="button"
            disabled={submitting || checklistLocked}
            className={cn(
              'inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-primary-600 px-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50'
            )}
            onClick={onSubmit}
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            {t('crewPages.checklist.submit')}
          </button>
        </div>
      </footer>
    </div>
  );
}
