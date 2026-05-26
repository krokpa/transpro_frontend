'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { bookingsApi } from '@/lib/api';
import { formatCFA } from '@transpro/shared';
import { ArrowRight, Clock, Loader2, Ticket, MapPin, Users } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
dayjs.locale('fr');

const STATUS_STYLE: Record<string, { label: string; cls: string; dot: string }> = {
  PENDING:   { label: 'En attente',  cls: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400' },
  CONFIRMED: { label: 'Confirmée',   cls: 'bg-green-100 text-green-700',   dot: 'bg-green-500' },
  CANCELLED: { label: 'Annulée',     cls: 'bg-red-100 text-red-600',       dot: 'bg-red-400' },
  COMPLETED: { label: 'Terminée',    cls: 'bg-gray-100 text-gray-600',     dot: 'bg-gray-400' },
};

type Tab = 'upcoming' | 'past' | 'cancelled';

export default function BookingsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('upcoming');

  const { data: raw, isLoading } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => bookingsApi.myBookings() as any,
  });

  const all: any[] = Array.isArray(raw) ? raw : [];
  const now = dayjs();

  const upcoming  = all.filter((b) => ['PENDING', 'CONFIRMED'].includes(b.status) && dayjs(b.trip?.departureAt).isAfter(now));
  const past      = all.filter((b) => b.status === 'COMPLETED' || (['PENDING', 'CONFIRMED'].includes(b.status) && dayjs(b.trip?.departureAt).isBefore(now)));
  const cancelled = all.filter((b) => b.status === 'CANCELLED');

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'upcoming',  label: 'À venir',  count: upcoming.length },
    { key: 'past',      label: 'Passés',   count: past.length },
    { key: 'cancelled', label: 'Annulés',  count: cancelled.length },
  ];

  const displayed = tab === 'upcoming' ? upcoming : tab === 'past' ? past : cancelled;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mes réservations</h1>
          <p className="text-sm text-gray-500 mt-0.5">{all.length} réservation{all.length !== 1 ? 's' : ''} au total</p>
        </div>
        <button
          onClick={() => router.push('/passenger/search')}
          className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition shadow-sm shadow-brand-500/20"
        >
          <MapPin size={14} /> Nouveau voyage
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold min-w-[20px] text-center ${
                tab === t.key ? 'bg-brand-100 text-brand-600' : 'bg-gray-200 text-gray-500'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-brand-500" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Ticket size={24} className="text-gray-300" />
          </div>
          <p className="font-semibold text-gray-700">Aucune réservation {tab === 'upcoming' ? 'à venir' : tab === 'past' ? 'passée' : 'annulée'}</p>
          {tab === 'upcoming' && (
            <>
              <p className="text-sm text-gray-400 mt-1 mb-4">Recherchez un voyage et réservez votre place</p>
              <button
                onClick={() => router.push('/passenger/search')}
                className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2 rounded-lg text-sm font-semibold transition"
              >
                Rechercher un voyage
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((b) => {
            const s = STATUS_STYLE[b.status] ?? STATUS_STYLE.PENDING;
            const dep = dayjs(b.trip?.departureAt);
            const seats: string[] = b.seatNumbers ?? [];
            return (
              <button
                key={b.id}
                onClick={() => router.push(`/passenger/bookings/${b.id}`)}
                className="w-full bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-5 hover:border-brand-200 hover:shadow-sm transition text-left group"
              >
                {/* Date block */}
                <div className="w-14 shrink-0 text-center">
                  <p className="text-2xl font-bold text-gray-900 leading-none">{dep.format('D')}</p>
                  <p className="text-xs text-gray-500 mt-0.5 capitalize">{dep.format('MMM')}</p>
                  <p className="text-xs text-gray-400">{dep.format('YYYY')}</p>
                </div>

                {/* Divider */}
                <div className="w-px h-12 bg-gray-100 shrink-0" />

                {/* Route + details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900 text-base">
                      {b.trip?.route?.originCity?.name}
                    </span>
                    <ArrowRight size={14} className="text-gray-400 shrink-0" />
                    <span className="font-bold text-gray-900 text-base">
                      {b.trip?.route?.destinationCity?.name}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${s.cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      {s.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {dep.format('HH:mm')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={11} />
                      {seats.length} siège{seats.length !== 1 ? 's' : ''} · {seats.join(', ')}
                    </span>
                    {b.trip?.vehicle?.brand && (
                      <span className="text-gray-400">{b.trip.vehicle.brand} {b.trip.vehicle.model}</span>
                    )}
                  </div>
                </div>

                {/* Amount + arrow */}
                <div className="text-right shrink-0">
                  <p className="font-bold text-gray-900 text-base">{formatCFA(b.totalAmount)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{b.trip?.tripClass}</p>
                </div>
                <ArrowRight size={16} className="text-gray-200 group-hover:text-brand-400 transition shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
