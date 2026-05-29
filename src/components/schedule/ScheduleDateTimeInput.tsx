import { useRef } from 'react';
import { Calendar } from 'lucide-react';

import { cn } from '../../lib/utils';
import {
  applyYmdToScheduleDateTime,
  finalizeScheduleDateTimeInput,
  normalizeScheduleDateTimeInput,
  parseScheduleDateInput,
} from '../../lib/schedule-input';

export type ScheduleDateTimeInputProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  calendarAriaLabel?: string;
};

function openNativeDatePicker(input: HTMLInputElement | null) {
  if (input && typeof input.showPicker === 'function') {
    try {
      input.showPicker();
    } catch {
      /* Safari / unsupported */
    }
  }
}

function ymdFromDateTimeText(text: string): string {
  const finalized = finalizeScheduleDateTimeInput(text);
  const datePart = finalized.split(/\s+/)[0] ?? finalized;
  return parseScheduleDateInput(datePart) ?? '';
}

export function ScheduleDateTimeInput({
  value,
  onChange,
  onBlur,
  placeholder,
  className,
  calendarAriaLabel = 'Open calendar',
}: ScheduleDateTimeInputProps) {
  const nativeRef = useRef<HTMLInputElement>(null);
  const ymd = ymdFromDateTimeText(value);

  return (
    <div className={cn('relative min-w-0', className)}>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className="input w-full tabular-nums pr-10"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(normalizeScheduleDateTimeInput(e.target.value))}
        onBlur={onBlur}
      />
      <input
        ref={nativeRef}
        type="date"
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        value={ymd}
        onChange={(e) => {
          const picked = e.target.value;
          if (!picked) return;
          onChange(applyYmdToScheduleDateTime(value, picked));
        }}
      />
      <button
        type="button"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        onClick={() => openNativeDatePicker(nativeRef.current)}
        aria-label={calendarAriaLabel}
      >
        <Calendar className="h-4 w-4" />
      </button>
    </div>
  );
}
