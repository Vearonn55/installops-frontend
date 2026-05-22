import toast from 'react-hot-toast';
import i18n from '../lib/i18n';
import { apiClient, isAxiosError } from './http';
import { useAuthStore } from '../stores/auth';

let handlingUnauthorized = false;

function isAuthEndpoint(url: string): boolean {
  return /\/auth\/(login|register|logout)(\/|$|\?)/.test(url);
}

/** Permission denials on optional enrichment must not destroy the session. */
function isOptionalEnrichmentEndpoint(url: string): boolean {
  return /\/integrations\/netsis\//.test(url);
}

/** Global 401/403 → clear session and redirect to login (cookie sessions). */
export function setupAuthHttpInterceptor(): void {
  apiClient.interceptors.response.use(
    (res) => res,
    (err) => {
      if (!isAxiosError(err)) return Promise.reject(err);
      const status = err.response?.status;
      const url = String(err.config?.url || '');
      if (isAuthEndpoint(url)) return Promise.reject(err);

      if (status === 403 && isOptionalEnrichmentEndpoint(url)) {
        return Promise.reject(err);
      }

      if (status !== 401 && status !== 403) return Promise.reject(err);

      const state = useAuthStore.getState();
      if (!state.isAuthenticated && state.sessionValidated) return Promise.reject(err);

      if (!handlingUnauthorized) {
        handlingUnauthorized = true;
        state.logout();
        toast.error(i18n.t('auth.sessionExpired', { ns: 'common' }));
        const path = window.location.pathname;
        if (!path.startsWith('/auth/login')) {
          window.location.assign('/auth/login');
        }
        setTimeout(() => {
          handlingUnauthorized = false;
        }, 2000);
      }

      return Promise.reject(err);
    }
  );
}
