'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { bookingsApi, ticketTemplatesApi, tripsApi } from '@/lib/api';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { qzConnect, qzDisconnect, qzIsActive, qzGetPrinters, qzGetDefault, qzPrintHTML } from '@/lib/qz';
import { formatCFA } from '@transpro/shared';
import { Search, Printer, Plus, X, Loader2, CheckCircle, Ticket, Wifi, WifiOff, ChevronDown } from 'lucide-react';
import dayjs from 'dayjs';
import { toast } from 'sonner';

// ─── Constantes impression ────────────────────────────────────────────────────

const PAPER_SIZES: Record<string, { width: number; height: number; css: string }> = {
  THERMAL_80: { width: 302, height: 529, css: '@page { size: 80mm 140mm; margin: 0; }' },
  THERMAL_58: { width: 219, height: 529, css: '@page { size: 58mm 140mm; margin: 0; }' },
  A4:         { width: 595, height: 842, css: '@page { size: A4 portrait; margin: 10mm; }' },
};

function substituteVars(text: string, booking: any, ticket: any): string {
  const vars: Record<string, string> = {
    '{{passenger_name}}': `${booking.passenger?.firstName ?? ''} ${booking.passenger?.lastName ?? ''}`.trim(),
    '{{passenger_phone}}': booking.passenger?.phone ?? '',
    '{{origin}}': booking.trip?.route?.originCity?.name ?? '',
    '{{destination}}': booking.trip?.route?.destinationCity?.name ?? '',
    '{{departure_date}}': dayjs(booking.trip?.departureAt).format('DD/MM/YYYY'),
    '{{departure_time}}': dayjs(booking.trip?.departureAt).format('HH:mm'),
    '{{seat_number}}': ticket?.seatNumber ?? '',
    '{{trip_class}}': booking.trip?.tripClass ?? '',
    '{{price}}': formatCFA(Math.round((booking.totalAmount ?? 0) / Math.max(1, booking.seatNumbers?.length ?? 1))) as string,
    '{{booking_ref}}': booking.reference ?? '',
    '{{company_name}}': booking.trip?.tenant?.name ?? '',
  };
  return Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(k, v), text);
}

