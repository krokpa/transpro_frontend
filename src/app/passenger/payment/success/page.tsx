'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsApi, paymentsApi } from '@/lib/api';
import { formatCFA } from '@transpro/shared';
import { CheckCircle, ArrowRight, Loader2, XCircle, AlertTriangle } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
dayjs.locale('fr');

function SuccessContent() {
  const params    = useSearchParams();
  const router    = useRouter();
  const qc        = useQueryClient();
  const bookingId = params.get('bookingId');
  const urlStatus = params.get('status'); // 'completed' | 'failed' | ... depuis Genius Pay

  // Appel Genius Pay immédiat pour synchroniser le statut en DB
  const confirmMut = useMutation({
    mutationFn: () => paymentsApi.checkStatusByBooking(bookingId!) as any,
    onSuccess: (data: any) => {
      if (data?.updated) {
        qc.invalidateQueries({ queryKey: ['booking-success', bookingId] });
        qc.invalidateQueries({ queryKey: ['my-bookings'] });
        qc.invalidateQueries({ queryKey: ['my-payments'] });
        qc.invalidateQueries({ queryKey: ['booking', bookingId] });
      }
    },
  });

  useEffect(() => {
    if (bookingId) confirmMut.mutate();
  }, [bookingId]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking-success', bookingId],
    queryFn: () => bookingsApi.getMine(bookingId!) as any,
    enabled: !!bookingId && !confirmMut.isPending,
    retry: 2,
  });

  if (!bookingId) {
    router.replace('/passenger');
    return null;
  }

  const isPaid   = booking?.status === 'CONFIRMED' || booking?.status === 'COMPLETED';
  const isFailed = booking?.status === 'CANCELLED' && urlStatus !== 'completed';
  const isChecking = confirmMut.isPending || isLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">

        {/* ── En cours de confirmation ── */}
        {isChecking && (
          <>
            <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <Loader2 size={36} className="animate-spin text-brand-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Confirmation en cours…</h1>
            <p className="text-gray-500 text-sm">Nous vérifions votre paiement auprès de Genius Pay.</p>
          </>
        )}

        {/* ── Paiement confirmé ── */}
        {!isChecking && isPaid && (
          <>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={40} className="text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Paiement réussi !</h1>
            <p className="text-gray-500 text-sm mb-6">Votre billet est confirmé et prêt.</p>

            <div className="bg-gray-50 rounded-xl p-4 text-left mb-6 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Trajet</span>
                <span className="text-sm font-semibold text-gray-900">
                  {booking.trip?.route?.originCity?.name} → {booking.trip?.route?.destinationCity?.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Date</span>
                <span className="text-sm font-semibold text-gray-900">
                  {dayjs(booking.trip?.departureAt).format('ddd D MMM · HH:mm')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Sièges</span>
                <span className="text-sm font-semibold text-gray-900">{booking.seatNumbers?.join(', ')}</span>
              </div>
              <div className="flex items-center justify-between border-t border-gray-200 pt-2.5 mt-1">
                <span className="text-sm text-gray-500">Total payé</span>
                <span className="text-base font-bold text-green-600">{formatCFA(booking.totalAmount)}</span>
              </div>
            </div>

            <button
              onClick={() => router.push(`/passenger/bookings/${bookingId}`)}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition shadow-sm shadow-brand-500/20"
            >
              Voir mon billet <ArrowRight size={16} />
            </button>
            <button
              onClick={() => router.push('/passenger')}
              className="w-full mt-2 text-gray-400 text-sm py-2 hover:text-gray-600 transition"
            >
              Retour à l'accueil
            </button>
          </>
        )}

        {/* ── Paiement échoué / annulé ── */}
        {!isChecking && isFailed && (
          <>
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <XCircle size={40} className="text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Paiement échoué</h1>
            <p className="text-gray-500 text-sm mb-6">La transaction n'a pas abouti. Aucun montant n'a été débité.</p>
            <button
              onClick={() => router.push('/passenger/bookings')}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white py-3 rounded-xl font-semibold transition"
            >
              Réessayer une réservation
            </button>
          </>
        )}

        {/* ── Statut indéterminé après vérification ── */}
        {!isChecking && !isPaid && !isFailed && (
          <>
            <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <AlertTriangle size={36} className="text-yellow-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">En attente de confirmation</h1>
            <p className="text-gray-500 text-sm mb-6">
              Genius Pay a reçu votre paiement mais la confirmation n'est pas encore arrivée.
              Vérifiez l'état dans vos transactions.
            </p>
            <button
              onClick={() => router.push(`/passenger/bookings/${bookingId}`)}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white py-3 rounded-xl font-semibold transition mb-2"
            >
              Voir ma réservation
            </button>
            <button
              onClick={() => router.push('/passenger/transactions')}
              className="w-full text-gray-500 text-sm py-2 hover:text-gray-700 transition"
            >
              Voir mes transactions
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-brand-500" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
