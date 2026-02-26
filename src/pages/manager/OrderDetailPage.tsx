// src/pages/manager/OrderDetailPage.tsx
import { useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
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

import type { Order } from '../../types';
import { apiClient } from '../../lib/api';
import { cn } from '../../lib/utils';

// Mock Data
const mockOrder = {
  id: 'ORD-10001',
  status: 'confirmed',
  placed_at: '2025-10-18T10:15:00+03:00',
  store_id: 'Lajivert Nicosia',
  customer: {
    full_name: 'Eren Kaya',
    region: 'Nicosia',
    phone: '+90 533 555 12 34',
    email: 'eren.kaya@example.com',
    address: 'Atatürk Cd. No: 47, K.Kaymaklı, Nicosia 99010, Cyprus',
  },
  timeline: [
    {
      id: 't1',
      date: '2025-10-19T09:45:00+03:00',
      status: 'failed',
      note: 'Customer was not available at the address.',
    },
    {
      id: 't2',
      date: '2025-10-21T14:30:00+03:00',
      status: 'missing_part',
      note: 'Left hinge bracket missing; rescheduled after replacement part arrival.',
    },
    {
      id: 't3',
      date: '2025-10-23T16:15:00+03:00',
      status: 'completed',
      note: 'Installation finished and verified by customer signature.',
    },
  ],
};


type TimelineStatus = 'failed' | 'missing_part' | 'completed';
type TimelineEvent = { id: string; date: string; status: TimelineStatus; note?: string };
type ExtendedOrder = Order & {
  customer?: {
    full_name?: string;
    phone?: string;
    email?: string;
    address?: string;
    region?: string;
  };
  items?: Array<{ id: string; product_id: string; quantity: number; name?: string; sku?: string }>;
  placed_at?: string;
  store_id?: string | number;
  status?: string;
  timeline?: TimelineEvent[];
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const orderQuery = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const res = await apiClient.getOrder(id as string);
      return res.data as any;
    },
    enabled: !!id,
  });

