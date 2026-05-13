/** Normalize phone camera images (often HEIC) to JPEG for reliable server upload. */
export async function preparePhotoForUpload(file: File): Promise<File> {
  const type = (file.type || '').toLowerCase();
  if (type === 'image/jpeg' || type === 'image/jpg' || type === 'image/png') {
    return file;
  }

  try {
    const objectUrl = URL.createObjectURL(file);
    try {
      const img = await loadImage(objectUrl);
      const maxEdge = 2048;
      const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return file;
      ctx.drawImage(img, 0, 0, w, h);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.88);
      });
      if (!blob) return file;

      const base = (file.name || 'photo').replace(/\.[^.]+$/, '') || 'photo';
      return new File([blob], `${base}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return file;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image_decode_failed'));
    img.src = src;
  });
}
