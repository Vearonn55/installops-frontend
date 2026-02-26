// src/pages/admin/IntegrationsPage.tsx
import { Plug, Clock } from 'lucide-react';

export default function IntegrationsPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-10 text-center">
      {/* Icon badge */}
      <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-600">
        <Plug className="h-7 w-7" />
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>

      {/* Subtitle */}
      <p className="mt-2 max-w-md text-sm text-gray-500">
        This page will let you connect InstallOps with external systems (ERPs, analytics,
        webhooks and more).
      </p>

      {/* Coming soon pill */}
      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-yellow-50 px-4 py-1.5 text-xs font-medium text-yellow-800 border border-yellow-200">
        <Clock className="h-3.5 w-3.5" />
        Coming soon
      </div>

      {/* Extra hint */}
      <p className="mt-4 max-w-md text-xs text-gray-400">
        Integrations are not yet available in this environment. Once enabled, you’ll be able
        to configure event webhooks and monitor deliveries from this screen.
      </p>
    </div>
  );
}
