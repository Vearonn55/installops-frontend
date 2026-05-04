// src/pages/manager/OrderDetailPage.tsx
import { useMemo } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  User,
  MapPin,
  Phone,
  AtSign,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

import {
  getOrderInstallations,
  getOrderTimeline,
  type OrderInstallationsResponse,
  type OrderTimelineResponse,
} from '../../api/orders';
import {
  getNetsisCustomerDetail,
  getNetsisOrderDetail,
  searchNetsisOrders,
  type NetsisOrderDetailData,
} from '../../api/integrations';
import type { UUID } from '../../api/http';
import { cn, formatDateTime } from '../../lib/utils';

type TimelineStatus = 'failed' | 'missing_part' | 'completed';
type TimelineEvent = { id: string; date: string; status: TimelineStatus; note?: string };
type ExtendedOrder = {
  id: string;
  /** Store UUID for Netsis proxy */
  store_uuid?: string;
  /** Display name */
  store_name?: string;
  customer?: {
    full_name?: string;
    phone?: string;
    email?: string;
    address?: string;
    region?: string;
  };
  items?: Array<{ id: string; product_id: string; quantity: number; name?: string; sku?: string }>;
  /** Line items from Netsis REST (when configured) */
  netsis_items?: Array<{ id: string; product_id: string; quantity: number; name?: string; sku?: string }>;
  placed_at?: string;
  store_id?: string | number;
  status?: string;
  timeline?: TimelineEvent[];
};

function mapAuditActionToTimelineStatus(action: string): TimelineStatus {
  const a = (action || '').toLowerCase();
  if (a.includes('fail') || a.includes('decline') || a.includes('cancel')) return 'failed';
  if (a.includes('missing') || a.includes('part')) return 'missing_part';
  return 'completed';
}

function buildExtendedOrder(
  externalOrderId: string,
  instRes: OrderInstallationsResponse,
  tlRes: OrderTimelineResponse
): ExtendedOrder | null {
  const installations = instRes.data;
  if (installations.length === 0) return null;

  const first = installations[0];
  const store = first.store;
  const addr = store?.address;
  const placed = [...installations].map((i) => i.created_at).sort()[0];

  const items = installations.flatMap((ins) =>
    (ins.items ?? []).map((it) => ({
      id: it.id,
      product_id: it.external_product_id,
      quantity: it.quantity,
      name: it.external_product_id,
      sku: it.external_product_id,
    }))
  );

  let status: string = 'pending';
  if (installations.every((i) => i.status === 'completed')) status = 'confirmed';
  else if (installations.some((i) => i.status === 'in_progress' || i.status === 'staged')) {
    status = 'confirmed';
  } else if (installations.some((i) => i.status === 'failed' || i.status === 'canceled')) {
    status = 'pending';
  }

  const timeline: TimelineEvent[] = (tlRes.timeline?.data ?? []).map((row) => ({
    id: String(row.id),
    date: row.at,
    status: mapAuditActionToTimelineStatus(row.action),
    note: row.action,
  }));

  const addressLine = [addr?.line1, addr?.line2, addr?.city, addr?.postal_code].filter(Boolean).join(', ');

  return {
    id: externalOrderId,
    status,
    placed_at: placed,
    store_uuid: first.store_id,
    store_name: store?.name ?? String(first.store_id),
    store_id: store?.name ?? first.store_id,
    customer: {
      full_name: store?.name ?? '—',
      region: addr?.region || addr?.city || '—',
      phone: store?.phone ?? '—',
      email: '—',
      address: addressLine || '—',
    },
    items,
    timeline,
  };
}

function netsisItemsToRows(items: NetsisOrderDetailData['items']) {
  return (items ?? []).map((it) => ({
    id: it.id,
    product_id: it.product_id,
    quantity: it.quantity,
    name: it.name ?? it.product_id,
    sku: it.sku ?? it.product_id,
  }));
}

