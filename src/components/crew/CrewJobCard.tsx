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
        'overflow-hidden rounded-2xl border-2 shadow-sm',
        crewJobCardClass(job.status)
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-start gap-3 p-4 text-left active:opacity-90"
      >
        <div className="min-w-0 flex-1">
          <motionBody job={job} t={t} />
        </div>
        <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-gray-400" />
      </button>

      {showStart && job.status === 'staged' && onStart ? (
        <div className="border-t border-black/5 px-4 pb-4 pt-2">
          <button
            type="button"
            disabled={starting}
            onClick={(e) => {
              e.stopPropagation();
              onStart();
            }}
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

function motionBody({
  job,
  t,
}: {
  job: CrewJobView;
  t: (k: string) => string;
}) {
  return (
    <>
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

      <h3 className="mt-1 text-lg font-bold leading-snug text-gray-900">
        {job.customerName}
      </h3>

      <p className="mt-0.5 text-sm font-medium text-gray-700">{job.storeName}</p>

      <div className="mt-2 space-y-1.5 text-sm text-gray-800">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
          <span className="break-words leading-snug">{job.address}</span>
        </div>
        {job.phone ? (
          <a
            href={`tel:${job.phone.replace(/\s/g, '')}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 font-medium text-primary-700"
          >
            <Phone className="h-4 w-4" />
            {job.phone}
          </a>
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
        <p className="mt-2 line-clamp-2 text-xs text-gray-600">{job.notes}</p>
      ) : null}
    </>
  );
}
