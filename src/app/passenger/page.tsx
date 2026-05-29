'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { bookingsApi, citiesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { formatCFA } from '@transpro/shared';
import {
  Search, MapPin, Calendar, ArrowRight, Clock,
  Loader2, Ticket, TrendingUp, Star, Users,
  ChevronDown, ChevronUp, Bus, CheckCircle2, Building2,
} from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
dayjs.locale('fr');

const FALLBACK_CITIES = [
  'Abidjan', 'Bouaké', 'Yamoussoukro', 'Gagnoa', 'San-Pédro',
  'Daloa', 'Korhogo', 'Man', 'Divo', 'Abengourou',
];

const POPULAR_ROUTES = [
  { from: 'Abidjan',  to: 'Bouaké' },
  { from: 'Abidjan',  to: 'Yamoussoukro' },
  { from: 'Bouaké',   to: 'Korhogo' },
  { from: 'Abidjan',  to: 'San-Pédro' },
];

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  PENDING:   { label: 'En attente', cls: 'bg-amber-100 text-amber-700' },
  CONFIRMED: { label: 'Confirmée',  cls: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Annulée',    cls: 'bg-red-100 text-red-600' },
  COMPLETED: { label: 'Terminée',   cls: 'bg-gray-100 text-gray-600' },
};

