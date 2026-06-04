import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';

import { cn } from '../../lib/utils';

export type RevealablePhoto = {
  id: string;
  url: string;
};

type Props = {
  photos: RevealablePhoto[];
  className?: string;
};

export function RevealablePhotoGrid({ photos, className }: Props) {
  const { t } = useTranslation('common');
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());

  const reveal = useCallback((id: string) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  if (!photos.length) return null;

  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5',
        className
      )}
    >
      {photos.map((photo) => {
        const isRevealed = revealed.has(photo.id);
        return (
          <div
            key={photo.id}
            className="relative overflow-hidden rounded-md border bg-gray-50"
          >
            <img
              src={photo.url}
              alt={
                isRevealed
                  ? t('installationDetailPage.media.photoAlt')
                  : t('installationDetailPage.media.photoHiddenAlt')
              }
              className={cn(
                'h-32 w-full object-cover transition-all duration-300',
                !isRevealed && 'scale-110 blur-md'
              )}
            />
            {!isRevealed ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 p-2">
                <button
                  type="button"
                  onClick={() => reveal(photo.id)}
                  className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-gray-900 shadow hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  aria-label={t('installationDetailPage.media.revealPhotoAria')}
                >
                  {t('installationDetailPage.media.revealPhoto')}
                </button>
              </div>
            ) : (
              <a
                href={photo.url}
                target="_blank"
                rel="noreferrer"
                className="absolute bottom-1 right-1 flex items-center gap-1 rounded bg-black/60 px-2 py-0.5 text-xs text-white hover:bg-black/75"
                aria-label={t('installationDetailPage.media.openFullSize')}
              >
                <ExternalLink className="h-3 w-3" aria-hidden />
                <span>{t('installationDetailPage.media.openFullSize')}</span>
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}
