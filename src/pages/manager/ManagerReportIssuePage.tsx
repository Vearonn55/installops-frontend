import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';

import IssueReportForm from '../../components/issues/IssueReportForm';
import { pageHeaderClass } from '../../lib/responsive-layout';

export default function ManagerReportIssuePage() {
  const { t } = useTranslation('common');

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

      <div className="mx-auto max-w-xl rounded-lg border bg-white p-6 shadow-sm">
        <IssueReportForm />
      </div>
    </div>
  );
}
