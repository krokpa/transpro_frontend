'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { stationsApi } from '@/lib/api';
import { Ticket, Bus, Banknote, TrendingUp } from 'lucide-react';
import { formatCFA } from '@transpro/shared';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
dayjs.locale('fr');

export default function StationDashboardPage() {
  const { stationId } = useParams<{ stationId: string }>();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['station-dashboard', stationId],
    queryFn: () => stationsApi.getDashboard(stationId) as any,
    refetchInterval: 30000,
  });

  const { data: trips = [], isLoading: tripsLoading } = useQuery<any[]>({
    queryKey: ['station-today-trips', stationId],
    queryFn: () => stationsApi.getTodayTrips(stationId) as any,
    refetchInterval: 30000,
  });

  const statusColors: Record<string, string> = {
    SCHEDULED: 'bg-blue-50 text-blue-700',
    BOARDING: 'bg-amber-50 text-amber-700',
    DEPARTED: 'bg-green-50 text-green-700',
    ARRIVED: 'bg-gray-50 text-gray-500',
    CANCELLED: 'bg-red-50 text-red-700',
    DELAYED: 'bg-orange-50 text-orange-700',
  };

  const statusLabel: Record<string, string> = {
    SCHEDULED: 'Prévu', BOARDING: 'Embarquement', DEPARTED: 'Parti',
    ARRIVED: 'Arrivé', CANCELLED: 'Annulé', DELAYED: 'Retardé',
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-400 text-sm">{dayjs().format('dddd D MMMM YYYY')}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Voyages du jour', value: isLoading ? '…' : stats?.todayTrips ?? 0, icon: Bus, color: 'text-blue-500 bg-blue-50' },
          { label: 'Billets vendus', value: isLoading ? '…' : stats?.todayBookings ?? 0, icon: Ticket, color: 'text-brand-500 bg-brand-50' },
          { label: 'Recette du jour', value: isLoading ? '…' : formatCFA(stats?.todayRevenue ?? 0), icon: Banknote, color: 'text-green-500 bg-green-50' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className={`rounded-lg p-2 ${kpi.color}`}>
                <kpi.icon size={16} />
              </div>
              <p className="text-xs text-gray-500 font-medium">{kpi.label}</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Today's trips */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
          <Bus size={15} className="text-gray-400" />
          <h2 className="font-semibold text-gray-900 text-sm">Départs du jour</h2>
          <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{trips.length}</span>
        </div>
        {tripsLoading ? (
          <div className="flex items-center justify-center h-20 text-gray-400 text-sm">Chargement...</div>
        ) : trips.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-gray-400 text-sm">Aucun départ prévu aujourd'hui</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {trips.map((trip: any) => (
              <div key={trip.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="font-medium text-sm text-gray-900">
                    {trip.route?.originCity?.name} → {trip.route?.destinationCity?.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {dayjs(trip.departureAt).format('HH:mm')} · {trip.vehicle?.plate} · {trip.availableSeats}/{trip.totalSeats} places
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium">{trip._count?.bookings ?? 0} résa</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[trip.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {statusLabel[trip.status] ?? trip.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
