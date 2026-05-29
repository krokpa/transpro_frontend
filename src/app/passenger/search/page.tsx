'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { tripsApi, bookingsApi, citiesApi, tenantsApi } from '@/lib/api';
import { formatCFA } from '@transpro/shared';
import {
  Search, MapPin, Calendar, Users, ArrowRight,
  Loader2, ChevronDown, ChevronUp, X, CheckCircle,
  Zap, Crown, Bus, Wifi, Wind, Tv, Usb, Coffee, Building2,
} from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { toast } from 'sonner';
dayjs.locale('fr');

// ── Constants ────────────────────────────────────────────────────────────────

const CLASS_CONFIG: Record<string, {
  label: string; icon: React.ReactNode; badgeCls: string;
  cardBorder: string; cardBg: string; accentCls: string; priceCls: string;
}> = {
  STANDARD: { label: 'Standard', icon: <Bus size={13} />, badgeCls: 'bg-gray-100 text-gray-600', cardBorder: 'border-gray-100', cardBg: '', accentCls: 'text-gray-500', priceCls: 'text-brand-600' },
  VIP:      { label: 'VIP',      icon: <Crown size={13} />, badgeCls: 'bg-amber-100 text-amber-700', cardBorder: 'border-amber-200', cardBg: 'bg-amber-50/40', accentCls: 'text-amber-600', priceCls: 'text-amber-600' },
  EXPRESS:  { label: 'Express',  icon: <Zap size={13} />, badgeCls: 'bg-blue-100 text-blue-700', cardBorder: 'border-blue-200', cardBg: 'bg-blue-50/30', accentCls: 'text-blue-600', priceCls: 'text-blue-600' },
};

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  AC: <Wind size={11} />, WIFI: <Wifi size={11} />, USB: <Usb size={11} />, TV: <Tv size={11} />, SNACK: <Coffee size={11} />,
};

const AMENITY_LABELS: Record<string, string> = {
  AC: 'Climatisation', WIFI: 'WiFi', USB: 'Prise USB', TV: 'Écran', SNACK: 'Snack', RECLINING: 'Sièges inclinables',
};

const CLASS_FILTERS = [
  { key: '', label: 'Tous' },
  { key: 'STANDARD', label: 'Standard' },
  { key: 'VIP', label: 'VIP' },
  { key: 'EXPRESS', label: 'Express' },
];

// ── TenantLogo ────────────────────────────────────────────────────────────────

