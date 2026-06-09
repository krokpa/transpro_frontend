'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { bookingsApi, ticketTemplatesApi } from '@/lib/api';
import { BookingStatus } from '@transpro/shared';
import { formatCFA } from '@transpro/shared';
import {
  Search, Printer, Eye, TrendingUp, Clock, CheckCircle,
  XCircle, Users, MapPin, Calendar, CreditCard,
} from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useRouter } from 'next/navigation';
import { DataTable, Column } from '@/components/ui/DataTable';
import { usePagination } from '@/hooks/usePagination';
import { toast } from 'sonner';

dayjs.locale('fr');
dayjs.extend(relativeTime);

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<BookingStatus, { label: string; dot: string; badge: string }> = {
  PENDING:   { label: 'En attente', dot: 'bg-yellow-400', badge: 'bg-yellow-50 text-yellow-700 ring-yellow-200' },
  CONFIRMED: { label: 'Confirmé',   dot: 'bg-green-400',  badge: 'bg-green-50 text-green-700 ring-green-200' },
  CANCELLED: { label: 'Annulé',     dot: 'bg-red-400',    badge: 'bg-red-50 text-red-700 ring-red-200' },
  COMPLETED: { label: 'Terminé',    dot: 'bg-blue-400',   badge: 'bg-blue-50 text-blue-700 ring-blue-200' },
  NO_SHOW:   { label: 'Absent',     dot: 'bg-orange-400', badge: 'bg-orange-50 text-orange-700 ring-orange-200' },
};

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Espèces', ORANGE_MONEY: 'Orange Money', MTN_MOMO: 'MTN MoMo',
  WAVE: 'Wave', CARD: 'Carte', GENIUS_PAY: 'GeniusPay',
};

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
  if (el.type === 'text')  return `<div style="${s}font-size:${el.fontSize??14}px;font-weight:${el.fontWeight??'normal'};font-style:${el.fontStyle??'normal'};text-align:${el.textAlign??'left'};color:${el.color??'#000'};line-height:1.3;overflow:hidden;white-space:pre-wrap;word-break:break-word;">${substituteVars(el.content??'',b,t)}</div>`;
  if (el.type === 'qrcode') return `<div style="${s}background:#fff;display:flex;align-items:center;justify-content:center;border:1px solid #e5e7eb;"><img src="${t?.qrCode??''}" style="width:90%;height:90%;object-fit:contain;"/></div>`;
  if (el.type === 'image')  { const logo=b.trip?.tenant?.logo??''; return logo?`<img src="${logo}" style="${s}object-fit:contain;"/>`:`<div style="${s}background:#f9fafb;border:1px dashed #d1d5db;"></div>`; }
  if (el.type === 'rect')   return `<div style="${s}background:${el.bgColor??'transparent'};border:${el.borderWidth??1}px solid ${el.borderColor??'#d1d5db'};border-radius:${el.borderRadius??0}px;"></div>`;
  if (el.type === 'line')   return `<div style="${s}background:${el.bgColor??'#d1d5db'};"></div>`;
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(' ').filter(Boolean);
  const ini   = parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : (parts[0]?.[0] ?? '?');
  return (
    <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center shrink-0 uppercase">
      {ini}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Booking = Record<string, any>;

export default function BookingsPage() {
  const router = useRouter();
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [printingId, setPrintingId]   = useState<string | null>(null);
  const pagination                    = usePagination();

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-bookings', statusFilter, search, pagination.page],
    queryFn: () => bookingsApi.tenantBookings({
      status: statusFilter || undefined,
      page: pagination.page,
      limit: pagination.limit,
      search: search || undefined,
    }) as any,
    refetchInterval: 15_000,
  });

  const { data: defaultTemplate } = useQuery({
    queryKey: ['ticket-template-default'],
    queryFn: () => ticketTemplatesApi.getDefault() as any,
  });

  const bookings: Booking[] = (data as any)?.data ?? data ?? [];
  const meta = (data as any)?.meta;

  const filtered = search
    ? bookings.filter((b) => {
        const q = search.toLowerCase();
        return b.reference?.toLowerCase().includes(q)
          || b.passenger?.firstName?.toLowerCase().includes(q)
          || b.passenger?.lastName?.toLowerCase().includes(q)
          || b.passenger?.phone?.includes(q);
      })
    : bookings;

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:     bookings.length,
    confirmed: bookings.filter((b) => b.status === 'CONFIRMED').length,
    pending:   bookings.filter((b) => b.status === 'PENDING').length,
    revenue:   bookings.filter((b) => ['CONFIRMED', 'COMPLETED'].includes(b.status))
                       .reduce((s, b) => s + (b.totalAmount ?? 0), 0),
  }), [bookings]);

  async function handlePrint(booking: Booking) {
    if (!defaultTemplate) {
      toast.error('Aucun modèle de ticket par défaut. Configurez-en un dans "Modèles tickets".');
      return;
    }
    setPrintingId(booking.id);
    try {
      const full = await bookingsApi.get(booking.id) as any;
      openPrintWindow(full, defaultTemplate);
    } catch {
      toast.error('Erreur lors du chargement');
    } finally {
      setPrintingId(null);
    }
  }

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns: Column<Booking>[] = [
    {
      key: 'reference',
      header: 'Référence',
      render: (row) => (
        <div>
          <p className="font-mono text-sm font-semibold text-gray-800">{row.reference}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{dayjs(row.createdAt).format('DD MMM YYYY')}</p>
        </div>
      ),
    },
    {
      key: 'passenger',
      header: 'Voyageur',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <Initials name={`${row.passenger?.firstName ?? ''} ${row.passenger?.lastName ?? ''}`} />
          <div className="min-w-0">
            <p className="font-medium text-gray-900 text-sm truncate">
              {row.passenger?.firstName} {row.passenger?.lastName}
            </p>
            <p className="text-xs text-gray-400 truncate">{row.passenger?.phone ?? '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'trajet',
      header: 'Trajet',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-sm text-gray-700">
          <MapPin size={12} className="text-gray-400 shrink-0" />
          <span className="font-medium">{row.trip?.route?.originCity?.name ?? '—'}</span>
          <span className="text-gray-300">→</span>
          <span className="font-medium">{row.trip?.route?.destinationCity?.name ?? '—'}</span>
        </div>
      ),
    },
    {
      key: 'departureAt',
      header: 'Départ',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Calendar size={12} className="text-gray-400 shrink-0" />
          <div>
            <p className="text-sm text-gray-700">{dayjs(row.trip?.departureAt).format('DD MMM')}</p>
            <p className="text-xs text-gray-400">{dayjs(row.trip?.departureAt).format('HH:mm')}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'seatNumbers',
      header: 'Sièges',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {(row.seatNumbers ?? []).slice(0, 3).map((s: string) => (
            <span key={s} className="text-[11px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">{s}</span>
          ))}
          {(row.seatNumbers ?? []).length > 3 && (
            <span className="text-[11px] text-gray-400">+{row.seatNumbers.length - 3}</span>
          )}
        </div>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Montant',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-semibold text-gray-900 text-sm">{formatCFA(row.totalAmount)}</p>
          {row.payment?.method && (
            <p className="text-[11px] text-gray-400">{PAYMENT_LABELS[row.payment.method] ?? row.payment.method}</p>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (row) => {
        const cfg = STATUS_CFG[row.status as BookingStatus] ?? STATUS_CFG.PENDING;
        return (
          <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold ring-1 ${cfg.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => router.push(`/dashboard/bookings/${row.id}`)}
            title="Voir le détail"
            className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition"
          >
            <Eye size={15} />
          </button>
          <button
            onClick={() => handlePrint(row)}
            disabled={printingId === row.id}
            title="Imprimer le ticket"
            className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition disabled:opacity-50"
          >
            {printingId === row.id
              ? <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              : <Printer size={15} />}
          </button>
        </div>
      ),
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Réservations</h1>
          <p className="text-sm text-gray-400 mt-0.5">Gérez toutes les réservations de votre compagnie</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
            <Users size={18} className="text-gray-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-400">Total</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle size={18} className="text-green-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-green-700">{stats.confirmed}</p>
            <p className="text-xs text-gray-400">Confirmées</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center shrink-0">
            <Clock size={18} className="text-yellow-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
            <p className="text-xs text-gray-400">En attente</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center shrink-0">
            <TrendingUp size={18} className="text-brand-500" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900 leading-tight">{formatCFA(stats.revenue)}</p>
            <p className="text-xs text-gray-400">Chiffre d'affaires</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Réf, nom, téléphone…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); pagination.reset(); }}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); pagination.reset(); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_CFG).map(([value, { label }]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <DataTable
        data={filtered}
        columns={columns}
        isLoading={isLoading}
        keyExtractor={(row) => row.id}
        totalPages={meta?.totalPages ?? pagination.totalPages}
        currentPage={pagination.page}
        onPageChange={pagination.goTo}
        emptyMessage="Aucune réservation trouvée"
        onRowClick={(row) => router.push(`/dashboard/bookings/${row.id}`)}
      />
    </div>
  );
}