function renderElementHtml(el: any, booking: any, ticket: any): string {
  const style = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;box-sizing:border-box;`;
  if (el.type === 'text') {
    return `<div style="${style};font-size:${el.fontSize ?? 14}px;font-weight:${el.fontWeight ?? 'normal'};font-style:${el.fontStyle ?? 'normal'};text-align:${el.textAlign ?? 'left'};color:${el.color ?? '#000'};line-height:1.3;overflow:hidden;white-space:pre-wrap;word-break:break-word;">${substituteVars(el.content ?? '', booking, ticket)}</div>`;
  }
  if (el.type === 'qrcode') {
    return `<div style="${style}background:#fff;display:flex;align-items:center;justify-content:center;border:1px solid #e5e7eb;"><img src="${ticket?.qrCode ?? ''}" style="width:90%;height:90%;object-fit:contain;" /></div>`;
  }
  if (el.type === 'image') {
    const logo = booking.trip?.tenant?.logo ?? '';
    return logo ? `<img src="${logo}" style="${style}object-fit:contain;" />` : `<div style="${style}background:#f9fafb;border:1px dashed #d1d5db;"></div>`;
  }
  if (el.type === 'rect') {
    return `<div style="${style}background:${el.bgColor ?? 'transparent'};border:${el.borderWidth ?? 1}px solid ${el.borderColor ?? '#d1d5db'};border-radius:${el.borderRadius ?? 0}px;"></div>`;
  }
  if (el.type === 'line') {
    return `<div style="${style}background:${el.bgColor ?? '#d1d5db'};"></div>`;
  }
  return '';
}

/** Ticket de secours si aucun modèle n'est configuré */
function buildFallbackTicketHtml(booking: any, ticket: any): string {
  const origin = booking.trip?.route?.originCity?.name ?? '';
  const dest = booking.trip?.route?.destinationCity?.name ?? '';
  const company = booking.trip?.tenant?.name ?? 'TransPro CI';
  const dep = dayjs(booking.trip?.departureAt).format('DD/MM/YYYY HH:mm');
  const passenger = `${booking.passenger?.firstName ?? ''} ${booking.passenger?.lastName ?? ''}`.trim();
  const phone = booking.passenger?.phone ?? '';
  const ref = booking.reference ?? '';
  const seat = ticket?.seatNumber ?? '';
  const price = formatCFA(Math.round((booking.totalAmount ?? 0) / Math.max(1, booking.seatNumbers?.length ?? 1)));
  const qrSrc = ticket?.qrCode ?? '';

  return `
    <div style="width:302px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;font-family:Arial,sans-serif;margin-bottom:16px;page-break-after:always;">
      <div style="background:#4f46e5;color:#fff;padding:10px 14px;">
        <div style="font-weight:700;font-size:13px;">${company}</div>
        <div style="font-size:11px;opacity:.8;">Billet de transport</div>
      </div>
      <div style="padding:12px 14px;border-bottom:1px dashed #d1d5db;">
        <div style="font-size:18px;font-weight:700;color:#111;text-align:center;">${origin} → ${dest}</div>
        <div style="text-align:center;color:#6b7280;font-size:12px;margin-top:2px;">${dep}</div>
      </div>
      <div style="padding:10px 14px;display:flex;gap:14px;border-bottom:1px dashed #d1d5db;">
        <div style="flex:1;">
          <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;margin-bottom:2px;">Passager</div>
          <div style="font-size:12px;font-weight:600;color:#111;">${passenger}</div>
          <div style="font-size:11px;color:#6b7280;">${phone}</div>
        </div>
        <div>
          <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;margin-bottom:2px;">Siège</div>
          <div style="font-size:22px;font-weight:700;color:#4f46e5;text-align:center;">${seat}</div>
        </div>
      </div>
      <div style="padding:10px 14px;display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;margin-bottom:2px;">Référence</div>
          <div style="font-size:11px;font-family:monospace;font-weight:600;color:#374151;">${ref}</div>
          <div style="font-size:13px;font-weight:700;color:#111;margin-top:4px;">${price}</div>
        </div>
        ${qrSrc ? `<img src="${qrSrc}" style="width:70px;height:70px;" />` : ''}
      </div>
    </div>`;
}

function buildPrintHTML(booking: any, template: any | null): string {
  const tickets: any[] = booking.tickets?.length
    ? booking.tickets
    : (booking.seatNumbers ?? []).map((s: string) => ({ seatNumber: s, qrCode: '' }));

  let body: string;
  let pageCss: string;

  if (template && Array.isArray(template.layout) && template.layout.length > 0) {
    const dims = PAPER_SIZES[template.paperSize ?? 'THERMAL_80'];
    pageCss = dims.css;
    body = tickets.map((ticket: any) =>
      `<div style="position:relative;width:${dims.width}px;height:${dims.height}px;background:#fff;page-break-after:always;">
        ${template.layout.map((el: any) => renderElementHtml(el, booking, ticket)).join('')}
      </div>`
    ).join('');
  } else {
    pageCss = PAPER_SIZES.THERMAL_80.css;
    body = tickets.map((ticket: any) => buildFallbackTicketHtml(booking, ticket)).join('');
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <style>${pageCss}*{margin:0;padding:0;box-sizing:border-box;}body{display:flex;flex-direction:column;align-items:center;font-family:Arial,sans-serif;}@media print{body{padding:0;}}</style>
  </head><body>${body}</body></html>`;
}

async function printViaQZ(html: string, printer: string, template: any | null): Promise<void> {
  const paperSize = template?.paperSize ?? 'THERMAL_80';
  const widthIn = paperSize === 'THERMAL_58' ? 2.2835 : paperSize === 'A4' ? 8.2677 : 3.1496;
  await qzPrintHTML(html, printer, widthIn);
}

