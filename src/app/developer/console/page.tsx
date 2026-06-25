'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { KeyRound, LogOut, ExternalLink, MailWarning } from 'lucide-react';
import { apiConsumersApi, developerApi, apiError } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useBranding } from '@/lib/branding';
import { ConsumerDetail } from '@/app/dashboard/developers/page';
import { toast } from 'sonner';

export default function DeveloperConsolePage() {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const { appName } = useBranding();
  const [resending, setResending] = useState(false);

  // Retour de paiement Genius Pay (?billing=success|error).
  useEffect(() => {
    const billing = new URLSearchParams(window.location.search).get('billing');
    if (billing === 'success') toast.success('Paiement reçu — votre plan sera activé sous peu.');
    else if (billing === 'error') toast.error('Le paiement a échoué ou a été annulé.');
    if (billing) window.history.replaceState({}, '', '/developer/console');
  }, []);

  const { data: rawConsumers = [], isLoading } = useQuery({
    queryKey: ['api-consumers'],
    queryFn: () => apiConsumersApi.list() as any,
    enabled: user?.role === 'DEVELOPER',
    staleTime: 30_000,
  });
  const consumers: any[] = Array.isArray(rawConsumers) ? rawConsumers : [];

  if (user && user.role !== 'DEVELOPER') {
    router.replace('/dashboard');
    return null;
  }
  if (!user) {
    router.replace('/developer/login');
    return null;
  }

  function logout() {
    clearAuth();
    router.push('/developer/login');
  }

  async function resendVerification() {
    setResending(true);
    try {
      await developerApi.resendVerification();
      toast.success('Email de vérification renvoyé — vérifiez votre boîte.');
    } catch (e) {
      toast.error(apiError(e, 'Envoi impossible'));
    } finally {
      setResending(false);
    }
  }

  const apiDocsUrl =
    (process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3001') + '/developers';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header autonome (pas de sidebar compagnie) */}
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-10 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-brand-500 text-white rounded-xl p-2 shadow-sm">
              <KeyRound size={18} />
            </div>
            <div>
              <p className="font-bold text-gray-900 leading-tight">Espace Développeur</p>
              <p className="text-xs text-gray-400 leading-tight">{appName} API</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href={apiDocsUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-1.5">
              <ExternalLink size={15} /> Documentation
            </a>
            <span className="text-sm text-gray-400 hidden sm:inline">{user.email}</span>
            <button onClick={logout} title="Déconnexion" className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 lg:px-10 py-8">
        {(user as any).isVerified === false && (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-2.5">
              <MailWarning size={18} className="text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Vérifiez votre adresse email</p>
                <p className="text-xs text-amber-800/80 mt-0.5">
                  Le sandbox est disponible, mais la demande d'accès production nécessite un email vérifié.
                </p>
              </div>
            </div>
            <button
              onClick={resendVerification}
              disabled={resending}
              className="shrink-0 px-3 py-2 text-xs font-semibold bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition disabled:opacity-50"
            >
              Renvoyer l'email
            </button>
          </div>
        )}

        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900">Mon intégration API</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gérez vos clés, webhooks et votre plan. Démarrez en sandbox, demandez la production quand vous êtes prêt.
          </p>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">Chargement…</div>
        ) : consumers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500">
            Aucune intégration trouvée pour ce compte.
          </div>
        ) : (
          <ConsumerDetail consumerId={consumers[0].id} wide />
        )}
      </main>
    </div>
  );
}
