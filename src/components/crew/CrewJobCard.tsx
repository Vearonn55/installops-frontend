import { Clock, MapPin, Phone, Users, ChevronRight, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import {
  crewJobCardClass,
  crewStatusLabelKey,
  crewStatusPillClass,
  fmtTimeRange,
  type CrewJobView,
} from '../../lib/crew-job';

type Props = {
  job: CrewJobView;
  onOpen: () => void;
  onStart?: () => void;
  starting?: boolean;
  showStart?: boolean;
};

export default function CrewJobCard({
  job,
  onOpen,
  onStart,
  starting,
  showStart,
}: Props) {
  const { t } = useTranslation('common');

  return (
    <article
      className={cn(
        'rounded-2xl border-2 shadow-sm',
        crewJobCardClass(job.status)
      )}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpen();
          }
        }}
        className="grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] gap-2 p-4 text-left text-gray-900 active:opacity-90"
      >
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold text-gray-600">
              {job.installCode}
            </span>
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                crewStatusPillClass(job.status)
              )}
            >
              {t(crewStatusLabelKey(job.status))}
            </span>
          </div>

          <h3 className="text-lg font-bold leading-snug text-gray-900">
            {job.customerName}
          </h3>

          <p className="text-sm font-medium text-gray-700">{job.storeName}</p>

          <div className="space-y-1.5 pt-1 text-sm text-gray-800">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
              <span className="break-words leading-snug">{job.address}</span>
            </div>
            {job.phone ? (
              <span
                role="link"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `tel:${job.phone.replace(/\s/g, '')}`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.stopPropagation();
                    window.location.href = `tel:${job.phone.replace(/\s/g, '')}`;
                  }
                }}
                className="flex items-center gap-2 font-medium text-primary-700"
              >
                <Phone className="h-4 w-4" />
                {job.phone}
              </span>
            ) : null}
            <div className="flex items-center gap-2 text-gray-700">
              <Clock className="h-4 w-4 text-gray-500" />
              <span>{fmtTimeRange(job.start, job.end)}</span>
            </div>
            {job.crewNames.length > 0 ? (
              <div className="flex items-start gap-2 text-gray-700">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
                <span className="break-words">{job.crewNames.join(' · ')}</span>
              </div>
            ) : null}
          </div>

          {job.notes ? (
            <p className="line-clamp-2 pt-1 text-xs text-gray-600">{job.notes}</p>
          ) : null}
        </div>

        <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-gray-400" />
      </div>

      {showStart && job.status === 'staged' && onStart ? (
        <div className="border-t border-black/5 px-4 pb-4 pt-2">
          <button
            type="button"
            disabled={starting}
            onClick={onStart}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-base font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
          >
            <Play className="h-5 w-5" />
            {starting ? t('crewPages.starting') : t('crewPages.startInstallation')}
          </button>
        </div>
      ) : null}
    </article>
  );
}
