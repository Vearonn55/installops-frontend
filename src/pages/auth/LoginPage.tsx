import { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

import { useAuthStore } from '../../stores/auth-simple';
import { login as apiLogin } from '../../api/auth';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const logoRef = useRef<HTMLImageElement | null>(null);
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

  // Redirect if already authenticated (run once when auth state changes)
  useEffect(() => {
    if (isAuthenticated && user) {
      const from =
        (location.state as any)?.from?.pathname ||
        getDefaultRoute();

      navigate(from, { replace: true });
    }
  }, [isAuthenticated, user, location, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      clearError();
      // 1) POST /auth/login — backend sets session cookie (Set-Cookie) in response
      await apiLogin({
        email: data.email,
        password: data.password,
      });
      // 2) Brief delay so the browser can persist the cookie before the next request
      await new Promise((r) => setTimeout(r, 100));
      // 3) GET /auth/me — must send cookie; then we update auth store
      await login(data.email, data.password);
      // Redirect will be handled by the useEffect above when isAuthenticated flips to true
    } catch (error) {
      // Error is handled by the store
    }
  };

  useEffect(() => {
    const img = logoRef.current;
    // #region agent log
    fetch('http://127.0.0.1:7769/ingest/02dc9109-71a7-4b49-b7ff-2027a4b9bc0e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7f797c'},body:JSON.stringify({sessionId:'7f797c',runId:'logo-bg-investigation',hypothesisId:'H1',location:'src/pages/auth/LoginPage.tsx:mount',message:'login-logo-initial-src',data:{src:img?.getAttribute('src')??null,currentSrc:img?.currentSrc??null,complete:img?.complete??null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }, []);

  const handleLogoLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const style = window.getComputedStyle(img);
    let cornerPixels: Array<{ pos: string; r: number; g: number; b: number; a: number }> = [];
    try {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx && img.naturalWidth > 2 && img.naturalHeight > 2) {
        ctx.drawImage(img, 0, 0);
        const points = [
          { pos: 'tl', x: 0, y: 0 },
          { pos: 'tr', x: img.naturalWidth - 1, y: 0 },
          { pos: 'bl', x: 0, y: img.naturalHeight - 1 },
          { pos: 'br', x: img.naturalWidth - 1, y: img.naturalHeight - 1 },
        ];
        cornerPixels = points.map((p) => {
          const px = ctx.getImageData(p.x, p.y, 1, 1).data;
          return { pos: p.pos, r: px[0], g: px[1], b: px[2], a: px[3] };
        });
      }
    } catch {
      cornerPixels = [];
    }

    // #region agent log
    fetch('http://127.0.0.1:7769/ingest/02dc9109-71a7-4b49-b7ff-2027a4b9bc0e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7f797c'},body:JSON.stringify({sessionId:'7f797c',runId:'logo-bg-investigation',hypothesisId:'H2',location:'src/pages/auth/LoginPage.tsx:onLoad',message:'login-logo-render-styles',data:{currentSrc:img.currentSrc,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,mixBlendMode:style.mixBlendMode,filter:style.filter,opacity:style.opacity,backgroundColor:style.backgroundColor},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    // #region agent log
    fetch('http://127.0.0.1:7769/ingest/02dc9109-71a7-4b49-b7ff-2027a4b9bc0e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7f797c'},body:JSON.stringify({sessionId:'7f797c',runId:'logo-bg-investigation',hypothesisId:'H3',location:'src/pages/auth/LoginPage.tsx:onLoad',message:'login-logo-corner-pixels',data:{corners:cornerPixels},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto flex w-fit items-center justify-center rounded-md bg-white px-2 py-1">
            <img
              ref={logoRef}
              src="/ozerman-logo.png"
              alt="Ozerman Ticaret"
              className="mx-auto h-16 w-auto object-contain"
              onLoad={handleLogoLoad}
            />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            InstallOps
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to your account
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  className="input"
                  placeholder="Enter your email"
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
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="input pr-10"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
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

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary btn-lg w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
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
                    Sign in failed
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    {error || 'Please check your credentials and try again.'}
                  </div>
                </div>
              </div>
            </div>
          )}
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
