import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';

import IssueReportForm from '../../components/issues/IssueReportForm';

export default function CrewIssues() {
  const { t } = useTranslation('common');

  return (
    <div className="mx-auto max-w-lg p-4 pb-24">
      <div className="mb-4 flex items-center gap-2">
        <AlertTriangle className="h-6 w-6 text-amber-600" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('issuesPage.crew.title')}</h1>
          <p className="text-sm text-gray-500">{t('issuesPage.crew.subtitle')}</p>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <IssueReportForm />
      </div>
    </div>
  );
}
