import { Link } from 'react-router-dom';
import { Plug, BookOpen, Building2, ExternalLink } from 'lucide-react';

export default function IntegrationsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-10">
      <div className="text-center">
        <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-600">
          <Plug className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="mt-2 text-sm text-gray-500">
          Connect InstallOps to Netsis per store. The browser never talks to Netsis directly — only
          this API proxies requests using credentials you configure.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          to="/app/admin/stores"
          className="flex flex-col gap-2 rounded-lg border bg-white p-4 shadow-sm transition hover:border-primary-300 hover:shadow"
        >
          <Building2 className="h-8 w-8 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">Stores & Netsis</h2>
          <p className="text-sm text-gray-600">
            Set base URL, search path, optional HTTP Basic auth, and test connectivity per store.
          </p>
        </Link>
        <a
          href="https://polaris.logo.cloud/docs/netsis-uyarlama-araclari/detail/external%3Fcid%3D733a2034-62db-4c83-add0-e164ce6af7ed&link%3D42eecc09-cbf0-48dd-a955-00656cb546b1&tenantId%3Dcdd87e13-3009-4dd1-a5b8-2a005c0e58da&hideName%3DTrue"
          target="_blank"
          rel="noreferrer"
          className="flex flex-col gap-2 rounded-lg border bg-white p-4 shadow-sm transition hover:border-primary-300 hover:shadow"
        >
          <ExternalLink className="h-8 w-8 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">Logo — Netsis docs</h2>
          <p className="text-sm text-gray-600">
            Official Logo Polaris documentation (Netsis uyarlama araçları). May require login.
          </p>
        </a>
        <a
          href="https://github.com/Vearonn55/installops-backend/blob/main/docs/NETSIS.md"
          target="_blank"
          rel="noreferrer"
          className="flex flex-col gap-2 rounded-lg border bg-white p-4 shadow-sm transition hover:border-primary-300 hover:shadow"
        >
          <BookOpen className="h-8 w-8 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">InstallOps ↔ Netsis</h2>
          <p className="text-sm text-gray-600">
            How this app proxies Netsis: Host header, ping path, order search JSON shapes.
          </p>
        </a>
      </div>
    </div>
  );
}