function mergeNetsisIntoOrder(
  base: ExtendedOrder | null | undefined,
  netsis: NetsisOrderDetailData | undefined,
  externalOrderId: string,
  storeUuidFromQuery: string
): ExtendedOrder | undefined {
  if (!netsis) return base ?? undefined;
  const ni = netsisItemsToRows(netsis.items);
  const nc = netsis.customer || {};
  if (!base) {
    return {
      id: externalOrderId,
      store_uuid: storeUuidFromQuery || undefined,
      store_name: storeUuidFromQuery ? '—' : '—',
      placed_at: netsis.placed_at ?? undefined,
      status: netsis.status || 'pending',
      customer: {
        full_name: nc.full_name ?? '—',
        phone: nc.phone ?? '—',
        email: nc.email ?? '—',
        address: nc.address ?? '—',
        region: nc.region ?? '—',
      },
      netsis_items: ni,
      items: [],
      timeline: [],
    };
  }
  const bc = base.customer || {};
  return {
    ...base,
    placed_at: netsis.placed_at || base.placed_at,
    status: (netsis.status as string) || base.status,
    customer: {
      full_name: nc.full_name || bc.full_name,
      phone: nc.phone || bc.phone,
      email: nc.email || bc.email,
      address: nc.address || bc.address,
      region: nc.region || bc.region,
    },
    netsis_items: ni.length ? ni : base.netsis_items,
  };
}

