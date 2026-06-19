'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsApi, luggageApi, ticketTemplatesApi } from '@/lib/api';
import { formatCFA } from '@transpro/shared';
import {
  ArrowLeft, Luggage, Plus, Loader2, Ticket, Scale,
  Package, QrCode, AlertTriangle, Printer, RefreshCw,
  MapPin, Calendar, CreditCard, User, CheckCircle2, Clock,
  Ban, Flag, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';
import { confirm } from '@/lib/confirm';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

dayjs.locale('fr');

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; dot: string; badge: string; icon: any }> = {
  PENDING:   { label: 'En attente',  dot: 'bg-yellow-400', badge: 'bg-yellow-50 text-yellow-700 ring-yellow-200', icon: Clock },
  CONFIRMED: { label: 'Confirmé',    dot: 'bg-green-400',  badge: 'bg-green-50 text-green-700 ring-green-200',   icon: CheckCircle2 },
  CANCELLED: { label: 'Annulé',      dot: 'bg-red-400',    badge: 'bg-red-50 text-red-600 ring-red-200',         icon: Ban },
  COMPLETED: { label: 'Terminé',     dot: 'bg-blue-400',   badge: 'bg-blue-50 text-blue-700 ring-blue-200',      icon: CheckCircle2 },
  NO_SHOW:   { label: 'Absent',      dot: 'bg-orange-400', badge: 'bg-orange-50 text-orange-700 ring-orange-200', icon: Flag },
};

const TRANSITIONS: Record<string, { status: string; label: string; className: string }[]> = {
  PENDING: [
    { status: 'CONFIRMED', label: 'Confirmer la réservation', className: 'bg-green-500 hover:bg-green-600 text-white' },
    { status: 'CANCELLED', label: 'Annuler',                  className: 'bg-red-500 hover:bg-red-600 text-white' },
  ],
  CONFIRMED: [
    { status: 'COMPLETED', label: 'Marquer terminé', className: 'bg-blue-500 hover:bg-blue-600 text-white' },
    { status: 'NO_SHOW',   label: 'Passager absent', className: 'bg-orange-500 hover:bg-orange-600 text-white' },
    { status: 'CANCELLED', label: 'Annuler',         className: 'bg-red-500 hover:bg-red-600 text-white' },
  ],
  COMPLETED: [], NO_SHOW: [], CANCELLED: [],
};

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Espèces', ORANGE_MONEY: 'Orange Money', MTN_MOMO: 'MTN MoMo',
  WAVE: 'Wave', CARD: 'Carte bancaire', GENIUS_PAY: 'GeniusPay',
};

const BAG_CFG: Record<string, { label: string; color: string; bg: string }> = {
  DECLARED:  { label: 'Déclaré',   color: '#6B7280', bg: '#F3F4F6' },
  LOADED:    { label: 'En soute',  color: '#3B82F6', bg: '#EFF6FF' },
  ARRIVED:   { label: 'Arrivé',    color: '#F59E0B', bg: '#FFFBEB' },
  CLAIMED:   { label: 'Récupéré', color: '#16A34A', bg: '#F0FDF4' },
  MISSING:   { label: 'Manquant', color: '#EF4444', bg: '#FEF2F2' },
};

// ── Print ─────────────────────────────────────────────────────────────────────

const PAPER_SIZES: Record<string, { width: number; height: number; css: string }> = {
  THERMAL_80: { width: 302, height: 529, css: '@page { size: 80mm 140mm; margin: 0; }' },
  THERMAL_58: { width: 219, height: 529, css: '@page { size: 58mm 140mm; margin: 0; }' },
  A4:         { width: 595, height: 842, css: '@page { size: A4 portrait; margin: 10mm; }' },
};

const VARIABLES: Record<string, (b: any, t: any) => string> = {
  '{{passenger_name}}':  (b) => `${b.passenger?.firstName ?? ''} ${b.passenger?.lastName ?? ''}`.trim(),
  '{{passenger_phone}}': (b) => b.passenger?.phone ?? '',
  '{{origin}}':          (b) => b.trip?.route?.originCity?.name ?? '',
  '{{destination}}':     (b) => b.trip?.route?.destinationCity?.name ?? '',
  '{{departure_date}}':  (b) => dayjs(b.trip?.departureAt).format('DD/MM/YYYY'),
  '{{departure_time}}':  (b) => dayjs(b.trip?.departureAt).format('HH:mm'),
  '{{seat_number}}':     (_b, t) => t?.seatNumber ?? '',
  '{{trip_class}}':      (b) => b.trip?.tripClass ?? '',
  '{{price}}':           (b) => formatCFA(Math.round((b.totalAmount ?? 0) / Math.max(1, b.seatNumbers?.length ?? 1))) as string,
  '{{booking_ref}}':     (b) => b.reference ?? '',
  '{{company_name}}':    (b) => b.trip?.tenant?.name ?? '',
};

