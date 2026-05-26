'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { XCircle, ArrowLeft, RotateCcw, Loader2 } from 'lucide-react';

function ErrorContent() {
  const params = useSearchParams();
  const router = useRouter();
  const bookingId = params.get('bookingId');

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <XCircle size={40} className="text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Paiement échoué</h1>
        <p className="text-gray-500 text-sm mb-8">
          Votre paiement n'a pas abouti. Aucun montant n'a été débité.
        </p>

        <div className="space-y-3">
          {bookingId && (
            <button
              onClick={() => router.push(`/passenger/bookings/${bookingId}`)}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition"
            >
              <RotateCcw size={16} /> Réessayer le paiement
            </button>
          )}
          <button
            onClick={() => router.push('/passenger/bookings')}
            className="w-full border border-gray-200 text-gray-700 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 transition"
          >
            <ArrowLeft size={16} /> Mes réservations
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-6">
          Si le problème persiste, contactez le support ou présentez-vous à la gare.
        </p>
      </div>
    </div>
  );
}

export default function PaymentErrorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 size={28} className="animate-spin text-brand-500" /></div>}>
      <ErrorContent />
    </Suspense>
  );
}
