'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { bookingsApi, stationsApi, tripsApi, ticketTemplatesApi, luggageApi, usersApi } from '@/lib/api';
import { qzConnect, qzDisconnect, qzIsActive, qzGetPrinters, qzGetDefault, qzPrintHTML } from '@/lib/qz';
import { formatCFA } from '@transpro/shared';
import { BusSeatMap } from '@/components/ui/BusSeatMap';
import {
  Search, Ticket, Loader2, CheckCircle, Plus, X,
  Printer, ChevronDown, Wifi, WifiOff, Luggage, Minus, CheckCircle2,
  Bus, Crown, Zap, Clock, MapPin, UserCheck, UserX, ReceiptText,
  ChevronLeft, CreditCard, Users,
} from 'lucide-react';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
dayjs.locale('fr');

// ── Print engine (inchangé) ────────────────────────────────────────────────────

const PAPER_SIZES: Record<string, { width: number; height: number; css: string; widthIn: number }> = {
  THERMAL_80: { width: 302, height: 529, css: '@page { size: 80mm 140mm; margin: 0; }', widthIn: 3.1496 },
  THERMAL_58: { width: 219, height: 529, css: '@page { size: 58mm 140mm; margin: 0; }', widthIn: 2.2835 },
  A4:         { width: 595, height: 842, css: '@page { size: A4 portrait; margin: 10mm; }', widthIn: 8.2677 },
};

const VARIABLES: Record<string, (booking: any, ticket: any) => string> = {
  '{{passenger_name}}':  (b)     => `${b.passenger?.firstName ?? ''} ${b.passenger?.lastName ?? ''}`.trim(),
  '{{passenger_phone}}': (b)     => b.passenger?.phone ?? '',
  '{{origin}}':          (b)     => b.trip?.route?.originCity?.name ?? '',
  '{{destination}}':     (b)     => b.trip?.route?.destinationCity?.name ?? '',
  '{{departure_date}}':  (b)     => dayjs(b.trip?.departureAt).format('DD/MM/YYYY'),
  '{{departure_time}}':  (b)     => dayjs(b.trip?.departureAt).format('HH:mm'),
  '{{seat_number}}':     (_b, t) => t?.seatNumber ?? '',
  '{{trip_class}}':      (b)     => b.trip?.tripClass ?? '',
  '{{price}}':           (b)     => formatCFA(Math.round((b.totalAmount ?? 0) / Math.max(1, b.seatNumbers?.length ?? 1))) as string,
  '{{booking_ref}}':     (b)     => b.reference ?? '',
  '{{company_name}}':    (b)     => b.trip?.tenant?.name ?? '',
};

function substituteVars(text: string, booking: any, ticket: any) {
  return Object.entries(VARIABLES).reduce((acc, [k, fn]) => acc.replaceAll(k, fn(booking, ticket)), text);
}

function renderEl(el: any, booking: any, ticket: any) {
  const s = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;box-sizing:border-box;`;
  if (el.type === 'text')  return `<div style="${s};font-size:${el.fontSize ?? 14}px;font-weight:${el.fontWeight ?? 'normal'};font-style:${el.fontStyle ?? 'normal'};text-align:${el.textAlign ?? 'left'};color:${el.color ?? '#000'};line-height:1.3;overflow:hidden;white-space:pre-wrap;word-break:break-word;">${substituteVars(el.content ?? '', booking, ticket)}</div>`;
  if (el.type === 'qrcode') return `<div style="${s}background:#fff;display:flex;align-items:center;justify-content:center;border:1px solid #e5e7eb;"><img src="${ticket?.qrCode ?? ''}" style="width:90%;height:90%;object-fit:contain;"/></div>`;
  if (el.type === 'image')  { const l = booking.trip?.tenant?.logo ?? ''; return l ? `<img src="${l}" style="${s}object-fit:contain;"/>` : `<div style="${s}background:#f9fafb;border:1px dashed #d1d5db;"></div>`; }
  if (el.type === 'rect')   return `<div style="${s}background:${el.bgColor ?? 'transparent'};border:${el.borderWidth ?? 1}px solid ${el.borderColor ?? '#d1d5db'};border-radius:${el.borderRadius ?? 0}px;"></div>`;
  if (el.type === 'line')   return `<div style="${s}background:${el.bgColor ?? '#d1d5db'};"></div>`;
  return '';
}

function buildTicketsHtml(booking: any, template: any) {
  const tickets: any[] = (booking.tickets ?? []).length > 0
    ? booking.tickets
    : (booking.seatNumbers ?? []).map((s: string) => ({ seatNumber: s, qrCode: '' }));
  const dims   = PAPER_SIZES[template.paperSize ?? 'THERMAL_80'];
  const layout = Array.isArray(template.layout) ? template.layout : [];
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${dims.css}*{margin:0;padding:0;box-sizing:border-box;}body{background:#f0f0f0;display:flex;flex-direction:column;align-items:center;padding:20px;gap:16px;font-family:Arial,sans-serif;}@media print{body{background:#fff;padding:0;gap:0;}.no-print{display:none!important;}}</style></head><body>
<div class="no-print" style="position:fixed;top:16px;right:16px;z-index:9999;"><button onclick="window.print()" style="background:#6366f1;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-size:14px;cursor:pointer;font-weight:600;">🖨️ Imprimer (${tickets.length} billet${tickets.length > 1 ? 's' : ''})</button></div>
${tickets.map((t: any) => `<div style="position:relative;width:${dims.width}px;height:${dims.height}px;background:#fff;page-break-after:always;">${layout.map((el: any) => renderEl(el, booking, t)).join('')}</div>`).join('')}
</body></html>`;
}

