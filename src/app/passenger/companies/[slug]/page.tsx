'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { tenantsApi } from '@/lib/api';
import { useFavorites } from '@/hooks/useFavorites';
import { formatCFA } from '@transpro/shared';
import MapView from '@/components/ui/MapView';
import {
  ArrowLeft, Star, MapPin, Phone, Mail, Building2,
  Bus, Route, Clock, Search, Navigation, ExternalLink,
  Loader2, ChevronRight, X, Map,
} from 'lucide-react';

function CompanyLogo({ logo, name, size = 64 }: { logo?: string | null; name: string; size?: number }) {
  if (logo) {
    return (
      <div className="rounded-2xl overflow-hidden bg-white/20 shrink-0 ring-2 ring-white/20" style={{ width: size, height: size }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt={name} className="object-contain w-full h-full p-1.5" />
      </div>
    );
  }
  return (
    <div
      className="rounded-2xl bg-white/15 ring-2 ring-white/20 shrink-0 flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <Bus size={size * 0.45} className="text-white/70" />
    </div>
  );
}

function StatChip({ icon: Icon, value, label }: { icon: any; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 bg-white/[0.12] rounded-xl px-3 py-2.5 min-w-[72px]">
      <Icon size={14} className="text-white/70" />
      <span className="font-bold text-white text-base leading-none mt-0.5">{value}</span>
      <span className="text-[10px] text-white/60 text-center">{label}</span>
    </div>
  );
}

function StationModal({ station, onClose, onToggleFav, isFav }: {
  station: any;
  onClose: () => void;
  onToggleFav: () => void;
  isFav: boolean;
}) {
  const hasMap = station.latitude != null && station.longitude != null;
  const mapsUrl = hasMap
    ? `https://www.google.com/maps/search/?api=1&query=${station.latitude},${station.longitude}`
    : station.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([station.address, station.city?.name].filter(Boolean).join(', '))}`
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md sm:mx-4 overflow-hidden animate-in slide-in-from-bottom-4 sm:fade-in duration-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center shrink-0">
              <Building2 size={18} className="text-violet-500" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 truncate">{station.name}</h3>
              {station.city?.name && (
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <MapPin size={10} /> {station.city.name}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onToggleFav}
              className="p-2 rounded-xl hover:bg-amber-50 transition-colors"
              title={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            >
              <Star size={17} className={isFav ? 'fill-amber-400 text-amber-400' : 'text-gray-300'} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <X size={18} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Map */}
        {hasMap && (
          <div className="px-5 pb-4">
            <MapView
              key={station.id}
              lat={station.latitude}
              lng={station.longitude}
              label={station.name}
              height={200}
              zoom={15}
            />
          </div>
        )}

        {/* Details */}
        <div className="px-5 pb-5 space-y-3">
          {station.address && (
            <div className="flex items-start gap-3">
              <MapPin size={15} className="text-brand-400 shrink-0 mt-0.5" />
              <span className="text-sm text-gray-700">{station.address}</span>
            </div>
          )}
          {station.phone && (
            <a
              href={`tel:${station.phone}`}
              className="flex items-center gap-3 hover:text-brand-600 transition-colors"
            >
              <Phone size={15} className="text-brand-400 shrink-0" />
              <span className="text-sm text-gray-700">{station.phone}</span>
            </a>
          )}
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-4 py-2.5 rounded-xl transition-colors w-full justify-center mt-1"
            >
              <Navigation size={14} /> Voir sur Google Maps <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CompanyDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { toggleCompany, isCompanyFavorite, toggleStation, isStationFavorite } = useFavorites();
  const [selectedStation, setSelectedStation] = useState<any | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['company-detail', slug],
    queryFn: () => tenantsApi.getBySlug(slug!) as any,
    enabled: !!slug,
    staleTime: 5 * 60_000,
  });

  const company: any = data ?? {};

  if (isLoading) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 size={28} className="animate-spin text-brand-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Building2 size={40} className="text-gray-300" />
        <p className="font-semibold text-gray-600">Impossible de charger la compagnie</p>
        <div className="flex gap-3">
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 underline">
            Retour
          </button>
          <button onClick={() => refetch()} className="text-sm text-brand-600 hover:text-brand-700 underline">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const stations: any[] = company.stations ?? [];
  const routes: any[]   = company.routes   ?? [];
  const count           = company._count   ?? {};
  const upcoming        = company.upcomingTrips ?? 0;
  const stationCount    = count.stations ?? stations.length;
  const routeCount      = count.routes   ?? routes.length;
  const isFav           = isCompanyFavorite(company.id);

  const hasCompanyMap = company.latitude != null && company.longitude != null;

  const googleMapsUrl = company.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(company.address + (company.city?.name ? ', ' + company.city.name : ''))}`
    : null;

  return (
    <>
      <div className="space-y-6 pb-8">
        {/* ── Hero ── */}
        <div className="bg-gradient-to-br from-[#0c1425] via-[#142035] to-[#1a3a5c] rounded-2xl overflow-hidden relative">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-brand-500/10 rounded-full pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-brand-600/10 rounded-full pointer-events-none" />

          <div className="relative flex items-center justify-between px-5 pt-5 pb-2">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-white/70 hover:text-white text-sm font-medium transition-colors"
            >
              <ArrowLeft size={16} /> Retour
            </button>
            <button
              onClick={() => toggleCompany({ id: company.id, name: company.name, logo: company.logo, slug: company.slug, city: company.city })}
              className="p-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] transition-colors"
              title={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            >
              <Star size={18} className={isFav ? 'fill-amber-400 text-amber-400' : 'text-white/60'} />
            </button>
          </div>

          <div className="relative px-5 pb-6 pt-2">
            <div className="flex items-start gap-4">
              <CompanyLogo logo={company.logo} name={company.name} size={68} />
              <div className="flex-1 min-w-0 pt-1">
                <h1 className="text-2xl font-bold text-white leading-tight">{company.name}</h1>
                {company.city?.name && (
                  <p className="text-white/60 text-sm flex items-center gap-1.5 mt-1">
                    <MapPin size={12} /> {company.city.name}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 mt-5 flex-wrap">
              <StatChip icon={Bus} value={String(upcoming)} label="départs" />
              <StatChip icon={Building2} value={String(stationCount)} label="gares" />
              <StatChip icon={Route} value={String(routeCount)} label="lignes" />
            </div>
          </div>
        </div>

        {/* ── Quick action ── */}
        <button
          onClick={() => router.push(`/passenger/search?tenantSlug=${company.slug}`)}
          className="w-full bg-brand-500 hover:bg-brand-600 text-white rounded-xl py-3.5 flex items-center justify-center gap-2 font-semibold text-sm transition-all shadow-md shadow-brand-500/20"
        >
          <Search size={16} /> Rechercher un voyage avec {company.name}
        </button>

        {/* ── Contact ── */}
        {(company.phone || company.email || company.address) && (
          <section>
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 px-0.5">Contact</h2>
            <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
              {company.phone && (
                <a
                  href={`tel:${company.phone}`}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <Phone size={16} className="text-brand-400 shrink-0" />
                  <span className="text-sm text-gray-800 font-medium">{company.phone}</span>
                </a>
              )}
              {company.email && (
                <a
                  href={`mailto:${company.email}`}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <Mail size={16} className="text-brand-400 shrink-0" />
                  <span className="text-sm text-gray-800 font-medium">{company.email}</span>
                </a>
              )}
              {company.address && (
                <div className="flex items-start justify-between gap-3 px-5 py-3.5">
                  <div className="flex items-start gap-3">
                    <MapPin size={16} className="text-brand-400 shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-800">{company.address}</span>
                  </div>
                  {googleMapsUrl && (
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-semibold transition-colors"
                    >
                      <Navigation size={11} /> Maps <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Localisation compagnie ── */}
        {hasCompanyMap && (
          <section>
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 px-0.5 flex items-center gap-2">
              <Map size={14} className="text-brand-400" /> Localisation
            </h2>
            <div className="rounded-xl overflow-hidden border border-gray-100 shadow-sm">
              <MapView
                lat={company.latitude}
                lng={company.longitude}
                label={company.name}
                height={240}
                zoom={14}
              />
            </div>
            {googleMapsUrl && (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-semibold transition-colors"
              >
                <ExternalLink size={11} /> Ouvrir dans Google Maps
              </a>
            )}
          </section>
        )}

        {/* ── Gares ── */}
        {stations.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 px-0.5">
              Gares ({stations.length})
            </h2>
            <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
              {stations.map((s: any) => {
                const sIsFav = isStationFavorite(s.id);
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer group"
                    onClick={() => setSelectedStation(s)}
                  >
                    <div className="w-9 h-9 bg-violet-50 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-violet-100 transition-colors">
                      <Building2 size={16} className="text-violet-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-violet-700 transition-colors">{s.name}</p>
                      {(s.city?.name || s.address) && (
                        <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-0.5">
                          <MapPin size={10} />
                          {[s.city?.name, s.address].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      {s.phone && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <Phone size={10} /> {s.phone}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => toggleStation({ id: s.id, name: s.name, address: s.address, city: s.city })}
                        className="p-1.5 rounded-lg hover:bg-amber-50 transition-colors"
                        title={sIsFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                      >
                        <Star size={15} className={sIsFav ? 'fill-amber-400 text-amber-400' : 'text-gray-300 hover:text-amber-400'} />
                      </button>
                      {s.latitude && s.longitude && (
                        <div className="p-1.5 rounded-lg bg-gray-50 group-hover:bg-violet-50 transition-colors">
                          <Map size={14} className="text-gray-400 group-hover:text-violet-400 transition-colors" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-2 px-1">Cliquez sur une gare pour voir ses détails et sa localisation</p>
          </section>
        )}

        {/* ── Lignes & Tarifs ── */}
        {routes.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 px-0.5">
              Lignes & Tarifs ({routes.length})
            </h2>
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-2.5 bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                <span>Trajet</span>
                <span className="text-center">Durée</span>
                <span className="text-right">Tarif</span>
              </div>
              {routes.map((r: any, i: number) => {
                const origin = r.originCity?.name ?? '—';
                const dest   = r.destinationCity?.name ?? '—';
                const dur    = r.durationMinutes as number | null;
                const price  = r.basePrice as number | null;
                return (
                  <div
                    key={r.id ?? i}
                    className="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors items-center"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Route size={14} className="text-gray-300 shrink-0" />
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {origin}
                        <span className="text-gray-400 mx-1.5">→</span>
                        {dest}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 justify-center whitespace-nowrap">
                      {dur != null ? (
                        <>
                          <Clock size={11} className="text-gray-400" />
                          {Math.floor(dur / 60)}h{String(dur % 60).padStart(2, '0')}
                        </>
                      ) : <span className="text-gray-300">—</span>}
                    </div>
                    <div className="text-right whitespace-nowrap">
                      {price != null && price > 0 ? (
                        <span className="inline-block bg-brand-50 text-brand-600 text-xs font-bold px-2.5 py-1 rounded-full">
                          {formatCFA(price)}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">N/C</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── CTA bottom ── */}
        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/passenger/search?tenantSlug=${company.slug}`)}
            className="flex-1 bg-brand-500 hover:bg-brand-600 text-white rounded-xl py-3 flex items-center justify-center gap-2 font-semibold text-sm transition-all"
          >
            <Search size={15} /> Voir les voyages <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* ── Station detail modal ── */}
      {selectedStation && (
        <StationModal
          station={selectedStation}
          onClose={() => setSelectedStation(null)}
          onToggleFav={() => toggleStation({
            id: selectedStation.id,
            name: selectedStation.name,
            address: selectedStation.address,
            city: selectedStation.city,
          })}
          isFav={isStationFavorite(selectedStation.id)}
        />
      )}
    </>
  );
}
