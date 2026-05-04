// src/pages/crew/CrewOrderDetail.tsx
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, MapPin, User2 } from 'lucide-react';

import { cn } from '../../lib/utils';
import { formatUiDateTime } from '../../lib/date-display';
import { getInstallation } from '../../api/installations';
import { getOrderTimeline } from '../../api/orders';
import type { UUID } from '../../api/http';
import {
  auditRowToOrderTrackingEvent,
  orderTrackingAccentClass,
  type OrderTimelineViewEvent,
} from '../../lib/order-timeline-audit';

type Customer = {
  name: string;
  region: string;
  address: string;
};

type OrderDetail = {
  orderId: string;
  orderNo: string;
  customer: Customer;
  timeline: OrderTimelineViewEvent[];
};

async function loadOrderDetailForInstallation(installationId: string): Promise<OrderDetail> {
  const inst = await getInstallation(installationId as UUID);
  const tl = await getOrderTimeline(inst.external_order_id, { limit: 200, offset: 0 });
  const store = inst.store;
  const addr = store?.address;
  const addressLine = [addr?.line1, addr?.line2, addr?.city, addr?.postal_code].filter(Boolean).join(', ') || '—';

  const timeline = (tl.timeline?.data ?? []).map(auditRowToOrderTrackingEvent);

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

      <main className="space-y-3 p-3 pb-[calc(env(safe-area-inset-bottom)+88px)]">
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
                <div className="min-w-0 break-words text-[16px] leading-snug text-gray-900">{order.customer.address}</div>
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border bg-white p-3 shadow-sm">
              <div className="mb-1 text-sm font-semibold text-gray-900">Installation tracking</div>
              <p className="mb-3 text-xs text-gray-500">
                Short summary only. Your office can open Audit for full technical history.
              </p>

              {timeline.length === 0 ? (
                <p className="text-sm text-gray-500">No milestones yet.</p>
              ) : (
                <ul className="space-y-3">
                  {timeline.map((ev) => (
                    <li
                      key={ev.id}
                      className={cn('border-l-2 pl-3', orderTrackingAccentClass(ev.tone))}
                    >
                      <div className="flex flex-col gap-0.5">
                        <p className="text-sm font-medium leading-snug text-gray-900">{ev.headline}</p>
                        <time className="text-xs tabular-nums text-gray-500" dateTime={ev.date}>
                          {formatUiDateTime(ev.date)}
                        </time>
                      </div>
                      {ev.detail ? (
                        <p className="mt-1 line-clamp-3 text-sm leading-snug text-gray-600">{ev.detail}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
