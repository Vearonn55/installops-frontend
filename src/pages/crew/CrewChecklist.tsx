// src/pages/crew/CrewChecklist.tsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, Camera, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

import { cn } from '../../lib/utils';
import { isAxiosError } from '../../api/http';
import { updateInstallationStatus, type InstallStatus } from '../../api/installations';

function storageKey(jobId: string) {
  return `crew_checklist_${jobId}`;
}

type InstallOutcome = 'successful' | 'failed';

type Values = {
  arrived_on_time?: boolean;
  customer_notes?: string;

  install_status?: InstallOutcome;
  handover_docs?: boolean;
  payment_notes?: string;
  google_reco_given?: boolean;

  failure_reason?: string;
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

  const [values, setValues] = useState<Values>({});
  const [submitting, setSubmitting] = useState(false);
  const [submittingAfterSale, setSubmittingAfterSale] = useState(false);

  // local-only photos (will connect to /api/media later)
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  // ---- derive helpers ----
  const installStatus = values.install_status;
  const handoverDocs = values.handover_docs ?? false;
  const paymentNotes = values.payment_notes ?? '';
  const googleRecoGiven = values.google_reco_given ?? false;
  const failureReason = values.failure_reason ?? '';

  // ------------------ load + autosave draft ------------------
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
    }
  }, [jobId]);

  useEffect(() => {
    if (!jobId) return;
    try {
      localStorage.setItem(storageKey(jobId), JSON.stringify(values));
    } catch {
      // ignore quota errors
    }
  }, [values, jobId]);

  // clean up object URLs on unmount
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
    setPhotos((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      return [];
    });
    toast('Draft cleared');
  }

  // Map UI outcome → backend InstallStatus
  function mapInstallStatusForApi(status: InstallOutcome): InstallStatus {
    return status === 'successful' ? 'completed' : 'failed';
  }

  // ------------------------ photo handlers ------------------------
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
      toast.error('No valid images selected');
      return;
    }

    setPhotos((prev) => [...prev, ...next]);
  }

  // --------------------------- submit ---------------------------
  async function onSubmit() {
    if (!jobId) {
      toast.error('Missing job ID');
      return;
    }

    setSubmitting(true);
    try {
      if (installStatus === 'successful' || installStatus === 'failed') {
        const apiStatus = mapInstallStatusForApi(installStatus);
        await updateInstallationStatus(jobId, { status: apiStatus });
      }

      // NOTE: photos are still local-only.
      // Next step: upload files + call /installations/{id}/media using /api/media.ts.

      toast.success('Checklist submitted');
      localStorage.removeItem(storageKey(jobId));
      navigate(`/crew/jobs/${jobId}`);
    } catch (err) {
      if (isAxiosError(err)) {
        const msg =
          (err.response?.data as { message?: string; error?: string })?.message ||
          (err.response?.data as { message?: string; error?: string })?.error ||
          'Failed to submit checklist';
        toast.error(msg);
      } else {
        toast.error('Failed to submit checklist');
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ---------------- after-sale status ----------------
  async function markAfterSaleService() {
    if (!jobId) {
      toast.error('Missing job ID');
      return;
    }

    setSubmittingAfterSale(true);
    try {
      await updateInstallationStatus(jobId, {
        status: 'after_sale_service' as InstallStatus,
      });

      toast.success('Marked as after-sale service');
      localStorage.removeItem(storageKey(jobId));
      navigate(`/crew/jobs/${jobId}`);
    } catch (err) {
      if (isAxiosError(err)) {
        const msg =
          (err.response?.data as { message?: string; error?: string })?.message ||
          (err.response?.data as { message?: string; error?: string })?.error ||
          'Failed to mark after-sale service';
        toast.error(msg);
      } else {
        toast.error('Failed to mark after-sale service');
      }
    } finally {
      setSubmittingAfterSale(false);
    }
  }

  return (
    // root: flex column, main is scrollable, footer pinned at bottom
    <div className="flex h-full min-h-0 flex-1 flex-col bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex w-full max-w-screen-sm items-center gap-3 px-3 py-2">
          <button
            className="rounded-md p-1 hover:bg-gray-50"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-gray-900">
              Installation Checklist
            </div>
            <div className="text-[11px] text-gray-500">
              Standard Install Handover • v1.0.0
            </div>
          </div>
        </div>
      </header>

      {/* Scrollable content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-screen-sm space-y-3 p-3 pb-24">
          {/* Arrived on time */}
          <section className="rounded-xl border bg-white p-3 shadow-sm">
            <div className="text-sm font-medium text-gray-900">Arrived on time</div>
            <div className="mt-3 flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="arrived_on_time"
                  checked={values.arrived_on_time === true}
                  onChange={() => update('arrived_on_time', true)}
                />
                Yes
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="arrived_on_time"
                  checked={values.arrived_on_time === false}
                  onChange={() => update('arrived_on_time', false)}
                />
                No
              </label>
            </div>
          </section>

          {/* Customer notes */}
          <section className="rounded-xl border bg-white p-3 shadow-sm">
            <div className="text-sm font-medium text-gray-900">Customer notes</div>
            <div className="mt-0.5 text-xs text-gray-500">
              Anything the customer requested
            </div>
            <div className="mt-3 space-y-2">
              <textarea
                className="input w-full min-h-[72px]"
                placeholder="Type here…"
                value={values.customer_notes ?? ''}
                onChange={(e) => update('customer_notes', e.target.value)}
              />
              <div className="text-right">
                <button
                  onClick={() => update('customer_notes', undefined)}
                  className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                >
                  Clear
                </button>
              </div>
            </div>
          </section>

          {/* Photos */}
          <section className="rounded-xl border bg-white p-3 shadow-sm">
            <div className="text-sm font-medium text-gray-900">Photos</div>
            <div className="mt-0.5 text-xs text-gray-500">
              Take a quick photo or pick from your gallery. Your browser will ask for
              camera / photo permissions if needed.
            </div>

            {/* Hidden inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                handleFilesSelected(e.target.files, 'camera');
                // clear value so selecting the same file again still fires onChange
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

            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                type="button"
                className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 px-3 py-4 text-center text-xs font-medium text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                onClick={() => {
                  if (!cameraInputRef.current) return;
                  cameraInputRef.current.click();
                }}
              >
                <Camera className="mb-1 h-5 w-5" />
                <span>Take photo</span>
              </button>

              <button
                type="button"
                className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 px-3 py-4 text-center text-xs font-medium text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                onClick={() => {
                  if (!galleryInputRef.current) return;
                  galleryInputRef.current.click();
                }}
              >
                <ImageIcon className="mb-1 h-5 w-5" />
                <span>Select from gallery</span>
              </button>
            </div>

            {photos.length > 0 && (
              <div className="mt-3 space-y-1">
                <div className="text-[11px] font-medium text-gray-500">
                  Selected photos ({photos.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {photos.map((p) => (
                    <div
                      key={p.id}
                      className="relative h-16 w-16 overflow-hidden rounded-md border"
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
            )}
          </section>

          {/* Installation result */}
          <section className="rounded-xl border bg-white p-3 shadow-sm">
            <div className="mb-2 text-sm font-medium text-gray-900">Installation result</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={cn(
                  'rounded-md border px-3 py-2 text-sm',
                  installStatus === 'successful'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 hover:bg-gray-50'
                )}
                onClick={() => {
                  update('install_status', 'successful');
                  update('failure_reason', undefined);
                }}
              >
                Installation successful
              </button>
              <button
                type="button"
                className={cn(
                  'rounded-md border px-3 py-2 text-sm',
                  installStatus === 'failed'
                    ? 'border-rose-300 bg-rose-50 text-rose-700'
                    : 'border-gray-200 hover:bg-gray-50'
                )}
                onClick={() => {
                  update('install_status', 'failed');
                  update('handover_docs', undefined);
                  update('payment_notes', undefined);
                  update('google_reco_given', undefined);
                }}
              >
                Installation failed
              </button>
            </div>
          </section>

          {/* When successful */}
          {installStatus === 'successful' && (
            <>
              <section className="rounded-xl border bg-white p-3 shadow-sm">
                <div className="text-sm font-medium text-gray-900">
                  Insurance document and User instructions given
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={handoverDocs}
                      onChange={(e) => update('handover_docs', e.target.checked)}
                    />
                    Confirmed
                  </label>
                </div>
              </section>

              <section className="rounded-xl border bg-white p-3 shadow-sm">
                <div className="text-sm font-medium text-gray-900">
                  About customer payment
                </div>
                <div className="mt-2 space-y-2">
                  <textarea
                    className="input w-full min-h-[72px]"
                    placeholder="Write any notes about payment method, receipt, balance, or follow-up…"
                    value={paymentNotes}
                    onChange={(e) => update('payment_notes', e.target.value)}
                  />
                  <div className="text-right">
                    <button
                      onClick={() => update('payment_notes', undefined)}
                      className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border bg-white p-3 shadow-sm">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900">
                    Google recommendation given
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500">
                    Ask customer to scan and leave a quick Google review.
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={googleRecoGiven}
                      onChange={(e) => update('google_reco_given', e.target.checked)}
                    />
                    Confirmed
                  </label>

                  <button
                    type="button"
                    className="ml-auto inline-flex items-center rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
                    onClick={() => toast('Opening QR generator (mock)…')}
                  >
                    Open QR generator
                  </button>
                </div>
              </section>
            </>
          )}

          {/* When failed */}
          {installStatus === 'failed' && (
            <section className="rounded-xl border bg-white p-3 shadow-sm">
              <div className="text-sm font-medium text-gray-900">Failure reason</div>
              <div className="mt-2 space-y-2">
                <textarea
                  className="input w-full min-h-[72px]"
                  placeholder="Describe the failure reason…"
                  value={failureReason}
                  onChange={(e) => update('failure_reason', e.target.value)}
                />
                <div className="text-right">
                  <button
                    onClick={() => update('failure_reason', undefined)}
                    className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-gray-500">
                  If this job requires a follow-up visit, you can mark it as an after-sale
                  service.
                </p>
                <button
                  type="button"
                  onClick={markAfterSaleService}
                  disabled={submittingAfterSale}
                  className="inline-flex items-center justify-center rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                >
                  {submittingAfterSale && (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  )}
                  After-sale service
                </button>
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white">
        <div className="mx-auto flex w-full max-w-screen-sm gap-2 px-3 py-3">
          <button
            className="btn-soft flex-1"
            onClick={() => {
              clearDraft();
            }}
          >
            Clear All
          </button>
          <button
            disabled={submitting || submittingAfterSale}
            className={cn(
              'inline-flex flex-1 items-center justify-center rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50'
            )}
            onClick={onSubmit}
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Submit
          </button>
        </div>
      </footer>
    </div>
  );
}
