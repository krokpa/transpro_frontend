'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { stationsApi, ticketTemplatesApi, bookingsApi, luggageApi } from '@/lib/api';
import { BookingStatus } from '@transpro/shared';
import { formatCFA } from '@transpro/shared';
import { Search, Printer, Ticket, Luggage, X, Plus, Minus, Loader2, ChevronDown, CheckCircle2 } from 'lucide-react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { usePagination } from '@/hooks/usePagination';

const statusConfig: Record<BookingStatus, { label: string; className: string }> = {
  PENDING: { label: 'En attente', className: 'bg-yellow-100 text-yellow-700' },
  CONFIRMED: { label: 'Confirmé', className: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Annulé', className: 'bg-red-100 text-red-700' },
  COMPLETED: { label: 'Terminé', className: 'bg-gray-100 text-gray-700' },
  NO_SHOW: { label: 'Absent', className: 'bg-orange-100 text-orange-700' },
};

const PAPER_SIZES: Record<string, { width: number; height: number; css: string }> = {
  THERMAL_80: { width: 302, height: 529, css: '@page { size: 80mm 140mm; margin: 0; }' },
  THERMAL_58: { width: 219, height: 529, css: '@page { size: 58mm 140mm; margin: 0; }' },
  A4:         { width: 595, height: 842, css: '@page { size: A4 portrait; margin: 10mm; }' },
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
    const textStyle = [style, `font-size:${el.fontSize ?? 14}px`, `font-weight:${el.fontWeight ?? 'normal'}`,
      `font-style:${el.fontStyle ?? 'normal'}`, `text-align:${el.textAlign ?? 'left'}`,
      `color:${el.color ?? '#000'}`, 'line-height:1.3', 'overflow:hidden', 'white-space:pre-wrap', 'word-break:break-word',
    ].join(';');
    return `<div style="${textStyle}">${substituteVars(el.content ?? '', booking, ticket)}</div>`;
  }
  if (el.type === 'qrcode') {
    return `<div style="${style}background:#fff;display:flex;align-items:center;justify-content:center;border:1px solid #e5e7eb;">
      <img src="${ticket?.qrCode ?? ''}" style="width:90%;height:90%;object-fit:contain;" />
    </div>`;
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

function openPrintWindow(booking: any, template: any) {
  const dims = PAPER_SIZES[template.paperSize ?? 'THERMAL_80'];
  const layout: any[] = Array.isArray(template.layout) ? template.layout : [];
  const tickets: any[] = booking.tickets ?? [];
  const ticketGroups = tickets.length > 0
    ? tickets
    : (booking.seatNumbers ?? []).map((s: string) => ({ seatNumber: s, qrCode: '' }));

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Tickets — ${booking.reference}</title>
  <style>${dims.css}*{margin:0;padding:0;box-sizing:border-box;}body{background:#f0f0f0;display:flex;flex-direction:column;align-items:center;padding:20px;gap:16px;font-family:Arial,sans-serif;}
  @media print{body{background:white;padding:0;gap:0;}.no-print{display:none!important;}}.ticket-wrapper{box-shadow:0 2px 12px rgba(0,0,0,0.15);}</style></head>
  <body><div class="no-print" style="position:fixed;top:16px;right:16px;z-index:9999;">
  <button onclick="window.print()" style="background:#6366f1;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-size:14px;cursor:pointer;font-weight:600;">🖨️ Imprimer</button></div>
  ${ticketGroups.map((ticket: any) => `<div class="ticket-wrapper" style="position:relative;width:${dims.width}px;height:${dims.height}px;background:#fff;page-break-after:always;">${layout.map((el: any) => renderElementHtml(el, booking, ticket)).join('')}</div>`).join('')}
  </body></html>`;

  const win = window.open('', '_blank', `width=${dims.width + 80},height=${dims.height + 120}`);
  if (win) { win.document.write(html); win.document.close(); }
  else toast.error('Popup bloqué — autorisez les popups pour imprimer');
}

// ── Luggage declaration modal ─────────────────────────────────────────────────

const FREE_WEIGHT = 20;
const EXCESS_RATE = 300;

function LuggageModal({ booking, onClose }: { booking: any; onClose: () => void }) {
  const [bagCount,      setBagCount]      = useState(1);
  const [totalWeight,   setTotalWeight]   = useState('');
  const [declared,      setDeclared]      = useState(false);

  const excessKg  = Math.max(0, (parseFloat(totalWeight) || 0) - FREE_WEIGHT);
  const excessFee = Math.round(excessKg * EXCESS_RATE);

  const declareMut = useMutation({
    mutationFn: () => luggageApi.declare({
      bookingId:      booking.id,
      bagCount,
      totalWeightKg:  totalWeight ? parseFloat(totalWeight) : undefined,
      freeWeightKg:   FREE_WEIGHT,
    }),
    onSuccess: () => setDeclared(true),
    onError:   (e: any) => alert(e?.response?.data?.message ?? 'Erreur lors de la déclaration'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Luggage size={18} className="text-brand-500" />
            <span className="font-semibold text-gray-900 text-sm">Déclarer les bagages</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={18} />
          </button>
        </div>

        {declared ? (
          <div className="px-5 py-8 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 size={40} className="text-green-500" />
            <p className="font-semibold text-gray-900">Bagages déclarés</p>
            <p className="text-xs text-gray-400">
              {bagCount} sac{bagCount > 1 ? 's' : ''} enregistré{bagCount > 1 ? 's' : ''} pour{' '}
              <strong>{booking.passenger?.firstName} {booking.passenger?.lastName}</strong>
            </p>
            <button onClick={onClose}
              className="mt-2 px-5 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium">
              Fermer
            </button>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-4">
            {/* Passenger info */}
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600">
              <p className="font-medium">{booking.passenger?.firstName} {booking.passenger?.lastName}</p>
              <p className="font-mono text-gray-400">{booking.reference} · {booking.tickets?.map((t: any) => t.seatNumber).join(', ')}</p>
            </div>

            {/* Bag count */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Nombre de sacs</label>
              <div className="flex items-center gap-3">
                <button onClick={() => setBagCount(Math.max(0, bagCount - 1))}
                  className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition">
                  <Minus size={14} />
                </button>
                <span className="w-8 text-center font-bold text-lg">{bagCount}</span>
                <button onClick={() => setBagCount(Math.min(20, bagCount + 1))}
                  className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition">
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Weight */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Poids total (kg) <span className="text-gray-400 font-normal">— franchise {FREE_WEIGHT} kg</span>
              </label>
              <input type="number" value={totalWeight}
                onChange={(e) => setTotalWeight(e.target.value)}
                placeholder="Ex: 25"
                min="0" step="0.5"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Excess fee */}
            {excessKg > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs">
                <p className="text-amber-700">
                  Excédent : <strong>{excessKg} kg</strong> × {EXCESS_RATE} F = <strong>{formatCFA(excessFee)}</strong>
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={onClose}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
                Ignorer
              </button>
              <button onClick={() => declareMut.mutate()}
                disabled={declareMut.isPending || bagCount === 0}
                className="flex-1 py-2.5 bg-brand-500 text-white rounded-lg text-sm font-semibold hover:bg-brand-600 transition disabled:opacity-50 flex items-center justify-center gap-1.5">
                {declareMut.isPending ? <><Loader2 size={14} className="animate-spin" /> Déclaration...</> : 'Déclarer'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function StationReservationsPage() {
  const { stationId } = useParams<{ stationId: string }>();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [declaringBooking, setDeclaringBooking] = useState<any | null>(null);
  const pagination = usePagination();

  const { data, isLoading } = useQuery({
    queryKey: ['station-bookings', stationId, statusFilter, pagination.page, search],
    queryFn: async () => (await stationsApi.getBookings(stationId, {
      status: statusFilter || undefined,
      page: pagination.page,
      limit: pagination.limit,
      search: search || undefined,
    })) as any,
    refetchInterval: 15_000,
  });

  const { data: defaultTemplate } = useQuery({
    queryKey: ['ticket-template-default'],
    queryFn: () => ticketTemplatesApi.getDefault() as any,
  });

  async function handlePrint(booking: any) {
    if (!defaultTemplate) {
      toast.error('Aucun modèle de ticket par défaut');
      return;
    }
    setPrintingId(booking.id);
    try {
      const full = await bookingsApi.get(booking.id) as any;
      openPrintWindow(full, defaultTemplate);
    } catch {
      toast.error('Erreur lors du chargement de la réservation');
    } finally {
      setPrintingId(null);
    }
  }

  const bookings: any[] = (data as any)?.data ?? [];
  const meta = (data as any)?.meta;

  return (
    <div className="p-6 space-y-5">
      {declaringBooking && (
        <LuggageModal booking={declaringBooking} onClose={() => setDeclaringBooking(null)} />
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Réservations</h1>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher (réf, nom, téléphone)"
            value={search}
            onChange={(e) => { setSearch(e.target.value); pagination.reset(); }}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); pagination.reset(); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(statusConfig).map(([value, { label }]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-gray-400">
            <Ticket size={32} className="text-gray-200" />
            <p className="text-sm">Aucune réservation trouvée</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Référence', 'Voyageur', 'Trajet', 'Départ', 'Sièges', 'Montant', 'Statut', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {bookings.map((b: any) => {
                const cfg = statusConfig[b.status as BookingStatus];
                return (
                  <tr key={b.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-gray-700">{b.reference}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 text-sm">
                        {b.passenger?.firstName} {b.passenger?.lastName}
                      </p>
                      <p className="text-xs text-gray-400">{b.passenger?.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {b.trip?.route?.originCity?.name} → {b.trip?.route?.destinationCity?.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {dayjs(b.trip?.departureAt).format('DD/MM HH:mm')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {b.tickets?.map((t: any) => t.seatNumber).join(', ') || b.seatNumbers?.join(', ')}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {formatCFA(b.totalAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${cfg?.className ?? 'bg-gray-100 text-gray-600'}`}>
                        {cfg?.label ?? b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {['PENDING', 'CONFIRMED'].includes(b.status) && (
                          <button
                            onClick={() => setDeclaringBooking(b)}
                            title="Déclarer les bagages (optionnel)"
                            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition"
                          >
                            <Luggage size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => handlePrint(b)}
                          disabled={printingId === b.id}
                          title="Imprimer le ticket"
                          className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition disabled:opacity-50"
                        >
                          {printingId === b.id ? (
                            <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Printer size={15} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{meta.total} réservation(s)</span>
          <div className="flex gap-1">
            <button
              onClick={() => pagination.goTo(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
            >
              ←
            </button>
            <span className="px-3 py-1 text-gray-700">
              {pagination.page} / {meta.totalPages}
            </span>
            <button
              onClick={() => pagination.goTo(pagination.page + 1)}
              disabled={pagination.page >= meta.totalPages}
              className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