function TenantLogo({ logo, name, size = 32 }: { logo?: string; name?: string; size?: number }) {
  if (logo) {
    return (
      <img
        src={logo}
        alt={name ?? 'Compagnie'}
        style={{ width: size, height: size }}
        className="rounded-lg object-cover shrink-0"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-lg bg-brand-50 flex items-center justify-center shrink-0"
    >
      <Building2 size={size * 0.5} className="text-brand-400" />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

function SearchContent() {
  const router = useRouter();
  const params = useSearchParams();

  const [origin, setOrigin]           = useState(params.get('origin') ?? '');
  const [destination, setDestination] = useState(params.get('destination') ?? '');
  const [date, setDate]               = useState(params.get('date') ?? dayjs().format('YYYY-MM-DD'));
  const [classFilter, setClassFilter] = useState(params.get('class') ?? '');
  const [companyFilter, setCompanyFilter] = useState(params.get('company') ?? '');

  const [selectedTrip, setSelectedTrip]   = useState<any>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [passengerCount, setPassengerCount] = useState(1);
  const [booking, setBooking]   = useState(false);
  const [bookedId, setBookedId] = useState<string | null>(null);

  const effectiveASM = (trip: any) =>
    trip.advancedSeatManagement ?? trip.vehicle?.advancedSeatManagement ?? true;

  const { data: citiesRaw } = useQuery({
    queryKey: ['cities-list'],
    queryFn: async () => ((await citiesApi.list()) ?? []) as any[],
    staleTime: 10 * 60 * 1000,
  });
  const cities: string[] = Array.isArray(citiesRaw) && citiesRaw.length > 0
    ? citiesRaw.map((c: any) => c.name)
    : ['Abidjan', 'Bouaké', 'Yamoussoukro', 'Gagnoa', 'San-Pédro', 'Daloa', 'Korhogo', 'Man'];

  const { data: companiesRaw } = useQuery({
    queryKey: ['tenants-public'],
    queryFn: async () => ((await tenantsApi.listPublic()) ?? []) as any[],
    staleTime: 5 * 60 * 1000,
  });
  const companies: any[] = Array.isArray(companiesRaw) ? companiesRaw : [];

  const { data: results, isLoading, refetch } = useQuery({
    queryKey: ['trip-search', origin, destination, date, companyFilter],
    queryFn: () => tripsApi.search({
      origin, destination, date,
      tenantSlug: companyFilter || undefined,
    }) as any,
    enabled: !!(origin && destination && date),
  });

  const allTrips: any[] = Array.isArray(results) ? results : [];
  const trips = classFilter ? allTrips.filter((t) => t.tripClass === classFilter) : allTrips;

  const { data: seatsRaw, isLoading: seatsLoading } = useQuery({
    queryKey: ['trip-seats', selectedTrip?.id],
    queryFn: async () => ((await tripsApi.getSeats(selectedTrip.id)) ?? []) as any[],
    enabled: !!selectedTrip?.id,
  });
  const seats: any[] = seatsRaw ?? [];

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    refetch();
    const p = new URLSearchParams({ origin, destination, date });
    if (classFilter) p.set('class', classFilter);
    if (companyFilter) p.set('company', companyFilter);
    router.replace(`/passenger/search?${p.toString()}`);
  }

  function toggleSeat(sn: string) {
    setSelectedSeats((prev) => prev.includes(sn) ? prev.filter((s) => s !== sn) : [...prev, sn]);
  }

  async function handleBook() {
    if (!selectedTrip) return;
    const isAdvanced = effectiveASM(selectedTrip);
    if (isAdvanced && selectedSeats.length === 0) return;
    setBooking(true);
    try {
      const payload: any = { tripId: selectedTrip.id };
      if (isAdvanced) { payload.seatNumbers = selectedSeats; }
      else { payload.passengerCount = passengerCount; payload.seatNumbers = []; }
      const b = await bookingsApi.create(payload) as any;
      setBookedId(b.id);
      toast.success('Réservation créée ! Rendez-vous à la gare pour payer.');
      setSelectedTrip(null); setSelectedSeats([]); setPassengerCount(1);
    } catch (err: any) {
      const raw = err?.response?.data;
      const msg = raw?.error ?? raw?.message ?? err?.message ?? 'Erreur';
      toast.error(Array.isArray(msg) ? msg.join(' | ') : msg);
    } finally {
      setBooking(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Search form */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select value={origin} onChange={(e) => setOrigin(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                <option value="">Départ</option>
                {cities.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select value={destination} onChange={(e) => setDestination(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                <option value="">Arrivée</option>
                {cities.filter((c) => c !== origin).map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="date" value={date} min={dayjs().format('YYYY-MM-DD')}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>

          {/* Company filter chips */}
          {companies.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400 shrink-0">Compagnie :</span>
              <button type="button"
                onClick={() => setCompanyFilter('')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition ${
                  companyFilter === '' ? 'bg-brand-500 border-brand-500 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}>
                Toutes
              </button>
              {companies.map((c) => (
                <button key={c.id} type="button"
                  onClick={() => setCompanyFilter(companyFilter === c.slug ? '' : c.slug)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition ${
                    companyFilter === c.slug ? 'bg-brand-500 border-brand-500 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}>
                  {c.logo && (
                    <img src={c.logo} alt={c.name}
                      className={`w-4 h-4 rounded object-cover ${companyFilter === c.slug ? 'opacity-90' : ''}`}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  )}
                  {c.name}
                </button>
              ))}
            </div>
          )}

          <button type="submit"
            className="w-full bg-brand-500 hover:bg-brand-600 text-white py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition">
            <Search size={15} /> Rechercher
          </button>
        </form>
      </div>

      {/* Booking success banner */}
      {bookedId && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-green-600 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-green-800">Réservation créée avec succès !</p>
            <p className="text-sm text-green-700">Présentez-vous à la gare pour valider votre paiement.</p>
          </div>
          <div className="flex gap-2 items-center">
            <button onClick={() => router.push(`/passenger/bookings/${bookedId}`)} className="text-sm font-medium text-green-700 underline">Voir le détail</button>
            <button onClick={() => setBookedId(null)}><X size={16} className="text-green-600" /></button>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 size={28} className="animate-spin text-brand-500" />
        </div>
      )}

      {/* Results */}
      {!isLoading && allTrips.length > 0 && (
        <div className="space-y-4">
          {/* Class filter + count */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-gray-500 font-medium">
              {trips.length} voyage{trips.length > 1 ? 's' : ''} disponible{trips.length > 1 ? 's' : ''}
              {classFilter ? ` · ${CLASS_CONFIG[classFilter]?.label}` : ''}
              {companyFilter ? ` · ${companies.find(c => c.slug === companyFilter)?.name ?? companyFilter}` : ''}
            </p>
            <div className="flex gap-1.5">
              {CLASS_FILTERS.map((f) => {
                const count = f.key ? allTrips.filter((t) => t.tripClass === f.key).length : allTrips.length;
                if (count === 0 && f.key) return null;
                return (
                  <button key={f.key} onClick={() => setClassFilter(f.key)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                      classFilter === f.key
                        ? f.key === 'VIP' ? 'bg-amber-500 border-amber-500 text-white'
                          : f.key === 'EXPRESS' ? 'bg-blue-500 border-blue-500 text-white'
                          : 'bg-brand-500 border-brand-500 text-white'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}>
                    {f.key && CLASS_CONFIG[f.key]?.icon}
                    {f.label}
                    <span className={`ml-0.5 ${classFilter === f.key ? 'opacity-80' : 'text-gray-400'}`}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {trips.length === 0 && (
            <div className="text-center py-8 bg-white rounded-2xl border border-gray-100 text-gray-400 text-sm">
              Aucun voyage {CLASS_CONFIG[classFilter]?.label} disponible pour ce trajet.
            </div>
          )}

          {trips.map((trip) => {
            const cfg = CLASS_CONFIG[trip.tripClass] ?? CLASS_CONFIG.STANDARD;
            const isOpen = selectedTrip?.id === trip.id;
            const duration = trip.route?.durationMinutes
              ? `${Math.floor(trip.route.durationMinutes / 60)}h${String(trip.route.durationMinutes % 60).padStart(2, '0')}`
              : null;

            return (
              <div key={trip.id}
                className={`rounded-2xl border overflow-hidden transition ${cfg.cardBorder} ${cfg.cardBg || 'bg-white'}`}>
                {trip.tripClass !== 'STANDARD' && (
                  <div className={`h-1 w-full ${trip.tripClass === 'VIP' ? 'bg-amber-400' : 'bg-blue-400'}`} />
                )}

                <div className="p-4">
                  {/* Company header */}
                  {trip.tenant && (
                    <div className="flex items-center gap-2.5 mb-3 pb-3 border-b border-gray-100">
                      <TenantLogo logo={trip.tenant.logo} name={trip.tenant.name} size={32} />
                      <span className="text-sm font-semibold text-gray-700">{trip.tenant.name}</span>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    {/* Left: route + meta */}
                    <div className="flex-1 min-w-0">
                      {/* Departure → Arrival */}
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-bold text-2xl text-gray-900 leading-none">
                            {dayjs(trip.departureAt).format('HH:mm')}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">{trip.route?.originCity?.name}</p>
                          {trip.departureStation && (
                            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                              <MapPin size={9} className="shrink-0" />{trip.departureStation.name}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-center gap-0.5 flex-1">
                          {duration && <p className={`text-xs font-medium ${cfg.accentCls}`}>{duration}</p>}
                          <div className="flex items-center w-full gap-1">
                            <div className="h-px flex-1 border-t border-dashed border-gray-300" />
                            <ArrowRight size={13} className="text-gray-300 shrink-0" />
                          </div>
                        </div>
                        <div>
                          <p className="font-bold text-2xl text-gray-900 leading-none">
                            {dayjs(trip.estimatedArrivalAt).format('HH:mm')}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">{trip.route?.destinationCity?.name}</p>
                          {trip.arrivalStation && (
                            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                              <MapPin size={9} className="shrink-0" />{trip.arrivalStation.name}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Meta row */}
                      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.badgeCls}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Users size={11} /> {trip.availableSeats} places
                        </span>
                        <span className="text-xs text-gray-400">{trip.vehicle?.brand} {trip.vehicle?.model}</span>
                      </div>

                      {/* Amenities */}
                      {trip.amenities?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {trip.amenities.map((a: string) => (
                            <span key={a}
                              className="inline-flex items-center gap-1 bg-white border border-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                              {AMENITY_ICONS[a] ?? null}{AMENITY_LABELS[a] ?? a}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right: price + CTA */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${cfg.priceCls}`}>{formatCFA(trip.price)}</p>
                        <p className="text-xs text-gray-400">par siège</p>
                      </div>
                      <button
                        onClick={() => { setSelectedTrip(isOpen ? null : trip); setSelectedSeats([]); setPassengerCount(1); }}
                        disabled={trip.availableSeats === 0}
                        className={`flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition ${
                          trip.availableSeats === 0
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : isOpen ? 'bg-gray-100 text-gray-700'
                            : trip.tripClass === 'VIP' ? 'bg-amber-500 hover:bg-amber-600 text-white'
                            : trip.tripClass === 'EXPRESS' ? 'bg-blue-500 hover:bg-blue-600 text-white'
                            : 'bg-brand-500 hover:bg-brand-600 text-white'
                        }`}>
                        {trip.availableSeats === 0 ? 'Complet'
                          : isOpen ? <><ChevronUp size={14} /> Fermer</>
                          : <>Réserver <ChevronDown size={14} /></>}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Seat picker */}
                {isOpen && (
                  <div className="border-t border-gray-100 p-4 bg-white/80 space-y-4">
                    {effectiveASM(trip) ? (
                      <>
                        <p className="text-sm font-semibold text-gray-700">Choisissez vos sièges</p>
                        {seatsLoading ? (
                          <div className="flex justify-center py-4">
                            <Loader2 size={20} className="animate-spin text-brand-500" />
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {seats.map((s) => {
                              const avail = s.status === 'AVAILABLE';
                              const sel = selectedSeats.includes(s.seatNumber);
                              return (
                                <button key={s.id} disabled={!avail} onClick={() => avail && toggleSeat(s.seatNumber)}
                                  className={`w-10 h-10 rounded-lg text-xs font-bold border transition ${
                                    !avail ? 'bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed'
                                    : sel
                                      ? trip.tripClass === 'VIP' ? 'bg-amber-500 border-amber-500 text-white shadow'
                                        : trip.tripClass === 'EXPRESS' ? 'bg-blue-500 border-blue-500 text-white shadow'
                                        : 'bg-brand-500 border-brand-600 text-white shadow'
                                      : 'bg-white border-gray-200 text-gray-700 hover:border-brand-400'
                                  }`}
                                  title={s.seatNumber}>{s.seatNumber}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        <div className="flex gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-white border border-gray-200 inline-block" /> Libre</span>
                          <span className="flex items-center gap-1.5"><span className={`w-3 h-3 rounded inline-block ${trip.tripClass === 'VIP' ? 'bg-amber-500' : trip.tripClass === 'EXPRESS' ? 'bg-blue-500' : 'bg-brand-500'}`} /> Sélectionné</span>
                          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-100 border border-gray-200 inline-block" /> Occupé</span>
                        </div>
                        {selectedSeats.length > 0 && (
                          <div className={`rounded-xl border p-4 ${
                            trip.tripClass === 'VIP' ? 'bg-amber-50 border-amber-200'
                            : trip.tripClass === 'EXPRESS' ? 'bg-blue-50 border-blue-200'
                            : 'bg-white border-brand-200'
                          }`}>
                            <div className="flex items-center justify-between flex-wrap gap-3">
                              <div>
                                <p className="text-sm text-gray-600">
                                  {selectedSeats.length} siège{selectedSeats.length > 1 ? 's' : ''} : <span className="font-semibold">{selectedSeats.join(', ')}</span>
                                </p>
                                <p className={`text-lg font-bold mt-0.5 ${cfg.priceCls}`}>
                                  Total : {formatCFA(trip.price * selectedSeats.length)}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">Paiement à la gare</p>
                              </div>
                              <button onClick={handleBook} disabled={booking}
                                className={`px-6 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition disabled:opacity-60 text-white ${
                                  trip.tripClass === 'VIP' ? 'bg-amber-500 hover:bg-amber-600'
                                  : trip.tripClass === 'EXPRESS' ? 'bg-blue-500 hover:bg-blue-600'
                                  : 'bg-brand-500 hover:bg-brand-600'
                                }`}>
                                {booking ? <><Loader2 size={15} className="animate-spin" /> Création...</> : 'Confirmer la réservation'}
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-sm font-semibold text-gray-700">Nombre de places</p>
                        <p className="text-xs text-gray-400">Les sièges vous seront attribués automatiquement.</p>
                        <div className="flex items-center gap-3">
                          <button onClick={() => setPassengerCount((n) => Math.max(1, n - 1))}
                            className="w-9 h-9 rounded-lg border border-gray-200 text-gray-600 font-bold text-lg hover:bg-gray-50 transition flex items-center justify-center">−</button>
                          <span className="text-2xl font-bold text-gray-900 w-8 text-center">{passengerCount}</span>
                          <button onClick={() => setPassengerCount((n) => Math.min(trip.availableSeats, n + 1))}
                            className="w-9 h-9 rounded-lg border border-gray-200 text-gray-600 font-bold text-lg hover:bg-gray-50 transition flex items-center justify-center">+</button>
                          <span className="text-xs text-gray-400 ml-1">/ {trip.availableSeats} places disponibles</span>
                        </div>
                        <div className={`rounded-xl border p-4 ${
                          trip.tripClass === 'VIP' ? 'bg-amber-50 border-amber-200'
                          : trip.tripClass === 'EXPRESS' ? 'bg-blue-50 border-blue-200'
                          : 'bg-white border-brand-200'
                        }`}>
                          <div className="flex items-center justify-between flex-wrap gap-3">
                            <div>
                              <p className="text-sm text-gray-600">{passengerCount} place{passengerCount > 1 ? 's' : ''}</p>
                              <p className={`text-lg font-bold mt-0.5 ${cfg.priceCls}`}>
                                Total : {formatCFA(trip.price * passengerCount)}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">Paiement à la gare</p>
                            </div>
                            <button onClick={handleBook} disabled={booking}
                              className={`px-6 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition disabled:opacity-60 text-white ${
                                trip.tripClass === 'VIP' ? 'bg-amber-500 hover:bg-amber-600'
                                : trip.tripClass === 'EXPRESS' ? 'bg-blue-500 hover:bg-blue-600'
                                : 'bg-brand-500 hover:bg-brand-600'
                              }`}>
                              {booking ? <><Loader2 size={15} className="animate-spin" /> Création...</> : 'Confirmer la réservation'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && allTrips.length === 0 && origin && destination && (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <p className="text-gray-500 font-medium">Aucun voyage disponible</p>
          <p className="text-sm text-gray-400 mt-1">
            {origin} → {destination} le {dayjs(date).format('D MMMM YYYY')}
            {companyFilter ? ` · ${companies.find(c => c.slug === companyFilter)?.name ?? companyFilter}` : ''}
          </p>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-20">
        <Loader2 size={28} className="animate-spin text-brand-500" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