function printViaIframe(html: string): void {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:0;';
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();
  iframe.contentWindow?.focus();
  iframe.contentWindow?.print();
  setTimeout(() => document.body.removeChild(iframe), 2000);
}

// ─── Types ────────────────────────────────────────────────────────────────────

const PAYMENT_METHODS = [
  { value: 'CASH', label: '💵 Espèces' },
  { value: 'ORANGE_MONEY', label: '🟠 Orange Money' },
  { value: 'MTN_MOMO', label: '🟡 MTN MoMo' },
  { value: 'WAVE', label: '🔵 Wave' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BilletteriePage() {
  const [tab, setTab] = useState<'search' | 'sale'>('sale');

  // ── QZ Tray ──
  const [qzStatus, setQzStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [printers, setPrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('qz_printer') ?? '' : ''
  );
  const [showPrinters, setShowPrinters] = useState(false);

  // ── Mode recherche ──
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [printingId, setPrintingId] = useState<string | null>(null);

  // ── Modèle de ticket ──
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // ── Mode vente ──
  const [selectedTripId, setSelectedTripId] = useState('');
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', paymentMethod: 'CASH' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [selling, setSelling] = useState(false);
  const [soldBooking, setSoldBooking] = useState<any>(null);

  // ── QZ Tray connexion ──────────────────────────────────────────────────────

  const handleQzConnect = useCallback(async () => {
    setQzStatus('connecting');
    try {
      await qzConnect();
      const list = await qzGetPrinters();
      setPrinters(list);
      const saved = localStorage.getItem('qz_printer');
      const def = saved && list.includes(saved) ? saved : (await qzGetDefault());
      setSelectedPrinter(def);
      localStorage.setItem('qz_printer', def);
      setQzStatus('connected');
      toast.success('QZ Tray connecté');
    } catch {
      setQzStatus('disconnected');
      toast.error('QZ Tray introuvable — vérifiez qu\'il est lancé sur ce poste');
    }
  }, []);

  const handleQzDisconnect = useCallback(async () => {
    await qzDisconnect();
    setQzStatus('disconnected');
    setPrinters([]);
  }, []);

  useEffect(() => {
    // Tentative de connexion automatique au chargement
    if (typeof window !== 'undefined') {
      handleQzConnect().catch(() => {});
    }
  }, [handleQzConnect]);

  const handlePrinterChange = (p: string) => {
    setSelectedPrinter(p);
    localStorage.setItem('qz_printer', p);
    setShowPrinters(false);
  };

  async function doPrint(booking: any) {
    const html = buildPrintHTML(booking, activeTemplate);
    if (qzStatus === 'connected' && selectedPrinter) {
      try {
        await printViaQZ(html, selectedPrinter, activeTemplate);
      } catch (err: any) {
        toast.error(`QZ Tray : ${err?.message ?? 'Erreur impression'}`);
      }
    } else {
      printViaIframe(html);
    }
  }

  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ['ticket-templates'],
    queryFn: async () => ((await ticketTemplatesApi.list()) ?? []) as any[],
  });

  // Template actif : celui sélectionné, sinon le défaut, sinon le premier
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

  // Voyages d'aujourd'hui et des prochains jours (SCHEDULED ou BOARDING)
  const today = dayjs().format('YYYY-MM-DD');
  const { data: tripsRaw } = useQuery({
    queryKey: ['trips-billetterie', today],
    queryFn: () => tripsApi.list({ date: today }) as any,
    refetchInterval: 30_000,
  });
  const trips: any[] = (tripsRaw as any) ?? [];
  const availableTrips = trips.filter((t: any) => ['SCHEDULED', 'BOARDING'].includes(t.status));

  const selectedTrip = availableTrips.find((t: any) => t.id === selectedTripId);

  // Sièges du voyage sélectionné
  const { data: seatsRaw } = useQuery({
    queryKey: ['trip-seats', selectedTripId],
    queryFn: () => selectedTripId ? tripsApi.getSeats(selectedTripId) as any : Promise.resolve([]),
    enabled: !!selectedTripId,
  });
  const seats: any[] = seatsRaw ?? [];
  const availableSeats = seats.filter((s: any) => s.status === 'AVAILABLE');

  // ── Recherche ──────────────────────────────────────────────────────────────

  async function handleSearch() {
    if (!searchQ.trim()) return;
    setSearching(true);
    try {
      const data = await bookingsApi.tenantBookings({ search: searchQ, limit: 50 }) as any;
      const all: any[] = Array.isArray(data) ? data : data?.data ?? [];
      setSearchResults(all);
    } catch (err: any) {
      const raw = err?.response?.data;
      const msg = raw?.error ?? raw?.message ?? err?.message ?? 'Erreur inconnue';
      toast.error(`Recherche impossible : ${Array.isArray(msg) ? msg.join(' | ') : msg}`);
    } finally {
      setSearching(false);
    }
  }

  async function handlePrint(booking: any) {
    setPrintingId(booking.id);
    try {
      const full = await bookingsApi.get(booking.id) as any;
      await doPrint(full);
    } catch (err: any) {
      const raw = err?.response?.data;
      const msg = raw?.error ?? raw?.message ?? err?.message ?? 'Erreur inconnue';
      toast.error(`Chargement impossible : ${Array.isArray(msg) ? msg.join(' | ') : msg}`);
    } finally {
      setPrintingId(null);
    }
  }

  // ── Vente ─────────────────────────────────────────────────────────────────

  function toggleSeat(seatNumber: string) {
    setSelectedSeats((prev) =>
      prev.includes(seatNumber) ? prev.filter((s) => s !== seatNumber) : [...prev, seatNumber]
    );
  }

  function validateForm() {
    const e: Record<string, string> = {};
    if (!selectedTripId) e.trip = 'Sélectionnez un voyage';
    if (selectedSeats.length === 0) e.seats = 'Sélectionnez au moins un siège';
    if (form.phone && form.phone.length < 8) e.phone = 'Numéro invalide';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSell() {
    if (!validateForm()) return;
    setSelling(true);
    setSoldBooking(null);
    try {
      const booking = await bookingsApi.guichet({
        tripId: selectedTripId,
        seatNumbers: selectedSeats,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        paymentMethod: form.paymentMethod,
      }) as any;
      setSoldBooking(booking);
      toast.success(`Ticket créé — réf. ${booking.reference}`);
      // Impression automatique si QZ Tray connecté
      if (qzIsActive() && selectedPrinter) {
        await doPrint(booking);
      }
      // Réinitialiser le formulaire
      setSelectedTripId('');
      setSelectedSeats([]);
      setForm({ firstName: '', lastName: '', phone: '', paymentMethod: 'CASH' });
    } catch (err: any) {
      const raw = err?.response?.data;
      const msg = raw?.error ?? raw?.message ?? err?.message ?? 'Erreur inconnue';
      const detail = Array.isArray(msg) ? msg.join(' | ') : String(msg);
      toast.error(`Erreur : ${detail}`);
    } finally {
      setSelling(false);
    }
  }

  async function handleImmediatePrint(booking: any) {
    await doPrint(booking);
  }

  // ── UI ────────────────────────────────────────────────────────────────────

  const inputCls = (err?: string) =>
    `w-full border ${err ? 'border-red-400' : 'border-gray-200'} rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition`;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Ticket size={22} className="text-brand-500" />
          Billetterie
        </h1>
        <p className="text-sm text-gray-500 mt-1">Vente au guichet et impression des tickets</p>
      </div>

      {/* ── Barre QZ Tray ─────────────────────────────────────────────────── */}
      <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm ${
        qzStatus === 'connected'
          ? 'bg-green-50 border-green-200'
          : qzStatus === 'connecting'
          ? 'bg-yellow-50 border-yellow-200'
          : 'bg-gray-50 border-gray-200'
      }`}>
        {qzStatus === 'connected'
          ? <Wifi size={15} className="text-green-600 shrink-0" />
          : qzStatus === 'connecting'
          ? <Loader2 size={15} className="animate-spin text-yellow-600 shrink-0" />
          : <WifiOff size={15} className="text-gray-400 shrink-0" />}

        <span className={`font-medium ${
          qzStatus === 'connected' ? 'text-green-700' :
          qzStatus === 'connecting' ? 'text-yellow-700' : 'text-gray-500'
        }`}>
          {qzStatus === 'connected' ? 'QZ Tray connecté' :
           qzStatus === 'connecting' ? 'Connexion…' : 'QZ Tray non connecté — impression avec dialogue navigateur'}
        </span>

        {/* Sélecteur d'imprimante */}
        {qzStatus === 'connected' && printers.length > 0 && (
          <div className="relative ml-auto">
            <button
              onClick={() => setShowPrinters((p) => !p)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-green-200 rounded-lg text-green-800 hover:bg-green-50 transition text-xs font-medium"
            >
              <Printer size={13} />
              {selectedPrinter || 'Choisir imprimante'}
              <ChevronDown size={12} />
            </button>
            {showPrinters && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-[260px] py-1">
                {printers.map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePrinterChange(p)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition ${p === selectedPrinter ? 'font-semibold text-brand-600' : 'text-gray-700'}`}
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
            className="ml-auto text-xs font-medium text-brand-600 hover:text-brand-700 underline underline-offset-2"
          >
            Reconnecter
          </button>
        )}
        {qzStatus === 'connected' && (
          <button
            onClick={handleQzDisconnect}
            className="text-xs text-gray-400 hover:text-gray-600 transition"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* ── Sélecteur de modèle de ticket ────────────────────────────────── */}
      {(templates as any[]).length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm">
          <Ticket size={15} className="text-brand-500 shrink-0" />
          <span className="text-gray-600 font-medium shrink-0">Modèle de ticket</span>
          <div className="flex-1 max-w-xs">
            <SearchableSelect
              value={selectedTemplateId}
              onChange={setSelectedTemplateId}
              options={(templates as any[]).map((t: any) => ({
                value: t.id,
                label: t.name + (t.isDefault ? ' (par défaut)' : ''),
              }))}
            />
          </div>
          {activeTemplate && (
            <span className="text-xs text-gray-400 shrink-0">
              {activeTemplate.paperSize?.replace('_', ' ') ?? ''}
            </span>
          )}
        </div>
      )}

      {/* Onglets */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { key: 'sale', label: '+ Vente directe' },
          { key: 'search', label: '🔍 Rechercher une réservation' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── VENTE DIRECTE ─────────────────────────────────────────────────── */}
      {tab === 'sale' && (
        <div className="space-y-5">
          {/* Succès — ticket créé */}
          {soldBooking && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
              <CheckCircle size={20} className="text-green-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-green-800">Ticket créé avec succès !</p>
                <p className="text-sm text-green-700 mt-0.5">
                  Réf. <span className="font-mono">{soldBooking.reference}</span> — {soldBooking.passenger?.firstName} {soldBooking.passenger?.lastName}
                </p>
              </div>
              <button
                onClick={() => handleImmediatePrint(soldBooking)}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                <Printer size={15} />
                {qzStatus === 'connected' ? 'Imprimer' : 'Imprimer…'}
              </button>
              <button onClick={() => setSoldBooking(null)} className="text-green-600 hover:text-green-800 ml-1">
                <X size={16} />
              </button>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
            <h2 className="font-semibold text-gray-800">1. Choisir le voyage</h2>

            <div>
              <SearchableSelect
                value={selectedTripId}
                onChange={(v) => { setSelectedTripId(v); setSelectedSeats([]); }}
                placeholder="— Sélectionner un voyage du jour —"
                className={formErrors.trip ? 'border border-red-400 rounded-lg' : ''}
                options={availableTrips.map((t: any) => ({
                  value: t.id,
                  label: `${t.route?.originCity?.name ?? '?'} → ${t.route?.destinationCity?.name ?? '?'} — ${dayjs(t.departureAt).format('HH:mm')}`,
                  sub: `${formatCFA(t.price)} · ${t.availableSeats} places`,
                }))}
              />
              {formErrors.trip && <p className="text-red-500 text-xs mt-1">{formErrors.trip}</p>}
            </div>
          </div>

          {/* Sièges */}
          {selectedTrip && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
              <h2 className="font-semibold text-gray-800">2. Choisir les sièges</h2>
              {availableSeats.length === 0 ? (
                <p className="text-sm text-gray-500">Aucun siège disponible</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {seats.map((seat: any) => {
                    const isAvail = seat.status === 'AVAILABLE';
                    const isSelected = selectedSeats.includes(seat.seatNumber);
                    return (
                      <button
                        key={seat.id}
                        disabled={!isAvail}
                        onClick={() => isAvail && toggleSeat(seat.seatNumber)}
                        className={`w-10 h-10 rounded-lg border text-xs font-semibold transition-all ${
                          !isAvail
                            ? 'bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed'
                            : isSelected
                            ? 'bg-brand-500 border-brand-600 text-white shadow-md'
                            : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                        }`}
                        title={isAvail ? seat.seatNumber : `${seat.seatNumber} (${seat.status})`}
                      >
                        {seat.seatNumber}
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedSeats.length > 0 && (
                <p className="text-xs text-brand-600 font-medium">
                  Sièges sélectionnés : {selectedSeats.join(', ')} — Total : {formatCFA(selectedTrip.price * selectedSeats.length)}
                </p>
              )}
              {formErrors.seats && <p className="text-red-500 text-xs">{formErrors.seats}</p>}
            </div>
          )}

          {/* Infos passager */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">3. Informations passager</h2>
              <span className="text-xs text-gray-400 italic">optionnel</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Prénom</label>
                <input
                  value={form.firstName}
                  onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                  placeholder="Kouassi"
                  className={inputCls()}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nom</label>
                <input
                  value={form.lastName}
                  onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                  placeholder="Yao"
                  className={inputCls()}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Téléphone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+2250712345678"
                className={inputCls(formErrors.phone)}
              />
              {formErrors.phone && <p className="text-red-500 text-xs mt-1">{formErrors.phone}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Mode de paiement</label>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, paymentMethod: m.value }))}
                    className={`px-3 py-2 rounded-lg text-sm border transition-all ${
                      form.paymentMethod === m.value
                        ? 'border-brand-500 bg-brand-50 text-brand-700 font-medium'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleSell}
            disabled={selling}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 transition disabled:opacity-60 text-sm"
          >
            {selling ? (
              <><Loader2 size={16} className="animate-spin" /> Création en cours...</>
            ) : (
              <><Plus size={16} /> Créer et imprimer le ticket</>
            )}
          </button>
        </div>
      )}

      {/* ── RECHERCHE ─────────────────────────────────────────────────────── */}
      {tab === 'search' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Référence, téléphone ou nom du passager…"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={searching}
              className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition flex items-center gap-2 disabled:opacity-60"
            >
              {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              Chercher
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((b: any) => (
                <div key={b.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-medium text-gray-600">{b.reference}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        b.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                        b.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{b.status}</span>
                    </div>
                    <p className="font-semibold text-gray-900 mt-1">
                      {b.passenger?.firstName} {b.passenger?.lastName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {b.trip?.route?.originCity?.name} → {b.trip?.route?.destinationCity?.name} — {dayjs(b.trip?.departureAt).format('DD/MM HH:mm')} — Sièges : {b.seatNumbers?.join(', ')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-gray-900">{formatCFA(b.totalAmount)}</p>
                    <button
                      onClick={() => handlePrint(b)}
                      disabled={printingId === b.id}
                      className="mt-2 flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium disabled:opacity-50"
                    >
                      {printingId === b.id
                        ? <Loader2 size={14} className="animate-spin" />
                        : <Printer size={14} />}
                      Imprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {searchQ && !searching && searchResults.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <Search size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucune réservation trouvée pour « {searchQ} »</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
