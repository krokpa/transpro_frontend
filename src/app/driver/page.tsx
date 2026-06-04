'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driverSpaceApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import {
  Bus, Star, CheckCircle2, AlertTriangle, Loader2,
  ChevronRight, ShieldCheck, Clock, MapPin, Radio, StopCircle,
} from 'lucide-react';
import { useDriverLocation } from '@/hooks/useDriverLocation';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { toast } from 'sonner';
import { formatCFA } from '@transpro/shared';

dayjs.locale('fr');

const GPS_STATUSES = new Set(['BOARDING', 'DEPARTED']);

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

export default function DriverDashboard() {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const { data: meData, isLoading: loadingMe } = useQuery({
    queryKey: ['driver-me'],
    queryFn: () => driverSpaceApi.me() as any,
  });

  const { data: todayTrips = [], isLoading: loadingToday } = useQuery<any[]>({
    queryKey: ['driver-today'],
    queryFn: () => driverSpaceApi.todayTrips() as any,
    refetchInterval: 60_000,
  });

  const { data: upcoming = [] } = useQuery<any[]>({
    queryKey: ['driver-upcoming'],
    queryFn: () => driverSpaceApi.upcomingTrips() as any,
  });

  const updateStatus = useMutation({
    mutationFn: ({ tripId, status }: { tripId: string; status: string }) =>
      driverSpaceApi.updateTripStatus(tripId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver-today'] });
      qc.invalidateQueries({ queryKey: ['driver-upcoming'] });
      toast.success('Statut mis à jour');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });

  const toggleAvail = useMutation({
    mutationFn: (v: boolean) => driverSpaceApi.setAvailability(v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['driver-me'] }); toast.success('Disponibilité mise à jour'); },
    onError: () => toast.error('Erreur'),
  });

  const gps    = useDriverLocation();
  const me     = (meData as any)?.driver;
  const stats  = (meData as any)?.stats;
  const isAvail = me?.isAvailable ?? true;

  const licenseExpired = stats ? stats.isLicenseExpired : false;
  const licenseWarn    = stats && !licenseExpired && stats.licenseExpiresInDays <= 60;

  if (loadingMe) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={28} className="animate-spin text-brand-500" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* ── Bandeau GPS actif ── */}
      {gps.isSharing && (
        <div className="flex items-center gap-3 bg-green-500 text-white rounded-2xl px-5 py-3 shadow-lg shadow-green-500/20">
          <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
          </span>
          <p className="text-sm font-semibold flex-1">
            Position partagée en temps réel
            {gps.speed > 0 && <span className="font-normal opacity-80"> · {gps.speed} km/h</span>}
          </p>
          <button onClick={() => gps.stop()}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition">
            <StopCircle size={12} /> Arrêter
          </button>
        </div>
      )}

      {/* ── Bienvenue ── */}
      <div className="bg-gradient-to-r from-brand-500 via-brand-400 to-orange-300 rounded-2xl p-6 text-white shadow-lg shadow-brand-500/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/70 text-sm">Bonjour,</p>
            <h1 className="text-2xl font-bold mt-0.5">{user?.firstName} {user?.lastName}</h1>
            <p className="text-white/60 text-sm mt-1">
              {dayjs().format('dddd DD MMMM YYYY')}
            </p>
          </div>
          <button
            onClick={() => toggleAvail.mutate(!isAvail)}
            disabled={toggleAvail.isPending}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition disabled:opacity-50 ${
              isAvail
                ? 'bg-white/20 text-white hover:bg-white/30'
                : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isAvail ? 'bg-green-300' : 'bg-white/40'}`} />
            {isAvail ? 'Disponible' : 'Indisponible'}
          </button>
        </div>

        {/* Stats chips */}
        {stats && (
          <div className="grid grid-cols-3 gap-3 mt-5">
            {[
              { label: 'Voyages ce mois', value: stats.tripsThisMonth, icon: Bus },
              { label: 'Note moyenne',    value: stats.avgRating ? `${stats.avgRating}/5` : '—', icon: Star },
              { label: 'Taux réalisation', value: stats.completionRate !== null ? `${stats.completionRate}%` : '—', icon: CheckCircle2 },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-white/15 rounded-xl px-3 py-2.5 backdrop-blur-sm">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={12} className="text-white/60" />
                  <span className="text-[10px] text-white/60">{label}</span>
                </div>
                <p className="text-lg font-bold text-white">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Alertes ── */}
      {licenseExpired && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
          <p className="text-sm font-semibold text-red-700">Votre permis de conduire est expiré. Contactez votre responsable.</p>
        </div>
      )}
      {licenseWarn && !licenseExpired && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />
          <p className="text-sm font-semibold text-amber-700">
            Votre permis expire dans <strong>{stats.licenseExpiresInDays} jour{stats.licenseExpiresInDays > 1 ? 's' : ''}</strong>. Pensez à le renouveler.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Voyages du jour ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <Bus size={16} className="text-brand-500" />
              Voyages d'aujourd'hui
              <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                {(todayTrips as any[]).length}
              </span>
            </h2>
          </div>

          {loadingToday ? (
            <div className="space-y-3">
              {[1,2].map(i => <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />)}
            </div>
          ) : (todayTrips as any[]).length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
              <Bus size={36} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400">Aucun voyage prévu aujourd'hui</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(todayTrips as any[]).map((trip: any) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  onStatusChange={(status) => updateStatus.mutate({ tripId: trip.id, status })}
                  loading={updateStatus.isPending}
                  gpsSharing={gps.isSharingTrip(trip.id)}
                  gpsSpeed={gps.speed}
                  onToggleGps={async () => {
                    if (!GPS_STATUSES.has(trip.status)) return;
                    if (gps.isSharingTrip(trip.id)) {
                      gps.stop();
                    } else {
                      const ok = await gps.start(trip.id);
                      if (!ok) toast.error('Impossible d\'accéder au GPS');
                    }
                  }}
                />
              ))}
            </div>
          )}

          {/* Prochains voyages */}
          {(upcoming as any[]).length > 0 && (
            <>
              <h2 className="font-bold text-slate-800 flex items-center gap-2 pt-2">
                <Clock size={16} className="text-purple-500" />
                Prochains voyages <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{(upcoming as any[]).length}</span>
              </h2>
              <div className="space-y-2">
                {(upcoming as any[]).slice(0, 3).map((trip: any) => {
                  const sc = STATUS_CFG[trip.status] ?? STATUS_CFG['SCHEDULED'];
                  return (
                    <div key={trip.id} className="bg-white rounded-xl border border-slate-100 px-4 py-3 flex items-center gap-4">
                      <div className="text-center w-10 flex-shrink-0">
                        <p className="text-xs text-slate-400 capitalize">{dayjs(trip.departureAt).format('ddd')}</p>
                        <p className="text-base font-bold text-slate-900">{dayjs(trip.departureAt).format('DD')}</p>
                        <p className="text-xs text-slate-400">{dayjs(trip.departureAt).format('HH:mm')}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm truncate">
                          {trip.route?.originCity?.name} → {trip.route?.destinationCity?.name}
                        </p>
                        <p className="text-xs text-slate-400">{trip.vehicle?.licensePlate}</p>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${sc.bg} ${sc.text}`}>
                        {sc.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ── Panneau droit ── */}
        <div className="space-y-4">

          {/* Permis */}
          {me && (
            <div className={`rounded-2xl border p-4 ${licenseExpired ? 'bg-red-50 border-red-200' : licenseWarn ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={15} className={licenseExpired ? 'text-red-500' : licenseWarn ? 'text-amber-500' : 'text-green-500'} />
                <h3 className={`font-semibold text-sm ${licenseExpired ? 'text-red-800' : licenseWarn ? 'text-amber-800' : 'text-green-800'}`}>Permis de conduire</h3>
              </div>
              <p className="font-mono text-xs text-slate-600 mb-1">{me.licenseNumber}</p>
              <p className={`text-xs ${licenseExpired ? 'text-red-600' : licenseWarn ? 'text-amber-600' : 'text-green-600'}`}>
                {licenseExpired
                  ? `Expiré depuis ${Math.abs(stats.licenseExpiresInDays)} j`
                  : `Expire le ${dayjs(me.licenseExpiry).format('DD/MM/YYYY')}`}
              </p>
            </div>
          )}

          {/* Infos chauffeur */}
          {me && (
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <h3 className="font-semibold text-slate-800 text-sm mb-3 flex items-center gap-2">
                <MapPin size={14} className="text-brand-500" /> Mon véhicule du jour
              </h3>
              {(todayTrips as any[]).length > 0 && (todayTrips as any[])[0]?.vehicle ? (
                <div>
                  <p className="font-bold text-slate-900">{(todayTrips as any[])[0].vehicle.brand} {(todayTrips as any[])[0].vehicle.model}</p>
                  <p className="font-mono text-sm text-slate-500 mt-0.5">{(todayTrips as any[])[0].vehicle.licensePlate}</p>
                  <p className="text-xs text-slate-400 mt-1">{(todayTrips as any[])[0].vehicle.capacity} places</p>
                </div>
              ) : (
                <p className="text-sm text-slate-400">Aucun véhicule assigné</p>
              )}
            </div>
          )}

          {/* Évaluations rapides */}
          {stats && stats.evaluationCount > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <h3 className="font-semibold text-slate-800 text-sm mb-3 flex items-center gap-2">
                <Star size={14} className="text-amber-400" /> Mes évaluations
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-black text-slate-900">{stats.avgRating?.toFixed(1)}</span>
                <div>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(n => (
                      <Star key={n} size={14} className={n <= Math.round(stats.avgRating ?? 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{stats.evaluationCount} éval.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TripCard({ trip, onStatusChange, loading, gpsSharing = false, gpsSpeed = 0, onToggleGps }: {
  trip: any; onStatusChange: (s: string) => void; loading: boolean;
  gpsSharing?: boolean; gpsSpeed?: number; onToggleGps?: () => void;
}) {
  const sc         = STATUS_CFG[trip.status] ?? STATUS_CFG['SCHEDULED'];
  const nextStates = NEXT_STATUS[trip.status] ?? [];
  const canGps     = GPS_STATUSES.has(trip.status);
  const LABELS: Record<string, string> = {
    BOARDING: 'Commencer l\'embarquement',
    DEPARTED: 'Marquer comme parti',
    ARRIVED:  'Marquer comme arrivé',
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Heure */}
        <div className="text-center w-14 flex-shrink-0">
          <p className="text-2xl font-black text-brand-500 leading-none">{dayjs(trip.departureAt).format('HH:mm')}</p>
          <p className="text-xs text-slate-400 mt-0.5 capitalize">{dayjs(trip.departureAt).format('ddd DD')}</p>
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-base truncate">
            {trip.route?.originCity?.name} → {trip.route?.destinationCity?.name}
          </p>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
            {trip.vehicle && <span className="font-mono">{trip.vehicle.licensePlate}</span>}
            {trip.vehicle && <span>·</span>}
            {trip.vehicle && <span>{trip.vehicle.brand} {trip.vehicle.model}</span>}
            {trip.departureStation && <><span>·</span><span><MapPin size={10} className="inline" /> {trip.departureStation.name}</span></>}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${sc.bg} ${sc.text}`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${sc.dot}`} />
              {sc.label}
            </span>
            <span className="text-xs text-slate-400">{trip.availableSeats}/{trip.totalSeats} places</span>
            {trip.price && <span className="text-xs font-semibold text-slate-700">{formatCFA(trip.price)}</span>}
          </div>
        </div>
      </div>

      {/* Bouton GPS */}
      {canGps && onToggleGps && (
        <div className="px-5 pb-3 border-t border-slate-50 pt-3">
          <button
            onClick={onToggleGps}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition ${
              gpsSharing
                ? 'bg-green-50 border border-green-200 text-green-700 hover:bg-green-100'
                : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {gpsSharing ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                En direct {gpsSpeed > 0 && `· ${gpsSpeed} km/h`}
                <StopCircle size={13} className="ml-auto" />
              </>
            ) : (
              <><Radio size={13} /> Partager ma position</>
            )}
          </button>
        </div>
      )}

      {/* Action buttons */}
      {nextStates.length > 0 && (
        <div className={`px-5 pb-4 flex gap-2 ${canGps ? 'pt-0' : ''}`}>
          {nextStates.map(next => (
            <button
              key={next}
              onClick={() => onStatusChange(next)}
              disabled={loading}
              className="flex-1 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold py-2.5 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {LABELS[next] ?? next}
              <ChevronRight size={14} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
