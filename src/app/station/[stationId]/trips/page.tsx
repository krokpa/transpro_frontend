'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stationsApi, tripsApi, routesApi, vehiclesApi, driversApi } from '@/lib/api';
import { TripStatus } from '@transpro/shared';
import { formatCFA } from '@transpro/shared';
import { Plus, Bus, ChevronRight, Users } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { SeatMap } from '@/components/trips/SeatMap';
import { FormModal, FormField, Input, Select } from '@/components/ui/FormModal';
import { useSocketEvent } from '@/hooks/useSocket';
import { SocketEvent } from '@transpro/shared';
import { toast } from 'sonner';

dayjs.locale('fr');

const statusConfig: Record<TripStatus, { label: string; className: string }> = {
  SCHEDULED: { label: 'Planifié', className: 'bg-blue-100 text-blue-700' },
  BOARDING: { label: 'Embarquement', className: 'bg-yellow-100 text-yellow-700' },
  DEPARTED: { label: 'En route', className: 'bg-green-100 text-green-700' },
  ARRIVED: { label: 'Arrivé', className: 'bg-gray-100 text-gray-700' },
  CANCELLED: { label: 'Annulé', className: 'bg-red-100 text-red-700' },
  DELAYED: { label: 'Retardé', className: 'bg-orange-100 text-orange-700' },
};

const STATUS_TRANSITIONS: Partial<Record<TripStatus, TripStatus[]>> = {
  SCHEDULED: [TripStatus.BOARDING, TripStatus.CANCELLED],
  BOARDING: [TripStatus.DEPARTED, TripStatus.DELAYED, TripStatus.CANCELLED],
  DEPARTED: [TripStatus.ARRIVED],
  DELAYED: [TripStatus.BOARDING, TripStatus.CANCELLED],
};

interface TripForm {
  routeId: string;
  vehicleId: string;
  driverId: string;
  departureAt: string;
  price: string;
}

const emptyForm: TripForm = {
  routeId: '',
  vehicleId: '',
  driverId: '',
  departureAt: dayjs().add(1, 'hour').format('YYYY-MM-DDTHH:mm'),
  price: '',
};

