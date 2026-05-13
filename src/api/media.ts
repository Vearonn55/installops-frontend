// /api/media.ts
import { apiGet, apiPost, apiDelete, UUID } from './http';

export type MediaType = 'photo' | 'signature';

export type MediaAsset = {
  id: UUID;
  installation_id: UUID;
  url: string;
  type: MediaType;
  tags?: Record<string, unknown> | string[]; // union from oneOf
  sha256?: string | null;
  metadata?: Record<string, unknown> | null;
  created_by?: UUID;
  created_at: string;
};

export type MediaAssetCreate = {
  url: string;
  type: MediaType;
  tags?: Record<string, unknown> | string[];
  sha256?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type MediaAssetList = {
  data: MediaAsset[];
  total: number;
  limit: number;
  offset: number;
};

// installation-scoped
export async function listInstallationMedia(
  installationId: UUID,
  params?: { limit?: number; offset?: number }
): Promise<MediaAssetList> {
  return apiGet<MediaAssetList>(`/installations/${installationId}/media`, {
    params,
  });
}

export async function createInstallationMedia(
  installationId: UUID,
  payload: MediaAssetCreate
): Promise<MediaAsset> {
  return apiPost<MediaAsset>(`/installations/${installationId}/media`, payload);
}

export type UploadInstallationMediaOptions = {
  type?: MediaType;
  tags?: Record<string, unknown>;
};

/** Multipart upload — stores file on server and creates media_assets row. */
export async function uploadInstallationMedia(
  installationId: UUID,
  file: File,
  opts?: UploadInstallationMediaOptions
): Promise<MediaAsset> {
  const form = new FormData();
  form.append('file', file);
  form.append('type', opts?.type ?? 'photo');
  if (opts?.tags && Object.keys(opts.tags).length > 0) {
    form.append('tags', JSON.stringify(opts.tags));
  }

  const base =
    import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '/api/v1';
  const url = `${base}/media/installations/${installationId}/media/upload`;

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 120_000);

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      body: form,
      credentials: 'include',
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('upload_timeout');
    }
    throw new Error('network_error');
  } finally {
    window.clearTimeout(timer);
  }

  if (!res.ok) {
    let message = `Upload failed (${res.status})`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body?.message) message = body.message;
    } catch {
      if (res.status === 413) {
        message = 'file_too_large';
      }
    }
    throw new Error(message);
  }

  return res.json() as Promise<MediaAsset>;
}

// global media record
export async function getMedia(id: UUID): Promise<MediaAsset> {
  return apiGet<MediaAsset>(`/media/${id}`);
}

export async function deleteMedia(id: UUID): Promise<void> {
  await apiDelete<void>(`/media/${id}`);
}
