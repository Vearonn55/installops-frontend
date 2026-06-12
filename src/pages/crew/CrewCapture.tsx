import { useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Camera, Image as ImageIcon, Loader2 } from 'lucide-react';
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
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
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
      queryClient.invalidateQueries({
        queryKey: [kind === 'transfer' ? 'transferMedia' : 'installationMedia', id],
      });
      toast.success(t('crewPages.photoUploaded'));
    },
    onError: (e: Error) => toast.error(e.message || t('crewPages.photoUploadFailed')),
  });

  const onFilesSelected = async (fileList: FileList | null) => {
    if (!fileList?.length || !id) return;
    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        if (!file.type.startsWith('image/')) continue;
        await uploadMut.mutateAsync(file);
      }
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
        <p className="text-sm text-gray-600">{t('crewPages.checklist.photosHint')}</p>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            void onFilesSelected(e.target.files);
            e.target.value = '';
          }}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            void onFilesSelected(e.target.files);
            e.target.value = '';
          }}
        />

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={uploading || uploadMut.isPending}
            onClick={() => cameraInputRef.current?.click()}
            className="flex min-h-[4.5rem] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 px-3 text-center text-xs font-semibold text-gray-700 hover:border-gray-400 hover:bg-gray-50 disabled:opacity-60"
          >
            {uploading || uploadMut.isPending ? (
              <Loader2 className="mb-1.5 h-6 w-6 animate-spin" />
            ) : (
              <Camera className="mb-1.5 h-6 w-6" />
            )}
            {t('crewPages.checklist.takePhoto')}
          </button>
          <button
            type="button"
            disabled={uploading || uploadMut.isPending}
            onClick={() => galleryInputRef.current?.click()}
            className="flex min-h-[4.5rem] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 px-3 text-center text-xs font-semibold text-gray-700 hover:border-gray-400 hover:bg-gray-50 disabled:opacity-60"
          >
            <ImageIcon className="mb-1.5 h-6 w-6" />
            {t('crewPages.checklist.selectGallery')}
          </button>
        </div>

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
