// src/pages/crew/CrewOrderDetail.tsx
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, XCircle, Loader2, MapPin, User2 } from 'lucide-react';
import { cn } from '../../lib/utils';

type TimelineStatus = 'failed' | 'missing_part' | 'completed';

type TimelineEvent = {
  id: string;
  date: string;        // ISO date string
  status: TimelineStatus;
  note?: string;
};

type Customer = {
  name: string;
  region: string;      // e.g. "Nicosia"
  address: string;     // full address line(s)
};

type OrderDetail = {
  orderId: string;     // internal id
  orderNo: string;     // e.g. ORD-25322
  customer: Customer;
  timeline: TimelineEvent[]; // must be sorted ASC by date
};

// ---------------------- Mock fetch (replace with real API later) ----------------------
async function fetchOrderDetailByJobId(jobId: string): Promise<OrderDetail> {
  // Simulate latency
  await new Promise((r) => setTimeout(r, 300));

  // Example mock map by job id
  const MOCK: Record<string, OrderDetail> = {
    '1': {
      orderId: '1',
      orderNo: 'ORD-25322',
      customer: {
        name: 'Eren Kaya',
        region: 'Nicosia',
        address: 'Atatürk Cd. No: 47, K.Kaymaklı, Nicosia 99010',
      },
      timeline: [
        {
          id: 't1',
          date: '2025-10-10T09:30:00+03:00',
          status: 'failed',
          note: 'Customer was not available at the address.',
        },
        {
          id: 't2',
          date: '2025-10-13T14:15:00+03:00',
          status: 'missing_part',
          note: 'Left hinge bracket was missing; rescheduled after part arrival.',
        },
        {
          id: 't3',
          date: '2025-10-18T16:45:00+03:00',
          status: 'completed',
          note: 'Installation finished and verified with customer.',
        },
      ],
    },
  };

// Safe fallback orderNo generator for string IDs like 'inst-3001'
const seq = parseInt(jobId?.match(/\d+/)?.[0] ?? '0', 10);
const orderNo = `ORD-${20000 + (seq % 80000)}`;

const fallback: OrderDetail = {
    orderId: jobId,
    orderNo,
    customer: {
        name: 'Customer Name',
        region: 'Region',
        address: 'Full address line',
    },
    timeline: [
      {
        id: 't1',
        date: '2025-10-12T10:00:00+03:00',
        status: 'failed',
        note: 'Failed attempt (no access).',
      },
      {
        id: 't2',
        date: '2025-10-15T11:00:00+03:00',
        status: 'missing_part',
        note: 'Missing part reported; waiting for warehouse.',
      },
      {
        id: 't3',
        date: '2025-10-18T15:30:00+03:00',
        status: 'completed',
        note: 'Installation successful.',
      },
    ],
  };

  return MOCK[jobId] ?? fallback;
}

// ---------------------- Helpers ----------------------
function formatDate(dt: string) {
  try {
    const d = new Date(dt);
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dt;
  }
}

function statusBadgeStyles(status: TimelineStatus) {
  switch (status) {
    case 'failed':
    case 'missing_part': // <-- same as failed
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'completed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
}


function statusIcon(status: TimelineStatus) {
  switch (status) {
    case 'failed':
    case 'missing_part': // <-- same as failed
      return <XCircle className="h-4 w-4" />;
    case 'completed':
      return <CheckCircle2 className="h-4 w-4" />;
  }
}


function statusLabel(status: TimelineStatus) {
  switch (status) {
    case 'failed':
      return 'Failed attempt';
    case 'missing_part':
      return 'Missing part';
    case 'completed':
      return 'Completed';
  }
}

// ---------------------- Component ----------------------
export default function CrewOrderDetail() {
  const { id: jobId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const queryEnabled = Boolean(jobId);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['crew-order-detail', jobId],
    queryFn: () => fetchOrderDetailByJobId(jobId as string),
    enabled: queryEnabled,
  });

  const order = data;
  const timeline = useMemo(() => {
    if (!order) return [];
    // Ensure chronological order (ASC) just in case
    return [...order.timeline].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [order]);

  return (
    <div className="mx-auto h-full w-full max-w-screen-sm">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="flex items-center gap-3 px-3 py-2">
          <button className="rounded-md p-1 hover:bg-gray-50" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-gray-900">
              {order ? order.orderNo : 'Order Details'}
            </div>
            <div className="text-[11px] text-gray-500">Order information & history</div>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="space-y-3 p-3 pb-24">
        {/* Loading / Error states */}
        {isLoading && (
          <section className="rounded-xl border bg-white p-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading order details…
            </div>
          </section>
        )}
        {isError && (
          <section className="rounded-xl border bg-white p-4 text-sm text-rose-700">
            Failed to load order details.
          </section>
        )}

        {!!order && (
          <>
        {/* Customer / Address */}
        <section className="rounded-xl border bg-white p-3 shadow-sm">
        <div className="grid grid-cols-[32px_1fr] gap-x-3 gap-y-2 items-start">
            {/* Row 1: user icon + name/region */}
            <div className="flex items-start justify-center pt-0.5">
            <User2 className="h-7 w-7 text-gray-700" />
            </div>
            <div className="min-w-0">
            <div className="text-lg font-semibold text-gray-900">
                {order.customer.name}
            </div>
            <div className="text-sm text-gray-600">{order.customer.region}</div>
            </div>

            {/* Row 2: map icon + address (perfectly aligned) */}
            <div className="flex items-start justify-center pt-0.5">
            <MapPin className="h-6 w-6 text-gray-700" />
            </div>
            <div className="min-w-0 text-[16px] leading-snug text-gray-900">
            {order.customer.address}
            </div>
        </div>
        </section>




            {/* Timeline */}
            <section className="rounded-xl border bg-white p-3 shadow-sm overflow-hidden">
            <div className="mb-2 text-sm font-semibold text-gray-900">Installation Timeline</div>

            {/* Ensure the rule starts inside the padding, not outside the card */}
            <ol className="relative pl-5 border-l border-gray-200">
                {timeline.map((ev, idx) => {
                const isLast = idx === timeline.length - 1;
                return (
                    <li key={ev.id} className="relative pb-3 pl-3">
                    {/* Connector line stays inside the border */}
                    {!isLast && (
                        <span
                        className="absolute left-0 top-6 block h-[calc(100%-1.5rem)] w-px bg-gray-200"
                        aria-hidden
                        />
                    )}

                    {/* Dot sits on the border line, not outside the card */}
                    <span
                        className={cn(
                        'absolute left-0 -translate-x-1/2 mt-1 flex h-4 w-4 items-center justify-center rounded-full border bg-white text-gray-500',
                        ev.status === 'completed' && 'border-emerald-300 text-emerald-600',
                        ev.status === 'failed' && 'border-rose-300 text-rose-600',
                        ev.status === 'missing_part' && 'border-amber-300 text-amber-600'
                        )}
                        aria-hidden
                    >
                        <span className="sr-only">{statusLabel(ev.status)}</span>
                    </span>

                    <div className="mb-3 ml-1">
                        <div className="flex items-center gap-2">
                        <span
                            className={cn(
                            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]',
                            statusBadgeStyles(ev.status)
                            )}
                        >
                            {statusIcon(ev.status)}
                            {statusLabel(ev.status)}
                        </span>
                        <span className="text-[11px] text-gray-500">{formatDate(ev.date)}</span>
                        </div>
                        {ev.note && <div className="mt-1 text-sm text-gray-800">{ev.note}</div>}
                    </div>
                    </li>
                );
                })}
            </ol>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
