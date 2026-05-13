/** Turn backend media paths (/media/...) into a browser-loadable URL. */
export function resolveMediaUrl(url: string | null | undefined): string {
  const u = String(url ?? '').trim();
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;

  const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '/api/v1';
  if (u.startsWith('/media/') && apiBase.startsWith('http')) {
    try {
      return `${new URL(apiBase).origin}${u}`;
    } catch {
      return u;
    }
  }
  return u;
}
