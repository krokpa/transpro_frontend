'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KeyRound, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { developerApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export default function DeveloperVerifyPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) { setState('error'); return; }
    developerApi
      .verifyEmail(token)
      .then(() => {
        setState('ok');
        if (user) setUser({ ...user, isVerified: true } as any);
        setTimeout(() => router.push('/developer/console'), 1500);
      })
      .catch(() => setState('error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="flex items-center gap-2 justify-center mb-6">
          <div className="bg-brand-500 text-white rounded-xl p-2 shadow-sm"><KeyRound size={20} /></div>
          <span className="text-lg font-bold text-gray-900">TransPro — Espace Développeur</span>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          {state === 'loading' && (
            <div className="text-gray-500"><Loader2 size={28} className="animate-spin mx-auto mb-3 text-brand-500" />Vérification en cours…</div>
          )}
          {state === 'ok' && (
            <div>
              <CheckCircle2 size={36} className="mx-auto mb-3 text-green-500" />
              <p className="font-semibold text-gray-900">Email vérifié !</p>
              <p className="text-sm text-gray-500 mt-1">Redirection vers votre console…</p>
            </div>
          )}
          {state === 'error' && (
            <div>
              <XCircle size={36} className="mx-auto mb-3 text-red-500" />
              <p className="font-semibold text-gray-900">Lien invalide ou expiré</p>
              <p className="text-sm text-gray-500 mt-1 mb-4">Reconnectez-vous puis renvoyez un email de vérification depuis votre console.</p>
              <Link href="/developer/console" className="text-brand-600 font-semibold hover:text-brand-700 text-sm">Aller à ma console</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
