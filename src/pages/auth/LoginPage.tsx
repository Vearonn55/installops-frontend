import { useState, useEffect, useMemo } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useAuthStore } from '../../stores/auth';
import OzermanLogoAnimated from '../../components/auth/OzermanLogoAnimated';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const { t } = useTranslation('common');
  const { isAuthenticated, user, login, isLoading, error, clearError } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const getDefaultRoute = () => {
    if (!user) return '/app/dashboard';

    switch (user.role) {
      case 'ADMIN':
        return '/app/dashboard';
      case 'STORE_MANAGER':
        return '/app/dashboard';
      case 'CREW':
        return '/crew';
      default:
        return '/app/dashboard';
    }
  };

  const postLoginTarget = useMemo(() => {
    const from = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from;
    const path = from?.pathname;
    if (!path || path === '/auth/login') return null;
    return `${path}${from?.search ?? ''}`;
  }, [location.state, location.key]);

  useEffect(() => {
    if (location.pathname !== '/auth/login') return;
    if (!isAuthenticated || !user) return;
    navigate(postLoginTarget ?? getDefaultRoute(), { replace: true });
  }, [isAuthenticated, user?.id, user?.role, location.pathname, postLoginTarget, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    clearError();
    try {
      await login(data.email, data.password);
    } catch {
      /* Error message is stored in auth store */
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto flex w-fit items-center justify-center px-2 py-1">
            <OzermanLogoAnimated className="mx-auto h-20 w-auto" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            InstallOps
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to your account
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  {...register('email')}
                  id="email"
                  type="email"
                  autoComplete="email"
                  className="input"
                  placeholder="Enter your email"
                  disabled={isLoading}
                  aria-invalid={Boolean(errors.email)}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  {...register('password')}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="input pr-10"
                  placeholder="Enter your password"
                  disabled={isLoading}
                  aria-invalid={Boolean(errors.password || error)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link
                to="/auth/forgot-password"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                Forgot your password?
              </Link>
            </div>
          </div>

          {error ? (
            <div
              className="rounded-md bg-red-50 p-4"
              role="alert"
              aria-live="polite"
            >
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    {t('auth.signInFailedTitle', { defaultValue: 'Sign in failed' })}
                  </h3>
                  <p className="mt-2 text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          ) : null}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary btn-lg w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('auth.signingIn', { defaultValue: 'Signing in…' })}
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">
                Furniture Installation Management Platform
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
