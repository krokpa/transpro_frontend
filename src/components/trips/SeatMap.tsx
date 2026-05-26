'use client';

import { Fragment, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { tripsApi } from '@/lib/api';
import { joinTripRoom, leaveTripRoom, getSocket, SocketEvent } from '@/lib/socket';
import { SeatStatus } from '@transpro/shared';
import clsx from 'clsx';
import { Lock, Unlock, User, X } from 'lucide-react';
import { toast } from 'sonner';

interface TripSeat {
  id: string;
  seatNumber: string;
  status: SeatStatus;
}

interface BookingInfo {
  id: string;
  reference: string;
  status: string;
  totalAmount: number;
  confirmedAt: string | null;
  passenger: { firstName: string; lastName: string; phone: string; email: string };
  payment: { method: string; status: string; paidAt: string | null } | null;
}

interface Props {
  tripId: string;
}

const seatColors: Record<SeatStatus, string> = {
  AVAILABLE: 'bg-green-100 border-green-300 text-green-700 hover:bg-green-200 cursor-pointer',
  RESERVED: 'bg-yellow-100 border-yellow-300 text-yellow-700 cursor-pointer hover:bg-yellow-200',
  OCCUPIED: 'bg-red-100 border-red-300 text-red-700 cursor-pointer hover:bg-red-200',
  BLOCKED: 'bg-gray-200 border-gray-400 text-gray-500 cursor-pointer hover:bg-gray-300',
};

const seatLabels: Record<SeatStatus, string> = {
  AVAILABLE: 'Disponible',
  RESERVED: 'Réservé',
  OCCUPIED: 'Occupé',
  BLOCKED: 'Bloqué',
};

export function SeatMap({ tripId }: Props) {
  const queryClient = useQueryClient();
  const [realtimeUpdates, setRealtimeUpdates] = useState<Record<string, SeatStatus>>({});
  const [loadingSeats, setLoadingSeats] = useState<Set<string>>(new Set());
  const [selectedBooking, setSelectedBooking] = useState<{ seatNumber: string; data: BookingInfo | null } | null>(null);

  const { data: seats = [], isLoading } = useQuery({
    queryKey: ['trip-seats', tripId],
    queryFn: async () => ((await tripsApi.getSeats(tripId)) ?? []) as TripSeat[],
  });

  useEffect(() => {
    joinTripRoom(tripId);
    const socket = getSocket();

    socket.on(SocketEvent.SEAT_UPDATED, (data: { tripId: string; seatNumber: string; status: SeatStatus }) => {
      if (data.tripId !== tripId) return;
      setRealtimeUpdates((prev) => ({ ...prev, [data.seatNumber]: data.status }));
      queryClient.invalidateQueries({ queryKey: ['trip-seats', tripId] });
    });

    return () => {
      leaveTripRoom(tripId);
      socket.off(SocketEvent.SEAT_UPDATED);
    };
  }, [tripId]);

  const getSeatStatus = (seat: TripSeat): SeatStatus =>
    realtimeUpdates[seat.seatNumber] ?? seat.status;

  async function handleSeatClick(seat: TripSeat) {
    const status = getSeatStatus(seat);

    if (status === 'RESERVED' || status === 'OCCUPIED') {
      // Fetch booking info
      try {
        const res = await tripsApi.getSeatBooking(tripId, seat.seatNumber);
        const data = (res.data ?? null) as BookingInfo | null;
        setSelectedBooking({ seatNumber: seat.seatNumber, data });
      } catch {
        setSelectedBooking({ seatNumber: seat.seatNumber, data: null });
      }
      return;
    }

    // Toggle block/unblock
    setLoadingSeats((prev) => new Set(prev).add(seat.seatNumber));
    try {
      await tripsApi.toggleSeatBlock(tripId, seat.seatNumber);
      const newStatus: SeatStatus = status === 'AVAILABLE' ? SeatStatus.BLOCKED : SeatStatus.AVAILABLE;
      setRealtimeUpdates((prev) => ({ ...prev, [seat.seatNumber]: newStatus }));
      toast.success(
        newStatus === 'BLOCKED'
          ? `Siège ${seat.seatNumber} bloqué`
          : `Siège ${seat.seatNumber} débloqué`,
      );
    } catch {
      toast.error('Impossible de modifier ce siège');
    } finally {
      setLoadingSeats((prev) => {
        const next = new Set(prev);
        next.delete(seat.seatNumber);
        return next;
      });
    }
  }

  const stats = seats.reduce(
    (acc, seat) => {
      const status = getSeatStatus(seat);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    );
  }

  const rows = seats.reduce((acc, seat) => {
    const row = seat.seatNumber.replace(/[A-Z]/g, '');
    if (!acc[row]) acc[row] = [];
    acc[row].push(seat);
    return acc;
  }, {} as Record<string, TripSeat[]>);

  return (
    <div className="space-y-4">
      {/* Légende */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(seatLabels).map(([status, label]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={`w-5 h-5 rounded border text-xs flex items-center justify-center ${seatColors[status as SeatStatus]}`} />
            <span className="text-xs text-gray-600">
              {label} ({stats[status] || 0})
            </span>
          </div>
        ))}
      </div>

      {/* Plan des sièges */}
      <div className="bg-gray-50 rounded-xl p-4 overflow-x-auto">
        <div className="text-center text-xs text-gray-400 mb-4 border-b pb-2">🚌 Avant du bus</div>
        <div className="space-y-2">
          {Object.entries(rows).sort(([a], [b]) => parseInt(a) - parseInt(b)).map(([row, rowSeats]) => (
            <div key={row} className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-4">{row}</span>
              <div className="flex gap-1.5">
                {rowSeats.sort((a, b) => a.seatNumber.localeCompare(b.seatNumber)).map((seat, i) => {
                  const status = getSeatStatus(seat);
                  const isLoading = loadingSeats.has(seat.seatNumber);
                  return (
                    <Fragment key={seat.id}>
                      {i === Math.floor(rowSeats.length / 2) && <div className="w-4" />}
                      <button
                        onClick={() => handleSeatClick(seat)}
                        disabled={isLoading}
                        className={clsx(
                          'w-9 h-9 rounded border text-xs font-medium flex items-center justify-center transition-all relative',
                          seatColors[status],
                          isLoading && 'opacity-50',
                        )}
                        title={`Siège ${seat.seatNumber} — ${seatLabels[status]}`}
                      >
                        {isLoading ? (
                          <div className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" />
                        ) : (
                          seat.seatNumber.replace(/\d/g, '')
                        )}
                      </button>
                    </Fragment>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hint */}
      <div className="flex items-center gap-4 text-xs text-gray-400 justify-center">
        <span className="flex items-center gap-1"><Lock size={11} /> Clic sur disponible = bloquer</span>
        <span className="flex items-center gap-1"><Unlock size={11} /> Clic sur bloqué = débloquer</span>
        <span className="flex items-center gap-1"><User size={11} /> Clic sur réservé = voir infos</span>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Mise à jour en temps réel — {stats.AVAILABLE || 0} places disponibles
      </p>

      {/* Panneau booking */}
      {selectedBooking && (
        <div className="border border-gray-200 rounded-xl p-4 bg-white space-y-2 relative">
          <button
            onClick={() => setSelectedBooking(null)}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
          <p className="text-sm font-semibold text-gray-800">
            Siège {selectedBooking.seatNumber}
          </p>
          {selectedBooking.data ? (
            <div className="space-y-1 text-sm text-gray-600">
              <p>Réf : <span className="font-mono font-medium text-gray-900">{selectedBooking.data.reference}</span></p>
              <p>Passager : {selectedBooking.data.passenger.firstName} {selectedBooking.data.passenger.lastName}</p>
              <p>Téléphone : {selectedBooking.data.passenger.phone}</p>
              <p>Statut réservation : <span className="font-medium">{selectedBooking.data.status}</span></p>
              {selectedBooking.data.payment && (
                <p>Paiement : {selectedBooking.data.payment.method} — {selectedBooking.data.payment.status}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Aucune réservation trouvée pour ce siège.</p>
          )}
        </div>
      )}
    </div>
  );
}
