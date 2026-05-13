// src/pages/crew/CrewOrderDetail.tsx
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2, MapPin, Phone, Package, User2 } from 'lucide-react';

import { getInstallation } from '../../api/installations';
import type { UUID } from '../../api/http';
import { useInstallationNetsis } from '../../hooks/use-installation-netsis';
import {
  buildCrewJobView,
  mergeArpIntoCrewJobView,
} from '../../lib/crew-job';
import { netsisLinesToDisplayRows } from '../../lib/netsis-native';

export default function CrewOrderDetail() {
  const { id: jobId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  const instQuery = useQuery({
    queryKey: ['installation', jobId],
    queryFn: () => getInstallation(jobId as UUID),
    enabled: Boolean(jobId),
  });

  const inst = instQuery.data;
  const netsis = useInstallationNetsis(inst);

  const job = useMemo(() => {
    if (!inst) return null;
    const base = buildCrewJobView(inst, netsis.order);
    return mergeArpIntoCrewJobView(base, netsis.customerFromArp);
  }, [inst, netsis.order, netsis.customerFromArp]);

  const lines = useMemo(
    () => netsisLinesToDisplayRows(netsis.order?.lines),
    [netsis.order?.lines]
  );

  const loading = instQuery.isLoading || netsis.isLoading;
  const hasError = instQuery.isError;

  return (
    <div className="mx-auto h-full w-full max-w-screen-sm">
      <header className="sticky top-0 z-10 border-b bg-white/95 backdrop-blur">
        <div className="flex items-center gap-2 px-3 py-2">
          <button
            type="button"
            className="rounded-lg p-2 hover:bg-gray-100"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-gray-900">
              {job?.orderId ?? t('crewPages.order')}
            </div>
            <div className="text-[11px] text-gray-500">{t('crewPages.orderSubtitle')}</div>
          </div>
        </div>
      </header>

      <main className="crew-page space-y-3">
        {loading && (
          <section className="rounded-2xl border bg-white p-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('crewPages.loading')}
            </div>
          </section>
        )}

        {hasError && (
          <section className="rounded-2xl border bg-white p-6 text-sm text-rose-700">
            {t('crewPages.orderLoadError')}
          </section>
        )}

        {job && !loading && (
          <>
            <section className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="grid grid-cols-[28px_1fr] items-start gap-x-3 gap-y-3">
                <User2 className="h-6 w-6 text-gray-600" />
                <div>
                  <div className="text-lg font-bold text-gray-900">{job.customerName}</div>
                  <div className="text-sm text-gray-600">{job.storeName}</div>
                </div>

                <MapPin className="h-5 w-5 text-gray-600" />
                <div className="break-words text-sm leading-snug text-gray-900">
                  {job.address}
                </div>

                {job.phone ? (
                  <>
                    <Phone className="h-5 w-5 text-gray-600" />
                    <a
                      href={`tel:${job.phone.replace(/\s/g, '')}`}
                      className="text-sm font-semibold text-primary-700"
                    >
                      {job.phone}
                    </a>
                  </>
                ) : null}
              </div>
            </section>

            <section className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Package className="h-4 w-4" />
                {t('crewPages.orderLines')}
              </div>
              {lines.length === 0 ? (
                <p className="text-sm text-gray-500">{t('crewPages.noOrderLines')}</p>
              ) : (
                <ul className="divide-y">
                  {lines.map((line) => (
                    <li key={line.id} className="py-3">
                      <div className="text-sm font-medium text-gray-900">{line.name}</div>
                      {line.description && line.description !== line.name ? (
                        <p className="mt-0.5 text-xs text-gray-600">{line.description}</p>
                      ) : null}
                      <div className="mt-1 flex justify-between text-xs text-gray-500">
                        <span className="font-mono">{line.sku}</span>
                        <span className="font-semibold text-gray-900">×{line.quantity}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
