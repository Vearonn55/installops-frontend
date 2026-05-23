import i18n from './i18n';
import { isAxiosError, type ApiErrorBody } from '../api/http';

function isLoginRequest(err: unknown): boolean {
  if (!isAxiosError(err)) return false;
  const url = String(err.config?.url ?? '');
  return /\/auth\/login(\/|$|\?)/.test(url);
}

/** User-facing message for failed sign-in (login POST or session establishment). */
export function getLoginErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const status = err.response?.status;
    const body = err.response?.data as ApiErrorBody | undefined;
    const serverMessage = body?.message?.trim();

    if (status === 401) {
      if (isLoginRequest(err)) {
        return (
          serverMessage ||
          i18n.t('auth.invalidCredentials', {
            ns: 'common',
            defaultValue: 'Incorrect email or password.',
          })
        );
      }
      return (
        serverMessage ||
        i18n.t('auth.sessionNotEstablished', {
          ns: 'common',
          defaultValue:
            'Session could not be established. Enable cookies and try again, or contact support.',
        })
      );
    }

    if (status === 400) {
      return (
        serverMessage ||
        i18n.t('auth.badRequest', {
          ns: 'common',
          defaultValue: 'Please check your email and password.',
        })
      );
    }

    if (status === 429) {
      return i18n.t('auth.tooManyAttempts', {
        ns: 'common',
        defaultValue: 'Too many sign-in attempts. Please wait and try again.',
      });
    }

    if (status === 503) {
      return (
        serverMessage ||
        i18n.t('auth.serviceUnavailable', {
          ns: 'common',
          defaultValue: 'Service temporarily unavailable. Please try again shortly.',
        })
      );
    }

    if (serverMessage) return serverMessage;
  }

  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }

  return i18n.t('auth.signInFailed', {
    ns: 'common',
    defaultValue: 'Sign in failed. Please try again.',
  });
}
