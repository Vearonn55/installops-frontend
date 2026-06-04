import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ChevronRight } from 'lucide-react';

import IssueReportForm from '../../components/issues/IssueReportForm';
import { listInstallations } from '../../api/installations';
import { useAuthStore } from '../../stores/auth';
import { formatUiDateTime } from '../../lib/date-display';
import { pageHeaderClass } from '../../lib/responsive-layout';
import type { UUID } from '../../api/http';

export default function ManagerReportIssuePage() {
  const { t } = useTranslation('common');
  const [params, setParams] = useSearchParams();
  const queryInstallationId = params.get('installationId') as UUID | null;
  const storeId = useAuthStore((s) => s.user?.store_id);
  const [pickedId, setPickedId] = useState<UUID | null>(queryInstallationId);

  const activeId = (queryInstallationId ?? pickedId) as UUID | undefined;

  const installationsQuery = useQuery({
    queryKey: ['manager', 'installations', 'issues-picker', storeId],
    queryFn: async () => {
      const res = await listInstallations({
        limit: 100,
        offset: 0,
        store_id: storeId ?? undefined,
      });
      return res.data;
    },
    enabled: !queryInstallationId && !!storeId,
  });

  const installations = useMemo(() => {
    const rows = installationsQuery.data ?? [];
    return [...rows].sort((a, b) => {
      const ta = a.scheduled_start ?? a.created_at;
      const tb = b.scheduled_start ?? b.created_at;
      return tb.localeCompare(ta);
    });
  }, [installationsQuery.data]);

  const selectInstallation = (id: UUID) => {
    setPickedId(id);
    setParams({ installationId: id });
  };

  const clearSelection = () => {
    setPickedId(null);
    setParams({});
  };

  return (
    <div className="space-y-6">
      <div className={pageHeaderClass}>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-7 w-7 text-amber-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('issuesPage.manager.title')}</h1>
            <p className="mt-1 text-sm text-gray-500">{t('issuesPage.manager.subtitle')}</p>
          </div>
        </div>
      </div>

      {!activeId ? (
        <div className="mx-auto max-w-xl space-y-3">
          {!storeId ? (
            <p className="rounded-lg border bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {t('issuesPage.manager.noStore')}
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-600">{t('issuesPage.manager.pickInstallation')}</p>
              {installationsQuery.isLoading ? (
                <p className="text-sm text-gray-500">{t('issuesPage.manager.loadingInstallations')}</p>
              ) : null}
              {installations.length === 0 && !installationsQuery.isLoading ? (
                <p className="rounded-lg border bg-white px-4 py-3 text-sm text-gray-600">
                  {t('issuesPage.manager.noInstallations')}
                </p>
              ) : null}
              <ul className="space-y-2">
                {installations.map((inst) => (
                  <li key={inst.id}>
                    <button
                      type="button"
                      onClick={() => selectInstallation(inst.id)}
                      className="flex w-full items-center justify-between rounded-lg border bg-white px-4 py-3 text-left shadow-sm hover:bg-gray-50"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium text-gray-900">
                          {inst.install_code || inst.external_order_id}
                        </div>
                        <div className="font-mono text-xs text-gray-500">
                          {inst.external_order_id}
                        </div>
                        {inst.scheduled_start ? (
                          <div className="mt-0.5 text-xs text-gray-500">
                            {formatUiDateTime(inst.scheduled_start)}
                          </div>
                        ) : null}
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : (
        <div className="mx-auto max-w-xl rounded-lg border bg-white p-6 shadow-sm">
          <button
            type="button"
            className="mb-4 text-sm text-primary-600 hover:underline"
            onClick={clearSelection}
          >
            {t('issuesPage.manager.changeInstallation')}
          </button>
          <IssueReportForm installationId={activeId} />
        </div>
      )}
    </div>
  );
}
