import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { tableScrollWrapClass } from '../../lib/responsive-layout';

type Props<T> = {
  rows: T[];
  keyExtractor: (row: T) => string;
  desktop: ReactNode;
  renderMobileCard: (row: T) => ReactNode;
  loading?: boolean;
  loadingContent?: ReactNode;
  error?: boolean;
  errorContent?: ReactNode;
  empty?: boolean;
  emptyContent?: ReactNode;
  className?: string;
  mobileListClassName?: string;
  footer?: ReactNode;
};

export default function ResponsiveDataView<T>({
  rows,
  keyExtractor,
  desktop,
  renderMobileCard,
  loading,
  loadingContent,
  error,
  errorContent,
  empty,
  emptyContent,
  className,
  mobileListClassName,
  footer,
}: Props<T>) {
  const showMobileList = !loading && !error && !empty;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800',
        className,
      )}
    >
      <div className={cn('hidden md:block', tableScrollWrapClass)}>{desktop}</div>

      <div className={cn('md:hidden', mobileListClassName)}>
        {loading ? (
          loadingContent ?? (
            <p className="px-4 py-8 text-center text-sm text-gray-500">Loading…</p>
          )
        ) : null}
        {error ? (
          errorContent ?? (
            <p className="px-4 py-8 text-center text-sm text-red-600">Failed to load.</p>
          )
        ) : null}
        {empty ? (
          emptyContent ?? (
            <p className="px-4 py-8 text-center text-sm text-gray-500">No results.</p>
          )
        ) : null}
        {showMobileList ? (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {rows.map((row) => (
              <li key={keyExtractor(row)} className="p-4">
                {renderMobileCard(row)}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {footer}
    </div>
  );
}

/** Label + value row for mobile cards */
export function MobileCardField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{children}</dd>
    </div>
  );
}

export function MobileCardActions({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
      {children}
    </div>
  );
}