function openPrintPopup(booking: any, template: any) {
  const dims = PAPER_SIZES[template.paperSize ?? 'THERMAL_80'];
  const win  = window.open('', '_blank', `width=${dims.width + 80},height=${dims.height + 140}`);
  if (win) { win.document.write(buildTicketsHtml(booking, template)); win.document.close(); }
  else toast.error('Popup bloqué — autorisez les popups pour imprimer');
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CLASS_CONFIG: Record<string, { label: string; icon: React.ReactNode; border: string; badge: string }> = {
  VIP:      { label: 'VIP',      icon: <Crown size={11} />,  border: 'border-l-amber-400', badge: 'bg-amber-100 text-amber-700' },
  EXPRESS:  { label: 'Express',  icon: <Zap size={11} />,    border: 'border-l-blue-400',  badge: 'bg-blue-100  text-blue-700' },
  STANDARD: { label: 'Standard', icon: <Bus size={11} />,    border: 'border-l-gray-300',  badge: 'bg-gray-100  text-gray-600' },
};

const PAY_METHODS = [
  { value: 'CASH',         label: 'Espèces',      emoji: '💵' },
  { value: 'ORANGE_MONEY', label: 'Orange Money', emoji: '🟠' },
  { value: 'MTN_MOMO',     label: 'MTN MoMo',     emoji: '🟡' },
  { value: 'WAVE',         label: 'Wave',          emoji: '🔵' },
];

type SaleStep = 'idle' | 'selecting-seats' | 'passenger-info' | 'done';

// ── Stepper ───────────────────────────────────────────────────────────────────

function Stepper({ step }: { step: SaleStep }) {
  const steps = [
    { key: 'idle',            label: 'Voyage' },
    { key: 'selecting-seats', label: 'Sièges' },
    { key: 'passenger-info',  label: 'Passager' },
    { key: 'done',            label: 'Confirmation' },
  ];
  const idx = steps.findIndex((s) => s.key === step);
  return (
    <div className="flex items-center gap-0 mb-2">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center">
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
            i === idx
              ? 'bg-brand-500 text-white'
              : i < idx
              ? 'text-brand-600'
              : 'text-gray-400'
          }`}>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
              i < idx ? 'bg-brand-100 text-brand-600' : i === idx ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'
            }`}>
              {i < idx ? '✓' : i + 1}
            </span>
            {s.label}
          </div>
          {i < steps.length - 1 && (
            <div className={`w-5 h-px mx-0.5 ${i < idx ? 'bg-brand-300' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── QZ bar ─────────────────────────────────────────────────────────────────────

function QzBar({
  status, printers, selectedPrinter, showPrinters, onConnect, onDisconnect, onPrinterChange, onTogglePrinters,
}: {
  status: 'disconnected' | 'connecting' | 'connected';
  printers: string[]; selectedPrinter: string; showPrinters: boolean;
  onConnect: () => void; onDisconnect: () => void;
  onPrinterChange: (p: string) => void; onTogglePrinters: () => void;
}) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs ${
      status === 'connected' ? 'bg-green-50 border-green-200' :
      status === 'connecting' ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'
    }`}>
      {status === 'connected'  ? <Wifi size={12} className="text-green-600 shrink-0" /> :
       status === 'connecting' ? <Loader2 size={12} className="animate-spin text-yellow-600 shrink-0" /> :
                                 <WifiOff size={12} className="text-gray-400 shrink-0" />}
      <span className={`font-medium ${
        status === 'connected' ? 'text-green-700' : status === 'connecting' ? 'text-yellow-700' : 'text-gray-500'
      }`}>
        {status === 'connected' ? 'QZ Tray' : status === 'connecting' ? 'Connexion…' : 'QZ non connecté'}
      </span>

      {status === 'connected' && printers.length > 0 && (
        <div className="relative ml-1">
          <button onClick={onTogglePrinters}
            className="flex items-center gap-1 px-2 py-0.5 bg-white border border-green-200 rounded-lg text-green-800 hover:bg-green-50 transition font-medium">
            <Printer size={10} />
            <span className="max-w-[120px] truncate">{selectedPrinter || 'Choisir'}</span>
            <ChevronDown size={9} />
          </button>
          {showPrinters && (
            <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-[200px] py-1">
              {printers.map((p) => (
                <button key={p} onClick={() => onPrinterChange(p)}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 transition ${p === selectedPrinter ? 'font-semibold text-brand-600' : 'text-gray-700'}`}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {status === 'disconnected' && (
        <button onClick={onConnect} className="ml-1 text-brand-600 hover:text-brand-700 underline underline-offset-2 font-medium">Connecter</button>
      )}
      {status === 'connected' && (
        <button onClick={onDisconnect} className="ml-auto text-gray-400 hover:text-gray-600"><X size={11} /></button>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StationGuichetPage() {
  const { stationId } = useParams<{ stationId: string }>();

  // ── Flow ──
  const [step, setStep]                 = useState<SaleStep>('idle');
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [seats, setSeats]               = useState<any[]>([]);
  const [selectedSeats, setSelectedSeats]   = useState<string[]>([]);
  const [passengerCount, setPassengerCount] = useState(1);
  const [passenger, setPassenger]           = useState({ firstName: '', lastName: '', phone: '', email: '' });
  const [payMethod, setPayMethod]           = useState('CASH');
  const [loading, setLoading]           = useState(false);
  const [booking, setBooking]           = useState<any>(null);
  const [search, setSearch]             = useState('');

  // ── Passenger lookup ──
  type PassengerFound = { id: string; firstName: string; lastName: string; email: string; phone: string; avatar?: string };
  const [lookup, setLookup] = useState<{ loading: boolean; found: PassengerFound | null; notFound: boolean }>({
    loading: false, found: null, notFound: false,
  });
  const lookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const phone = passenger.phone;
    if (lookupTimer.current) clearTimeout(lookupTimer.current);
    if (!phone || phone.replace(/\D/g, '').length < 8) {
      setLookup({ loading: false, found: null, notFound: false });
      return;
    }
    setLookup((s) => ({ ...s, loading: true, found: null, notFound: false }));
    lookupTimer.current = setTimeout(async () => {
      try {
        const user = await usersApi.lookupByPhone(phone) as unknown as PassengerFound | null;
        if (user?.id) {
          setLookup({ loading: false, found: user, notFound: false });
          setPassenger((p) => ({ ...p, firstName: user.firstName, lastName: user.lastName }));
        } else {
          setLookup({ loading: false, found: null, notFound: true });
        }
      } catch {
        setLookup({ loading: false, found: null, notFound: false });
      }
    }, 500);
    return () => { if (lookupTimer.current) clearTimeout(lookupTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passenger.phone]);

  // ── Bagages ──
  const [luggageOpen,     setLuggageOpen]     = useState(false);
  const [luggageBags,     setLuggageBags]     = useState(1);
  const [luggageWeight,   setLuggageWeight]   = useState('');
  const [luggageDeclared, setLuggageDeclared] = useState(false);

  // ── Templates ──
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // ── QZ Tray ──
  const [qzStatus, setQzStatus]           = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [printers, setPrinters]           = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('qz_printer') ?? '' : ''
  );
  const [showPrinters, setShowPrinters]   = useState(false);
  const [printing, setPrinting]           = useState(false);

  // ── Queries ──
  const { data: trips = [] } = useQuery<any[]>({
    queryKey: ['station-today-trips', stationId],
    queryFn:  async () => ((await stationsApi.getTodayTrips(stationId)) ?? []) as any[],
    refetchInterval: 30_000,
  });

  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ['ticket-templates'],
    queryFn:  async () => ((await ticketTemplatesApi.list()) ?? []) as any[],
  });

  const activeTemplate: any =
    (templates as any[]).find((t: any) => t.id === selectedTemplateId) ??
    (templates as any[]).find((t: any) => t.isDefault) ??
    (templates as any[])[0] ?? null;

  useEffect(() => {
    if ((templates as any[]).length > 0 && !selectedTemplateId) {
      const def = (templates as any[]).find((t: any) => t.isDefault) ?? (templates as any[])[0];
      if (def) setSelectedTemplateId(def.id);
    }
  }, [templates, selectedTemplateId]);

  // ── QZ Tray ──
  const handleQzConnect = useCallback(async () => {
    setQzStatus('connecting');
    try {
      await qzConnect();
      const list = await qzGetPrinters();
      setPrinters(list);
      const saved = localStorage.getItem('qz_printer');
      const def   = saved && list.includes(saved) ? saved : await qzGetDefault();
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

  useEffect(() => { handleQzConnect().catch(() => {}); }, [handleQzConnect]);

  // ── Print ──
  async function handlePrint() {
    if (!activeTemplate) { toast.error('Aucun modèle de ticket configuré.'); return; }
    if (!booking) return;
    let printable = booking;
    if (!booking.tickets?.length) {
      setPrinting(true);
      try { printable = await bookingsApi.get(booking.id) as any; }
      catch { toast.error('Erreur chargement tickets'); setPrinting(false); return; }
      setPrinting(false);
    }
    const dims = PAPER_SIZES[activeTemplate.paperSize ?? 'THERMAL_80'];
    if (qzStatus === 'connected' && selectedPrinter) {
      try { await qzPrintHTML(buildTicketsHtml(printable, activeTemplate), selectedPrinter, dims.widthIn); toast.success('Impression envoyée'); }
      catch (e: any) { toast.error(`QZ Tray : ${e?.message ?? "Erreur d'impression"}`); }
    } else {
      openPrintPopup(printable, activeTemplate);
    }
  }

  // ── Flow ──
  const effectiveASM = (trip: any) => trip.advancedSeatManagement ?? trip.vehicle?.advancedSeatManagement ?? true;

  const filteredTrips = trips.filter((t) => {
    const q = search.toLowerCase();
    return !q
      || t.route?.originCity?.name?.toLowerCase().includes(q)
      || t.route?.destinationCity?.name?.toLowerCase().includes(q)
      || t.vehicle?.plate?.toLowerCase().includes(q);
  });

  async function selectTrip(trip: any) {
    setSelectedTrip(trip);
    setSelectedSeats([]);
    setPassengerCount(1);
    if (effectiveASM(trip)) {
      try {
        const s = await tripsApi.getSeats(trip.id) as any;
        setSeats(Array.isArray(s) ? s : []);
      } catch { setSeats([]); }
      setStep('selecting-seats');
    } else {
      setStep('selecting-seats');
    }
  }

  function toggleSeat(seatNumber: string) {
    setSelectedSeats((prev) =>
      prev.includes(seatNumber) ? prev.filter((s) => s !== seatNumber) : [...prev, seatNumber],
    );
  }

  async function handleSell(e: React.FormEvent) {
    e.preventDefault();
    const isAdvanced = effectiveASM(selectedTrip);
    if (isAdvanced && selectedSeats.length === 0) return;
    setLoading(true);
    try {
      const payload: any = {
        tripId: selectedTrip.id,
        firstName: passenger.firstName || undefined,
        lastName:  passenger.lastName  || undefined,
        phone:     passenger.phone     || undefined,
        email:     passenger.email     || undefined,
        paymentMethod: payMethod,
        stationId,
      };
      if (isAdvanced) { payload.seatNumbers = selectedSeats; }
      else { payload.passengerCount = passengerCount; payload.seatNumbers = []; }
      const result = await bookingsApi.guichet(payload) as any;
      setBooking(result);
      setStep('done');
      toast.success('Billet vendu avec succès !');
      if (qzIsActive() && selectedPrinter && activeTemplate) {
        const dims = PAPER_SIZES[activeTemplate.paperSize ?? 'THERMAL_80'];
        await qzPrintHTML(buildTicketsHtml(result, activeTemplate), selectedPrinter, dims.widthIn)
          .catch((err: any) => toast.error(`QZ Tray : ${err?.message ?? "Erreur d'impression automatique"}`));
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
    setPassengerCount(1);
    setPassenger({ firstName: '', lastName: '', phone: '', email: '' });
    setPayMethod('CASH');
    setBooking(null);
    setSearch('');
    setLuggageOpen(false);
    setLuggageBags(1);
    setLuggageWeight('');
    setLuggageDeclared(false);
    setLookup({ loading: false, found: null, notFound: false });
  }

  const declareLugMut = useMutation({
    mutationFn: () => luggageApi.declare({
      bookingId:     booking?.id,
      bagCount:      luggageBags,
      totalWeightKg: luggageWeight ? parseFloat(luggageWeight) : undefined,
      freeWeightKg:  20,
    }),
    onSuccess: () => setLuggageDeclared(true),
    onError:   (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur déclaration bagages'),
  });

  const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white transition';

  // ── DONE ──────────────────────────────────────────────────────────────────────
  if (step === 'done' && booking) {
    const tc = booking.trip?.tripClass ?? 'STANDARD';
    const cc = CLASS_CONFIG[tc] ?? CLASS_CONFIG.STANDARD;
    return (
      <div className="p-6 max-w-lg mx-auto space-y-4">
        {/* Receipt header */}
        <div className={`rounded-2xl p-5 bg-gradient-to-br ${
          tc === 'VIP' ? 'from-amber-500 to-amber-600' :
          tc === 'EXPRESS' ? 'from-blue-500 to-blue-600' :
          'from-brand-500 to-brand-600'
        } text-white`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle size={16} className="opacity-90" />
                <span className="text-sm font-medium opacity-90">Vente confirmée</span>
              </div>
              <p className="text-2xl font-bold tracking-tight">
                {booking.trip?.route?.originCity?.name} → {booking.trip?.route?.destinationCity?.name}
              </p>
              <p className="text-sm opacity-80 mt-0.5">
                {dayjs(booking.trip?.departureAt).format('dddd D MMMM · HH:mm')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-70 mb-0.5">Réf.</p>
              <p className="font-mono text-sm font-bold bg-white/20 px-2 py-0.5 rounded-lg">{booking.reference}</p>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-2 divide-x divide-y divide-gray-100">
            {[
              { label: 'Voyageur', value: `${booking.passenger?.firstName ?? '—'} ${booking.passenger?.lastName ?? ''}`.trim() || '—' },
              { label: 'Sièges',   value: booking.seatNumbers?.join(', ') || '—' },
              { label: 'Départ',   value: dayjs(booking.trip?.departureAt).format('DD/MM HH:mm') },
              { label: 'Véhicule', value: booking.trip?.vehicle?.plate ?? '—' },
              { label: 'Montant',  value: formatCFA(booking.totalAmount) as string },
              { label: 'Paiement', value: (booking.payment?.method ?? payMethod).replace('_', ' ') },
            ].map(({ label, value }) => (
              <div key={label} className="px-4 py-3">
                <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">{label}</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5 truncate">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bagages */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <button type="button" onClick={() => setLuggageOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Luggage size={15} className="text-purple-500" />
              <span className="font-medium">Bagages</span>
              <span className="text-xs text-gray-400">(optionnel)</span>
              {luggageDeclared && <CheckCircle2 size={13} className="text-green-500" />}
            </div>
            <ChevronDown size={13} className={`text-gray-400 transition-transform ${luggageOpen ? 'rotate-180' : ''}`} />
          </button>
          {luggageOpen && (
            <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
              {luggageDeclared ? (
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <CheckCircle2 size={15} className="text-green-500" />
                  {luggageBags} sac{luggageBags > 1 ? 's' : ''} déclaré{luggageBags > 1 ? 's' : ''}{luggageWeight && ` · ${luggageWeight} kg`}
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Nombre de sacs</p>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setLuggageBags(Math.max(0, luggageBags - 1))}
                        className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50">
                        <Minus size={12} />
                      </button>
                      <span className="w-6 text-center font-bold">{luggageBags}</span>
                      <button onClick={() => setLuggageBags(Math.min(20, luggageBags + 1))}
                        className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50">
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Poids total (kg) — franchise 20 kg</p>
                    <input type="number" value={luggageWeight} onChange={(e) => setLuggageWeight(e.target.value)}
                      placeholder="Ex: 25" min="0" step="0.5"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                    {parseFloat(luggageWeight) > 20 && (
                      <p className="mt-1 text-xs text-amber-600">
                        Excédent {(parseFloat(luggageWeight) - 20).toFixed(1)} kg → {formatCFA(Math.round((parseFloat(luggageWeight) - 20) * 300))}
                      </p>
                    )}
                  </div>
                  <button onClick={() => declareLugMut.mutate()}
                    disabled={declareLugMut.isPending || luggageBags === 0}
                    className="w-full py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-sm font-medium transition disabled:opacity-50 flex items-center justify-center gap-1.5">
                    {declareLugMut.isPending
                      ? <><Loader2 size={13} className="animate-spin" /> Déclaration...</>
                      : <><Luggage size={13} /> Déclarer</>}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Config impression */}
        <div className="space-y-2">
          <QzBar
            status={qzStatus} printers={printers} selectedPrinter={selectedPrinter}
            showPrinters={showPrinters} onConnect={handleQzConnect} onDisconnect={handleQzDisconnect}
            onPrinterChange={(p) => { setSelectedPrinter(p); localStorage.setItem('qz_printer', p); setShowPrinters(false); }}
            onTogglePrinters={() => setShowPrinters((v) => !v)}
          />
          {(templates as any[]).length > 0 && (
            <SearchableSelect value={selectedTemplateId} onChange={setSelectedTemplateId}
              options={(templates as any[]).map((t: any) => ({
                value: t.id, label: t.name + (t.isDefault ? ' (par défaut)' : ''), sub: t.paperSize?.replace('_', ' '),
              }))} />
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={handlePrint} disabled={printing || !activeTemplate}
            className="flex-1 flex items-center justify-center gap-2 border border-gray-200 text-gray-700 rounded-xl py-3 text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50">
            {printing ? <><Loader2 size={14} className="animate-spin" /> Chargement...</> : <><Printer size={14} /> {qzStatus === 'connected' && selectedPrinter ? 'Imprimer' : 'Aperçu / Imprimer'}</>}
          </button>
          <button onClick={reset}
            className="flex-1 bg-brand-500 hover:bg-brand-600 text-white rounded-xl py-3 text-sm font-semibold transition flex items-center justify-center gap-2">
            <Plus size={14} /> Nouvelle vente
          </button>
        </div>
      </div>
    );
  }

  // ── PASSENGER INFO ────────────────────────────────────────────────────────────
  if (step === 'passenger-info') {
    const isAdvanced = effectiveASM(selectedTrip);
    const total = isAdvanced
      ? selectedTrip.price * selectedSeats.length
      : selectedTrip.price * passengerCount;
    return (
      <div className="p-6 max-w-lg mx-auto space-y-5">
        <div>
          <Stepper step={step} />
          <div className="flex items-center gap-3 mt-2">
            <button onClick={() => setStep('selecting-seats')}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
              <ChevronLeft size={16} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Informations passager</h1>
              <p className="text-xs text-gray-400">
                {isAdvanced ? `Sièges : ${selectedSeats.join(', ')}` : `${passengerCount} place${passengerCount > 1 ? 's' : ''}`}
                {' · '}<span className="font-semibold text-brand-600">{formatCFA(total)}</span>
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSell} className="space-y-4">
          {/* Phone + lookup */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Users size={14} className="text-brand-500" /> Coordonnées
              <span className="text-xs font-normal text-gray-400">(optionnel)</span>
            </h2>
            <div className="relative">
              <PhoneInput value={passenger.phone}
                onChange={(v) => {
                  setPassenger((p) => ({ ...p, phone: v, firstName: '', lastName: '' }));
                  setLookup({ loading: false, found: null, notFound: false });
                }} />
              {lookup.loading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 size={14} className="animate-spin text-gray-400" />
                </div>
              )}
            </div>

            {lookup.found && (
              <div className="flex items-center gap-3 px-3 py-2.5 bg-green-50 border border-green-200 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  {lookup.found.avatar
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={lookup.found.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                    : <span className="text-xs font-bold text-green-700">{lookup.found.firstName?.[0]}{lookup.found.lastName?.[0]}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-green-800 truncate">{lookup.found.firstName} {lookup.found.lastName}</p>
                  <p className="text-xs text-green-600 truncate">{lookup.found.email}</p>
                </div>
                <div className="flex items-center gap-1 text-green-600 shrink-0">
                  <UserCheck size={13} />
                  <span className="text-xs font-medium">Identifié</span>
                </div>
              </div>
            )}

            {lookup.notFound && (
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl">
                <UserX size={13} className="text-gray-400 shrink-0" />
                <p className="text-xs text-gray-500">Numéro inconnu — un compte passager sera créé automatiquement.</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Prénom</label>
                <input value={passenger.firstName}
                  onChange={(e) => setPassenger((p) => ({ ...p, firstName: e.target.value }))}
                  placeholder="Kouassi" readOnly={!!lookup.found}
                  className={`${inputCls} ${lookup.found ? 'bg-gray-50 text-gray-500 cursor-default' : ''}`} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nom</label>
                <input value={passenger.lastName}
                  onChange={(e) => setPassenger((p) => ({ ...p, lastName: e.target.value }))}
                  placeholder="Yao" readOnly={!!lookup.found}
                  className={`${inputCls} ${lookup.found ? 'bg-gray-50 text-gray-500 cursor-default' : ''}`} />
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <CreditCard size={14} className="text-brand-500" /> Mode de paiement
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {PAY_METHODS.map((m) => (
                <button key={m.value} type="button" onClick={() => setPayMethod(m.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all ${
                    payMethod === m.value
                      ? 'border-brand-500 bg-brand-50 text-brand-700 font-semibold'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}>
                  <span>{m.emoji}</span> {m.label}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl py-3.5 transition flex items-center justify-center gap-2 disabled:opacity-70 text-sm">
            {loading
              ? <><Loader2 size={15} className="animate-spin" /> Enregistrement...</>
              : (() => {
                  const count = isAdvanced ? selectedSeats.length : passengerCount;
                  return <><Ticket size={15} /> Émettre {count > 1 ? `${count} billets` : 'le billet'} · {formatCFA(total)}</>;
                })()
            }
          </button>
        </form>
      </div>
    );
  }

  // ── SEAT SELECTION ────────────────────────────────────────────────────────────
  if (step === 'selecting-seats') {
    const isAdvanced = effectiveASM(selectedTrip);
    const total = isAdvanced
      ? selectedTrip.price * selectedSeats.length
      : selectedTrip.price * passengerCount;
    const tc = selectedTrip?.tripClass ?? 'STANDARD';
    const cc = CLASS_CONFIG[tc] ?? CLASS_CONFIG.STANDARD;
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-5">
        <div>
          <Stepper step={step} />
          <div className="flex items-center gap-3 mt-2">
            <button onClick={() => setStep('idle')}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
              <ChevronLeft size={16} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                {isAdvanced ? 'Choisir les sièges' : 'Nombre de passagers'}
              </h1>
              <p className="text-xs text-gray-400">
                {selectedTrip?.route?.originCity?.name} → {selectedTrip?.route?.destinationCity?.name}
                {' · '}{dayjs(selectedTrip?.departureAt).format('HH:mm')}
                {' · '}<span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${cc.badge}`}>{cc.icon} {cc.label}</span>
              </p>
            </div>
          </div>
        </div>

        {isAdvanced ? (
          seats.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Loader2 size={24} className="animate-spin mx-auto mb-2" />
              <p className="text-sm">Chargement des sièges…</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="overflow-x-auto flex justify-center">
                <BusSeatMap seats={seats} selectedSeats={selectedSeats} onToggle={toggleSeat} tripClass={tc} />
              </div>
            </div>
          )
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 font-medium">Nombre de places</span>
              <span className="text-xs text-gray-400">{selectedTrip.availableSeats} disponibles</span>
            </div>
            <div className="flex items-center justify-center gap-6">
              <button type="button" onClick={() => setPassengerCount((n) => Math.max(1, n - 1))}
                className="w-10 h-10 rounded-full border-2 border-gray-200 text-gray-600 text-xl font-bold hover:border-brand-300 hover:text-brand-600 transition flex items-center justify-center">−</button>
              <span className="text-4xl font-bold text-gray-900 w-12 text-center tabular-nums">{passengerCount}</span>
              <button type="button" onClick={() => setPassengerCount((n) => Math.min(selectedTrip.availableSeats, n + 1))}
                className="w-10 h-10 rounded-full border-2 border-gray-200 text-gray-600 text-xl font-bold hover:border-brand-300 hover:text-brand-600 transition flex items-center justify-center">+</button>
            </div>
            <p className="text-center text-xs text-gray-400">Mode sans numérotation des sièges</p>
          </div>
        )}

        {(isAdvanced ? selectedSeats.length > 0 : passengerCount > 0) && (
          <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4 flex items-center justify-between">
            <div>
              {isAdvanced ? (
                <>
                  <p className="text-sm font-semibold text-gray-800">
                    {selectedSeats.length} siège{selectedSeats.length > 1 ? 's' : ''} : {selectedSeats.join(', ')}
                  </p>
                  <p className="text-xs text-gray-500">@ {formatCFA(selectedTrip.price)} / siège</p>
                </>
              ) : (
                <p className="text-sm font-semibold text-gray-800">{passengerCount} passager{passengerCount > 1 ? 's' : ''}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-brand-600">{formatCFA(total)}</span>
              <button onClick={() => setStep('passenger-info')}
                className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition">
                Continuer →
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── IDLE / TRIP LIST ──────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Stepper step={step} />
          <h1 className="text-xl font-bold text-gray-900 mt-2">Guichet</h1>
          <p className="text-sm text-gray-400">Sélectionner un voyage du jour</p>
        </div>
        <div className="flex flex-col gap-2 shrink-0 min-w-0">
          {(templates as any[]).length > 0 && (
            <SearchableSelect value={selectedTemplateId} onChange={setSelectedTemplateId} className="min-w-[160px]"
              options={(templates as any[]).map((t: any) => ({ value: t.id, label: t.name + (t.isDefault ? ' ★' : '') }))} />
          )}
          <QzBar
            status={qzStatus} printers={printers} selectedPrinter={selectedPrinter}
            showPrinters={showPrinters} onConnect={handleQzConnect} onDisconnect={handleQzDisconnect}
            onPrinterChange={(p) => { setSelectedPrinter(p); localStorage.setItem('qz_printer', p); setShowPrinters(false); }}
            onTogglePrinters={() => setShowPrinters((v) => !v)}
          />
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une destination, un véhicule…"
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
      </div>

      {/* Trip cards */}
      <div className="space-y-2.5">
        {filteredTrips.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Bus size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucun voyage disponible aujourd'hui</p>
          </div>
        )}
        {filteredTrips.map((trip) => {
          const avail    = trip.availableSeats > 0 && ['SCHEDULED', 'BOARDING'].includes(trip.status);
          const tc       = trip.tripClass ?? 'STANDARD';
          const cc       = CLASS_CONFIG[tc] ?? CLASS_CONFIG.STANDARD;
          const depTime  = dayjs(trip.departureAt);
          const isBoarding = trip.status === 'BOARDING';

          return (
            <button key={trip.id} onClick={() => avail && selectTrip(trip)} disabled={!avail}
              className={`w-full text-left bg-white rounded-2xl border-l-4 border border-gray-100 p-4 transition-all ${
                avail
                  ? `${cc.border} hover:shadow-md hover:border-gray-200 cursor-pointer`
                  : 'border-l-gray-200 opacity-40 cursor-not-allowed'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                {/* Left */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${cc.badge}`}>
                      {cc.icon} {cc.label}
                    </span>
                    {isBoarding && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                        ● Embarquement
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-gray-900 text-base truncate">
                    {trip.route?.originCity?.name} → {trip.route?.destinationCity?.name}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock size={11} /> {depTime.format('HH:mm')}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={11} /> {trip.vehicle?.plate ?? '—'}
                    </span>
                    {trip.vehicle?.brand && (
                      <span className="text-gray-400">{trip.vehicle.brand} {trip.vehicle.model ?? ''}</span>
                    )}
                  </div>
                </div>

                {/* Right */}
                <div className="shrink-0 text-right">
                  <p className="text-lg font-bold text-brand-600">{formatCFA(trip.price)}</p>
                  <div className={`mt-1 px-2.5 py-1 rounded-xl text-xs font-semibold ${
                    trip.availableSeats === 0
                      ? 'bg-red-50 text-red-600'
                      : trip.availableSeats <= 5
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-green-50 text-green-700'
                  }`}>
                    {trip.availableSeats} place{trip.availableSeats !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