function BookingRow({ b, onClick }: { b: any; onClick: () => void }) {
  const s    = STATUS_STYLE[b.status] ?? STATUS_STYLE.PENDING;
  const depAt = b.trip?.departureAt;
  const isPast = depAt ? dayjs(depAt).isBefore(dayjs()) : false;

  return (
    <button
      onClick={onClick}
      className={`w-full bg-white rounded-xl border p-4 flex items-center gap-4 hover:shadow-sm hover:border-brand-200 transition-all duration-150 text-left ${isPast ? 'opacity-70' : ''}`}
    >
      <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center shrink-0">
        <Bus size={18} className="text-brand-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-900 text-sm">
            {b.trip?.route?.originCity?.name} → {b.trip?.route?.destinationCity?.name}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${s.cls}`}>{s.label}</span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
          <Clock size={10} /> {depAt ? dayjs(depAt).format('ddd D MMM · HH:mm') : '—'}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-bold text-gray-900 text-sm">{formatCFA(b.totalAmount)}</p>
        <ArrowRight size={13} className="text-gray-300 ml-auto mt-1" />
      </div>
    </button>
  );
}

export default function PassengerHome() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [origin,      setOrigin]      = useState('');
  const [destination, setDestination] = useState('');
  const [date,        setDate]        = useState(dayjs().format('YYYY-MM-DD'));
  const [passengers,  setPassengers]  = useState(1);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [showHistory,     setShowHistory]     = useState(false);

  const { data: citiesRaw } = useQuery({
    queryKey: ['cities-list'],
    queryFn:  async () => ((await citiesApi.list()) ?? []) as any[],
    staleTime: 10 * 60_000,
  });
  const cities: string[] = Array.isArray(citiesRaw) && citiesRaw.length > 0
    ? citiesRaw.map((c: any) => c.name)
    : FALLBACK_CITIES;

  const { favs } = useFavorites();

  const { data: bookingsRaw, isLoading } = useQuery({
    queryKey: ['my-bookings'],
    queryFn:  () => bookingsApi.myBookings() as any,
  });
  const bookings: any[] = Array.isArray(bookingsRaw) ? bookingsRaw : [];

  const now      = dayjs();
  const upcoming = bookings.filter(
    (b) => ['PENDING', 'CONFIRMED'].includes(b.status) && dayjs(b.trip?.departureAt).isAfter(now),
  );
  const history = bookings.filter(
    (b) => b.status === 'COMPLETED' || b.status === 'CANCELLED' || dayjs(b.trip?.departureAt).isBefore(now),
  );
  const completed   = bookings.filter((b) => b.status === 'COMPLETED');
  const totalSpent  = completed.reduce((s, b) => s + (b.totalAmount ?? 0), 0);

  const visibleUpcoming = showAllUpcoming ? upcoming : upcoming.slice(0, 4);
  const visibleHistory  = showHistory ? history.slice(0, 10) : history.slice(0, 4);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (origin)      params.set('origin',     origin);
    if (destination) params.set('destination', destination);
    if (date)        params.set('date',        date);
    if (passengers > 1) params.set('passengers', String(passengers));
    router.push(`/passenger/search?${params.toString()}`);
  }

  function quickSearch(from: string, to: string) {
    const p = new URLSearchParams({ origin: from, destination: to, date: dayjs().format('YYYY-MM-DD') });
    router.push(`/passenger/search?${p.toString()}`);
  }

  return (
    <div className="space-y-6">
      {/* ── Hero: greeting + search ── */}
      <div className="bg-gradient-to-br from-[#0c1425] via-[#142035] to-[#1a3a5c] rounded-2xl p-6 text-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-brand-500/10 rounded-full pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-brand-600/10 rounded-full pointer-events-none" />

        <div className="relative">
          <p className="text-slate-400 text-sm font-medium">Bonjour,</p>
          <h1 className="text-2xl font-bold mt-0.5 mb-5">
            {user?.firstName} {user?.lastName} 👋
          </h1>

          <form onSubmit={handleSearch} className="bg-white rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Origin */}
              <div className="relative">
                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400 bg-white transition-all"
                >
                  <option value="">Ville de départ</option>
                  {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {/* Destination */}
              <div className="relative">
                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" />
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400 bg-white transition-all"
                >
                  <option value="">Ville d'arrivée</option>
                  {cities.filter((c) => c !== origin).map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {/* Date */}
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={date}
                  min={dayjs().format('YYYY-MM-DD')}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400 transition-all"
                />
              </div>
              {/* Passengers + submit */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Users size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select
                    value={passengers}
                    onChange={(e) => setPassengers(Number(e.target.value))}
                    className="w-full pl-7 pr-2 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500/40 bg-white transition-all"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{n} pax</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-brand-500/20 shrink-0"
                >
                  <Search size={14} /> Rechercher
                </button>
              </div>
            </div>
          </form>

          {/* Popular routes */}
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <span className="text-slate-500 text-xs font-medium">Populaires :</span>
            {POPULAR_ROUTES.map((r) => (
              <button
                key={`${r.from}-${r.to}`}
                onClick={() => quickSearch(r.from, r.to)}
                className="bg-white/[0.08] hover:bg-white/[0.15] text-slate-300 text-xs px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 border border-white/10"
              >
                {r.from} <ArrowRight size={10} /> {r.to}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Next booking hero ── */}
      {!isLoading && upcoming.length > 0 && (() => {
        const next = upcoming[0];
        const depAt = next.trip?.departureAt;
        return (
          <button
            onClick={() => router.push(`/passenger/bookings/${next.id}`)}
            className="w-full bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 rounded-2xl p-5 text-white text-left transition shadow-md shadow-brand-500/25 group"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-brand-200 text-xs font-medium mb-1.5 flex items-center gap-1">
                  <Bus size={11} /> Prochain voyage
                </p>
                <p className="text-lg font-bold truncate">
                  {next.trip?.route?.originCity?.name} <span className="text-brand-300">→</span> {next.trip?.route?.destinationCity?.name}
                </p>
                <p className="text-brand-200 text-sm mt-0.5 flex items-center gap-1.5 capitalize">
                  <Calendar size={11} />
                  {depAt ? dayjs(depAt).format('dddd D MMM à HH:mm') : '—'}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-2xl font-bold">{formatCFA(next.totalAmount)}</p>
                <p className="text-brand-200 text-xs mt-0.5">{STATUS_STYLE[next.status]?.label}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-brand-300 text-xs font-medium group-hover:text-white transition">
              <Ticket size={11} /> Voir les billets <ArrowRight size={11} />
            </div>
          </button>
        );
      })()}

      {/* ── Stats ── */}
      {!isLoading && bookings.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Réservations',      value: bookings.length,         icon: Ticket,       iconBg: 'bg-brand-100',   iconCls: 'text-brand-600',   accent: 'border-brand-400' },
            { label: 'Voyages effectués', value: completed.length,        icon: CheckCircle2, iconBg: 'bg-green-100',   iconCls: 'text-green-600',   accent: 'border-green-400' },
            { label: 'À venir',           value: upcoming.length,         icon: Bus,          iconBg: 'bg-blue-100',    iconCls: 'text-blue-600',    accent: 'border-blue-400' },
            { label: 'Total dépensé',     value: formatCFA(totalSpent),   icon: TrendingUp,   iconBg: 'bg-violet-100',  iconCls: 'text-violet-600',  accent: 'border-violet-400' },
          ].map((s) => (
            <div key={s.label} className={`bg-white rounded-xl p-5 border border-gray-100 border-t-2 ${s.accent} shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 cursor-default`}>
              <div className={`w-10 h-10 ${s.iconBg} rounded-xl flex items-center justify-center mb-3`}>
                <s.icon size={18} className={s.iconCls} />
              </div>
              <p className="text-[1.5rem] font-bold text-gray-900 leading-none truncate">{s.value}</p>
              <p className="text-gray-500 text-sm mt-1.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Favorite companies ── */}
      {favs.companies.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-bold text-gray-900 flex items-center gap-2">
              <Star size={15} className="text-amber-400 fill-amber-400" />
              Mes compagnies favorites
            </h2>
            <button
              onClick={() => router.push('/passenger/favorites')}
              className="text-xs text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1 transition-colors"
            >
              Voir tout <ArrowRight size={12} />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
            {favs.companies.map((c) => (
              <button
                key={c.id}
                onClick={() => router.push(`/passenger/companies/${c.slug}`)}
                className="flex flex-col items-center gap-2 shrink-0 group"
              >
                {c.logo ? (
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm group-hover:shadow-md group-hover:border-brand-200 transition-all">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.logo} alt={c.name} className="object-contain w-full h-full p-1" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center shadow-sm group-hover:shadow-md transition-all">
                    <Building2 size={24} className="text-brand-400" />
                  </div>
                )}
                <span className="text-[11px] font-medium text-gray-600 group-hover:text-brand-600 transition-colors w-16 text-center leading-tight truncate">
                  {c.name}
                </span>
              </button>
            ))}
            {/* Add more shortcut */}
            <button
              onClick={() => router.push('/passenger/companies')}
              className="flex flex-col items-center gap-2 shrink-0 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center group-hover:border-brand-300 group-hover:bg-brand-50 transition-all">
                <Building2 size={20} className="text-gray-300 group-hover:text-brand-400 transition-colors" />
              </div>
              <span className="text-[11px] font-medium text-gray-400 group-hover:text-brand-500 transition-colors w-16 text-center leading-tight">
                Voir tout
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ── Main content: upcoming + history ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming trips */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h2 className="text-[15px] font-semibold text-gray-900">Prochains voyages</h2>
            <button
              onClick={() => router.push('/passenger/bookings')}
              className="text-xs text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1 transition-colors"
            >
              Voir tout <ArrowRight size={12} />
            </button>
          </div>

          <div className="p-4 space-y-2.5">
            {isLoading ? (
              <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-gray-300" /></div>
            ) : upcoming.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center">
                  <Bus size={22} className="text-brand-300" />
                </div>
                <div>
                  <p className="font-semibold text-gray-700 text-sm">Aucun voyage à venir</p>
                  <p className="text-xs text-gray-400 mt-0.5">Réservez votre prochain trajet</p>
                </div>
                <button
                  onClick={() => router.push('/passenger/search')}
                  className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-xs font-semibold transition"
                >
                  Rechercher
                </button>
              </div>
            ) : (
              <>
                {visibleUpcoming.map((b) => (
                  <BookingRow key={b.id} b={b} onClick={() => router.push(`/passenger/bookings/${b.id}`)} />
                ))}
                {upcoming.length > 4 && (
                  <button
                    onClick={() => setShowAllUpcoming(!showAllUpcoming)}
                    className="w-full py-2 text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center justify-center gap-1 border border-dashed border-brand-200 rounded-lg hover:bg-brand-50 transition"
                  >
                    {showAllUpcoming
                      ? <><ChevronUp size={12} /> Réduire</>
                      : <><ChevronDown size={12} /> {upcoming.length - 4} de plus</>}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* History */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h2 className="text-[15px] font-semibold text-gray-900">Historique</h2>
            {history.length > 0 && (
              <span className="text-xs bg-gray-100 text-gray-500 font-semibold px-2.5 py-1 rounded-full">
                {history.length} voyage{history.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="p-4 space-y-2.5">
            {isLoading ? (
              <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-gray-300" /></div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                <Star size={28} className="text-gray-200" />
                <p className="text-sm text-gray-400">Votre historique apparaîtra ici</p>
              </div>
            ) : (
              <>
                {visibleHistory.map((b) => (
                  <BookingRow key={b.id} b={b} onClick={() => router.push(`/passenger/bookings/${b.id}`)} />
                ))}
                {history.length > 4 && (
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="w-full py-2 text-xs text-gray-500 hover:text-gray-700 font-medium flex items-center justify-center gap-1 border border-dashed border-gray-200 rounded-lg hover:bg-gray-50 transition"
                  >
                    {showHistory
                      ? <><ChevronUp size={12} /> Réduire</>
                      : <><ChevronDown size={12} /> Voir plus</>}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