function hasSparseCustomer(c?: {
  full_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  region?: string | null;
}) {
  if (!c) return true;
  return !(
    String(c.full_name || '').trim() ||
    String(c.phone || '').trim() ||
    String(c.email || '').trim() ||
    String(c.address || '').trim() ||
    String(c.region || '').trim()
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const storeIdFromUrl = (searchParams.get('store_id') || '').trim();

  const orderQuery = useQuery({
    queryKey: ['order-detail', id],
    queryFn: async () => {
      const ext = id as string;
      const [instRes, tlRes] = await Promise.all([
        getOrderInstallations(ext, { limit: 50, offset: 0 }),
        getOrderTimeline(ext, { limit: 200, offset: 0 }),
      ]);
      return buildExtendedOrder(ext, instRes, tlRes);
    },
    enabled: !!id,
  });

  const storeIdForNetsis = (orderQuery.data?.store_uuid || storeIdFromUrl || '').trim();

  const netsisQuery = useQuery({
    queryKey: ['netsis-order-detail', id, storeIdForNetsis],
    queryFn: async () => {
      const res = await getNetsisOrderDetail({
        store_id: storeIdForNetsis as UUID,
        order_id: id as string,
      });
      return res.data;
    },
    enabled: Boolean(id && storeIdForNetsis),
    retry: false,
  });

  const searchHitQuery = useQuery({
    queryKey: ['netsis-order-search-hit', id, storeIdForNetsis],
    queryFn: async () => {
      const res = await searchNetsisOrders({
        store_id: storeIdForNetsis as UUID,
        q: id as string,
        limit: 5,
      });
      const rows = res.data ?? [];
      const exact = rows.find((r) => String(r.order_id || '').trim() === String(id || '').trim());
      return exact ?? rows[0] ?? null;
    },
    enabled:
      Boolean(id && storeIdForNetsis) &&
      Boolean(!netsisQuery.data || hasSparseCustomer(netsisQuery.data.customer)),
    retry: false,
  });

  const cariKodForCustomer = String(
    netsisQuery.data?.customer?.cari_kod || searchHitQuery.data?.cari_kod || ''
  ).trim();

  const netsisCustomerQuery = useQuery({
    queryKey: ['netsis-customer-detail', storeIdForNetsis, cariKodForCustomer],
    queryFn: async () => {
      const res = await getNetsisCustomerDetail({
        store_id: storeIdForNetsis as UUID,
        cari_kod: cariKodForCustomer,
      });
      return res.data;
    },
    enabled:
      Boolean(storeIdForNetsis && cariKodForCustomer) &&
      Boolean(!netsisQuery.data || hasSparseCustomer(netsisQuery.data.customer)),
    retry: false,
  });

  const order = useMemo(() => {
    const merged = mergeNetsisIntoOrder(orderQuery.data, netsisQuery.data, id || '', storeIdFromUrl);
    if (!merged) return merged;
    if (!netsisCustomerQuery.data) return merged;
    const bc = merged.customer || {};
    const nc = netsisCustomerQuery.data;
    return {
      ...merged,
      customer: {
        full_name: nc.full_name || bc.full_name || '—',
        phone: nc.phone || bc.phone || '—',
        email: nc.email || bc.email || '—',
        address: nc.address || bc.address || '—',
        region: nc.region || bc.region || '—',
      },
    };
  }, [orderQuery.data, netsisQuery.data, netsisCustomerQuery.data, id, storeIdFromUrl]);

  const timeline: TimelineEvent[] = useMemo(() => {
    if (!order?.timeline?.length) return [];
    return [...order.timeline].sort((a, b) => +new Date(a.date) - +new Date(b.date));
  }, [order]);

  const statusIcon = (s: TimelineStatus) => {
    switch (s) {
      case 'failed':
      case 'missing_part':
        return <XCircle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />;
    }
  };
  const statusLabel = (s: TimelineStatus) =>
    s === 'failed' ? 'Failed attempt' : s === 'missing_part' ? 'Missing part' : 'Completed';
  const statusPill = (s: TimelineStatus) =>
    s === 'completed'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-rose-200 bg-rose-50 text-rose-700';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-md border px-2 py-1.5 text-sm hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order #{id}</h1>
            <p className="mt-1 text-sm text-gray-500">Installations & audit timeline</p>
          </div>
        </div>
        <Link
          to={`/app/installations/new?external_order_id=${encodeURIComponent(
            id || ''
          )}&store_id=${encodeURIComponent(storeIdForNetsis || storeIdFromUrl || '')}`}
          className="rounded-md bg-primary-600 px-3 py-2 text-sm text-white hover:bg-primary-700"
        >
          Create Installation
        </Link>
      </div>

      {orderQuery.isLoading && (
        <div className="rounded-lg border bg-white p-6 text-sm text-gray-600">Loading order…</div>
      )}
      {orderQuery.isError && (
        <div className="rounded-lg border bg-white p-6 text-sm text-red-600">
          Could not load this order. Check the order ID or your permissions.
        </div>
      )}
      {!orderQuery.isLoading && !orderQuery.isError && !order && !netsisQuery.isLoading && (
        <div className="rounded-lg border bg-white p-6 text-sm text-gray-600">
          No installations found for this order ID yet. Create an installation to attach work here.
          {!storeIdFromUrl ? (
            <span className="mt-2 block text-xs text-gray-500">
              To load customer and products from Netsis without an installation, open this page with{' '}
              <code className="rounded bg-gray-100 px-1">?store_id=</code> (store UUID) or open the order from the
              orders list after an installation exists for that store.
            </span>
          ) : null}
        </div>
      )}

      {netsisQuery.isError && storeIdForNetsis ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Netsis order detail could not be loaded.{' '}
          {(netsisQuery.error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Configure netsis_order_detail_path under Admin → Stores & Netsis, or check credentials.'}
        </div>
      ) : null}

      {(order || netsisQuery.isLoading) && (
        <>
          {netsisQuery.isLoading && (
            <div className="rounded-lg border bg-white p-3 text-sm text-gray-600">Loading Netsis order data…</div>
          )}
          <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2">
            <div className="card relative h-full">
              <div className="card-header">
                <h3 className="card-title">Status</h3>
                <p className="card-description">Order state</p>
              </div>

              <div className="card-content space-y-3">
                <div className="text-sm text-gray-600">
                  Placed: {order?.placed_at ? formatDateTime(order.placed_at) : '—'}
                </div>
                <div className="text-sm text-gray-600">Store: {order?.store_name ?? order?.store_id ?? '—'}</div>

                <div className="pt-2">
                  <span
                    className={cn(
                      'inline-flex items-center justify-center rounded-full border px-5 py-1.5 text-base font-semibold tracking-wide shadow-sm',
                      order?.status === 'confirmed'
                        ? 'border border-blue-200 bg-blue-100 text-blue-800'
                        : order?.status === 'pending'
                          ? 'border border-amber-200 bg-amber-100 text-amber-800'
                          : order?.status === 'cancelled'
                            ? 'border border-rose-200 bg-rose-100 text-rose-800'
                            : 'border border-gray-200 bg-gray-100 text-gray-800'
                    )}
                  >
                    {order?.status
                      ? `${order.status.charAt(0).toUpperCase()}${order.status.slice(1)}`
                      : '—'}
                  </span>
                </div>
              </div>
            </div>

            <div className="card h-full">
              <div className="card-header">
                <h3 className="card-title flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer
                </h3>
                <p className="card-description">Contact & address</p>
              </div>

              <div className="card-content">
                <div className="grid grid-cols-[30px_1fr] items-start gap-x-3 gap-y-3 text-sm">
                  <div className="flex items-start justify-center pt-[2px]">
                    <User className="h-5 w-5 text-gray-700" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-base font-semibold text-gray-900">
                      {order?.customer?.full_name ?? '—'}
                    </div>
                    <div className="text-gray-600">{order?.customer?.region ?? '—'}</div>
                  </div>

                  <div className="flex items-start justify-center pt-[2px]">
                    <Phone className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="min-w-0 text-gray-800">{order?.customer?.phone ?? '—'}</div>

                  <div className="flex items-start justify-center pt-[2px]">
                    <AtSign className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="min-w-0 break-all text-gray-800">{order?.customer?.email ?? '—'}</div>

                  <div className="flex items-start justify-center pt-[2px]">
                    <MapPin className="h-5 w-5 text-gray-700" />
                  </div>
                  <div className="min-w-0 text-[15px] leading-snug text-gray-900">
                    {order?.customer?.address ?? '—'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {order && (order.netsis_items?.length || order.items?.length) ? (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Products & line items</h3>
                <p className="card-description">
                  {order.netsis_items?.length ? 'From Netsis (when configured)' : 'From installations'}
                </p>
              </div>
              <div className="card-content overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead>
                    <tr className="border-b text-xs text-gray-500">
                      <th className="py-2 pr-3 font-medium">SKU / code</th>
                      <th className="py-2 pr-3 font-medium">Description</th>
                      <th className="py-2 font-medium">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(order.netsis_items?.length ? order.netsis_items : order.items ?? []).map((row) => (
                      <tr key={row.id} className="border-b border-gray-100">
                        <td className="py-2 pr-3 font-mono text-xs">{row.product_id}</td>
                        <td className="py-2 pr-3">{row.name ?? '—'}</td>
                        <td className="py-2">{row.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Installation Timeline</h3>
              <p className="card-description">Audit events for this order</p>
            </div>
            <div className="card-content">
              {timeline.length === 0 ? (
                <p className="text-sm text-gray-500">No audit events recorded yet.</p>
              ) : (
                <ol className="relative border-l border-gray-200 pl-5">
                  {timeline.map((ev, idx) => {
                    const isLast = idx === timeline.length - 1;
                    return (
                      <li key={ev.id} className="relative pb-4 pl-3">
                        {!isLast && (
                          <span
                            className="absolute left-0 top-6 block h-[calc(100%-1.5rem)] w-px bg-gray-200"
                            aria-hidden
                          />
                        )}

                        <span
                          className={cn(
                            'absolute left-0 mt-1 flex h-4 w-4 -translate-x-1/2 items-center justify-center rounded-full border bg-white',
                            (ev.status === 'failed' || ev.status === 'missing_part') &&
                              'border-rose-300 text-rose-600',
                            ev.status === 'completed' && 'border-emerald-300 text-emerald-600'
                          )}
                          aria-hidden
                        />

                        <div className="mb-1">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]',
                              statusPill(ev.status)
                            )}
                          >
                            {statusIcon(ev.status)}
                            {statusLabel(ev.status)}
                          </span>
                          <span className="ml-2 text-[11px] text-gray-500">
                            {formatDateTime(ev.date)}
                          </span>
                        </div>
                        {ev.note && <div className="text-sm text-gray-800">{ev.note}</div>}
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
