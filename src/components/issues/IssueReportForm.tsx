import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Loader2, Send } from 'lucide-react';

import { createSoftwareIssue } from '../../api/software-issues';
import { isAxiosError } from '../../api/http';

const MIN_SUBJECT = 3;
const MIN_BODY = 10;

type Props = {
  onSubmitted?: () => void;
};

export default function IssueReportForm({ onSubmitted }: Props) {
  const { t } = useTranslation('common');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const submitMut = useMutation({
    mutationFn: () =>
      createSoftwareIssue({
        subject: subject.trim(),
        body: body.trim(),
      }),
    onSuccess: () => {
      toast.success(t('issuesPage.form.success'));
      setSubject('');
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

  const titleTrim = subject.trim();
  const bodyTrim = body.trim();
  const canSubmit =
    titleTrim.length >= MIN_SUBJECT &&
    bodyTrim.length >= MIN_BODY &&
    !submitMut.isPending;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) {
          if (titleTrim.length < MIN_SUBJECT) {
            toast.error(t('issuesPage.form.minSubject', { min: MIN_SUBJECT }));
          } else if (bodyTrim.length < MIN_BODY) {
            toast.error(t('issuesPage.form.minLength', { min: MIN_BODY }));
          }
          return;
        }
        submitMut.mutate();
      }}
    >
      <div>
        <label className="text-sm font-medium text-gray-900" htmlFor="issue-subject">
          {t('issuesPage.form.subjectLabel')}
        </label>
        <input
          id="issue-subject"
          type="text"
          maxLength={200}
          className="input mt-2 w-full rounded-xl text-base"
          placeholder={t('issuesPage.form.subjectPlaceholder')}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={submitMut.isPending}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-900" htmlFor="issue-body">
          {t('issuesPage.form.bodyLabel')}
        </label>
        <textarea
          id="issue-body"
          className="input mt-2 min-h-[140px] w-full rounded-xl text-base"
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
