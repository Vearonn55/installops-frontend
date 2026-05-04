// src/pages/crew/CrewOrderDetail.tsx
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, XCircle, Loader2, MapPin, User2 } from 'lucide-react';

import { cn } from '../../lib/utils';
import { formatUiDateTime } from '../../lib/date-display';
import { getInstallation } from '../../api/installations';
import { getOrderTimeline } from '../../api/orders';
import type { UUID } from '../../api/http';

type TimelineStatus = 'failed' | 'missing_part' | 'completed';

type TimelineEvent = {
  id: string;
  date: string;
  status: TimelineStatus;
  note?: string;
};

type Customer = {
  name: string;
  region: string;
  address: string;
};

type OrderDetail = {
  orderId: string;
  orderNo: string;
  customer: Customer;
  timeline: TimelineEvent[];
};

function mapAuditActionToTimelineStatus(action: string): TimelineStatus {
  const a = (action || '').toLowerCase();
  if (a.includes('fail') || a.includes('decline') || a.includes('cancel')) return 'failed';
  if (a.includes('missing') || a.includes('part')) return 'missing_part';
  return 'completed';
}

async function loadOrderDetailForInstallation(installationId: string): Promise<OrderDetail> {
  const inst = await getInstallation(installationId as UUID);
  const tl = await getOrderTimeline(inst.external_order_id, { limit: 200, offset: 0 });
  const store = inst.store;
  const addr = store?.address;
  const addressLine = [addr?.line1, addr?.line2, addr?.city, addr?.postal_code].filter(Boolean).join(', ') || '—';

  const timeline: TimelineEvent[] = (tl.timeline?.data ?? []).map((row) => ({
    id: row.id,
    date: row.at,
    status: mapAuditActionToTimelineStatus(row.action),
    note: row.action,
  }));

  return {
    orderId: inst.id,
    orderNo: inst.external_order_id,
    customer: {
      name: store?.name ?? '—',
      region: addr?.region || addr?.city || '—',
      address: addressLine,
    },
    timeline,
  };
}

function statusBadgeStyles(status: TimelineStatus) {
  switch (status) {
    case 'failed':
    case 'missing_part':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    case 'completed':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }
}

function statusIcon(status: TimelineStatus) {
  switch (status) {
    case 'failed':
    case 'missing_part':
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

export default function CrewOrderDetail() {
  const { id: jobId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const queryEnabled = Boolean(jobId);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['crew-order-detail', jobId],
    queryFn: () => loadOrderDetailForInstallation(jobId as string),
    enabled: queryEnabled,
  });

  const order = data;
  const timeline = useMemo(() => {
    if (!order) return [];
    return [...order.timeline].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [order]);

  return (
    <div className="mx-auto h-full w-full max-w-screen-sm">
      <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="flex items-center gap-3 px-3 py-2">
          <button type="button" className="rounded-md p-1 hover:bg-gray-50" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-gray-900">
              {order ? order.orderNo : 'Order details'}
            </div>
            <div className="text-[11px] text-gray-500">Order information & history</div>
          </div>
        </div>
      </header>

      <main className="space-y-3 p-3 pb-24">
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
            <section className="rounded-xl border bg-white p-3 shadow-sm">
              <div className="grid grid-cols-[32px_1fr] items-start gap-x-3 gap-y-2">
                <div className="flex items-start justify-center pt-0.5">
                  <User2 className="h-7 w-7 text-gray-700" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-semibold text-gray-900">{order.customer.name}</div>
                  <div className="text-sm text-gray-600">{order.customer.region}</div>
                </div>

                <div className="flex items-start justify-center pt-0.5">
                  <MapPin className="h-6 w-6 text-gray-700" />
                </div>
                <div className="min-w-0 text-[16px] leading-snug text-gray-900">{order.customer.address}</div>
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border bg-white p-3 shadow-sm">
              <div className="mb-2 text-sm font-semibold text-gray-900">Installation timeline</div>

              {timeline.length === 0 ? (
                <p className="text-sm text-gray-500">No audit events yet.</p>
              ) : (
                <ol className="relative border-l border-gray-200 pl-5">
                  {timeline.map((ev, idx) => {
                    const isLast = idx === timeline.length - 1;
                    return (
                      <li key={ev.id} className="relative pb-3 pl-3">
                        {!isLast && (
                          <span
                            className="absolute left-0 top-6 block h-[calc(100%-1.5rem)] w-px bg-gray-200"
                            aria-hidden
                          />
                        )}

                        <span
                          className={cn(
                            'absolute left-0 mt-1 flex h-4 w-4 -translate-x-1/2 items-center justify-center rounded-full border bg-white text-gray-500',
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
                            <span className="text-[11px] text-gray-500">{formatUiDateTime(ev.date)}</span>
                          </div>
                          {ev.note && <div className="mt-1 text-sm text-gray-800">{ev.note}</div>}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
