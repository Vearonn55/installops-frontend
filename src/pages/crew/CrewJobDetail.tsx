// src/pages/crew/CrewJobDetail.tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  MapPin,
  Phone,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../../lib/utils';

/* --------------------------- Mock types & data --------------------------- */
type CrewJobStatus = 'pending' | 'Staged' | 'in_progress' | 'completed' | 'failed';

type CrewJob = {
  id: string;
  order_id: string;
  start: string; // ISO
  end: string;   // ISO
  customer: string;
  phone?: string;
  address: string;
  zone: 'Nicosia' | 'Famagusta' | 'Kyrenia' | 'Morphou' | 'Iskele';
  status: CrewJobStatus;
  notes?: string;
  items?: Array<{ sku: string; name: string; qty: number }>;
};

function formatTimeRange(startISO: string, endISO: string) {
  const s = new Date(startISO);
  const e = new Date(endISO);
  const fmt = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${fmt(s)}–${fmt(e)}`;
}

function mockJobs(): CrewJob[] {
  const base = new Date();
  const t = (h: number, m = 0) => {
    const d = new Date(base);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };
  return [
    {
      id: 'inst-3001',
      order_id: 'ORD-10291',
      start: t(9),
      end: t(10, 30),
      customer: 'Ali Demir',
      phone: '0533 555 12 34',
      address: 'Atatürk Cad. No:18, Nicosia',
      zone: 'Nicosia',
      status: 'in_progress',
      notes: 'Flat pack wardrobe + 2 chairs',
      items: [
        { sku: 'WARD-100', name: 'Wardrobe 180cm', qty: 1 },
        { sku: 'CHAIR-RED', name: 'Dining Chair (Red)', qty: 2 },
      ],
    },
    {
      id: 'inst-3002',
      order_id: 'ORD-10295',
      start: t(12),
      end: t(13, 30),
      customer: 'Selin Kaya',
      address: 'Ece Sk. 12, Famagusta',
      zone: 'Famagusta',
      status: 'Staged',
      notes: 'Kitchen island assembly',
      items: [{ sku: 'KIT-ISL-120', name: 'Kitchen Island 120', qty: 1 }],
    },
    {
      id: 'inst-3003',
      order_id: 'ORD-10302',
      start: t(15),
      end: t(16, 30),
      customer: 'Mete Aydın',
      address: 'Zeytinlik Mah., Kyrenia',
      zone: 'Kyrenia',
      status: 'pending',
      notes: 'Sofa & coffee table',
      items: [
        { sku: 'SOFA-3S', name: '3-Seater Sofa', qty: 1 },
        { sku: 'TABLE-COFFEE', name: 'Coffee Table', qty: 1 },
      ],
    },
  ];
}

function statusClass(s: CrewJobStatus) {
  switch (s) {
    case 'completed':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'in_progress':
      return 'border-blue-200 bg-blue-50 text-blue-700';
    case 'Staged':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'failed':
      return 'border-red-200 bg-red-50 text-red-700';
    default:
      return 'border-gray-200 bg-gray-50 text-gray-700';
  }
}

function statusLabel(s: CrewJobStatus) {
  switch (s) {
    case 'completed':
      return 'Completed';
    case 'in_progress':
      return 'In progress';
    case 'Staged':
      return 'Staged';
    case 'failed':
      return 'Failed';
    default:
      return 'Pending';
  }
}

/* -------------------------------- Component -------------------------------- */
export default function CrewJobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const allJobs = useMemo(() => mockJobs(), []);
  const initial = useMemo(
    () => allJobs.find((j) => j.id === id) || allJobs[0],
    [allJobs, id]
  );

  const [job, setJob] = useState<CrewJob>(initial);

  useEffect(() => {
    setJob(initial);
  }, [initial]);

  return (
    <div className="mx-auto h-full w-full max-w-screen-sm">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b">
        <div className="flex items-center gap-3 px-3 py-2">
          <button className="rounded-md p-1 hover:bg-gray-50" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-gray-500">Job</div>
            <div className="text-sm font-semibold text-gray-900">{job.id}</div>
          </div>
          <span
            className={cn(
              'ml-auto inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
              statusClass(job.status)
            )}
          >
            {statusLabel(job.status)}
          </span>
        </div>
      </header>

      <main className="space-y-4 p-3">
        {/* Customer & schedule */}
        <section className="rounded-xl border bg-white p-3 shadow-sm">
          <div className="text-base font-semibold text-gray-900">{job.customer}</div>

          <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span>{formatTimeRange(job.start, job.end)}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              <span className="truncate">
                {job.address} • {job.zone}
              </span>
            </div>
            {job.phone && (
              <a href={`tel:${job.phone}`} className="flex items-center gap-2 text-primary-700 hover:underline">
                <Phone className="h-4 w-4" />
                {job.phone}
              </a>
            )}
          </div>

          {job.notes && (
            <div className="mt-2 rounded-lg bg-gray-50 p-2 text-xs text-gray-600">
              <span className="font-medium text-gray-700">Notes:</span> {job.notes}
            </div>
          )}
        </section>

        {/* Items to install */}
        {!!job.items?.length && (
          <section className="rounded-xl border bg-white p-3 shadow-sm">
            <div className="mb-2 text-sm font-semibold text-gray-900">Items</div>
            <ul className="divide-y">
              {job.items.map((it) => (
                <li key={it.sku} className="flex items-center justify-between py-2">
                  <div className="min-w-0">
                    <div className="text-sm text-gray-900">{it.name}</div>
                    <div className="text-xs font-mono text-gray-500">{it.sku}</div>
                  </div>
                  <div className="text-sm font-medium text-gray-900">×{it.qty}</div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Timeline-ish status */}
        <section className="rounded-xl border bg-white p-3 shadow-sm">
          <div className="text-sm font-semibold text-gray-900">Progress</div>
          <ol className="mt-2 grid grid-cols-3 gap-2 text-center text-[11px]">
            {[
              { key: 'staged', label: 'Staged' },
              { key: 'in_progress', label: 'In progress' },
              { key: 'completed', label: 'Completed' },
            ].map((s) => {
              const active =
                (s.key === 'staged' && (job.status === 'Staged' || job.status === 'in_progress' || job.status === 'completed')) ||
                (s.key === 'in_progress' && (job.status === 'in_progress' || job.status === 'completed')) ||
                (s.key === 'completed' && job.status === 'completed');

              return (
                <li
                  key={s.key}
                  className={cn(
                    'rounded-lg border px-2 py-1',
                    active ? 'border-primary-200 bg-emerald-200 text-primary-700' : 'border-gray-200 text-gray-500'
                  )}
                >
                  {s.label}
                </li>
              );
            })}
          </ol>
        </section>

        {/* Order link */}
        <section className="rounded-xl border bg-white p-3 shadow-sm">
          <button
            onClick={() => navigate(`/crew/jobs/${job.id}/order`)}
            className="flex w-full items-center justify-between"
          >
            <div className="text-left">
              <div className="text-xs uppercase tracking-wide text-gray-500">Order</div>
              <div className="font-mono text-sm text-gray-900">{job.order_id}</div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>
        </section>
      </main>
    </div>
  );
}

/* ------------------------------ Notes / Styles ------------------------------
Utility classes used:
- .btn-soft and .quick-tile referenced elsewhere in the app.
If you don’t have them globally, these are the intended Tailwind compositions:

.btn-soft      => inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 active:scale-[0.99]
.quick-tile    => flex flex-col items-center justify-center rounded-xl border bg-white p-3 text-gray-700 shadow-sm active:scale-[0.99] hover:bg-gray-50
----------------------------------------------------------------------------- */