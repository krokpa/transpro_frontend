'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/lib/api';
import { Building2, ArrowRight, MapPin, Loader2 } from 'lucide-react';

type StationLink = {
  isPrimary: boolean;
  station: { id: string; name: string; city?: { name: string } | null; code?: string; isActive: boolean };
};

export default function StationSelectorPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [refreshing, setRefreshing] = useState(true);

  // Always refresh user data from API — the cached auth store may have stale
  // or incomplete userStations (missing isActive, city, or empty from old sessions).
  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    authApi.me()
      .then((fresh: any) => { if (fresh) setUser(fresh); })
      .catch(() => {})
      .finally(() => setRefreshing(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stations: StationLink[] = (user as any)?.userStations ?? [];
  const activeStations = stations.filter((s) => s.station.isActive);

  // Auto-redirect once refresh is done and there is exactly one active station
  useEffect(() => {
    if (refreshing) return;
    if (activeStations.length === 1) {
      router.replace(`/station/${activeStations[0].station.id}`);
    }
  }, [refreshing, activeStations, router]);

  if (!user) return null;

  if (refreshing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <Loader2 size={32} className="text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-500 rounded-2xl mb-4 shadow-lg shadow-brand-500/30">
            <Building2 size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Choisir une gare</h1>
          <p className="text-slate-400 text-sm mt-1">
            Bonjour {user.firstName}, sélectionnez votre gare de travail
          </p>
        </div>

        <div className="space-y-3">
          {activeStations.length === 0 && (
            <div className="text-center text-slate-400 py-8">
              Vous n'êtes affecté à aucune gare active.<br />
              Contactez votre administrateur.
            </div>
          )}
          {activeStations.map(({ station, isPrimary }) => (
            <button
              key={station.id}
              onClick={() => router.push(`/station/${station.id}`)}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-brand-500/50 rounded-2xl p-4 flex items-center gap-4 transition-all group"
            >
              <div className="bg-brand-500/20 text-brand-400 rounded-xl p-3 shrink-0">
                <Building2 size={20} />
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white truncate">{station.name}</p>
                  {station.code && (
                    <span className="text-xs bg-white/10 text-slate-300 font-mono rounded px-1.5 py-0.5 shrink-0">
                      {station.code}
                    </span>
                  )}
                  {isPrimary && (
                    <span className="text-xs bg-brand-500/20 text-brand-400 rounded px-1.5 py-0.5 shrink-0">
                      Principale
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin size={11} /> {station.city?.name ?? ''}
                </p>
              </div>
              <ArrowRight size={16} className="text-slate-500 group-hover:text-brand-400 transition shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
