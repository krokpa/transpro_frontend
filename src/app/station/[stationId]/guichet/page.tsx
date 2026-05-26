'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { bookingsApi, stationsApi, tripsApi, ticketTemplatesApi } from '@/lib/api';
import { qzConnect, qzDisconnect, qzIsActive, qzGetPrinters, qzGetDefault, qzPrintHTML } from '@/lib/qz';
import { formatCFA } from '@transpro/shared';
import {
  Search, Ticket, Loader2, CheckCircle, Plus, X,
  Printer, ChevronDown, Wifi, WifiOff,
} from 'lucide-react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
dayjs.locale('fr');

type SaleStep = 'idle' | 'selecting-trip' | 'selecting-seats' | 'passenger-info' | 'done';

// ── Ticket print engine ────────────────────────────────────────────────────────

const PAPER_SIZES: Record<string, { width: number; height: number; css: string; widthIn: number }> = {
  THERMAL_80: { width: 302, height: 529, css: '@page { size: 80mm 140mm; margin: 0; }', widthIn: 3.1496 },
  THERMAL_58: { width: 219, height: 529, css: '@page { size: 58mm 140mm; margin: 0; }', widthIn: 2.2835 },
  A4:         { width: 595, height: 842, css: '@page { size: A4 portrait; margin: 10mm; }', widthIn: 8.2677 },
};

const VARIABLES: Record<string, (booking: any, ticket: any) => string> = {
  '{{passenger_name}}': (b) => `${b.passenger?.firstName ?? ''} ${b.passenger?.lastName ?? ''}`.trim(),
  '{{passenger_phone}}': (b) => b.passenger?.phone ?? '',
  '{{origin}}': (b) => b.trip?.route?.originCity?.name ?? '',
  '{{destination}}': (b) => b.trip?.route?.destinationCity?.name ?? '',
  '{{departure_date}}': (b) => dayjs(b.trip?.departureAt).format('DD/MM/YYYY'),
  '{{departure_time}}': (b) => dayjs(b.trip?.departureAt).format('HH:mm'),
  '{{seat_number}}': (_b, t) => t?.seatNumber ?? '',
  '{{trip_class}}': (b) => b.trip?.tripClass ?? '',
  '{{price}}': (b) => formatCFA(Math.round((b.totalAmount ?? 0) / Math.max(1, b.seatNumbers?.length ?? 1))) as string,
  '{{booking_ref}}': (b) => b.reference ?? '',
  '{{company_name}}': (b) => b.trip?.tenant?.name ?? '',
};

function substituteVars(text: string, booking: any, ticket: any): string {
  return Object.entries(VARIABLES).reduce(
    (acc, [key, fn]) => acc.replaceAll(key, fn(booking, ticket)),
    text,
  );
}

function renderElementHtml(el: any, booking: any, ticket: any): string {
  const style = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;box-sizing:border-box;`;
  if (el.type === 'text') {
    const ts = [style,
      `font-size:${el.fontSize ?? 14}px`, `font-weight:${el.fontWeight ?? 'normal'}`,
      `font-style:${el.fontStyle ?? 'normal'}`, `text-align:${el.textAlign ?? 'left'}`,
      `color:${el.color ?? '#000'}`, 'line-height:1.3', 'overflow:hidden',
      'white-space:pre-wrap', 'word-break:break-word',
    ].join(';');
    return `<div style="${ts}">${substituteVars(el.content ?? '', booking, ticket)}</div>`;
  }
  if (el.type === 'qrcode') {
    return `<div style="${style}background:#fff;display:flex;align-items:center;justify-content:center;border:1px solid #e5e7eb;">
      <img src="${ticket?.qrCode ?? ''}" style="width:90%;height:90%;object-fit:contain;" /></div>`;
  }
  if (el.type === 'image') {
    const logo = booking.trip?.tenant?.logo ?? '';
    if (!logo) return `<div style="${style}background:#f9fafb;border:1px dashed #d1d5db;"></div>`;
    return `<img src="${logo}" style="${style}object-fit:contain;" />`;
  }
  if (el.type === 'rect') {
    return `<div style="${style}background:${el.bgColor ?? 'transparent'};border:${el.borderWidth ?? 1}px solid ${el.borderColor ?? '#d1d5db'};border-radius:${el.borderRadius ?? 0}px;"></div>`;
  }
  if (el.type === 'line') {
    return `<div style="${style}background:${el.bgColor ?? '#d1d5db'};"></div>`;
  }
  return '';
}

/** Construit le HTML des tickets (utilisé par QZ Tray et popup) */
function buildTicketsHtml(booking: any, template: any): string {
  const tickets: any[] = (booking.tickets ?? []).length > 0
    ? booking.tickets
    : (booking.seatNumbers ?? []).map((s: string) => ({ seatNumber: s, qrCode: '' }));

  const dims = PAPER_SIZES[template.paperSize ?? 'THERMAL_80'];
  const layout: any[] = Array.isArray(template.layout) ? template.layout : [];

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  ${dims.css}
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #f0f0f0; display: flex; flex-direction: column; align-items: center; padding: 20px; gap: 16px; font-family: Arial, sans-serif; }
  @media print { body { background: white; padding: 0; gap: 0; } .no-print { display: none !important; } }
  .ticket-wrapper { box-shadow: 0 2px 12px rgba(0,0,0,0.15); }
</style>
</head><body>
<div class="no-print" style="position:fixed;top:16px;right:16px;z-index:9999;">
  <button onclick="window.print()" style="background:#6366f1;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-size:14px;cursor:pointer;font-weight:600;">
    🖨️ Imprimer (${tickets.length} billet${tickets.length > 1 ? 's' : ''})
  </button>
</div>
${tickets.map((ticket: any) => `
  <div class="ticket-wrapper" style="position:relative;width:${dims.width}px;height:${dims.height}px;background:#fff;page-break-after:always;">
    ${layout.map((el: any) => renderElementHtml(el, booking, ticket)).join('')}
  </div>`).join('')}
</body></html>`;
}

