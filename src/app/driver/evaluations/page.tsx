'use client';

import { useQuery } from '@tanstack/react-query';
import { driverSpaceApi } from '@/lib/api';
import { Star, Loader2 } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

dayjs.locale('fr');

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <Star key={n} size={size}
          className={n <= Math.round(value) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'} />
      ))}
    </span>
  );
}

function Bar({ value }: { value?: number | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full">
        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(value / 5) * 100}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-600 w-4 text-right">{value}</span>
    </div>
  );
}

export default function DriverEvaluationsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['driver-evals'],
    queryFn: () => driverSpaceApi.evaluations() as any,
  });

  const avg   = (data as any)?.averageRating;
  const evals = (data as any)?.evaluations ?? [];
  const count = (data as any)?.count ?? 0;

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={28} className="animate-spin text-brand-500" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl mx-auto">

      {count > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-5xl font-black text-slate-900">{avg?.toFixed(1)}</p>
              <p className="text-slate-400 text-sm">/5</p>
            </div>
            <div>
              <Stars value={avg ?? 0} size={22} />
              <p className="text-sm text-slate-500 mt-1">{count} évaluation{count !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
          <Star size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400">Aucune évaluation pour le moment</p>
          <p className="text-xs text-slate-300 mt-1">Vos superviseurs pourront vous évaluer après chaque voyage</p>
        </div>
      )}

      {evals.length > 0 && (
        <div className="space-y-3">
          {evals.map((ev: any) => (
            <div key={ev.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <Stars value={ev.rating} size={16} />
                    <span className="font-bold text-slate-800 text-sm">{ev.rating}/5</span>
                    {ev.trip?.route && (
                      <span className="text-xs text-slate-400">
                        · {ev.trip.route.originCity?.name} → {ev.trip.route.destinationCity?.name}
                      </span>
                    )}
                  </div>

                  {(ev.punctuality || ev.safety || ev.service) && (
                    <div className="grid grid-cols-3 gap-3 my-3">
                      {ev.punctuality && (
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Ponctualité</p>
                          <Bar value={ev.punctuality} />
                        </div>
                      )}
                      {ev.safety && (
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Sécurité</p>
                          <Bar value={ev.safety} />
                        </div>
                      )}
                      {ev.service && (
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Service</p>
                          <Bar value={ev.service} />
                        </div>
                      )}
                    </div>
                  )}

                  {ev.comment && (
                    <p className="text-sm text-slate-700 bg-slate-50 rounded-xl px-4 py-3 italic">
                      "{ev.comment}"
                    </p>
                  )}

                  <p className="text-xs text-slate-400 mt-2">
                    {ev.evaluatedBy ? `Par ${ev.evaluatedBy.firstName} ${ev.evaluatedBy.lastName} · ` : ''}
                    {dayjs(ev.createdAt).format('DD MMM YYYY')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
