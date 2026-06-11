import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { searchNetsisTransfers } from '../api/integrations';
import type { UUID } from '../api/http';
import { isAxiosError } from '../api/http';
import { cn } from '../lib/utils';

type Props = {
  storeId: UUID | '';
  value: string;
  onChange: (transferId: string) => void;
  label: string;
  description?: string;
  placeholder?: string;
  disabled?: boolean;
};

export function TransferIdSearchCombobox({
  storeId,
  value,
  onChange,
  label,
  description,
  placeholder,
  disabled,
}: Props) {
  const [input, setInput] = useState(value);
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInput(value);
  }, [value]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(input.trim()), 300);
    return () => window.clearTimeout(t);
  }, [input]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const canSearch =
    Boolean(storeId) &&
    (debounced.length >= 1 || (open && debounced === '' && input.trim() === ''));

  const searchQuery = useQuery({
    queryKey: ['netsis-transfers', storeId, debounced],
    queryFn: () =>
      searchNetsisTransfers({
        store_id: storeId as UUID,
        ...(debounced.length >= 1 ? { q: debounced } : {}),
        limit: 20,
      }),
    enabled: canSearch,
    staleTime: 20_000,
  });

  const hits = searchQuery.data?.data ?? [];
  const showPanel = open && Boolean(storeId);

  const searchErrorMessage = useMemo(() => {
    const e = searchQuery.error;
    if (!e) return '';
    if (isAxiosError(e)) {
      const body = e.response?.data as { message?: string } | undefined;
      return body?.message || e.message || 'Search failed';
    }
    return e instanceof Error ? e.message : 'Search failed';
  }, [searchQuery.error]);

  return (
    <div ref={rootRef} className="flex flex-col gap-1">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {description ? (
        <p className="text-xs text-gray-500">{description}</p>
      ) : null}
      <div className="relative">
        <input
          type="text"
          className={cn('input w-full', disabled && 'opacity-60')}
          placeholder={placeholder}
          value={input}
          disabled={disabled}
          onChange={(e) => {
            const v = e.target.value;
            setInput(v);
            onChange(v);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          autoComplete="off"
        />
        {searchQuery.isFetching && (
          <Loader2 className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
        )}
        {showPanel && (
          <ul className="absolute left-0 top-full z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-white py-1 text-sm shadow-lg">
            {!storeId && (
              <li className="px-3 py-2 text-gray-500">Select a store first.</li>
            )}
            {storeId && searchQuery.isError && (
              <li className="px-3 py-2 text-sm text-red-600">
                {searchErrorMessage || 'Search failed.'} You can still enter a transfer ID manually.
              </li>
            )}
            {storeId && !searchQuery.isError && !searchQuery.isFetching && hits.length === 0 && (
              <li className="px-3 py-2 text-gray-500">
                No matches — continue typing or use manual ID.
              </li>
            )}
            {hits.map((h) => {
              const id = h.external_transfer_id || h.id;
              return (
                <li key={id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-gray-50"
                    onClick={() => {
                      setInput(id);
                      onChange(id);
                      setOpen(false);
                    }}
                  >
                    <span className="font-medium text-gray-900">{id}</span>
                    <span className="block text-xs text-gray-500">
                      {h.label ||
                        [
                          h.source_depot_code != null ? `From ${h.source_depot_code}` : null,
                          h.dest_depot_code != null ? `To ${h.dest_depot_code}` : null,
                          h.line_count != null ? `${h.line_count} lines` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ') ||
                        '—'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