/** Ouvre une popup de prévisualisation/impression (fallback sans QZ Tray) */
function openPrintPopup(booking: any, template: any) {
  const dims = PAPER_SIZES[template.paperSize ?? 'THERMAL_80'];
  const html = buildTicketsHtml(booking, template);
  const win = window.open('', '_blank', `width=${dims.width + 80},height=${dims.height + 140}`);
  if (win) { win.document.write(html); win.document.close(); }
  else toast.error('Popup bloqué — autorisez les popups pour imprimer');
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function StationGuichetPage() {
  const { stationId } = useParams<{ stationId: string }>();

  // ── Sale flow ──
  const [step, setStep] = useState<SaleStep>('idle');
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [seats, setSeats] = useState<any[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [passenger, setPassenger] = useState({ firstName: '', lastName: '', phone: '', email: '' });
  const [payMethod, setPayMethod] = useState('CASH');
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [search, setSearch] = useState('');

  // ── Templates ──
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // ── QZ Tray ──
  const [qzStatus, setQzStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [printers, setPrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('qz_printer') ?? '' : ''
  );
  const [showPrinters, setShowPrinters] = useState(false);
  const [printing, setPrinting] = useState(false);

  // ── Queries ──
  const { data: trips = [] } = useQuery<any[]>({
    queryKey: ['station-today-trips', stationId],
    queryFn: async () => ((await stationsApi.getTodayTrips(stationId)) ?? []) as any[],
    refetchInterval: 30_000,
  });

  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ['ticket-templates'],
    queryFn: async () => ((await ticketTemplatesApi.list()) ?? []) as any[],
  });

  const activeTemplate: any =
    (templates as any[]).find((t: any) => t.id === selectedTemplateId) ??
    (templates as any[]).find((t: any) => t.isDefault) ??
    (templates as any[])[0] ??
    null;

  useEffect(() => {
    if ((templates as any[]).length > 0 && !selectedTemplateId) {
      const def = (templates as any[]).find((t: any) => t.isDefault) ?? (templates as any[])[0];
      if (def) setSelectedTemplateId(def.id);
    }
  }, [templates, selectedTemplateId]);

  // ── QZ Tray connection ──────────────────────────────────────────────────────

  const handleQzConnect = useCallback(async () => {
    setQzStatus('connecting');
    try {
      await qzConnect();
      const list = await qzGetPrinters();
      setPrinters(list);
      const saved = localStorage.getItem('qz_printer');
      const def = saved && list.includes(saved) ? saved : await qzGetDefault();
      setSelectedPrinter(def);
      localStorage.setItem('qz_printer', def);
      setQzStatus('connected');
      toast.success('QZ Tray connecté');
    } catch {
      setQzStatus('disconnected');
      toast.error("QZ Tray introuvable — vérifiez qu'il est lancé sur ce poste");
    }
  }, []);

  const handleQzDisconnect = useCallback(async () => {
    await qzDisconnect();
    setQzStatus('disconnected');
    setPrinters([]);
  }, []);

  useEffect(() => {
    handleQzConnect().catch(() => {});
  }, [handleQzConnect]);

  const handlePrinterChange = (p: string) => {
    setSelectedPrinter(p);
    localStorage.setItem('qz_printer', p);
    setShowPrinters(false);
  };

  // ── Print ───────────────────────────────────────────────────────────────────

  async function handlePrint() {
    if (!activeTemplate) {
      toast.error('Aucun modèle de ticket — configurez-en un dans "Modèles tickets".');
      return;
    }
    if (!booking) return;

    let printableBooking = booking;
    if (!booking.tickets || booking.tickets.length === 0) {
      setPrinting(true);
      try {
        printableBooking = await bookingsApi.get(booking.id) as any;
      } catch {
        toast.error('Erreur lors du chargement des tickets');
        setPrinting(false);
        return;
      }
      setPrinting(false);
    }

    const html = buildTicketsHtml(printableBooking, activeTemplate);
    const dims = PAPER_SIZES[activeTemplate.paperSize ?? 'THERMAL_80'];

    if (qzStatus === 'connected' && selectedPrinter) {
      try {
        await qzPrintHTML(html, selectedPrinter, dims.widthIn);
        toast.success('Impression envoyée');
      } catch (err: any) {
        toast.error(`QZ Tray : ${err?.message ?? "Erreur d'impression"}`);
      }
    } else {
      openPrintPopup(printableBooking, activeTemplate);
    }
  }

  // ── Sale flow ───────────────────────────────────────────────────────────────

  const filteredTrips = trips.filter((t) => {
    const q = search.toLowerCase();
    return (
      !q ||
      t.route?.originCity?.name?.toLowerCase().includes(q) ||
      t.route?.destinationCity?.name?.toLowerCase().includes(q) ||
      t.vehicle?.plate?.toLowerCase().includes(q)
    );
  });

  async function selectTrip(trip: any) {
    setSelectedTrip(trip);
    setSelectedSeats([]);
    try {
      const s = await tripsApi.getSeats(trip.id) as any;
      setSeats(Array.isArray(s) ? s : []);
    } catch { setSeats([]); }
    setStep('selecting-seats');
  }

  function toggleSeat(seatNumber: string, status: string) {
    if (status !== 'AVAILABLE') return;
    setSelectedSeats((prev) =>
      prev.includes(seatNumber) ? prev.filter((s) => s !== seatNumber) : [...prev, seatNumber],
    );
  }

  async function handleSell(e: React.FormEvent) {
    e.preventDefault();
    if (selectedSeats.length === 0) return;
    setLoading(true);
    try {
      const result = await bookingsApi.guichet({
        tripId: selectedTrip.id,
        seatNumbers: selectedSeats,
        firstName: passenger.firstName || undefined,
        lastName: passenger.lastName || undefined,
        phone: passenger.phone || undefined,
        email: passenger.email || undefined,
        paymentMethod: payMethod,
        stationId,
      }) as any;
      setBooking(result);
      setStep('done');
      toast.success('Billet vendu avec succès !');
      // Impression automatique si QZ Tray connecté
      if (qzIsActive() && selectedPrinter && activeTemplate) {
        const html = buildTicketsHtml(result, activeTemplate);
        const dims = PAPER_SIZES[activeTemplate.paperSize ?? 'THERMAL_80'];
        await qzPrintHTML(html, selectedPrinter, dims.widthIn).catch((err: any) =>
          toast.error(`QZ Tray : ${err?.message ?? "Erreur d'impression automatique"}`),
        );
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Erreur lors de la vente');
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep('idle');
    setSelectedTrip(null);
    setSeats([]);
    setSelectedSeats([]);
    setPassenger({ firstName: '', lastName: '', phone: '', email: '' });
    setPayMethod('CASH');
    setBooking(null);
    setSearch('');
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';

  // ── QZ Tray bar (réutilisé dans plusieurs étapes) ───────────────────────────
  const QzBar = (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${
      qzStatus === 'connected'
        ? 'bg-green-50 border-green-200'
        : qzStatus === 'connecting'
        ? 'bg-yellow-50 border-yellow-200'
        : 'bg-gray-50 border-gray-200'
    }`}>
      {qzStatus === 'connected'
        ? <Wifi size={13} className="text-green-600 shrink-0" />
        : qzStatus === 'connecting'
        ? <Loader2 size={13} className="animate-spin text-yellow-600 shrink-0" />
        : <WifiOff size={13} className="text-gray-400 shrink-0" />}

      <span className={`font-medium ${
        qzStatus === 'connected' ? 'text-green-700' :
        qzStatus === 'connecting' ? 'text-yellow-700' : 'text-gray-500'
      }`}>
        {qzStatus === 'connected' ? 'QZ Tray' :
         qzStatus === 'connecting' ? 'Connexion…' : 'QZ non connecté'}
      </span>

      {qzStatus === 'connected' && printers.length > 0 && (
        <div className="relative ml-1">
          <button
            onClick={() => setShowPrinters((p) => !p)}
            className="flex items-center gap-1.5 px-2 py-1 bg-white border border-green-200 rounded-lg text-green-800 hover:bg-green-50 transition font-medium"
          >
            <Printer size={11} />
            <span className="max-w-[140px] truncate">{selectedPrinter || 'Choisir'}</span>
            <ChevronDown size={10} />
          </button>
          {showPrinters && (
            <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-[220px] py-1">
              {printers.map((p) => (
                <button
                  key={p}
                  onClick={() => handlePrinterChange(p)}
                  className={`w-full text-left px-4 py-2 text-xs hover:bg-gray-50 transition ${p === selectedPrinter ? 'font-semibold text-brand-600' : 'text-gray-700'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {qzStatus === 'disconnected' && (
        <button
          onClick={handleQzConnect}
          className="ml-1 text-brand-600 hover:text-brand-700 underline underline-offset-2 font-medium"
        >
          Connecter
        </button>
      )}
      {qzStatus === 'connected' && (
        <button onClick={handleQzDisconnect} className="ml-auto text-gray-400 hover:text-gray-600 transition">
          <X size={12} />
        </button>
      )}
    </div>
  );

  // ── Done screen ──────────────────────────────────────────────────────────────
  if (step === 'done' && booking) {
    const ticketCount = booking.tickets?.length ?? booking.seatNumbers?.length ?? 0;
    return (
      <div className="p-6 flex flex-col items-center gap-5 max-w-md mx-auto mt-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle size={36} className="text-green-500" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900">Vente confirmée</h2>
          <p className="text-gray-500 text-sm mt-1">
            Référence : <span className="font-mono font-semibold">{booking.reference}</span>
          </p>
        </div>

        <div className="w-full bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Voyageur</span>
            <span className="font-medium">{booking.passenger?.firstName} {booking.passenger?.lastName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Trajet</span>
            <span className="font-medium">
              {booking.trip?.route?.originCity?.name} → {booking.trip?.route?.destinationCity?.name}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Départ</span>
            <span className="font-medium">{dayjs(booking.trip?.departureAt).format('DD/MM HH:mm')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Sièges</span>
            <span className="font-medium">{booking.seatNumbers?.join(', ')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Montant</span>
            <span className="font-semibold text-brand-600">{formatCFA(booking.totalAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Paiement</span>
            <span className="font-medium">{booking.payment?.method ?? payMethod}</span>
          </div>
        </div>

        {/* Config impression */}
        <div className="w-full space-y-2">
          {QzBar}
          {(templates as any[]).length > 0 && (
            <div className="relative">
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full appearance-none border border-gray-200 rounded-lg pl-3 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              >
                {(templates as any[]).map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.name}{t.isDefault ? ' (par défaut)' : ''}
                    {' — '}{t.paperSize?.replace('_', ' ')}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          )}
        </div>

        <div className="flex gap-3 w-full">
          <button
            onClick={handlePrint}
            disabled={printing || !activeTemplate}
            className="flex-1 flex items-center justify-center gap-2 border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
          >
            {printing
              ? <><Loader2 size={15} className="animate-spin" /> Chargement...</>
              : <><Printer size={15} />
                  {qzStatus === 'connected' && selectedPrinter ? 'Imprimer' : 'Aperçu / Imprimer'}
                  {ticketCount > 1 ? ` (${ticketCount} billets)` : ''}
                </>
            }
          </button>
          <button
            onClick={reset}
            className="flex-1 bg-brand-500 hover:bg-brand-600 text-white rounded-lg py-2.5 text-sm font-semibold transition flex items-center justify-center gap-2"
          >
            <Plus size={15} /> Nouvelle vente
          </button>
        </div>
      </div>
    );
  }

  // ── Idle / trip selection ────────────────────────────────────────────────────
  if (step === 'idle' || step === 'selecting-trip') {
    return (
      <div className="p-6 space-y-4 max-w-2xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Guichet</h1>
            <p className="text-gray-400 text-sm">Vente de billets au comptoir</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {(templates as any[]).length > 0 && (
              <div className="relative">
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-7 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 text-gray-700"
                >
                  {(templates as any[]).map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.name}{t.isDefault ? ' ★' : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            )}
            {QzBar}
          </div>
        </div>

        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une destination ou un véhicule..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="space-y-2">
          {filteredTrips.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">Aucun voyage disponible aujourd'hui</div>
          )}
          {filteredTrips.map((trip) => {
            const available = trip.availableSeats > 0 && ['SCHEDULED', 'BOARDING'].includes(trip.status);
            return (
              <button
                key={trip.id}
                onClick={() => available && selectTrip(trip)}
                disabled={!available}
                className={`w-full text-left bg-white rounded-xl border p-4 transition ${
                  available
                    ? 'border-gray-100 hover:border-brand-200 hover:shadow-sm cursor-pointer'
                    : 'border-gray-100 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {trip.route?.originCity?.name} → {trip.route?.destinationCity?.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {dayjs(trip.departureAt).format('HH:mm')} · {trip.vehicle?.plate} · {formatCFA(trip.price)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-brand-600">{trip.availableSeats} places</p>
                    <p className="text-xs text-gray-400">disponibles</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Seat selection ───────────────────────────────────────────────────────────
  if (step === 'selecting-seats') {
    const seatColor = (status: string, selected: boolean) => {
      if (selected) return 'bg-brand-500 text-white border-brand-500';
      if (status === 'AVAILABLE') return 'bg-white border-gray-200 hover:border-brand-300 cursor-pointer';
      return 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed';
    };

    return (
      <div className="p-6 space-y-5 max-w-2xl">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep('idle')} className="text-gray-400 hover:text-gray-600 transition">
            <X size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Choisir les sièges</h1>
            <p className="text-gray-400 text-sm">
              {selectedTrip?.route?.originCity?.name} → {selectedTrip?.route?.destinationCity?.name}
              {' · '}{dayjs(selectedTrip?.departureAt).format('HH:mm')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {seats.map((seat: any) => (
            <button
              key={seat.seatNumber}
              onClick={() => toggleSeat(seat.seatNumber, seat.status)}
              className={`w-12 h-12 rounded-lg border text-xs font-semibold transition-all ${seatColor(seat.status, selectedSeats.includes(seat.seatNumber))}`}
            >
              {seat.seatNumber}
            </button>
          ))}
        </div>

        <div className="flex gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border border-gray-200 bg-white inline-block" /> Libre</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-brand-500 inline-block" /> Sélectionné</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-100 inline-block" /> Occupé</span>
        </div>

        {selectedSeats.length > 0 && (
          <div className="bg-brand-50 rounded-xl p-4 flex items-center justify-between">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">{selectedSeats.length}</span>{' '}
              siège{selectedSeats.length > 1 ? 's' : ''} sélectionné{selectedSeats.length > 1 ? 's' : ''}{' '}
              · {formatCFA(selectedTrip.price * selectedSeats.length)}
            </p>
            <button
              onClick={() => setStep('passenger-info')}
              className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
            >
              Continuer →
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Passenger info ───────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-md">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => setStep('selecting-seats')} className="text-gray-400 hover:text-gray-600 transition">
          <X size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Informations passager</h1>
          <p className="text-gray-400 text-sm">
            Sièges : {selectedSeats.join(', ')} · {formatCFA(selectedTrip?.price * selectedSeats.length)}
          </p>
        </div>
      </div>

      <form onSubmit={handleSell} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Prénom</label>
            <input value={passenger.firstName}
              onChange={(e) => setPassenger((p) => ({ ...p, firstName: e.target.value }))}
              placeholder="Kouassi" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nom</label>
            <input value={passenger.lastName}
              onChange={(e) => setPassenger((p) => ({ ...p, lastName: e.target.value }))}
              placeholder="Yao" className={inputCls} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Téléphone</label>
          <input value={passenger.phone}
            onChange={(e) => setPassenger((p) => ({ ...p, phone: e.target.value }))}
            placeholder="+2250700000000" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Mode de paiement</label>
          <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className={inputCls}>
            {['CASH', 'ORANGE_MONEY', 'MTN_MOMO', 'WAVE', 'CARD'].map((m) => (
              <option key={m} value={m}>{m.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-lg py-3 transition flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {loading
            ? <><Loader2 size={16} className="animate-spin" /> Enregistrement...</>
            : <><Ticket size={16} /> Émettre {selectedSeats.length > 1 ? `${selectedSeats.length} billets` : 'le billet'}</>
          }
        </button>
      </form>
    </div>
  );
}
