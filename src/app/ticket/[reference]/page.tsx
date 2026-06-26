'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { bookingsApi, apiError } from '@/lib/api';
import { useBranding } from '@/lib/branding';
import { formatCFA } from '@transpro/shared';
import { Ticket, MapPin, Clock, Armchair, AlertCircle, CheckCircle2 } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
dayjs.locale('fr');

interface PublicTicket {
  reference: string;
  status: string;
  seatNumbers: string[];
  totalAmount: number;
  currency: string;
  trip: {
    originCity: string | null;
    destinationCity: string | null;
    departureAt: string | null;
    tripClass: string | null;
    departureStation: string | null;
    companyName: string | null;
    companyLogo: string | null;
  };
  tickets: { seatNumber: string; qrCode: string | null; qrCodeData: string | null }[];
}

export default function PublicTicketPage() {
  const { reference } = useParams<{ reference: string }>();
  const branding = useBranding();

  const { data, isLoading, error } = useQuery<PublicTicket>({
    queryKey: ['public-ticket', reference],
    queryFn: () => bookingsApi.publicTicket(reference) as any,
    retry: false,
  });

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-8">
      {/* En-tête marque */}
      <div className="flex items-center gap-2 mb-6">
        {branding.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={branding.logoUrl} alt={branding.appName} className="h-9 w-auto" />
        ) : (
          <Ticket className="h-7 w-7" style={{ color: branding.primaryColor }} />
        )}
        <span className="text-xl font-extrabold text-gray-900">{branding.appName}</span>
      </div>

      {isLoading && (
        <div className="w-full max-w-md animate-pulse space-y-4">
          <div className="h-40 rounded-2xl bg-gray-200" />
          <div className="h-64 rounded-2xl bg-gray-200" />
        </div>
      )}

      {error && (
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />
          <h1 className="text-lg font-bold text-red-700">Billet introuvable</h1>
          <p className="mt-1 text-sm text-red-600">{apiError(error, 'Vérifiez la référence de votre billet.')}</p>
        </div>
      )}

      {data && (
        <div className="w-full max-w-md space-y-5">
          {/* Carte trajet */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="p-5" style={{ background: `${branding.primaryColor}0F` }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-extrabold text-gray-900">{data.trip.originCity ?? '—'}</div>
                  <div className="flex items-center gap-1 text-sm font-semibold" style={{ color: branding.primaryColor }}>
                    <MapPin className="h-3.5 w-3.5" /> {data.trip.destinationCity ?? '—'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black" style={{ color: branding.primaryColor }}>
                    {data.trip.departureAt ? dayjs(data.trip.departureAt).format('HH:mm') : '--:--'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {data.trip.departureAt ? dayjs(data.trip.departureAt).format('ddd D MMM') : ''}
                  </div>
                </div>
              </div>
              {data.trip.companyName && (
                <div className="mt-2 text-xs text-gray-500">{data.trip.companyName}</div>
              )}
            </div>

            <div className="space-y-3 p-5">
              <Row icon={<Ticket className="h-4 w-4" />} label="Référence" value={data.reference} mono />
              {data.seatNumbers.length > 0 && (
                <Row icon={<Armchair className="h-4 w-4" />} label="Sièges" value={data.seatNumbers.join(', ')} />
              )}
              {data.trip.departureStation && (
                <Row icon={<MapPin className="h-4 w-4" />} label="Gare de départ" value={data.trip.departureStation} />
              )}
              {data.trip.tripClass && (
                <Row icon={<Clock className="h-4 w-4" />} label="Classe" value={data.trip.tripClass} />
              )}
              <div className="flex items-center justify-between border-t border-dashed border-gray-200 pt-3">
                <span className="text-sm font-bold text-gray-900">Total</span>
                <span className="text-lg font-black" style={{ color: branding.primaryColor }}>
                  {formatCFA(data.totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* QR code(s) */}
          {data.tickets.map((t, i) => (
            <div key={i} className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
              <div className="mb-1 text-sm font-semibold text-gray-700">
                {data.tickets.length > 1 ? `Billet ${i + 1}/${data.tickets.length}` : 'Votre billet'}
                {t.seatNumber ? ` — Siège ${t.seatNumber}` : ''}
              </div>
              {t.qrCode ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.qrCode} alt={`QR billet ${data.reference}`} className="mx-auto h-56 w-56" />
              ) : (
                <div className="py-10 text-sm text-gray-400">QR indisponible — présentez la référence.</div>
              )}
              <div className="mt-1 flex items-center justify-center gap-1 text-xs text-gray-500">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Présentez ce QR à l'embarquement
              </div>
            </div>
          ))}

          <p className="px-2 text-center text-xs text-gray-400">
            Conservez ce lien : il vous redonne accès à votre billet à tout moment.
          </p>
        </div>
      )}
    </main>
  );
}

function Row({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-sm text-gray-500">
        <span className="text-gray-400">{icon}</span>
        {label}
      </span>
      <span className={`text-sm font-bold text-gray-900 ${mono ? 'font-mono tracking-wide' : ''}`}>{value}</span>
    </div>
  );
}
