import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, ArrowLeft, Construction } from 'lucide-react';

const FEATURE_KEYS: Record<string, string> = {
  help: 'comingSoon.features.help',
  shortcuts: 'comingSoon.features.shortcuts',
  integrations: 'comingSoon.features.integrations',
  reports: 'comingSoon.features.reports',
  capacity: 'comingSoon.features.capacity',
};

export default function ComingSoonPage() {
  const [searchParams] = useSearchParams();
  const feature = searchParams.get('feature') ?? '';
  const { t } = useTranslation();
  const featureKey = FEATURE_KEYS[feature];
  const title = featureKey ? t(`${featureKey}.title`) : t('comingSoon.title');
  const description = featureKey ? t(`${featureKey}.description`) : t('comingSoon.description');

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-full bg-primary-50">
            <Construction className="h-10 w-10 text-primary-600" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-gray-900">
            {title}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {description}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/app/dashboard"
            className="btn btn-primary btn-md inline-flex items-center justify-center gap-2"
          >
            <Home className="h-4 w-4" />
            {t('comingSoon.backToDashboard')}
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="btn btn-outline btn-md inline-flex items-center justify-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('comingSoon.goBack')}
          </button>
        </div>
      </div>
    </div>
  );
}
