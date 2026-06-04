'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGoogleLogin } from '@react-oauth/google';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

// ── Helpers ────────────────────────────────────────────────────────────────────

function finishLogin(res: any, setAuth: any, router: any) {
  setAuth(res.user, res.accessToken, res.refreshToken);
  toast.success('Connexion réussie !');
  const role = res.user?.role;
  if (role === 'SUPER_ADMIN')        router.push('/dashboard/admin');
  else if (role === 'PASSENGER')     router.push('/passenger');
  else if (!res.user?.tenantId)      router.push('/register');
  else if (role === 'DRIVER')        router.push('/driver');
  else if (role === 'COMPANY_AGENT') router.push('/station');
  else                               router.push('/dashboard');
}

// ── Facebook via popup OAuth (fonctionne en HTTP, pas de SDK) ─────────────────

function openFacebookOAuth(): Promise<string> {
  return new Promise((resolve, reject) => {
    const appId      = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    if (!appId) { reject(new Error('Facebook App ID non configuré')); return; }

    const redirectUri = `${window.location.origin}/auth/facebook/callback`;
    const url = `https://www.facebook.com/dialog/oauth?` +
      `client_id=${appId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=email,public_profile` +
      `&response_type=token`;

    const popup = window.open(url, 'fb-login', 'width=600,height=700,left=200,top=100');

    // Écouter le message de la page de callback
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === 'FB_AUTH_SUCCESS') {
        cleanup();
        resolve(e.data.token as string);
      } else if (e.data?.type === 'FB_AUTH_ERROR') {
        cleanup();
        reject(new Error('Erreur Facebook'));
      }
    };

    // Détecter si le popup est fermé sans auth
    const checkClosed = setInterval(() => {
      if (popup?.closed) { cleanup(); reject(new Error('cancelled')); }
    }, 500);

    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      clearInterval(checkClosed);
    };

    window.addEventListener('message', onMessage);
  });
}

// ── Main component ─────────────────────────────────────────────────────────────

export function SocialButtons() {
  const router      = useRouter();
  const { setAuth } = useAuthStore();
  const [fbLoading, setFbLoading] = useState(false);

  // ── Google ────────────────────────────────────────────────────────────────
  const googleLogin = useGoogleLogin({
    flow: 'implicit',
    onSuccess: async (tokenResponse) => {
      try {
        const res = await authApi.socialLogin('google', tokenResponse.access_token) as any;
        finishLogin(res, setAuth, router);
      } catch (err: any) {
        toast.error(err?.response?.data?.error || 'Erreur de connexion Google');
      }
    },
    onError: (error) => {
      if (error.error !== 'access_denied') {
        toast.error('Erreur de connexion Google');
      }
    },
  });

  // ── Facebook ──────────────────────────────────────────────────────────────
  async function handleFacebook() {
    setFbLoading(true);
    try {
      const token = await openFacebookOAuth();
      const res   = await authApi.socialLogin('facebook', token) as any;
      finishLogin(res, setAuth, router);
    } catch (err: any) {
      if (err?.message !== 'cancelled')
        toast.error(err?.response?.data?.error || err?.message || 'Erreur de connexion Facebook');
    } finally {
      setFbLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Google */}
      <button
        onClick={() => googleLogin()}
        className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all duration-150 text-sm font-medium text-slate-700 shadow-sm"
      >
        <GoogleIcon />
        Continuer avec Google
      </button>

      {/* Facebook */}
      <button
        onClick={handleFacebook}
        disabled={fbLoading}
        className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all duration-150 text-sm font-medium text-slate-700 disabled:opacity-50 shadow-sm"
      >
        {fbLoading ? <Loader2 size={18} className="animate-spin text-slate-400" /> : <FacebookIcon />}
        Continuer avec Facebook
      </button>
    </div>
  );
}

// ── SVG Icons ──────────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}
