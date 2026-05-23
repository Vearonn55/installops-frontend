import type { MouseEvent } from 'react';
import { Calendar } from 'lucide-react';

import { formatUiDate } from '../../lib/date-display';

export type DateRangeFilterProps = {
  from: string;
  to: string;
  fromLabel: string;
  toLabel: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  /** Show formatted date under each input (e.g. Reports). */
  showPreview?: boolean;
};

function openDatePicker(e: MouseEvent<HTMLInputElement>) {
  const input = e.currentTarget;
  if (typeof input.showPicker === 'function') {
    try {
      input.showPicker();
    } catch {
      /* Safari / unsupported */
    }
  }
}

export function DateRangeFilter({
  from,
  to,
  fromLabel,
  toLabel,
  onFromChange,
  onToChange,
  showPreview = false,
}: DateRangeFilterProps) {
  return (
    <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="min-w-0">
        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
          {fromLabel}
        </label>
        <div className="relative min-w-0">
          <Calendar className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="date"
            className="input-date-native input-date-native-with-icon w-full"
            value={from}
            max={to || undefined}
            onClick={openDatePicker}
            onChange={(e) => onFromChange(e.target.value)}
          />
        </div>
        {showPreview ? (
          <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
            {formatUiDate(from)}
          </p>
        ) : null}
      </div>

      <div className="min-w-0">
        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
          {toLabel}
        </label>
        <div className="relative min-w-0">
          <Calendar className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="date"
            className="input-date-native input-date-native-with-icon w-full"
            value={to}
            min={from || undefined}
            onClick={openDatePicker}
            onChange={(e) => onToChange(e.target.value)}
          />
        </div>
        {showPreview ? (
          <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
            {formatUiDate(to)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
