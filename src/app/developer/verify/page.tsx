'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { KeyRound, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { developerApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useBranding } from '@/lib/branding';

export default function DeveloperVerifyPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const { appName } = useBranding();
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) { setState('error'); return; }
    developerApi
      .verifyEmail(token)
      .then(() => {
        setState('ok');
        if (user) setUser({ ...user, isVerified: true } as any);
        setTimeout(() => router.push('/developer/console'), 1600);
      })
      .catch(() => setState('error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-brand-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' as const }}
        className="w-full max-w-md text-center"
      >
        <div className="flex items-center gap-2 justify-center mb-6">
          <div className="bg-brand-500 text-white rounded-xl p-2 shadow-lg shadow-brand-500/25"><KeyRound size={20} /></div>
          <span className="text-lg font-bold text-gray-900">{appName} — Développeurs</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-9 shadow-xl shadow-gray-200/50">
          {state === 'loading' && (
            <div className="text-gray-500">
              <Loader2 size={30} className="animate-spin mx-auto mb-3 text-brand-500" />
              Vérification en cours…
            </div>
          )}
          {state === 'ok' && (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 14 }}>
              <CheckCircle2 size={42} className="mx-auto mb-3 text-green-500" />
              <p className="font-semibold text-gray-900 text-lg">Email vérifié !</p>
              <p className="text-sm text-gray-500 mt-1">Redirection vers votre console…</p>
            </motion.div>
          )}
          {state === 'error' && (
            <div>
              <XCircle size={42} className="mx-auto mb-3 text-red-500" />
              <p className="font-semibold text-gray-900 text-lg">Lien invalide ou expiré</p>
              <p className="text-sm text-gray-500 mt-1 mb-4">Reconnectez-vous puis renvoyez un email de vérification depuis votre console.</p>
              <Link href="/developer/console" className="text-brand-600 font-semibold hover:text-brand-700 text-sm">Aller à ma console →</Link>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