export default function StationTripsPage() {
  const { stationId } = useParams<{ stationId: string }>();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<TripForm>(emptyForm);
  const [errors, setErrors] = useState<Partial<TripForm>>({});

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ['station-trips', stationId, selectedDate],
    queryFn: async () => ((await stationsApi.getTodayTrips(stationId, selectedDate)) ?? []) as any[],
    refetchInterval: 30_000,
  });

  const { data: routes = [] } = useQuery({
    queryKey: ['routes'],
    queryFn: async () => ((await routesApi.list()) ?? []) as any[],
    enabled: showCreate,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => ((await vehiclesApi.list()) ?? []) as any[],
    enabled: showCreate,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: async () => ((await driversApi.list()) ?? []) as any[],
    enabled: showCreate,
  });

  const createTrip = useMutation({
    mutationFn: (data: any) => tripsApi.create(data) as any,
    onSuccess: () => {
      toast.success('Voyage créé avec succès');
      queryClient.invalidateQueries({ queryKey: ['station-trips', stationId] });
      setShowCreate(false);
      setForm(emptyForm);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Erreur lors de la création');
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TripStatus }) =>
      tripsApi.updateStatus(id, { status }) as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['station-trips', stationId] });
      toast.success('Statut mis à jour');
    },
  });

  useSocketEvent(SocketEvent.SEAT_UPDATED, () => {
    queryClient.invalidateQueries({ queryKey: ['station-trips', stationId] });
  });

  const selectedTrip = (trips as any[]).find((t: any) => t.id === selectedTripId);

  function validate(): boolean {
    const e: Partial<TripForm> = {};
    if (!form.routeId) e.routeId = 'Itinéraire requis';
    if (!form.vehicleId) e.vehicleId = 'Véhicule requis';
    if (!form.driverId) e.driverId = 'Chauffeur requis';
    if (!form.departureAt) e.departureAt = 'Date de départ requise';
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0)
      e.price = 'Prix valide requis';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    createTrip.mutate({
      routeId: form.routeId,
      vehicleId: form.vehicleId,
      driverId: form.driverId,
      departureAt: new Date(form.departureAt).toISOString(),
      price: Number(form.price),
      departureStationId: stationId,
    });
  }

  function field(key: keyof TripForm) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm((prev) => ({ ...prev, [key]: e.target.value })),
    };
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Voyages</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition"
        >
          <Plus size={16} />
          Nouveau voyage
        </button>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <span className="text-sm text-gray-500">
          {(trips as any[]).length} voyage(s)
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
            ))
          ) : (trips as any[]).length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
              <Bus size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucun voyage pour cette date</p>
            </div>
          ) : (
            (trips as any[]).map((trip: any) => {
              const statusCfg = statusConfig[trip.status as TripStatus];
              const transitions = STATUS_TRANSITIONS[trip.status as TripStatus] ?? [];
              return (
                <div
                  key={trip.id}
                  className={`bg-white rounded-xl border p-4 transition ${
                    selectedTripId === trip.id
                      ? 'border-brand-400 ring-1 ring-brand-200'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <button
                    className="w-full text-left"
                    onClick={() => setSelectedTripId(trip.id === selectedTripId ? null : trip.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {trip.route?.originCity?.name} → {trip.route?.destinationCity?.name}
                        </p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {dayjs(trip.departureAt).format('HH:mm')} ·{' '}
                          {trip.vehicle?.brand} {trip.vehicle?.model}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusCfg.className}`}>
                          {statusCfg.label}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Users size={12} />
                          <span>{trip.availableSeats}/{trip.totalSeats}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-medium text-brand-600">
                        {formatCFA(trip.price)}
                      </span>
                      <ChevronRight size={16} className="text-gray-400" />
                    </div>
                  </button>

                  {transitions.length > 0 && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
                      {transitions.map((next) => (
                        <button
                          key={next}
                          onClick={() => updateStatus.mutate({ id: trip.id, status: next })}
                          disabled={updateStatus.isPending}
                          className={`text-xs px-3 py-1 rounded-lg font-medium transition disabled:opacity-50 ${statusConfig[next].className}`}
                        >
                          → {statusConfig[next].label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {selectedTripId && selectedTrip && (
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">
              Plan des sièges —{' '}
              {selectedTrip.route?.originCity?.name} → {selectedTrip.route?.destinationCity?.name}
            </h2>
            <SeatMap tripId={selectedTripId} />
          </div>
        )}
      </div>

      <FormModal
        isOpen={showCreate}
        onClose={() => { setShowCreate(false); setErrors({}); setForm(emptyForm); }}
        title="Nouveau voyage"
        description="Planifiez un voyage au départ de cette gare"
        size="lg"
        footer={
          <>
            <button
              onClick={() => { setShowCreate(false); setErrors({}); setForm(emptyForm); }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={createTrip.isPending}
              className="px-4 py-2 text-sm bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition disabled:opacity-50"
            >
              {createTrip.isPending ? 'Création...' : 'Créer le voyage'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Itinéraire" required error={errors.routeId}>
            <Select {...field('routeId')} error={!!errors.routeId}>
              <option value="">Sélectionner un itinéraire</option>
              {(routes as any[]).map((r: any) => (
                <option key={r.id} value={r.id}>
                  {r.originCity?.name} → {r.destinationCity?.name} ({r.durationMinutes} min)
                </option>
              ))}
            </Select>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Véhicule" required error={errors.vehicleId}>
              <Select {...field('vehicleId')} error={!!errors.vehicleId}>
                <option value="">Sélectionner</option>
                {(vehicles as any[]).map((v: any) => (
                  <option key={v.id} value={v.id}>
                    {v.brand} {v.model} — {v.plate}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Chauffeur" required error={errors.driverId}>
              <Select {...field('driverId')} error={!!errors.driverId}>
                <option value="">Sélectionner</option>
                {(drivers as any[]).map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.firstName} {d.lastName}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Départ prévu" required error={errors.departureAt}>
              <Input type="datetime-local" {...field('departureAt')} error={!!errors.departureAt} />
            </FormField>

            <FormField label="Prix (FCFA)" required error={errors.price}>
              <Input
                type="number"
                placeholder="ex: 5000"
                min={100}
                {...field('price')}
                error={!!errors.price}
              />
            </FormField>
          </div>
        </div>
      </FormModal>
    </div>
  );
}
