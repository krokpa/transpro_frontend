'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driverSpaceApi } from '@/lib/api';
import { Bus, Loader2, ChevronLeft, ChevronRight, MapPin, AlertTriangle, Radio, StopCircle } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { toast } from 'sonner';
import { formatCFA } from '@transpro/shared';
import { useDriverLocation } from '@/hooks/useDriverLocation';

dayjs.locale('fr');

const STATUS_CFG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  SCHEDULED: { label: 'Planifié',     bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-400' },
  BOARDING:  { label: 'Embarquement', bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400' },
  DEPARTED:  { label: 'En route',     bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-400' },
  ARRIVED:   { label: 'Arrivé',       bg: 'bg-slate-50',  text: 'text-slate-600',  dot: 'bg-slate-400' },
  CANCELLED: { label: 'Annulé',       bg: 'bg-red-50',    text: 'text-red-600',    dot: 'bg-red-400' },
  DELAYED:   { label: 'Retardé',      bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-400' },
};

const NEXT_STATUS: Record<string, string[]> = {
  SCHEDULED: ['BOARDING'],
  BOARDING:  ['DEPARTED'],
  DELAYED:   ['BOARDING', 'DEPARTED'],
  DEPARTED:  ['ARRIVED'],
};

const ACTION_LABEL: Record<string, string> = {
  BOARDING: 'Commencer l\'embarquement',
  DEPARTED: 'Marquer comme parti',
  ARRIVED:  'Marquer comme arrivé',
};

const GPS_STATUSES = new Set(['BOARDING', 'DEPARTED']);

export default function DriverTripsPage() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
  const gps = useDriverLocation();

  const { data: trips = [], isLoading } = useQuery<any[]>({
    queryKey: ['driver-schedule', month],
    queryFn: () => driverSpaceApi.schedule(month) as any,
  });

  const updateStatus = useMutation({
    mutationFn: ({ tripId, status }: { tripId: string; status: string }) =>
      driverSpaceApi.updateTripStatus(tripId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver-schedule', month] });
      qc.invalidateQueries({ queryKey: ['driver-today'] });
      toast.success('Statut mis à jour');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });

  const groups = (trips as any[]).reduce((acc: Record<string, any[]>, t: any) => {
    const day = dayjs(t.departureAt).format('YYYY-MM-DD');
    if (!acc[day]) acc[day] = [];
    acc[day].push(t);
    return acc;
  }, {});

  async function handleGps(tripId: string, status: string) {
    if (!GPS_STATUSES.has(status)) return;
    if (gps.isSharingTrip(tripId)) {
      gps.stop();
      toast.success('Partage de position arrêté');
    } else {
      if (!gps.isSupported) { toast.error('GPS non disponible sur ce navigateur'); return; }
      const ok = await gps.start(tripId);
      if (ok) toast.success('Position en cours de partage');
      else toast.error('Impossible d\'accéder au GPS');
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">

      {/* Bandeau GPS actif */}
      {gps.isSharing && (
        <div className="flex items-center gap-3 bg-green-500 text-white rounded-2xl px-5 py-3 shadow-md shadow-green-500/20">
          <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
          </span>
          <p className="text-sm font-semibold flex-1">
            Position partagée en temps réel
            {gps.speed > 0 && <span className="font-normal opacity-80"> · {gps.speed} km/h</span>}
          </p>
          <button onClick={() => { gps.stop(); toast.success('Partage arrêté'); }}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition">
            <StopCircle size={13} /> Arrêter
          </button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button onClick={() => setMonth(dayjs(month).subtract(1, 'month').format('YYYY-MM'))}
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition">
          <ChevronLeft size={15} />
        </button>
        <span className="text-sm font-semibold text-slate-700 capitalize min-w-[150px] text-center">
          {dayjs(month).format('MMMM YYYY')}
        </span>
        <button onClick={() => setMonth(dayjs(month).add(1, 'month').format('YYYY-MM'))}
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition">
          <ChevronRight size={15} />
        </button>
        <span className="text-xs text-slate-400 ml-1">{(trips as any[]).length} voyage{(trips as any[]).length !== 1 ? 's' : ''}</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
      ) : (trips as any[]).length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
          <Bus size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400">Aucun voyage ce mois</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groups).map(([day, dayTrips]) => (
            <div key={day}>
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-brand-500 text-white rounded-lg px-2.5 py-1 text-xs font-bold capitalize">
                  {dayjs(day).format('ddd DD')}
                </div>
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-xs text-slate-400">{dayjs(day).format('MMMM YYYY')}</span>
              </div>

              <div className="space-y-3">
                {(dayTrips as any[]).map((trip: any) => {
                  const sc = STATUS_CFG[trip.status] ?? STATUS_CFG['SCHEDULED'];
                  const next = NEXT_STATUS[trip.status] ?? [];
                  return (
                    <div key={trip.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="flex items-start gap-4 p-5">
                        <div className="w-12 text-center flex-shrink-0">
                          <p className="text-xl font-black text-brand-500 leading-none">{dayjs(trip.departureAt).format('HH:mm')}</p>
                          <p className="text-xs text-slate-400 mt-1">départ</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 truncate">
                            {trip.route?.originCity?.name} → {trip.route?.destinationCity?.name}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500">
                            {trip.vehicle && <span className="font-mono">{trip.vehicle.licensePlate} · {trip.vehicle.brand} {trip.vehicle.model}</span>}
                            {trip.departureStation && <span className="flex items-center gap-1"><MapPin size={10}/>{trip.departureStation.name}</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold ${sc.bg} ${sc.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{sc.label}
                            </span>
                            <span className="text-xs text-slate-400">{trip.availableSeats}/{trip.totalSeats} places</span>
                            {trip.price && <span className="text-xs font-semibold text-slate-700">{formatCFA(trip.price)}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Bouton GPS — visible sur BOARDING et DEPARTED */}
                      {GPS_STATUSES.has(trip.status) && (
                        <div className="px-5 pb-3 border-t border-slate-50 pt-3">
                          <button
                            onClick={() => handleGps(trip.id, trip.status)}
                            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition ${
                              gps.isSharingTrip(trip.id)
                                ? 'bg-green-50 border border-green-200 text-green-700 hover:bg-green-100'
                                : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {gps.isSharingTrip(trip.id) ? (
                              <>
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                                </span>
                                Position partagée {gps.speed > 0 && `· ${gps.speed} km/h`} — Arrêter
                              </>
                            ) : (
                              <><Radio size={14} /> Partager ma position</>
                            )}
                          </button>
                        </div>
                      )}

                      {next.length > 0 && (
                        <div className="px-5 pb-4 flex gap-2 pt-0">
                          {next.map(n => (
                            <button key={n} onClick={() => updateStatus.mutate({ tripId: trip.id, status: n })}
                              disabled={updateStatus.isPending}
                              className="flex-1 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold py-2.5 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2">
                              {updateStatus.isPending && <Loader2 size={14} className="animate-spin" />}
                              {ACTION_LABEL[n] ?? n}
                            </button>
                          ))}
                        </div>
                      )}

                      {trip.status === 'ARRIVED' && (
                        <div className="px-5 pb-4 pt-0">
                          <div className="bg-green-50 rounded-xl px-4 py-2 text-sm text-green-700 font-medium text-center">
                            ✓ Voyage terminé
                          </div>
                        </div>
                      )}

                      {trip.status === 'CANCELLED' && (
                        <div className="px-5 pb-4 pt-0">
                          <div className="flex items-center gap-2 bg-red-50 rounded-xl px-4 py-2 text-sm text-red-600">
                            <AlertTriangle size={14} /> Voyage annulé
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