function substituteVars(text: string, b: any, t: any) {
  return Object.entries(VARIABLES).reduce((acc, [k, fn]) => acc.replaceAll(k, fn(b, t)), text);
}

function renderEl(el: any, b: any, t: any): string {
  const s = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;box-sizing:border-box;`;
  if (el.type === 'text')  return `<div style="${s}font-size:${el.fontSize ?? 14}px;font-weight:${el.fontWeight ?? 'normal'};font-style:${el.fontStyle ?? 'normal'};text-align:${el.textAlign ?? 'left'};color:${el.color ?? '#000'};line-height:1.3;overflow:hidden;white-space:pre-wrap;word-break:break-word;">${substituteVars(el.content ?? '', b, t)}</div>`;
  if (el.type === 'qrcode') return `<div style="${s}background:#fff;display:flex;align-items:center;justify-content:center;border:1px solid #e5e7eb;"><img src="${t?.qrCode ?? ''}" style="width:90%;height:90%;object-fit:contain;"/></div>`;
  if (el.type === 'image')  { const logo = b.trip?.tenant?.logo ?? ''; return logo ? `<img src="${logo}" style="${s}object-fit:contain;"/>` : `<div style="${s}background:#f9fafb;border:1px dashed #d1d5db;"></div>`; }
  if (el.type === 'rect')   return `<div style="${s}background:${el.bgColor ?? 'transparent'};border:${el.borderWidth ?? 1}px solid ${el.borderColor ?? '#d1d5db'};border-radius:${el.borderRadius ?? 0}px;"></div>`;
  if (el.type === 'line')   return `<div style="${s}background:${el.bgColor ?? '#d1d5db'};"></div>`;
  return '';
}

function openPrintWindow(booking: any, template: any) {
  const dims   = PAPER_SIZES[template.paperSize ?? 'THERMAL_80'];
  const layout: any[] = Array.isArray(template.layout) ? template.layout : [];
  const tickets = booking.tickets?.length > 0 ? booking.tickets : (booking.seatNumbers ?? []).map((s: string) => ({ seatNumber: s, qrCode: '' }));
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Tickets — ${booking.reference}</title><style>${dims.css}*{margin:0;padding:0;box-sizing:border-box;}body{background:#f0f0f0;display:flex;flex-direction:column;align-items:center;padding:20px;gap:16px;font-family:Arial,sans-serif;}@media print{body{background:white;padding:0;gap:0;}.no-print{display:none!important;}}.ticket-wrapper{box-shadow:0 2px 12px rgba(0,0,0,.15);}</style></head><body><div class="no-print" style="position:fixed;top:16px;right:16px;z-index:9999;"><button onclick="window.print()" style="background:#6366f1;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-size:14px;cursor:pointer;font-weight:600;">🖨️ Imprimer</button></div>${tickets.map((t: any) => `<div class="ticket-wrapper" style="position:relative;width:${dims.width}px;height:${dims.height}px;background:#fff;page-break-after:always;">${layout.map((el: any) => renderEl(el, booking, t)).join('')}</div>`).join('')}</body></html>`;
  const win = window.open('', '_blank', `width=${dims.width + 80},height=${dims.height + 120}`);
  if (win) { win.document.write(html); win.document.close(); }
  else toast.error('Popup bloqué — autorisez les popups pour imprimer');
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BookingDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();
  const qc      = useQueryClient();
  const { user } = useAuthStore();
  const canManage = user?.role === 'COMPANY_OWNER' || user?.role === 'COMPANY_ADMIN';

  const [showLuggageForm, setShowLuggageForm] = useState(false);
  const [isPrinting, setIsPrinting]           = useState(false);
  const [luggageForm, setLuggageForm] = useState({
    bagCount: 1,
    totalWeightKg: '',
    freeWeightKg: 20,
    excessPaid: false,
    excessPaymentMethod: 'CASH',
    bagLabels: [''],
    bagWeights: [''],
  });

  const { data: booking, isLoading: bLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingsApi.get(id) as any,
  });

  const { data: defaultTemplate } = useQuery({
    queryKey: ['ticket-template-default'],
    queryFn: () => ticketTemplatesApi.getDefault() as any,
  });

  const { data: luggage } = useQuery({
    queryKey: ['luggage-booking', id],
    queryFn: () => luggageApi.getByBooking(id).catch(() => null) as any,
    enabled: !!id,
  });

  const declareMut = useMutation({
    mutationFn: (data: any) => luggageApi.declare(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['luggage-booking', id] });
      qc.invalidateQueries({ queryKey: ['luggage'] });
      toast.success('Bagages déclarés');
      setShowLuggageForm(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });

  const missingMut = useMutation({
    mutationFn: ({ bagId }: { bagId: string }) => luggageApi.reportMissing(bagId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['luggage-booking', id] }); toast.success('Signalé manquant'); },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });

  const scanMut = useMutation({
    mutationFn: (qrCode: string) => luggageApi.scanBag(qrCode),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['luggage-booking', id] }); toast.success('Sac scanné'); },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });

  const statusMut = useMutation({
    mutationFn: (status: string) => bookingsApi.updateStatus(id, status) as any,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['booking', id] });
      qc.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('Statut mis à jour');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });

  const genTicketsMut = useMutation({
    mutationFn: () => bookingsApi.generateTickets(id) as any,
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['booking', id] });
      toast.success(`${res?.generated ?? 0} ticket(s) généré(s)`);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });

  if (bLoading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 size={28} className="animate-spin text-gray-400" />
    </div>
  );

  const b   = booking as any;
  const lug = luggage as any;

  if (!b) return (
    <div className="text-center py-16 text-gray-400">Réservation introuvable</div>
  );

  const FREE_KG  = 20;
  const RATE_XOF = 300;
  const totalWt  = parseFloat(luggageForm.totalWeightKg) || 0;
  const excessKg = Math.max(0, totalWt - luggageForm.freeWeightKg);
  const excessFee = Math.round(excessKg * RATE_XOF);

  const statusCfg = STATUS_CFG[b.status] ?? STATUS_CFG.PENDING;
  const StatusIcon = statusCfg.icon;
  const transitions = TRANSITIONS[b.status] ?? [];

  const origin      = b.trip?.route?.originCity?.name      ?? '—';
  const destination = b.trip?.route?.destinationCity?.name ?? '—';
  const pricePerSeat = b.seatNumbers?.length > 1
    ? formatCFA(Math.round((b.totalAmount ?? 0) / b.seatNumbers.length))
    : null;

  async function handlePrint() {
    if (!defaultTemplate) {
      toast.error('Aucun modèle de ticket par défaut configuré');
      return;
    }
    setIsPrinting(true);
    try {
      openPrintWindow(b, defaultTemplate);
    } finally {
      setIsPrinting(false);
    }
  }

  function submitLuggage() {
    declareMut.mutate({
      bookingId: id,
      bagCount:        luggageForm.bagCount,
      totalWeightKg:   totalWt || undefined,
      freeWeightKg:    luggageForm.freeWeightKg,
      excessPaid:      luggageForm.excessPaid,
      excessPaymentMethod: luggageForm.excessPaid ? luggageForm.excessPaymentMethod : undefined,
      bagLabels:  luggageForm.bagLabels.slice(0, luggageForm.bagCount).filter(Boolean),
      bagWeights: luggageForm.bagWeights.slice(0, luggageForm.bagCount).map(Number).filter(Boolean),
    });
  }

  function printLabel(bag: any) {
    const w = window.open('', '_blank', 'width=300,height=300');
    if (!w) return;
    w.document.write(`<html><body style="font-family:monospace;text-align:center;padding:16px"><h3 style="margin:0">🧳 TransPro CI</h3><p style="font-size:22px;font-weight:bold;margin:12px 0">${bag.qrCode}</p><p>${bag.label || 'Sac'}${bag.weightKg ? ` · ${bag.weightKg} kg` : ''}</p><p style="font-size:11px">Réf: ${b?.reference}</p><p style="font-size:11px">${b?.passenger?.firstName} ${b?.passenger?.lastName}</p><script>window.print();window.close();</script></body></html>`);
  }

  return (
    <div className="space-y-5">

      {/* Back */}
      <button
        onClick={() => router.push('/dashboard/bookings')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition"
      >
        <ArrowLeft size={15} /> Retour aux réservations
      </button>

      {/* ── Header card — full width ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Top band */}
        <div className="bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-5 text-white flex items-start justify-between">
          <div>
            <p className="text-brand-100 text-xs font-medium tracking-wide uppercase mb-1">Réservation</p>
            <h1 className="text-2xl font-bold font-mono tracking-wider">{b.reference}</h1>
            <p className="text-brand-200 text-sm mt-1">
              Créée le {dayjs(b.createdAt).format('DD MMMM YYYY')} à {dayjs(b.createdAt).format('HH:mm')}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ring-1 ${statusCfg.badge}`}>
              <StatusIcon size={12} />
              {statusCfg.label}
            </span>
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex items-center gap-1.5 text-xs text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition"
            >
              {isPrinting
                ? <Loader2 size={12} className="animate-spin" />
                : <Printer size={12} />}
              Imprimer les tickets
            </button>
          </div>
        </div>

        {/* Route strip */}
        <div className="bg-gray-50 border-b border-gray-100 px-6 py-3 flex items-center gap-3 text-sm">
          <MapPin size={14} className="text-brand-500 shrink-0" />
          <span className="font-semibold text-gray-800">{origin}</span>
          <ArrowRight size={14} className="text-gray-300" />
          <span className="font-semibold text-gray-800">{destination}</span>
          <span className="text-gray-300 mx-1">·</span>
          <Calendar size={13} className="text-gray-400" />
          <span className="text-gray-600">{dayjs(b.trip?.departureAt).format('DD MMM YYYY, HH:mm')}</span>
          {b.trip?.tripClass && (
            <>
              <span className="text-gray-300 mx-1">·</span>
              <span className="text-xs font-semibold bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">{b.trip.tripClass}</span>
            </>
          )}
        </div>

        {/* 3-column info grid */}
        <div className="grid grid-cols-3 divide-x divide-gray-100 p-0">
          {/* Passager */}
          <div className="px-6 py-5">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5 mb-3">
              <User size={11} /> Passager
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 font-bold text-sm shrink-0">
                {`${b.passenger?.firstName?.[0] ?? ''}${b.passenger?.lastName?.[0] ?? ''}`.toUpperCase() || '?'}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">
                  {b.passenger?.firstName} {b.passenger?.lastName}
                </p>
                <p className="text-xs text-gray-400">{b.passenger?.phone ?? '—'}</p>
                {b.passenger?.email && (
                  <p className="text-xs text-gray-400">{b.passenger.email}</p>
                )}
              </div>
            </div>
          </div>

          {/* Sièges */}
          <div className="px-6 py-5">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5 mb-3">
              <Ticket size={11} /> Sièges réservés
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(b.seatNumbers ?? []).map((s: string) => (
                <span key={s} className="font-mono text-sm font-bold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg">
                  {s}
                </span>
              ))}
            </div>
            {b.seatNumbers?.length > 1 && (
              <p className="text-xs text-gray-400 mt-2">{b.seatNumbers.length} sièges</p>
            )}
          </div>

          {/* Paiement */}
          <div className="px-6 py-5">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5 mb-3">
              <CreditCard size={11} /> Paiement
            </p>
            <p className="text-2xl font-bold text-gray-900">{formatCFA(b.totalAmount)}</p>
            {pricePerSeat && (
              <p className="text-xs text-gray-400 mt-0.5">{pricePerSeat} / siège</p>
            )}
            {b.payment?.method && (
              <span className="inline-block mt-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                {PAYMENT_LABELS[b.payment.method] ?? b.payment.method}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Two-column body ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-5 items-start">

        {/* Left: Tickets */}
        <div className="space-y-5">

          {/* Tickets list */}
          {b.tickets?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                  <Ticket size={15} className="text-brand-500" /> Tickets
                </h2>
                <span className="text-xs text-gray-400">{b.tickets.length} ticket(s)</span>
              </div>
              <div className="divide-y divide-gray-50">
                {b.tickets.map((ticket: any) => (
                  <div key={ticket.id} className="flex items-center gap-4 px-6 py-3">
                    {ticket.qrCode ? (
                      <img
                        src={ticket.qrCode}
                        alt="QR"
                        className="w-12 h-12 rounded-lg border border-gray-100 shrink-0 object-contain bg-white p-0.5"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg border border-dashed border-gray-200 flex items-center justify-center shrink-0">
                        <QrCode size={18} className="text-gray-300" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">Siège {ticket.seatNumber}</p>
                      <p className="font-mono text-[11px] text-gray-400 mt-0.5">{ticket.id?.slice(-8)?.toUpperCase()}</p>
                    </div>
                    {ticket.scannedAt ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-green-600 bg-green-50 px-2.5 py-1 rounded-full font-semibold ring-1 ring-green-200">
                        <CheckCircle2 size={11} />
                        Scanné {dayjs(ticket.scannedAt).format('DD/MM HH:mm')}
                      </div>
                    ) : (
                      <span className="text-[11px] text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full ring-1 ring-gray-200">
                        Non scanné
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tickets manquants */}
          {canManage && b.status === 'CONFIRMED' && b.tickets?.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Ticket size={16} className="text-amber-500 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Tickets non générés</p>
                  <p className="text-xs text-amber-600 mt-0.5">Cette réservation est confirmée mais ses QR codes n'ont pas été créés.</p>
                </div>
              </div>
              <button
                onClick={() => genTicketsMut.mutate()}
                disabled={genTicketsMut.isPending}
                className="shrink-0 flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition disabled:opacity-60"
              >
                {genTicketsMut.isPending
                  ? <><Loader2 size={13} className="animate-spin" /> Génération...</>
                  : <><Ticket size={13} /> Générer les tickets</>}
              </button>
            </div>
          )}

        </div>

        {/* Right: Status + Luggage */}
        <div className="space-y-5">

          {/* Status management */}
          {canManage && transitions.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2 text-sm mb-4">
                <RefreshCw size={15} className="text-brand-500" /> Changer le statut
              </h2>
              <div className="flex flex-wrap gap-2">
                {transitions.map((t) => (
                  <button
                    key={t.status}
                    disabled={statusMut.isPending}
                    onClick={async () => {
                      if (!await confirm({ title: `Passer en "${t.label}" ?`, description: 'Le statut de la réservation sera mis à jour immédiatement.', variant: 'warning', confirmLabel: t.label })) return;
                      statusMut.mutate(t.status);
                    }}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-50 ${t.className}`}
                  >
                    {statusMut.isPending && statusMut.variables === t.status
                      ? <Loader2 size={13} className="animate-spin" />
                      : null}
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Luggage */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                <Luggage size={15} className="text-brand-500" /> Bagages en soute
              </h2>
              <button
                onClick={() => setShowLuggageForm(!showLuggageForm)}
                className="flex items-center gap-1.5 text-sm text-brand-500 hover:text-brand-600 font-medium"
              >
                <Plus size={14} /> {lug ? 'Modifier' : 'Déclarer'}
              </button>
            </div>

            <div className="p-6 space-y-4">
              {showLuggageForm && (
                <div className="border border-brand-100 bg-brand-50 rounded-xl p-5 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre de sacs *</label>
                      <input
                        type="number" min={0} max={20}
                        value={luggageForm.bagCount}
                        onChange={(e) => {
                          const n = parseInt(e.target.value) || 0;
                          setLuggageForm((p) => ({
                            ...p,
                            bagCount: n,
                            bagLabels:  Array.from({ length: n }, (_, i) => p.bagLabels[i]  ?? ''),
                            bagWeights: Array.from({ length: n }, (_, i) => p.bagWeights[i] ?? ''),
                          }));
                        }}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Poids total (kg)</label>
                      <input
                        type="number" min={0}
                        value={luggageForm.totalWeightKg}
                        onChange={(e) => setLuggageForm((p) => ({ ...p, totalWeightKg: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Franchise (kg)</label>
                      <input
                        type="number" min={0}
                        value={luggageForm.freeWeightKg}
                        onChange={(e) => setLuggageForm((p) => ({ ...p, freeWeightKg: parseFloat(e.target.value) || FREE_KG }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                  </div>

                  {excessKg > 0 && (
                    <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                      <Scale size={14} className="text-amber-600 shrink-0" />
                      <span className="text-sm text-amber-700">
                        Excédent <strong>{excessKg.toFixed(1)} kg</strong> → frais : <strong>{formatCFA(excessFee)}</strong>
                      </span>
                      <label className="ml-auto flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={luggageForm.excessPaid}
                          onChange={(e) => setLuggageForm((p) => ({ ...p, excessPaid: e.target.checked }))}
                          className="w-4 h-4 accent-brand-500"
                        />
                        <span className="text-xs font-medium text-amber-700">Payé maintenant</span>
                      </label>
                      {luggageForm.excessPaid && (
                        <select
                          value={luggageForm.excessPaymentMethod}
                          onChange={(e) => setLuggageForm((p) => ({ ...p, excessPaymentMethod: e.target.value }))}
                          className="border border-amber-300 rounded-lg px-2 py-1 text-xs focus:outline-none bg-white"
                        >
                          <option value="CASH">Espèces</option>
                          <option value="ORANGE_MONEY">Orange Money</option>
                          <option value="MTN_MOMO">MTN MoMo</option>
                          <option value="WAVE">Wave</option>
                        </select>
                      )}
                    </div>
                  )}

                  {luggageForm.bagCount > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-500">Détails des sacs (optionnel)</p>
                      {Array.from({ length: luggageForm.bagCount }).map((_, i) => (
                        <div key={i} className="flex gap-2">
                          <input
                            type="text"
                            placeholder={`Description sac ${i + 1}`}
                            value={luggageForm.bagLabels[i] ?? ''}
                            onChange={(e) => setLuggageForm((p) => {
                              const l = [...p.bagLabels]; l[i] = e.target.value; return { ...p, bagLabels: l };
                            })}
                            className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                          <input
                            type="number"
                            placeholder="kg"
                            value={luggageForm.bagWeights[i] ?? ''}
                            onChange={(e) => setLuggageForm((p) => {
                              const w = [...p.bagWeights]; w[i] = e.target.value; return { ...p, bagWeights: w };
                            })}
                            className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setShowLuggageForm(false)}
                      className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={submitLuggage}
                      disabled={declareMut.isPending || luggageForm.bagCount === 0}
                      className="flex-1 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {declareMut.isPending && <Loader2 size={14} className="animate-spin" />}
                      Valider la déclaration
                    </button>
                  </div>
                </div>
              )}

              {lug ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-4 text-sm text-gray-700">
                    <span className="flex items-center gap-1.5"><Package size={13} /> <strong>{lug.bagCount}</strong> sac(s)</span>
                    {lug.totalWeightKg > 0 && (
                      <span className="flex items-center gap-1.5"><Scale size={13} /> <strong>{lug.totalWeightKg} kg</strong> total</span>
                    )}
                    {lug.excessFeeXof > 0 && (
                      <span className={`flex items-center gap-1.5 font-semibold ${lug.excessPaid ? 'text-green-600' : 'text-amber-600'}`}>
                        Excédent : {formatCFA(lug.excessFeeXof)} {lug.excessPaid ? '✓' : '(impayé)'}
                      </span>
                    )}
                  </div>

                  <div className="divide-y divide-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                    {lug.bags.map((bag: any) => {
                      const cfg = BAG_CFG[bag.status] ?? BAG_CFG['DECLARED'];
                      return (
                        <div key={bag.id} className="flex items-center gap-3 px-4 py-3 bg-white">
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                            <Luggage size={14} className="text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800">
                              {bag.label || 'Sac'}{bag.weightKg ? ` · ${bag.weightKg} kg` : ''}
                            </p>
                            <p className="font-mono text-xs text-gray-400">{bag.qrCode}</p>
                          </div>
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ color: cfg.color, backgroundColor: cfg.bg }}
                          >
                            {cfg.label}
                          </span>
                          <button
                            onClick={() => printLabel(bag)}
                            className="text-gray-400 hover:text-gray-600 p-1.5 rounded hover:bg-gray-100"
                            title="Imprimer l'étiquette"
                          >
                            <Printer size={13} />
                          </button>
                          {!['MISSING', 'CLAIMED'].includes(bag.status) && (
                            <>
                              <button
                                onClick={() => scanMut.mutate(bag.qrCode)}
                                disabled={scanMut.isPending}
                                className="text-brand-500 hover:text-brand-700 p-1.5 rounded hover:bg-brand-50"
                                title="Scanner"
                              >
                                <QrCode size={13} />
                              </button>
                              <button
                                onClick={async () => { if (await confirm({ title: 'Signaler ce sac comme manquant ?', description: 'Une alerte sera créée pour ce bagage.', variant: 'warning', confirmLabel: 'Signaler' })) missingMut.mutate({ bagId: bag.id }); }}
                                className="text-red-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50"
                                title="Signaler manquant"
                              >
                                <AlertTriangle size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                !showLuggageForm && (
                  <div className="text-center py-8">
                    <Luggage size={32} className="text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Aucun bagage déclaré pour cette réservation</p>
                  </div>
                )
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
