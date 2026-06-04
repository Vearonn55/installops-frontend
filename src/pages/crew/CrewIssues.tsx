import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ChevronRight } from 'lucide-react';

import IssueReportForm from '../../components/issues/IssueReportForm';
import { listInstallations } from '../../api/installations';
import { useAuthStore } from '../../stores/auth';
import { buildCrewJobView, isCrewAssigned, isCrewVisibleInstallation } from '../../lib/crew-job';
import type { UUID } from '../../api/http';

export default function CrewIssues() {
  const { id: jobId } = useParams<{ id?: string }>();
  const { t } = useTranslation('common');
  const userId = useAuthStore((s) => s.user?.id);
  const [pickedId, setPickedId] = useState<UUID | null>(jobId ?? null);

  const installationsQuery = useQuery({
    queryKey: ['crew', 'installations', 'issues-picker'],
    queryFn: async () => {
      const res = await listInstallations({ limit: 100, offset: 0 });
      return res.data;
    },
    enabled: !jobId,
  });

  const assignedJobs = useMemo(() => {
    if (!userId || !installationsQuery.data) return [];
    return installationsQuery.data
      .filter((inst) => isCrewVisibleInstallation(inst) && isCrewAssigned(inst, userId))
      .map((inst) => buildCrewJobView(inst))
      .sort((a, b) => a.start.localeCompare(b.start));
  }, [installationsQuery.data, userId]);

  const activeId = (jobId ?? pickedId) as UUID | undefined;

  return (
    <div className="mx-auto max-w-lg p-4 pb-24">
      <div className="mb-4 flex items-center gap-2">
        <AlertTriangle className="h-6 w-6 text-amber-600" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {jobId ? t('issuesPage.crew.jobTitle') : t('issuesPage.crew.title')}
          </h1>
          <p className="text-sm text-gray-500">{t('issuesPage.crew.subtitle')}</p>
        </div>
      </div>

      {!jobId && !activeId ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">{t('issuesPage.crew.pickJob')}</p>
          {installationsQuery.isLoading ? (
            <p className="text-sm text-gray-500">{t('issuesPage.crew.loadingJobs')}</p>
          ) : null}
          {assignedJobs.length === 0 && !installationsQuery.isLoading ? (
            <p className="rounded-xl border bg-white p-4 text-sm text-gray-600">
              {t('issuesPage.crew.noJobs')}
            </p>
          ) : null}
          <ul className="space-y-2">
            {assignedJobs.map((job) => (
              <li key={job.id}>
                <button
                  type="button"
                  onClick={() => setPickedId(job.id)}
                  className="flex w-full items-center justify-between rounded-xl border bg-white px-4 py-3 text-left shadow-sm hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-gray-900">
                      {job.orderId}
                    </div>
                    <div className="text-xs text-gray-500">{job.address}</div>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {activeId ? (
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          {!jobId ? (
            <button
              type="button"
              className="mb-3 text-sm text-primary-600 hover:underline"
              onClick={() => setPickedId(null)}
            >
              {t('issuesPage.crew.changeJob')}
            </button>
          ) : (
            <Link
              to={`/crew/jobs/${activeId}`}
              className="mb-3 inline-block text-sm text-primary-600 hover:underline"
            >
              {t('issuesPage.crew.backToJob')}
            </Link>
          )}
          <IssueReportForm installationId={activeId} />
        </div>
      ) : null}
    </div>
  );
}
