'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsApi, paymentsApi } from '@/lib/api';
import { formatCFA } from '@transpro/shared';
import {
  ArrowLeft, ArrowRight, Clock, Loader2,
  XCircle, CheckCircle, QrCode, AlertTriangle, CreditCard,
  MapPin, Users, Calendar, Bus,
} from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { toast } from 'sonner';
import { useState } from 'react';

dayjs.locale('fr');

const STATUS_STYLE: Record<string, { label: string; icon: any; cls: string; dot: string }> = {
  PENDING:   { label: 'En attente de paiement', icon: Clock,       cls: 'bg-yellow-50 border-yellow-200 text-yellow-700', dot: 'bg-yellow-400' },
  CONFIRMED: { label: 'Confirmée',              icon: CheckCircle, cls: 'bg-green-50 border-green-200 text-green-700',   dot: 'bg-green-500' },
  CANCELLED: { label: 'Annulée',                icon: XCircle,     cls: 'bg-red-50 border-red-200 text-red-600',         dot: 'bg-red-400' },
  COMPLETED: { label: 'Terminée',               icon: CheckCircle, cls: 'bg-gray-50 border-gray-200 text-gray-600',      dot: 'bg-gray-400' },
};

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [paying, setPaying] = useState(false);

  async function handlePay() {
    setPaying(true);
    try {
      const res = await paymentsApi.initiate(id) as any;
      window.location.href = res.checkoutUrl;
    } catch (err: any) {
      const raw = err?.response?.data;
      const msg = raw?.error ?? raw?.message ?? err?.message ?? 'Erreur';
      toast.error(Array.isArray(msg) ? msg.join(' | ') : msg);
      setPaying(false);
    }
  }

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingsApi.getMine(id) as any,
    enabled: !!id,
  });

  const cancelMut = useMutation({
    mutationFn: () => bookingsApi.cancel(id) as any,
    onSuccess: () => {
      toast.success('Réservation annulée');
      qc.invalidateQueries({ queryKey: ['booking', id] });
      qc.invalidateQueries({ queryKey: ['my-bookings'] });
      setConfirmCancel(false);
    },
    onError: (err: any) => {
      const raw = err?.response?.data;
      const msg = raw?.error ?? raw?.message ?? err?.message ?? 'Erreur';
      toast.error(Array.isArray(msg) ? msg.join(' | ') : msg);
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-brand-500" /></div>;
  }

  if (!booking) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Réservation introuvable</p>
        <button onClick={() => router.back()} className="mt-4 text-brand-600 text-sm font-medium">Retour</button>
      </div>
    );
  }

  const s = STATUS_STYLE[booking.status] ?? STATUS_STYLE.PENDING;
  const StatusIcon = s.icon;
  const canCancel = ['PENDING', 'CONFIRMED'].includes(booking.status) && dayjs(booking.trip?.departureAt).isAfter(dayjs());
  const tickets: any[] = Array.isArray(booking.tickets) ? booking.tickets : [];

  return (
    <div className="space-y-5">
      {/* Back */}
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition">
        <ArrowLeft size={15} /> Retour aux réservations
      </button>

      {/* Status banner */}
      <div className={`flex items-center gap-3 p-4 rounded-xl border ${s.cls}`}>
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.dot}`} />
        <StatusIcon size={17} className="shrink-0" />
        <span className="font-semibold text-sm">{s.label}</span>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Left — trip info (wider) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Route card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Détails du voyage</p>

            {/* Departure / arrival times */}
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900 leading-none">{dayjs(booking.trip?.departureAt).format('HH:mm')}</p>
                <p className="text-sm font-medium text-gray-700 mt-1">{booking.trip?.route?.originCity?.name}</p>
              </div>
              <div className="flex-1 flex flex-col items-center gap-1.5 px-2">
                <div className="flex items-center gap-1 w-full">
                  <div className="w-2.5 h-2.5 rounded-full border-2 border-brand-400 shrink-0" />
                  <div className="flex-1 border-t-2 border-dashed border-gray-200" />
                  <ArrowRight size={14} className="text-gray-300 shrink-0" />
                  <div className="w-2.5 h-2.5 rounded-full bg-brand-400 shrink-0" />
                </div>
                <p className="text-xs text-gray-400">
                  {booking.trip?.route?.durationMinutes
                    ? `${Math.floor(booking.trip.route.durationMinutes / 60)}h${String(booking.trip.route.durationMinutes % 60).padStart(2, '0')}`
                    : '—'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900 leading-none">{dayjs(booking.trip?.estimatedArrivalAt).format('HH:mm')}</p>
                <p className="text-sm font-medium text-gray-700 mt-1">{booking.trip?.route?.destinationCity?.name}</p>
              </div>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-4 mt-6 pt-5 border-t border-gray-100">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
                  <Calendar size={14} className="text-gray-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Date</p>
                  <p className="font-semibold text-gray-800 text-sm mt-0.5 capitalize">
                    {dayjs(booking.trip?.departureAt).format('dddd D MMMM YYYY')}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
                  <Users size={14} className="text-gray-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Sièges réservés</p>
                  <p className="font-semibold text-gray-800 text-sm mt-0.5">{booking.seatNumbers?.join(', ')}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
                  <Bus size={14} className="text-gray-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Véhicule</p>
                  <p className="font-semibold text-gray-800 text-sm mt-0.5">
                    {booking.trip?.vehicle?.brand} {booking.trip?.vehicle?.model}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
                  <MapPin size={14} className="text-gray-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Classe</p>
                  <p className="font-semibold text-gray-800 text-sm mt-0.5">{booking.trip?.tripClass}</p>
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
              <p className="text-gray-500 text-sm">Montant total</p>
              <p className="text-2xl font-bold text-brand-600">{formatCFA(booking.totalAmount)}</p>
            </div>
          </div>

          {/* Tickets / QR codes */}
          {tickets.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-bold text-gray-900">Vos tickets ({tickets.length})</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-semibold text-gray-800">Siège {ticket.seatNumber}</p>
                        <p className="text-xs text-gray-400 mt-0.5">#{ticket.ticketNumber}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        ticket.status === 'VALID' ? 'bg-green-100 text-green-700' :
                        ticket.status === 'USED'  ? 'bg-gray-100 text-gray-500' :
                        'bg-red-100 text-red-600'
                      }`}>
                        {ticket.status === 'VALID' ? 'Valide' : ticket.status === 'USED' ? 'Utilisé' : 'Annulé'}
                      </span>
                    </div>
                    {ticket.qrCode ? (
                      <div className="flex justify-center">
                        <img src={ticket.qrCode} alt={`QR Siège ${ticket.seatNumber}`} className="w-40 h-40 rounded-lg border border-gray-100" />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 text-gray-300 gap-2">
                        <QrCode size={36} />
                        <p className="text-xs">QR disponible après confirmation</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column — actions */}
        <div className="lg:col-span-2 space-y-4">
          {/* Payment notice */}
          {booking.status === 'PENDING' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="text-yellow-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-yellow-800 text-sm">Paiement en attente</p>
                  <p className="text-xs text-yellow-700 mt-0.5 leading-relaxed">
                    Payez en ligne maintenant ou présentez-vous directement à la gare.
                  </p>
                </div>
              </div>
              <button
                onClick={handlePay}
                disabled={paying}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition disabled:opacity-60 shadow-sm shadow-brand-500/20"
              >
                {paying
                  ? <><Loader2 size={15} className="animate-spin" /> Redirection...</>
                  : <><CreditCard size={15} /> Payer en ligne</>}
              </button>
              <p className="text-center text-xs text-yellow-600">Wave · MTN Money · Orange Money</p>
            </div>
          )}

          {/* Cancel action */}
          {canCancel && !confirmCancel && (
            <button
              onClick={() => setConfirmCancel(true)}
              className="w-full border border-red-200 text-red-500 hover:bg-red-50 py-3 rounded-xl text-sm font-semibold transition"
            >
              Annuler la réservation
            </button>
          )}

          {confirmCancel && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-4">
              <div>
                <p className="text-sm font-semibold text-red-700">Confirmer l'annulation ?</p>
                <p className="text-xs text-red-600 mt-1">Cette action est irréversible. Votre réservation sera définitivement annulée.</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => cancelMut.mutate()}
                  disabled={cancelMut.isPending}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {cancelMut.isPending ? <><Loader2 size={14} className="animate-spin" /> Annulation...</> : 'Oui, annuler'}
                </button>
                <button
                  onClick={() => setConfirmCancel(false)}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 transition"
                >
                  Conserver
                </button>
              </div>
            </div>
          )}

          {/* Booking reference */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Référence</p>
            <p className="text-xs text-gray-400 font-mono break-all">{id}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
