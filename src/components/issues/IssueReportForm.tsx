import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Loader2, Send } from 'lucide-react';

import { createInstallationIssue } from '../../api/installation-issues';
import { getInstallation } from '../../api/installations';
import type { UUID } from '../../api/http';
import { isAxiosError } from '../../api/http';

const MIN_BODY = 10;

type Props = {
  installationId: UUID;
  onSubmitted?: () => void;
};

export default function IssueReportForm({ installationId, onSubmitted }: Props) {
  const { t } = useTranslation('common');
  const [body, setBody] = useState('');

  const instQuery = useQuery({
    queryKey: ['installation', installationId, 'issue-form'],
    queryFn: () => getInstallation(installationId),
    enabled: !!installationId,
  });

  const submitMut = useMutation({
    mutationFn: () =>
      createInstallationIssue({
        installation_id: installationId,
        body: body.trim(),
      }),
    onSuccess: () => {
      toast.success(t('issuesPage.form.success'));
      setBody('');
      onSubmitted?.();
    },
    onError: (e: unknown) => {
      const msg = isAxiosError(e)
        ? e.response?.data?.message || e.message
        : e instanceof Error
          ? e.message
          : t('issuesPage.form.error');
      toast.error(String(msg));
    },
  });

  const inst = instQuery.data;
  const trimmed = body.trim();
  const canSubmit = trimmed.length >= MIN_BODY && !submitMut.isPending;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) {
          if (trimmed.length < MIN_BODY) {
            toast.error(t('issuesPage.form.minLength', { min: MIN_BODY }));
          }
          return;
        }
        submitMut.mutate();
      }}
    >
      {instQuery.isLoading ? (
        <p className="text-sm text-gray-500">{t('issuesPage.form.loadingInstallation')}</p>
      ) : null}
      {inst ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
          <div className="font-medium text-gray-900">
            {inst.install_code || inst.external_order_id}
          </div>
          <div className="mt-0.5 font-mono text-xs text-gray-500">{inst.external_order_id}</div>
          {inst.store?.name ? (
            <div className="mt-1 text-xs text-gray-600">{inst.store.name}</div>
          ) : null}
        </div>
      ) : null}

      <div>
        <label className="text-sm font-medium text-gray-900" htmlFor="issue-body">
          {t('issuesPage.form.bodyLabel')}
        </label>
        <textarea
          id="issue-body"
          className="input mt-2 min-h-[120px] w-full rounded-xl text-base"
          placeholder={t('issuesPage.form.bodyPlaceholder')}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={submitMut.isPending}
        />
        <p className="mt-1 text-xs text-gray-500">{t('issuesPage.form.privacyNote')}</p>
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
      >
        {submitMut.isPending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Send className="h-5 w-5" />
        )}
        {t('issuesPage.form.submit')}
      </button>
    </form>
  );
}
