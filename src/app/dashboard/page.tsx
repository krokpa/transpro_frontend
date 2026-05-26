'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tenantsApi, tripsApi } from '@/lib/api';
import { formatCFA } from '@transpro/shared';
import { useAuthStore } from '@/store/auth.store';
import {
  TrendingUp, TrendingDown, Users, Bus, Ticket, Calendar,
  ArrowRight, Clock, AlertTriangle, CreditCard, CheckCircle2,
  MapPin, BarChart2,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import Link from 'next/link';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
dayjs.locale('fr');

const PERIODS = [
  { key: '7d',  label: '7 j' },
  { key: '30d', label: '30 j' },
  { key: '90d', label: '90 j' },
  { key: '12m', label: '12 m' },
] as const;

const TRIP_STATUS: Record<string, { label: string; cls: string }> = {
  SCHEDULED: { label: 'Planifié',  cls: 'bg-blue-100 text-blue-700' },
  BOARDING:  { label: 'Embarq.',   cls: 'bg-amber-100 text-amber-700' },
  DEPARTED:  { label: 'En route',  cls: 'bg-green-100 text-green-700' },
  ARRIVED:   { label: 'Arrivé',    cls: 'bg-gray-100 text-gray-600' },
  CANCELLED: { label: 'Annulé',    cls: 'bg-red-100 text-red-700' },
};

const BOOKING_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING:   { label: 'En attente', cls: 'bg-amber-100 text-amber-700' },
  CONFIRMED: { label: 'Confirmée',  cls: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Annulée',    cls: 'bg-red-100 text-red-600' },
  COMPLETED: { label: 'Terminée',   cls: 'bg-gray-100 text-gray-600' },
};

function ChangeChip({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span className={`flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full ${up ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'}`}>
      {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {Math.abs(value)}%
    </span>
  );
}

function SubscriptionBanner({ tenant }: { tenant: any }) {
  if (!tenant) return null;
  const { status, trialEndsAt, subscriptionEndsAt } = tenant;

  if (status === 'SUSPENDED') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
        <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
          <AlertTriangle size={16} className="text-red-500" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-red-700 text-sm">Compte suspendu</p>
          <p className="text-xs text-red-500 mt-0.5">Votre accès est limité. Renouvelez votre abonnement pour rétablir le service.</p>
        </div>
        <Link href="/dashboard/subscription" className="bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shrink-0">
          Renouveler
        </Link>
      </div>
    );
  }

  if (status === 'TRIAL') {
    const endsAt = trialEndsAt ? new Date(trialEndsAt) : null;
    const daysLeft = endsAt ? Math.ceil((endsAt.getTime() - Date.now()) / 86400000) : null;
    if (!daysLeft || daysLeft > 14) return null;
    const urgent = daysLeft <= 3;
    return (
      <div className={`border rounded-xl p-4 flex items-center gap-3 ${urgent ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}`}>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${urgent ? 'bg-orange-100' : 'bg-blue-100'}`}>
          <CreditCard size={16} className={urgent ? 'text-orange-500' : 'text-blue-500'} />
        </div>
        <div className="flex-1">
          <p className={`font-semibold text-sm ${urgent ? 'text-orange-700' : 'text-blue-700'}`}>
            Période d'essai — {daysLeft} jour{daysLeft > 1 ? 's' : ''} restant{daysLeft > 1 ? 's' : ''}
          </p>
          <p className={`text-xs mt-0.5 ${urgent ? 'text-orange-500' : 'text-blue-500'}`}>Passez à un plan payant pour continuer sans interruption.</p>
        </div>
        <Link href="/dashboard/subscription" className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shrink-0 text-white ${urgent ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600'}`}>
          Voir les plans
        </Link>
      </div>
    );
  }

  if (status === 'ACTIVE' && subscriptionEndsAt) {
    const daysLeft = Math.ceil((new Date(subscriptionEndsAt).getTime() - Date.now()) / 86400000);
    if (daysLeft > 7) return null;
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
        <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
          <AlertTriangle size={16} className="text-amber-500" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-amber-700 text-sm">Abonnement expire dans {daysLeft} jour{daysLeft > 1 ? 's' : ''}</p>
          <p className="text-xs text-amber-500 mt-0.5">Renouvelez maintenant pour éviter toute interruption.</p>
        </div>
        <Link href="/dashboard/subscription" className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shrink-0">
          Renouveler
        </Link>
      </div>
    );
  }

  return null;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '12m'>('30d');

  const canFetchTenant = user?.role === 'COMPANY_OWNER' || user?.role === 'COMPANY_ADMIN';

  const { data: tenantRaw } = useQuery({
    queryKey: ['tenant-me'],
    queryFn: () => tenantsApi.me() as any,
    enabled: canFetchTenant,
    staleTime: 5 * 60_000,
  });
  const tenant = tenantRaw as any;

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['dashboard-analytics', period],
    queryFn: () => tenantsApi.analytics(period) as any,
    refetchInterval: 5 * 60_000,
    staleTime: 2 * 60_000,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => tenantsApi.stats() as any,
    refetchInterval: 60_000,
  });

  const { data: todayTripsRaw } = useQuery({
    queryKey: ['today-trips'],
    queryFn: () => tripsApi.list({ date: dayjs().format('YYYY-MM-DD') }) as any,
    refetchInterval: 30_000,
  });
  const todayTrips: any[] = Array.isArray(todayTripsRaw) ? todayTripsRaw : [];

  const isLoading = analyticsLoading && statsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-100 rounded-xl w-52" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 h-72 bg-gray-100 rounded-xl" />
          <div className="h-72 bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  const kpis       = analytics?.kpis;
  const timeline   = analytics?.timeline ?? [];
  const topRoutes  = analytics?.topRoutes ?? stats?.topRoutes ?? [];
  const recentBookings: any[] = stats?.recentBookings ?? [];

  const statCards = [
    {
      label: 'Revenus',
      value: formatCFA(kpis?.revenue?.current ?? stats?.totalRevenue ?? 0),
      icon: TrendingUp,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-100',
      accent: 'border-emerald-400',
      change: kpis?.revenue?.change,
      sub: kpis?.revenue?.previous != null ? `vs ${formatCFA(kpis.revenue.previous)} période préc.` : null,
    },
    {
      label: 'Réservations',
      value: (kpis?.bookings?.current ?? stats?.totalBookings ?? 0).toLocaleString('fr'),
      icon: Ticket,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
      accent: 'border-blue-400',
      change: kpis?.bookings?.change,
      sub: kpis?.bookings?.previous != null ? `vs ${kpis.bookings.previous} période préc.` : null,
    },
    {
      label: 'Voyageurs',
      value: (kpis?.passengers?.current ?? stats?.totalPassengers ?? 0).toLocaleString('fr'),
      icon: Users,
      iconColor: 'text-violet-600',
      iconBg: 'bg-violet-100',
      accent: 'border-violet-400',
      change: kpis?.passengers?.change,
      sub: null,
    },
    {
      label: "Taux d'occupation",
      value: `${kpis?.occupancy?.current ?? stats?.occupancyRate ?? 0} %`,
      icon: Bus,
      iconColor: 'text-brand-600',
      iconBg: 'bg-brand-100',
      accent: 'border-brand-400',
      change: null,
      sub: kpis?.occupancy?.totalTrips != null ? `${kpis.occupancy.totalTrips} voyage${kpis.occupancy.totalTrips > 1 ? 's' : ''}` : null,
    },
  ];

  const chartLabel = period === '12m'
    ? (d: string) => dayjs(d).format('MMM YYYY')
    : (d: string) => dayjs(d).format('DD/MM');

  return (
    <div className="space-y-6">
      {/* Subscription banner */}
      <SubscriptionBanner tenant={tenant} />

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[1.35rem] font-bold text-gray-900 leading-tight">
            Bonjour, {user?.firstName} 👋
          </h1>
          <p className="text-gray-400 text-sm mt-0.5 capitalize">{dayjs().format('dddd D MMMM YYYY')}</p>
        </div>
        {/* Period selector — pill style */}
        <div className="flex items-center gap-1 bg-gray-100/80 rounded-full p-1 shrink-0">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                period === p.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`bg-white rounded-xl p-5 shadow-sm border border-gray-100 border-t-2 ${card.accent} hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 cursor-default`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`rounded-xl p-2.5 ${card.iconBg}`}>
                <card.icon size={18} className={card.iconColor} />
              </div>
              {card.change != null && <ChangeChip value={card.change} />}
            </div>
            <p className="text-[1.65rem] font-bold text-gray-900 truncate leading-none">{card.value}</p>
            <p className="text-gray-500 text-sm mt-1.5">{card.label}</p>
            {card.sub && <p className="text-gray-400 text-xs mt-1">{card.sub}</p>}
          </div>
        ))}
      </div>

      {/* ── Chart + Today's trips ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue area chart */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-[15px] font-semibold text-gray-900">Revenus & Réservations</h2>
              <p className="text-xs text-gray-400 mt-0.5">Évolution sur la période sélectionnée</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-500 inline-block" />
                Revenus
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" />
                Réservations
              </span>
            </div>
          </div>
          {timeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={timeline} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f97316" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#60a5fa" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tickFormatter={chartLabel} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis yAxisId="rev" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} width={38} />
                <YAxis yAxisId="bkg" orientation="right" tick={{ fontSize: 10 }} width={28} />
                <Tooltip
                  contentStyle={{ borderRadius: '10px', border: '1px solid #f3f4f6', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
                  formatter={(v: any, name: string) =>
                    name === 'revenue' ? [formatCFA(v), 'Revenus'] : [v, 'Réservations']
                  }
                  labelFormatter={(l) => dayjs(l).format('DD MMM YYYY')}
                />
                <Area yAxisId="rev" type="monotone" dataKey="revenue"  stroke="#f97316" strokeWidth={2}   fill="url(#colorRevenue)"  dot={false} />
                <Area yAxisId="bkg" type="monotone" dataKey="bookings" stroke="#60a5fa" strokeWidth={1.5} fill="url(#colorBookings)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
              <BarChart2 size={36} className="text-gray-200" />
              Pas encore de données pour cette période
            </div>
          )}
        </div>

        {/* Voyages du jour */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[15px] font-semibold text-gray-900">Voyages aujourd'hui</h2>
            </div>
            <span className="text-xs bg-brand-50 text-brand-600 font-semibold px-2.5 py-1 rounded-full">
              {todayTrips.length}
            </span>
          </div>
          <div className="space-y-1">
            {todayTrips.slice(0, 6).map((trip: any) => {
              const sc = TRIP_STATUS[trip.status] ?? { label: trip.status, cls: 'bg-gray-100 text-gray-600' };
              return (
                <div key={trip.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">
                      {trip.route?.originCity?.name} → {trip.route?.destinationCity?.name}
                    </p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <Clock size={10} />
                      {dayjs(trip.departureAt).format('HH:mm')}
                      {trip.tripClass && <span className="text-gray-300">· {trip.tripClass}</span>}
                    </p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ml-2 ${sc.cls}`}>
                    {sc.label}
                  </span>
                </div>
              );
            })}
            {todayTrips.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400 text-sm gap-2">
                <Calendar size={28} className="text-gray-200" />
                Aucun voyage planifié aujourd'hui
              </div>
            )}
            {todayTrips.length > 6 && (
              <Link href="/dashboard/trips" className="block text-center text-xs text-brand-600 hover:text-brand-700 font-medium pt-2">
                +{todayTrips.length - 6} autres →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Recent bookings + Top routes ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent bookings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h2 className="text-[15px] font-semibold text-gray-900">Réservations récentes</h2>
            <Link href="/dashboard/bookings" className="text-xs text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1 transition-colors">
              Voir tout <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentBookings.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400 text-sm gap-2">
                <Ticket size={24} className="text-gray-200" />
                Aucune réservation récente
              </div>
            )}
            {recentBookings.slice(0, 5).map((b: any) => {
              const bs = BOOKING_STATUS[b.status] ?? BOOKING_STATUS.PENDING;
              return (
                <div key={b.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/60 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold shrink-0">
                    {b.passenger?.firstName?.[0]}{b.passenger?.lastName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {b.passenger?.firstName} {b.passenger?.lastName}
                    </p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <MapPin size={10} />
                      {b.trip?.route?.originCity?.name} → {b.trip?.route?.destinationCity?.name}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-gray-900">{formatCFA(b.totalAmount)}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${bs.cls}`}>{bs.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top routes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h2 className="text-[15px] font-semibold text-gray-900">Itinéraires performants</h2>
            <Link href="/dashboard/routes" className="text-xs text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1 transition-colors">
              Gérer <ArrowRight size={12} />
            </Link>
          </div>
          {topRoutes.length > 0 ? (
            <div className="p-5">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={topRoutes.slice(0, 5)} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                  <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    width={90}
                    tickFormatter={(v: string) => v?.length > 14 ? `${v.slice(0, 14)}…` : v}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '10px', border: '1px solid #f3f4f6', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
                    formatter={(v: any) => [formatCFA(v), 'Revenus']}
                  />
                  <Bar dataKey="revenue" fill="#f97316" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-2">
                {topRoutes.slice(0, 5).map((r: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-[10px] shrink-0">{i + 1}</span>
                      {r.origin ?? r.name} → {r.destination ?? ''}
                    </span>
                    <span className="font-semibold text-gray-700">{r.bookings} rés.</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400 text-sm gap-2">
              <MapPin size={28} className="text-gray-200" />
              Aucune donnée d'itinéraire
            </div>
          )}
        </div>
      </div>

      {/* ── Payment methods breakdown ── */}
      {analytics?.paymentMethods?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-[15px] font-semibold text-gray-900 mb-4">Moyens de paiement</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {analytics.paymentMethods.map((m: any) => {
              const total = analytics.paymentMethods.reduce((s: number, x: any) => s + x.revenue, 0);
              const share = total > 0 ? Math.round((m.revenue / total) * 100) : 0;
              return (
                <div key={m.method} className="bg-gray-50 rounded-xl p-3.5 text-center hover:bg-gray-100/70 transition-colors">
                  <p className="text-xl font-bold text-gray-900">{share}%</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{m.label}</p>
                  <p className="text-xs text-brand-600 font-semibold mt-1">{formatCFA(m.revenue)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Quick actions ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Nouveau voyage',  href: '/dashboard/trips',       icon: Bus,          color: 'text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100' },
          { label: 'Vente guichet',   href: '/dashboard/billetterie', icon: Ticket,       color: 'text-brand-600 bg-brand-50 hover:bg-brand-100 border border-brand-100' },
          { label: 'Scanner billet',  href: '/dashboard/scanner',     icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100' },
          { label: 'Analytiques',     href: '/dashboard/analytics',   icon: BarChart2,    color: 'text-violet-600 bg-violet-50 hover:bg-violet-100 border border-violet-100' },
        ].map((a) => (
          <Link key={a.href} href={a.href}
            className={`rounded-xl p-4 flex flex-col items-center gap-2.5 transition-all duration-150 ${a.color}`}
          >
            <div className="w-10 h-10 bg-white/60 rounded-xl flex items-center justify-center shadow-sm">
              <a.icon size={20} />
            </div>
            <span className="text-xs font-semibold text-center">{a.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
