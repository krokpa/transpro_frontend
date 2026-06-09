'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsApi, paymentsApi } from '@/lib/api';
import { formatCFA } from '@transpro/shared';
import {
  ArrowLeft, ArrowRight, Clock, Loader2,
  XCircle, CheckCircle, QrCode, AlertTriangle, CreditCard,
  MapPin, Users, Calendar, Bus, Building2, Navigation2,
  Star, Share2, Check, Download, Maximize2, X, Ticket,
} from 'lucide-react';
import Link from 'next/link';
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
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedRating, setSelectedRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [copied, setCopied] = useState(false);
  const [fullscreenTicket, setFullscreenTicket] = useState<any>(null);

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

  const rateMut = useMutation({
    mutationFn: (data: { rating: number; comment?: string }) =>
      bookingsApi.rate(id, data) as any,
    onSuccess: () => {
      toast.success('Merci pour votre avis !');
      qc.invalidateQueries({ queryKey: ['booking', id] });
      qc.invalidateQueries({ queryKey: ['my-bookings'] });
    },
    onError: () => toast.error('Erreur lors de l\'envoi de la note'),
  });

  async function handleShare() {
    const origin = booking.trip?.route?.originCity?.name ?? '';
    const dest   = booking.trip?.route?.destinationCity?.name ?? '';
    const depAt  = booking.trip?.departureAt ? dayjs(booking.trip.departureAt).format('dddd D MMM à HH:mm') : '';
    const text   = `Je voyage avec TransPro CI — ${origin} → ${dest}, ${depAt}. Réservez sur transpro.ci 🚌`;
    if (navigator.share) {
      await navigator.share({ title: 'Mon voyage TransPro', text }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

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

  const tenant = booking.trip?.tenant;

  const s = STATUS_STYLE[booking.status] ?? STATUS_STYLE.PENDING;
  const StatusIcon = s.icon;
  const canCancel = ['PENDING', 'CONFIRMED'].includes(booking.status) && dayjs(booking.trip?.departureAt).isAfter(dayjs());
  const tickets: any[] = Array.isArray(booking.tickets) ? booking.tickets : [];

  function downloadQR(ticket: any) {
    const a = document.createElement('a');
    a.href = ticket.qrCode;
    a.download = `ticket-${ticket.seatNumber}-${booking.reference ?? id}.png`;
    a.click();
  }

  return (
    <div className="space-y-5">
      {/* Fullscreen QR overlay */}
      {fullscreenTicket && (
        <div
          className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center gap-6 p-6"
          onClick={() => setFullscreenTicket(null)}
        >
          <button
            onClick={() => setFullscreenTicket(null)}
            className="absolute top-5 right-5 text-white/70 hover:text-white bg-white/10 rounded-full p-2"
          >
            <X size={22} />
          </button>
          <p className="text-white/60 text-xs uppercase tracking-widest font-semibold">Siège {fullscreenTicket.seatNumber}</p>
          <div className="bg-white rounded-3xl p-5 shadow-2xl">
            <img
              src={fullscreenTicket.qrCode}
              alt={`QR Siège ${fullscreenTicket.seatNumber}`}
              className="w-72 h-72 sm:w-80 sm:h-80"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <p className="text-white/50 text-sm text-center max-w-xs">
            Présentez ce code à l'agent lors de l'embarquement
          </p>
          <button
            onClick={(e) => { e.stopPropagation(); downloadQR(fullscreenTicket); }}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-5 py-2.5 rounded-full transition"
          >
            <Download size={15} /> Télécharger
          </button>
        </div>
      )}

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
            {/* Company header */}
            {tenant && (
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
                {tenant.logo ? (
                  <img src={tenant.logo} alt={tenant.name}
                    className="w-10 h-10 rounded-xl object-cover shrink-0 border border-gray-100"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                    <Building2 size={18} className="text-brand-400" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{tenant.name}</p>
                  <p className="text-xs text-gray-400">{booking.trip?.route?.name}</p>
                </div>
              </div>
            )}
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
              {booking.trip?.departureStation && (
                <div className="col-span-2 flex items-start gap-3">
                  <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin size={14} className="text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400">Gare de départ</p>
                    <p className="font-semibold text-gray-800 text-sm mt-0.5">{booking.trip.departureStation.name}</p>
                    {booking.trip.departureStation.address && (
                      <p className="text-xs text-gray-400 mt-0.5">{booking.trip.departureStation.address}</p>
                    )}
                  </div>
                  {booking.trip.departureStation.latitude != null && booking.trip.departureStation.longitude != null && (
                    <Link
                      href={`/passenger/navigate?name=${encodeURIComponent(booking.trip.departureStation.name)}&lat=${booking.trip.departureStation.latitude}&lng=${booking.trip.departureStation.longitude}`}
                      className="shrink-0 flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
                    >
                      <Navigation2 size={12} /> Naviguer
                    </Link>
                  )}
                </div>
              )}
              {booking.trip?.arrivalStation && (
                <div className="col-span-2 flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin size={14} className="text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400">Gare d'arrivée</p>
                    <p className="font-semibold text-gray-800 text-sm mt-0.5">{booking.trip.arrivalStation.name}</p>
                    {booking.trip.arrivalStation.address && (
                      <p className="text-xs text-gray-400 mt-0.5">{booking.trip.arrivalStation.address}</p>
                    )}
                  </div>
                  {booking.trip.arrivalStation.latitude != null && booking.trip.arrivalStation.longitude != null && (
                    <Link
                      href={`/passenger/navigate?name=${encodeURIComponent(booking.trip.arrivalStation.name)}&lat=${booking.trip.arrivalStation.latitude}&lng=${booking.trip.arrivalStation.longitude}`}
                      className="shrink-0 flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
                    >
                      <Navigation2 size={12} /> Naviguer
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Total */}
            <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
              <p className="text-gray-500 text-sm">Montant total</p>
              <p className="text-2xl font-bold text-brand-600">{formatCFA(booking.totalAmount)}</p>
            </div>
          </div>

          {/* Tickets / QR codes */}
          {tickets.length > 0 ? (
            <div className="space-y-3">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Ticket size={16} className="text-brand-500" />
                Ticket{tickets.length > 1 ? 's' : ''} ({tickets.length})
              </h2>
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-brand-600 to-brand-500 px-5 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {tenant?.logo ? (
                          <img src={tenant.logo} alt={tenant.name}
                            className="w-9 h-9 rounded-lg object-cover border border-white/20 shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                            <Bus size={18} className="text-white" />
                          </div>
                        )}
                        <div>
                          <p className="text-white font-semibold text-sm">{tenant?.name ?? 'TransPro CI'}</p>
                          <p className="text-white/70 text-xs mt-0.5">
                            {booking.trip?.route?.originCity?.name} → {booking.trip?.route?.destinationCity?.name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white/60 text-[10px] uppercase tracking-wide">Siège</p>
                        <p className="text-white font-bold text-2xl leading-none">{ticket.seatNumber}</p>
                      </div>
                    </div>

                    {/* QR code — main zone */}
                    <div className="p-5">
                      {ticket.qrCode ? (
                        <>
                          {/* Large QR */}
                          <button
                            onClick={() => setFullscreenTicket(ticket)}
                            className="group relative w-full flex justify-center"
                            title="Agrandir pour scanner"
                          >
                            <div className="relative inline-block">
                              <img
                                src={ticket.qrCode}
                                alt={`QR Siège ${ticket.seatNumber}`}
                                className="w-56 h-56 sm:w-64 sm:h-64 rounded-2xl border border-gray-100"
                              />
                              {/* Expand hint overlay */}
                              <div className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/10 transition flex items-center justify-center">
                                <div className="opacity-0 group-hover:opacity-100 transition bg-black/60 text-white rounded-xl px-3 py-1.5 text-xs font-medium flex items-center gap-1.5">
                                  <Maximize2 size={12} /> Agrandir
                                </div>
                              </div>
                            </div>
                          </button>

                          {/* Meta row */}
                          <div className="flex items-center justify-between mt-4">
                            <div className="space-y-0.5">
                              <p className="text-xs text-gray-500">
                                {dayjs(booking.trip?.departureAt).format('ddd D MMM · HH:mm')}
                              </p>
                              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                                ticket.isScanned
                                  ? 'bg-gray-100 text-gray-500'
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {ticket.isScanned ? '✓ Utilisé' : '● Valide'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => downloadQR(ticket)}
                                title="Télécharger le QR code"
                                className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition"
                              >
                                <Download size={16} />
                              </button>
                              <button
                                onClick={() => setFullscreenTicket(ticket)}
                                title="Afficher en plein écran"
                                className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition"
                              >
                                <Maximize2 size={16} />
                              </button>
                            </div>
                          </div>

                          <p className="text-center text-xs text-gray-400 mt-3 flex items-center justify-center gap-1.5">
                            <QrCode size={11} />
                            Appuyez pour agrandir · Présentez à l'agent lors de l'embarquement
                          </p>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-10 gap-3">
                          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center">
                            <QrCode size={28} className="text-gray-300" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-500">QR code non disponible</p>
                            <p className="text-xs text-gray-400 mt-0.5">Le QR sera généré après confirmation du paiement</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : booking.status === 'CONFIRMED' ? (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex items-center gap-3">
              <Loader2 size={18} className="animate-spin text-blue-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-800">Tickets en cours de génération</p>
                <p className="text-xs text-blue-600 mt-0.5">Actualisez la page dans quelques secondes</p>
              </div>
            </div>
          ) : null}
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

          {/* Share */}
          <button
            onClick={handleShare}
            className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-700 hover:bg-gray-50 py-3 rounded-xl text-sm font-semibold transition"
          >
            {copied
              ? <><Check size={15} className="text-green-500" /> Lien copié !</>
              : <><Share2 size={15} /> Partager ce voyage</>}
          </button>

          {/* Rating — COMPLETED bookings only */}
          {booking.status === 'COMPLETED' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {booking.rating ? 'Votre avis' : 'Noter ce voyage'}
              </p>

              {/* Already rated — show saved rating */}
              {booking.rating ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={22}
                        className={star <= booking.rating.rating
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-gray-200 fill-gray-200'}
                      />
                    ))}
                    <span className="text-sm text-gray-400 ml-1.5">{booking.rating.rating}/5</span>
                  </div>
                  {booking.rating.comment && (
                    <p className="text-sm text-gray-600 italic leading-relaxed">"{booking.rating.comment}"</p>
                  )}
                </div>
              ) : (
                /* Not yet rated — interactive widget */
                <>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setSelectedRating(star)}
                        className="transition-transform active:scale-110"
                      >
                        <Star
                          size={30}
                          className={star <= (hoverRating || selectedRating)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-gray-200 fill-gray-200 hover:text-amber-200 hover:fill-amber-200'}
                        />
                      </button>
                    ))}
                  </div>

                  {selectedRating > 0 && (
                    <>
                      <textarea
                        value={ratingComment}
                        onChange={(e) => setRatingComment(e.target.value)}
                        placeholder="Commentaire optionnel (max 500 caractères)"
                        rows={3}
                        maxLength={500}
                        className="w-full text-sm border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-brand-300 placeholder:text-gray-300"
                      />
                      <button
                        onClick={() => rateMut.mutate({ rating: selectedRating, comment: ratingComment || undefined })}
                        disabled={rateMut.isPending}
                        className="w-full bg-amber-400 hover:bg-amber-500 text-white py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2"
                      >
                        {rateMut.isPending
                          ? <><Loader2 size={14} className="animate-spin" /> Envoi...</>
                          : 'Envoyer mon avis'}
                      </button>
                    </>
                  )}
                </>
              )}
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
