'use client';

import { useRouter } from 'next/navigation';
import { useFavorites } from '@/hooks/useFavorites';
import {
  Star, Building2, Bus, MapPin, ArrowRight, Search,
} from 'lucide-react';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { useViewMode } from '@/hooks/useViewMode';

function CompanyLogo({ logo, name }: { logo?: string | null; name: string }) {
  if (logo) {
    return (
      <div className="w-11 h-11 rounded-xl overflow-hidden bg-white border border-gray-100 shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt={name} className="object-contain w-full h-full p-1" />
      </div>
    );
  }
  return (
    <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
      <Bus size={20} className="text-brand-400" />
    </div>
  );
}

function EmptySection({ message, cta, onCta }: { message: string; cta?: string; onCta?: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-dashed border-gray-200 p-8 text-center">
      <Star size={28} className="text-gray-200 mx-auto mb-3" />
      <p className="text-sm text-gray-500 mb-3">{message}</p>
      {cta && onCta && (
        <button
          onClick={onCta}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-4 py-2 rounded-lg transition-colors"
        >
          {cta} <ArrowRight size={12} />
        </button>
      )}
    </div>
  );
}

export default function FavoritesPage() {
  const router = useRouter();
  const { favs, toggleCompany, toggleStation } = useFavorites();
  const [viewMode, setViewMode] = useViewMode('passenger-favorites', 'grid');

  const hasAnything = favs.companies.length > 0 || favs.stations.length > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mes favoris</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {hasAnything
              ? `${favs.companies.length} compagnie${favs.companies.length !== 1 ? 's' : ''} · ${favs.stations.length} gare${favs.stations.length !== 1 ? 's' : ''}`
              : 'Aucun favori enregistré'}
          </p>
        </div>
      </div>

      {/* ── Companies ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
            Compagnies favorites ({favs.companies.length})
          </h2>
          <div className="flex items-center gap-2">
            {favs.companies.length > 0 && (
              <ViewToggle value={viewMode} onChange={setViewMode} />
            )}
            <button
              onClick={() => router.push('/passenger/companies')}
              className="text-xs text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1 transition-colors"
            >
              Toutes les compagnies <ArrowRight size={12} />
            </button>
          </div>
        </div>

        {favs.companies.length === 0 ? (
          <EmptySection
            message="Aucune compagnie favorite. Explorez les compagnies et ajoutez vos préférées."
            cta="Explorer les compagnies"
            onCta={() => router.push('/passenger/companies')}
          />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {favs.companies.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-xl border border-gray-100 hover:border-brand-200 hover:shadow-sm transition-all duration-150 overflow-hidden group"
              >
                <div className="p-4 flex items-center gap-3">
                  <CompanyLogo logo={c.logo} name={c.name} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{c.name}</p>
                    {c.city?.name && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin size={10} /> {c.city.name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleCompany(c)}
                      className="p-1.5 rounded-lg hover:bg-amber-50 transition-colors"
                      title="Retirer des favoris"
                    >
                      <Star size={16} className="fill-amber-400 text-amber-400" />
                    </button>
                  </div>
                </div>
                <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center gap-3">
                  <button
                    onClick={() => router.push(`/passenger/search?tenantSlug=${c.slug}`)}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors"
                  >
                    <Search size={11} /> Voyages
                  </button>
                  <button
                    onClick={() => router.push(`/passenger/companies/${c.slug}`)}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-800 flex items-center gap-1 transition-colors group-hover:text-brand-600"
                  >
                    Détails <ArrowRight size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
            {favs.companies.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group">
                <CompanyLogo logo={c.logo} name={c.name} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                  {c.city?.name && (
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <MapPin size={10} /> {c.city.name}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => router.push(`/passenger/search?tenantSlug=${c.slug}`)}
                    className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <Search size={11} /> Voyages
                  </button>
                  <button
                    onClick={() => router.push(`/passenger/companies/${c.slug}`)}
                    className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-800 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <ArrowRight size={13} />
                  </button>
                  <button
                    onClick={() => toggleCompany(c)}
                    className="p-1.5 rounded-lg hover:bg-amber-50 transition-colors"
                    title="Retirer des favoris"
                  >
                    <Star size={15} className="fill-amber-400 text-amber-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Stations ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
            Gares favorites ({favs.stations.length})
          </h2>
        </div>

        {favs.stations.length === 0 ? (
          <EmptySection
            message="Aucune gare favorite. Ajoutez vos gares depuis les détails d'une compagnie."
            cta="Voir les compagnies"
            onCta={() => router.push('/passenger/companies')}
          />
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
            {favs.stations.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 bg-violet-50 rounded-lg flex items-center justify-center shrink-0">
                  <Building2 size={16} className="text-violet-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                  {(s.city?.name || s.address) && (
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 truncate">
                      <MapPin size={10} />
                      {[s.city?.name, s.address].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => toggleStation(s)}
                  className="p-1.5 rounded-lg hover:bg-amber-50 transition-colors shrink-0"
                  title="Retirer des favoris"
                >
                  <Star size={15} className="fill-amber-400 text-amber-400" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