const order: ExtendedOrder = (orderQuery.data as ExtendedOrder) ?? mockOrder;


  // Desktop-focused timeline (use server-provided if exists; otherwise mock based on placed_at)
  const timeline: TimelineEvent[] = useMemo(() => {
    if (order?.timeline && Array.isArray(order.timeline) && order.timeline.length > 0) {
      // ensure chronological ASC
      return [...order.timeline].sort((a, b) => +new Date(a.date) - +new Date(b.date));
    }
    // fallback mock
    const base = order?.placed_at ? new Date(order.placed_at) : new Date();
    const d = (offsetDays: number, hour = 10, min = 0) => {
      const t = new Date(base);
      t.setDate(t.getDate() + offsetDays);
      t.setHours(hour, min, 0, 0);
      return t.toISOString();
    };
    return [
      { id: 't1', date: d(0, 10, 0), status: 'failed', note: 'Failed attempt (no access).' },
      { id: 't2', date: d(3, 11, 0), status: 'missing_part', note: 'Missing part reported; waiting for warehouse.' },
      { id: 't3', date: d(6, 15, 30), status: 'completed', note: 'Installation successful.' },
    ];
  }, [order]);

  const formatDateTime = (iso?: string) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleString([], { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  };

  const statusIcon = (s: TimelineStatus) => {
    switch (s) {
      case 'failed':
      case 'missing_part':
        return <XCircle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />;
    }
  };
  const statusLabel = (s: TimelineStatus) => (s === 'failed' ? 'Failed attempt' : s === 'missing_part' ? 'Missing part' : 'Completed');
  const statusPill = (s: TimelineStatus) =>
    s === 'completed'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-rose-200 bg-rose-50 text-rose-700'; // missing_part shares failed styling per Crew page

  return (
    <div className="space-y-6">
      {/* Header — DO NOT TOUCH (kept exactly as you had it) */}
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
            <p className="mt-1 text-sm text-gray-500">Imported order details</p>
          </div>
        </div>
        <Link
          to="/app/installations/new"
          className="rounded-md bg-primary-600 px-3 py-2 text-sm text-white hover:bg-primary-700"
        >
          Create Installation
        </Link>
      </div>

      {/* Top meta row */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 items-stretch">
{/* Status */}
<div className="card h-full relative">
  <div className="card-header">
    <h3 className="card-title">Status</h3>
    <p className="card-description">Order state</p>
  </div>

  <div className="card-content space-y-3">
    {/* Order details */}
    <div className="text-sm text-gray-600">
      Placed: {order?.placed_at ? new Date(order.placed_at).toLocaleString() : '—'}
    </div>
    <div className="text-sm text-gray-600">
      Store: {order?.store_id ?? '—'}
    </div>

    {/* Big status badge below store name */}
    <div className="pt-2">
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-full px-5 py-1.5 text-base font-semibold tracking-wide shadow-sm',
          order?.status === 'confirmed'
            ? 'bg-blue-100 text-blue-800 border border-blue-200'
            : order?.status === 'pending'
            ? 'bg-amber-100 text-amber-800 border border-amber-200'
            : order?.status === 'cancelled'
            ? 'bg-rose-100 text-rose-800 border border-rose-200'
            : 'bg-gray-100 text-gray-800 border border-gray-200'
        )}
      >
        {order?.status
  ? `${order.status.charAt(0).toUpperCase()}${order.status.slice(1)}`
  : '—'}

      </span>
    </div>
  </div>
</div>






        {/* Customer & Address */}
        <div className="card h-full">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <User className="h-4 w-4" />
              Customer
            </h3>
            <p className="card-description">Contact & address</p>
          </div>

          <div className="card-content">
            {/* Grid-based layout for perfect icon alignment */}
            <div className="grid grid-cols-[30px_1fr] items-start gap-x-3 gap-y-3 text-sm">
              {/* Name + Region */}
              <div className="flex items-start justify-center pt-[2px]">
                <User className="h-5 w-5 text-gray-700" />
              </div>
              <div className="min-w-0">
                <div className="text-base font-semibold text-gray-900">
                  {order?.customer?.full_name ?? '—'}
                </div>
                <div className="text-gray-600">{order?.customer?.region ?? '—'}</div>
              </div>

              {/* Phone */}
              <div className="flex items-start justify-center pt-[2px]">
                <Phone className="h-4 w-4 text-gray-500" />
              </div>
              <div className="min-w-0 text-gray-800">
                {order?.customer?.phone ?? '—'}
              </div>

              {/* Email */}
              <div className="flex items-start justify-center pt-[2px]">
                <AtSign className="h-4 w-4 text-gray-500" />
              </div>
              <div className="min-w-0 text-gray-800 break-all">
                {order?.customer?.email ?? '—'}
              </div>

              {/* Address */}
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

      {/* Installation Timeline (Crew-style, desktop width) */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Installation Timeline</h3>
          <p className="card-description">Attempts & completion</p>
        </div>
        <div className="card-content">
          <ol className="relative pl-5 border-l border-gray-200">
            {timeline.map((ev, idx) => {
              const isLast = idx === timeline.length - 1;
              return (
                <li key={ev.id} className="relative pb-4 pl-3">
                  {/* Connector line inside card */}
                  {!isLast && (
                    <span className="absolute left-0 top-6 block h-[calc(100%-1.5rem)] w-px bg-gray-200" aria-hidden />
                  )}

                  {/* Dot color (failed & missing_part in rose; completed in emerald) */}
                  <span
                    className={cn(
                      'absolute left-0 -translate-x-1/2 mt-1 flex h-4 w-4 items-center justify-center rounded-full border bg-white',
                      (ev.status === 'failed' || ev.status === 'missing_part') && 'border-rose-300 text-rose-600',
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
                    <span className="ml-2 text-[11px] text-gray-500">{formatDateTime(ev.date)}</span>
                  </div>
                  {ev.note && <div className="text-sm text-gray-800">{ev.note}</div>}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
