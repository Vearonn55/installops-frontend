import { Navigation } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '../../lib/utils';

type Props = {
  href: string;
  /** Compact icon-only variant for job cards. */
  compact?: boolean;
  className?: string;
};

/**
 * Opens the installation site in Google Maps (app or website via the OS
 * handler). Rendered on crew job views so the crew can navigate while
 * delivering.
 */
export default function NavigateButton({ href, compact = false, className }: Props) {
  const { t } = useTranslation('common');
  const label = t('crewPages.navigate');

  if (compact) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        aria-label={label}
        title={label}
        className={cn(
          'inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100',
          className
        )}
      >
        <Navigation className="h-5 w-5" />
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700',
        className
      )}
    >
      <Navigation className="h-5 w-5" />
      {label}
    </a>
  );
}
