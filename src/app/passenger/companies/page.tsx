'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { tenantsApi } from '@/lib/api';
import { useFavorites } from '@/hooks/useFavorites';
import {
  Search, MapPin, Building2, Star, Loader2,
  Bus, Route, ArrowRight,
} from 'lucide-react';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { useViewMode } from '@/hooks/useViewMode';

function CompanyLogo({ logo, name, size = 48 }: { logo?: string | null; name: string; size?: number }) {
  if (logo) {
    return (
      <div className="shrink-0 rounded-xl overflow-hidden bg-white border border-gray-100" style={{ width: size, height: size }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo}
          alt={name}
          className="object-contain w-full h-full p-1"
        />
      </div>
    );
  }
  return (
    <div
      className="shrink-0 rounded-xl bg-brand-50 flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <Bus size={size * 0.45} className="text-brand-400" />
    </div>
  );
}

export default function CompaniesPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const { toggleCompany, isCompanyFavorite } = useFavorites();
  const [viewMode, setViewMode] = useViewMode('passenger-companies', 'grid');

  const { data: raw, isLoading, error, refetch } = useQuery({
    queryKey: ['companies-public'],
    queryFn: () => tenantsApi.listPublic() as any,
    staleTime: 5 * 60_000,
  });

  const companies: any[] = Array.isArray(raw) ? raw : [];

  const filtered = query.trim() === ''
    ? companies
    : companies.filter((c) => {
        const q = query.toLowerCase();
        return (
          (c.name as string ?? '').toLowerCase().includes(q) ||
          (c.city?.name as string ?? '').toLowerCase().includes(q)
        );
      });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Compagnies de transport</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isLoading ? '…' : `${companies.length} compagnie${companies.length !== 1 ? 's' : ''} disponible${companies.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <ViewToggle value={viewMode} onChange={setViewMode} />
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher une compagnie ou une ville…"
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-brand-500" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-100 rounded-xl p-8 text-center">
          <p className="text-red-600 font-medium">Impossible de charger les compagnies</p>
          <button
            onClick={() => refetch()}
            className="mt-3 text-sm text-red-500 hover:text-red-700 underline"
          >
            Réessayer
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-16 text-center">
          <Building2 size={32} className="text-gray-200 mx-auto mb-3" />
          <p className="font-semibold text-gray-700">Aucune compagnie trouvée</p>
          <p className="text-sm text-gray-400 mt-1">Essayez un autre terme de recherche</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((c) => {
            const isFav = isCompanyFavorite(c.id);
            const stationCount = c._count?.stations ?? c.stations?.length ?? 0;
            const routeCount   = c._count?.routes   ?? c.routes?.length   ?? 0;
            const upcoming     = c.upcomingTrips ?? 0;

            return (
              <div
                key={c.id}
                className="bg-white rounded-xl border border-gray-100 hover:border-brand-200 hover:shadow-sm transition-all duration-150 overflow-hidden group"
              >
                <div className="p-5 flex items-start gap-4">
                  <CompanyLogo logo={c.logo} name={c.name} size={52} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 text-[15px] truncate">{c.name}</h3>
                        {c.city?.name && (
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <MapPin size={11} className="text-gray-400 shrink-0" />
                            {c.city.name}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => toggleCompany({ id: c.id, name: c.name, logo: c.logo, slug: c.slug, city: c.city })}
                        className="shrink-0 p-1 rounded-lg hover:bg-amber-50 transition-colors"
                        title={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                      >
                        <Star
                          size={18}
                          className={isFav ? 'fill-amber-400 text-amber-400' : 'text-gray-300 hover:text-amber-400'}
                        />
                      </button>
                    </div>

                    {/* Stats chips */}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-brand-50 text-brand-600">
                        <Bus size={10} /> {upcoming} départ{upcoming !== 1 ? 's' : ''}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-violet-50 text-violet-600">
                        <Building2 size={10} /> {stationCount} gare{stationCount !== 1 ? 's' : ''}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-600">
                        <Route size={10} /> {routeCount} ligne{routeCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer CTA */}
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                  <button
                    onClick={() => router.push(`/passenger/search?tenantSlug=${c.slug}`)}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors"
                  >
                    <Search size={12} /> Rechercher un voyage
                  </button>
                  <button
                    onClick={() => router.push(`/passenger/companies/${c.slug}`)}
                    className="text-xs font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-1 transition-colors group-hover:text-brand-600"
                  >
                    Voir les détails <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List view */
        <div className="space-y-2">
          {filtered.map((c) => {
            const isFav = isCompanyFavorite(c.id);
            const stationCount = c._count?.stations ?? c.stations?.length ?? 0;
            const routeCount   = c._count?.routes   ?? c.routes?.length   ?? 0;
            const upcoming     = c.upcomingTrips ?? 0;

            return (
              <div
                key={c.id}
                className="bg-white rounded-xl border border-gray-100 hover:border-brand-200 hover:shadow-sm transition-all duration-150 px-4 py-3 flex items-center gap-4 group"
              >
                <CompanyLogo logo={c.logo} name={c.name} size={38} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 text-sm truncate">{c.name}</h3>
                    {c.city?.name && (
                      <span className="text-xs text-gray-400 flex items-center gap-0.5 shrink-0">
                        <MapPin size={10} /> {c.city.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-600">
                      <Bus size={9} /> {upcoming} départ{upcoming !== 1 ? 's' : ''}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600">
                      <Building2 size={9} /> {stationCount} gare{stationCount !== 1 ? 's' : ''}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                      <Route size={9} /> {routeCount} ligne{routeCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleCompany({ id: c.id, name: c.name, logo: c.logo, slug: c.slug, city: c.city })}
                    className="p-1.5 rounded-lg hover:bg-amber-50 transition-colors"
                    title={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  >
                    <Star size={15} className={isFav ? 'fill-amber-400 text-amber-400' : 'text-gray-300 hover:text-amber-400'} />
                  </button>
                  <button
                    onClick={() => router.push(`/passenger/search?tenantSlug=${c.slug}`)}
                    className="p-1.5 rounded-lg text-brand-600 hover:bg-brand-50 transition-colors"
                    title="Rechercher un voyage"
                  >
                    <Search size={15} />
                  </button>
                  <button
                    onClick={() => router.push(`/passenger/companies/${c.slug}`)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                    title="Voir les détails"
                  >
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
