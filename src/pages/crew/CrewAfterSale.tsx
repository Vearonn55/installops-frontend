// After-sale: mark installation as after_sale_service with customer notes (separate from checklist).
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, LifeBuoy } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuthStore } from '../../stores/auth';
import {
  listInstallations,
  updateInstallationStatus,
  updateCrewAfterInstallationNotes,
  type CrewAssignment,
  type Installation,
} from '../../api/installations';
import type { UUID } from '../../api/http';
import { isAxiosError } from '../../api/http';
import {
  pickInstallationRecordStatus,
  mapBackendInstallationToCrewUiStatus,
} from '../../lib/installation-status';

export default function CrewAfterSale() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const [selectedId, setSelectedId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const pre = (searchParams.get('installation_id') || '').trim();
    if (pre) setSelectedId(pre);
  }, [searchParams]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['crew-installations'],
    queryFn: () => listInstallations({ limit: 200, offset: 0 }),
  });

  const myJobs = useMemo(() => {
    const rows = (data?.data ?? []) as Installation[];
    const uid = user?.id;
    if (!uid) return [];
    return rows.filter((inst) =>
      (inst.crew || []).some((c: CrewAssignment) => c.crew_user_id === uid)
    );
  }, [data?.data, user?.id]);

  async function onSubmit() {
    const id = selectedId.trim();
    if (!id) {
      toast.error('Select a job');
      return;
    }
    const text = notes.trim();
    if (!text) {
      toast.error('Enter customer notes');
      return;
    }

    setSaving(true);
    try {
      await updateCrewAfterInstallationNotes(id as UUID, {
        crew_after_installation_notes: text,
      });
      await updateInstallationStatus(id as UUID, { status: 'after_sale_service' });
      toast.success('Saved as after-sale service');
      setNotes('');
      setSelectedId('');
      navigate(`/crew/jobs/${id}`);
    } catch (err) {
      if (isAxiosError(err)) {
        const body = err.response?.data as { message?: string; error?: string } | undefined;
        toast.error(body?.message || body?.error || 'Could not save');
      } else {
        toast.error('Could not save');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="crew-page">
      <header className="mb-4 flex items-center gap-3">
        <button
          type="button"
          className="rounded-md p-1 hover:bg-gray-50"
          onClick={() => navigate('/crew')}
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex min-w-0 items-center gap-2">
          <LifeBuoy className="h-5 w-5 shrink-0 text-primary-600" />
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-gray-900">After-sale service</h1>
            <p className="text-xs text-gray-500">
              Customer notes only — marks the job for follow-up in the office.
            </p>
          </div>
        </div>
      </header>

      {isLoading && (
        <div className="rounded-xl border bg-white p-4 text-sm text-gray-600">Loading your jobs…</div>
      )}
      {isError && (
        <div className="rounded-xl border bg-white p-4 text-sm text-red-600">Could not load jobs.</div>
      )}

      {!isLoading && !isError && (
        <div className="space-y-4">
          <section className="rounded-xl border bg-white p-3 shadow-sm">
            <label className="block text-sm font-medium text-gray-900">Job</label>
            <p className="mt-0.5 text-xs text-gray-500">Choose one of your assigned installations.</p>
            <select
              className="input mt-2 w-full"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              <option value="">— Select —</option>
              {myJobs.map((j) => {
                const raw = pickInstallationRecordStatus(j as unknown as Record<string, unknown>);
                const pill = mapBackendInstallationToCrewUiStatus(raw);
                return (
                  <option key={j.id} value={j.id}>
                    {j.external_order_id || j.id} · {pill}
                  </option>
                );
              })}
            </select>
          </section>

          <section className="rounded-xl border bg-white p-3 shadow-sm">
            <label className="block text-sm font-medium text-gray-900">Customer notes</label>
            <textarea
              className="input mt-2 w-full min-h-[120px]"
              placeholder="What the customer asked, site conditions, follow-up needed…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </section>

          <button
            type="button"
            disabled={saving}
            onClick={onSubmit}
            className="inline-flex w-full min-h-11 items-center justify-center rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save as after-sale service'}
          </button>
        </div>
      )}
    </div>
  );
}
