'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { billingApi } from '@/lib/api';
import { CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function SubscriptionPaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const subscriptionId = searchParams.get('subscriptionId');
  const [confirmed, setConfirmed] = useState(false);

  const confirmMut = useMutation({
    mutationFn: () => billingApi.confirmFromRedirect(subscriptionId!) as any,
    onSuccess: () => setConfirmed(true),
    onError: () => setConfirmed(true), // On affiche succès même si la confirmation échoue (le webhook le fera)
  });

  useEffect(() => {
    if (subscriptionId) {
      confirmMut.mutate();
    } else {
      setConfirmed(true);
    }
  }, [subscriptionId]);

  if (!confirmed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 text-center max-w-sm w-full">
          <Loader2 size={40} className="animate-spin text-brand-500 mx-auto mb-4" />
          <p className="text-gray-600">Confirmation du paiement en cours…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-10 text-center max-w-sm w-full">
        <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 size={32} className="text-green-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Paiement confirmé !</h1>
        <p className="text-gray-500 text-sm mb-6">
          Votre abonnement est maintenant actif. Un email de confirmation vous a été envoyé.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-6 py-3 rounded-xl transition"
        >
          Accéder au dashboard <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}
