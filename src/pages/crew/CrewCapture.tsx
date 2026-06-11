import { useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Camera, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import type { UUID } from '../../api/http';
import { uploadInstallationMedia, uploadTransferMedia } from '../../api/media';
import { preparePhotoForUpload } from '../../lib/prepare-photo-upload';
import { listTransferMedia } from '../../api/transfers';
import { listInstallationMedia } from '../../api/media';
import { resolveMediaUrl } from '../../lib/media-url';

export default function CrewCapture() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const kind = searchParams.get('kind') === 'transfer' ? 'transfer' : 'installation';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation('common');
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const mediaQuery = useQuery({
    queryKey: ['crew-capture-media', kind, id],
    queryFn: () =>
      kind === 'transfer'
        ? listTransferMedia(id as UUID, { limit: 50 })
        : listInstallationMedia(id as UUID, { limit: 50 }),
    enabled: !!id,
  });

  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      const prepared = await preparePhotoForUpload(file);
      if (kind === 'transfer') {
        return uploadTransferMedia(id as UUID, prepared, {
          type: 'photo',
          tags: { source: 'crew_capture' },
        });
      }
      return uploadInstallationMedia(id as UUID, prepared, {
        type: 'photo',
        tags: { source: 'crew_capture' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crew-capture-media', kind, id] });
      toast.success(t('crewPages.photoUploaded'));
    },
    onError: (e: Error) => toast.error(e.message || t('crewPages.photoUploadFailed')),
  });

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !id) return;
    setUploading(true);
    try {
      await uploadMut.mutateAsync(file);
    } finally {
      setUploading(false);
    }
  };

  const backPath =
    kind === 'transfer' ? `/crew/jobs/${id}?kind=transfer` : `/crew/jobs/${id}`;

  return (
    <div className="mx-auto max-w-screen-sm">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b bg-white px-3 py-2">
        <button type="button" className="rounded-lg p-2 hover:bg-gray-100" onClick={() => navigate(backPath)}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">{t('crewPages.captureTitle')}</h1>
      </header>

      <main className="crew-page space-y-4">
        <p className="text-sm text-gray-600">{t('crewPages.captureHint')}</p>

        <button
          type="button"
          disabled={uploading || uploadMut.isPending}
          onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 text-base font-semibold text-white disabled:opacity-60"
        >
          {uploading || uploadMut.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Camera className="h-5 w-5" />
          )}
          {t('crewPages.takePhoto')}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={onPick}
        />

        <div className="grid grid-cols-2 gap-2">
          {(mediaQuery.data?.data ?? []).map((asset) => (
            <img
              key={asset.id}
              src={resolveMediaUrl(asset.url)}
              alt=""
              className="aspect-square w-full rounded-xl border object-cover"
            />
          ))}
        </div>
      </main>
    </div>
  );
}
