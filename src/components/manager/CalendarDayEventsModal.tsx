import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '../../lib/utils';
import { formatUiFullFromDate } from '../../lib/date-display';
import {
  normalizeTransferStatus,
  transferStatusBadgeClass,
} from '../../lib/transfer-status';

export type CalendarDayEvent = {
  kind: 'installation' | 'transfer';
  id: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  label: string;
  subtitle?: string;
  store_id?: string;
};

type Props = {
  open: boolean;
  date: Date | null;
  events: CalendarDayEvent[];
  storeNameById: Map<string, string>;
  showStoreNames: boolean;
  onClose: () => void;
  eventPath: (ev: CalendarDayEvent) => string;
  eventTimeLabel: (ev: CalendarDayEvent) => string;
  /** Replaces the default full-day heading (e.g. for a single time slot). */
  titleOverride?: string;
};

function statusLabelKey(status: string): string {
  if (status === 'scheduled') return 'pending';
  if (status === 'canceled') return 'cancelled';
  return status;
}

function statusClasses(s: string) {
  switch (s) {
    case 'completed':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'in_progress':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'failed':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    case 'after_sale_service':
      return 'border-violet-200 bg-violet-50 text-violet-700';
    case 'staged':
      return 'border-blue-200 bg-blue-50 text-blue-700';
    case 'canceled':
    case 'cancelled':
      return 'border-zinc-200 bg-zinc-50 text-zinc-700';
    case 'scheduled':
      return 'border-gray-200 bg-gray-50 text-gray-700';
    default:
      return 'border-gray-200 bg-gray-50 text-gray-700';
  }
}

function eventStatusClasses(ev: CalendarDayEvent): string {
  if (ev.kind === 'transfer') {
    return transferStatusBadgeClass(normalizeTransferStatus(ev.status));
  }
  return statusClasses(ev.status);
}

function eventStatusLabel(ev: CalendarDayEvent, t: (key: string) => string): string {
  if (ev.kind === 'transfer') {
    return t(`transfersPage.statusLabels.${normalizeTransferStatus(ev.status)}`);
  }
  return t(
    `installationsPage.statusLabels.${statusLabelKey(ev.status)}`
  );
}

export default function CalendarDayEventsModal({
  open,
  date,
  events,
  storeNameById,
  showStoreNames,
  onClose,
  eventPath,
  eventTimeLabel,
  titleOverride,
}: Props) {
  const { t } = useTranslation('common');

  if (!open || !date) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="calendar-day-modal-title"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-t-xl bg-white shadow-xl sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 id="calendar-day-modal-title" className="text-base font-semibold text-gray-900">
              {titleOverride ?? t('calendarPage.dayModal.title', { date: formatUiFullFromDate(date) })}
            </h2>
            <p className="text-xs text-gray-500">
              {t('calendarPage.dayModal.count', { count: events.length })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
            aria-label={t('calendarPage.dayModal.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <ul className="max-h-[70vh] divide-y overflow-y-auto">
          {events.map((ev) => {
            const statusLabel = eventStatusLabel(ev, t);
            const storeName =
              showStoreNames && ev.store_id ? storeNameById.get(ev.store_id) : undefined;
            return (
              <li key={`${ev.kind}-${ev.id}`}>
                <Link
                  to={eventPath(ev)}
                  onClick={onClose}
                  className={cn(
                    'block border-l-4 px-4 py-3 hover:bg-gray-50',
                    eventStatusClasses(ev)
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{ev.label}</p>
                      {ev.subtitle ? (
                        <p className="truncate text-xs text-gray-600">{ev.subtitle}</p>
                      ) : null}
                      {storeName ? (
                        <p className="mt-0.5 text-xs text-gray-500">{storeName}</p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-xs text-gray-500">{statusLabel}</span>
                  </div>
                  {ev.scheduled_start ? (
                    <p className="mt-1 text-xs text-gray-500">{eventTimeLabel(ev)}</p>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>

        {events.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-500">
            {t('calendarPage.dayModal.empty')}
          </p>
        ) : null}
      </div>
    </div>
  );
}
