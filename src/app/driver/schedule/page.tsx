'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { driverSpaceApi } from '@/lib/api';
import { Bus, Loader2, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

dayjs.locale('fr');

const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
  SCHEDULED: { label: 'Planifié',     bg: 'bg-blue-100',   text: 'text-blue-700' },
  BOARDING:  { label: 'Embarquement', bg: 'bg-amber-100',  text: 'text-amber-700' },
  DEPARTED:  { label: 'En route',     bg: 'bg-green-100',  text: 'text-green-700' },
  ARRIVED:   { label: 'Arrivé',       bg: 'bg-slate-100',  text: 'text-slate-600' },
  CANCELLED: { label: 'Annulé',       bg: 'bg-red-100',    text: 'text-red-600' },
  DELAYED:   { label: 'Retardé',      bg: 'bg-orange-100', text: 'text-orange-700' },
};

export default function DriverSchedulePage() {
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));

  const { data: trips = [], isLoading } = useQuery<any[]>({
    queryKey: ['driver-schedule-full', month],
    queryFn: () => driverSpaceApi.schedule(month) as any,
  });

  // Build calendar grid
  const firstDay  = dayjs(`${month}-01`);
  const daysInMonth = firstDay.daysInMonth();
  const startDow    = (firstDay.day() + 6) % 7; // Monday=0

  const tripsByDay: Record<number, any[]> = {};
  (trips as any[]).forEach(t => {
    const d = dayjs(t.departureAt).date();
    if (!tripsByDay[d]) tripsByDay[d] = [];
    tripsByDay[d].push(t);
  });

  const cells = Array.from({ length: startDow + daysInMonth }, (_, i) =>
    i < startDow ? null : i - startDow + 1,
  );
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Month nav */}
      <div className="flex items-center gap-3">
        <button onClick={() => setMonth(dayjs(month).subtract(1,'month').format('YYYY-MM'))}
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition">
          <ChevronLeft size={15} />
        </button>
        <span className="text-sm font-semibold text-slate-700 capitalize min-w-[160px] text-center">
          {dayjs(month).format('MMMM YYYY')}
        </span>
        <button onClick={() => setMonth(dayjs(month).add(1,'month').format('YYYY-MM'))}
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition">
          <ChevronRight size={15} />
        </button>
        <span className="text-xs text-slate-400 ml-1">{(trips as any[]).length} voyage{(trips as any[]).length !== 1 ? 's' : ''}</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-slate-100">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
              <div key={d} className="py-2.5 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              const isToday  = day && dayjs(`${month}-${String(day).padStart(2,'0')}`).isSame(dayjs(), 'day');
              const dayTrips = day ? (tripsByDay[day] ?? []) : [];
              return (
                <div key={i} className={`min-h-[80px] p-1.5 border-b border-r border-slate-50 ${!day ? 'bg-slate-50/50' : ''} ${i % 7 === 6 ? 'border-r-0' : ''}`}>
                  {day && (
                    <>
                      <span className={`inline-flex w-6 h-6 items-center justify-center text-xs font-semibold rounded-full mb-1 ${
                        isToday ? 'bg-brand-500 text-white' : 'text-slate-600'
                      }`}>
                        {day}
                      </span>
                      <div className="space-y-0.5">
                        {dayTrips.map((t: any) => {
                          const sc = STATUS_CFG[t.status] ?? STATUS_CFG['SCHEDULED'];
                          return (
                            <div key={t.id} className={`text-[10px] px-1.5 py-0.5 rounded font-medium truncate ${sc.bg} ${sc.text}`}
                              title={`${t.route?.originCity?.name} → ${t.route?.destinationCity?.name} · ${dayjs(t.departureAt).format('HH:mm')}`}>
                              {dayjs(t.departureAt).format('HH:mm')} {t.route?.originCity?.name?.slice(0,3)}→{t.route?.destinationCity?.name?.slice(0,3)}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Trip list below calendar */}
      {(trips as any[]).length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold text-slate-700 text-sm">Détail du mois</h2>
          {(trips as any[]).map((trip: any) => {
            const sc = STATUS_CFG[trip.status] ?? STATUS_CFG['SCHEDULED'];
            return (
              <div key={trip.id} className="bg-white rounded-xl border border-slate-100 px-4 py-3 flex items-center gap-4">
                <div className="w-20 flex-shrink-0">
                  <p className="text-sm font-bold text-slate-800 capitalize">{dayjs(trip.departureAt).format('ddd DD MMM')}</p>
                  <p className="text-xs text-slate-400">{dayjs(trip.departureAt).format('HH:mm')}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">
                    {trip.route?.originCity?.name} → {trip.route?.destinationCity?.name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    {trip.vehicle && <span className="font-mono">{trip.vehicle.licensePlate}</span>}
                    {trip.departureStation && <span className="flex items-center gap-1"><MapPin size={9}/>{trip.departureStation.name}</span>}
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${sc.bg} ${sc.text}`}>{sc.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
