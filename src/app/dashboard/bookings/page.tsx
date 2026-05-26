'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { bookingsApi, ticketTemplatesApi } from '@/lib/api';
import { BookingStatus } from '@transpro/shared';
import { formatCFA } from '@transpro/shared';
import { Ticket, Search, Printer } from 'lucide-react';
import dayjs from 'dayjs';
import { DataTable, Column } from '@/components/ui/DataTable';
import { usePagination } from '@/hooks/usePagination';
import { toast } from 'sonner';

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
    const textStyle = [
      style,
      `font-size:${el.fontSize ?? 14}px`,
      `font-weight:${el.fontWeight ?? 'normal'}`,
      `font-style:${el.fontStyle ?? 'normal'}`,
      `text-align:${el.textAlign ?? 'left'}`,
      `color:${el.color ?? '#000'}`,
      'line-height:1.3',
      'overflow:hidden',
      'white-space:pre-wrap',
      'word-break:break-word',
    ].join(';');
    return `<div style="${textStyle}">${substituteVars(el.content ?? '', booking, ticket)}</div>`;
  }
  if (el.type === 'qrcode') {
    const qrSrc = ticket?.qrCode ?? '';
    return `<div style="${style}background:#fff;display:flex;align-items:center;justify-content:center;border:1px solid #e5e7eb;">
      <img src="${qrSrc}" style="width:90%;height:90%;object-fit:contain;" />
    </div>`;
  }
  if (el.type === 'image') {
    const logo = booking.trip?.tenant?.logo ?? '';
    if (!logo) return `<div style="${style}background:#f9fafb;border:1px dashed #d1d5db;"></div>`;
    return `<img src="${logo}" style="${style}object-fit:contain;" />`;
  }
  if (el.type === 'rect') {
    const bg = el.bgColor ?? 'transparent';
    const border = `${el.borderWidth ?? 1}px solid ${el.borderColor ?? '#d1d5db'}`;
    const radius = el.borderRadius ?? 0;
    return `<div style="${style}background:${bg};border:${border};border-radius:${radius}px;"></div>`;
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

  const ticketsHtml = ticketGroups
    .map((ticket: any) => {
      const elementsHtml = layout.map((el: any) => renderElementHtml(el, booking, ticket)).join('');
      return `
        <div style="position:relative;width:${dims.width}px;height:${dims.height}px;background:#fff;margin-bottom:16px;page-break-after:always;">
          ${elementsHtml}
        </div>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Tickets — ${booking.reference}</title>
  <style>
    ${dims.css}
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #f0f0f0; display: flex; flex-direction: column; align-items: center; padding: 20px; gap: 16px; font-family: Arial, sans-serif; }
    @media print {
      body { background: white; padding: 0; gap: 0; }
      .no-print { display: none !important; }
    }
    .ticket-wrapper { box-shadow: 0 2px 12px rgba(0,0,0,0.15); }
  </style>
</head>
<body>
  <div class="no-print" style="position:fixed;top:16px;right:16px;z-index:9999;">
    <button onclick="window.print()" style="background:#6366f1;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-size:14px;cursor:pointer;font-weight:600;">
      🖨️ Imprimer
    </button>
  </div>
  ${ticketGroups.map((ticket: any) => `
    <div class="ticket-wrapper" style="position:relative;width:${dims.width}px;height:${dims.height}px;background:#fff;page-break-after:always;">
      ${layout.map((el: any) => renderElementHtml(el, booking, ticket)).join('')}
    </div>`).join('')}
</body>
</html>`;

  const win = window.open('', '_blank', `width=${dims.width + 80},height=${dims.height + 120}`);
  if (win) {
    win.document.write(html);
    win.document.close();
  } else {
    toast.error('Popup bloqué — autorisez les popups pour imprimer');
  }
}

type Booking = Record<string, any>;

export default function BookingsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [printingId, setPrintingId] = useState<string | null>(null);
  const pagination = usePagination();

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-bookings', statusFilter, search, pagination.page],
    queryFn: () =>
      bookingsApi.tenantBookings({
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

  async function handlePrint(booking: Booking) {
    if (!defaultTemplate) {
      toast.error('Aucun modèle de ticket par défaut. Configurez un modèle dans "Modèles tickets".');
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

  const bookings: Booking[] = (data as any)?.data ?? data ?? [];
  const meta = (data as any)?.meta;

  const filtered = search
    ? bookings.filter((b) => {
        const q = search.toLowerCase();
        return (
          b.reference?.toLowerCase().includes(q) ||
          b.passenger?.firstName?.toLowerCase().includes(q) ||
          b.passenger?.lastName?.toLowerCase().includes(q) ||
          b.passenger?.phone?.includes(q)
        );
      })
    : bookings;

  const columns: Column<Booking>[] = [
    {
      key: 'reference',
      header: 'Référence',
      render: (row) => (
        <span className="font-mono text-xs text-gray-700">{row.reference}</span>
      ),
    },
    {
      key: 'passenger',
      header: 'Voyageur',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900 text-sm">
            {row.passenger?.firstName} {row.passenger?.lastName}
          </p>
          <p className="text-xs text-gray-400">{row.passenger?.phone}</p>
        </div>
      ),
    },
    {
      key: 'trajet',
      header: 'Trajet',
      render: (row) => (
        <span className="text-sm text-gray-700">
          {row.trip?.route?.originCity?.name} → {row.trip?.route?.destinationCity?.name}
        </span>
      ),
    },
    {
      key: 'departureAt',
      header: 'Départ',
      sortable: true,
      render: (row) => (
        <span className="text-sm text-gray-600">
          {dayjs(row.trip?.departureAt).format('DD/MM HH:mm')}
        </span>
      ),
    },
    {
      key: 'seatNumbers',
      header: 'Sièges',
      render: (row) => (
        <span className="text-sm text-gray-600">{row.seatNumbers?.join(', ')}</span>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Montant',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-gray-900">{formatCFA(row.totalAmount)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (row) => {
        const cfg = statusConfig[row.status as BookingStatus];
        return (
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${cfg.className}`}>
            {cfg.label}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <button
          onClick={() => handlePrint(row)}
          disabled={printingId === row.id}
          title="Imprimer le ticket"
          className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition disabled:opacity-50"
        >
          {printingId === row.id ? (
            <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Printer size={15} />
          )}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Réservations</h1>
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

      <DataTable
        data={filtered}
        columns={columns}
        isLoading={isLoading}
        keyExtractor={(row) => row.id}
        totalPages={meta?.totalPages ?? pagination.totalPages}
        currentPage={pagination.page}
        onPageChange={pagination.goTo}
        emptyMessage="Aucune réservation trouvée"
      />
    </div>
  );
}
