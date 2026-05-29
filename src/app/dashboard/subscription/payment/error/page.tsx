'use client';

import { XCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function SubscriptionPaymentErrorPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-10 text-center max-w-sm w-full">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <XCircle size={32} className="text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Paiement échoué</h1>
        <p className="text-gray-500 text-sm mb-6">
          Le paiement n'a pas abouti. Vérifiez votre solde ou réessayez avec un autre moyen de paiement.
        </p>
        <Link
          href="/dashboard/subscription"
          className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-6 py-3 rounded-xl transition"
        >
          <RefreshCw size={15} /> Réessayer
        </Link>
        <p className="text-xs text-gray-400 mt-4">
          Besoin d'aide ? <a href="mailto:support@transpro.ci" className="text-brand-600 hover:underline">support@transpro.ci</a>
        </p>
      </div>
    </div>
  );
}
