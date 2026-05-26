'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tenantsApi } from '@/lib/api';
import { formatCFA } from '@transpro/shared';
import {
  TrendingUp, TrendingDown, Minus, Users, Bus, Ticket,
  Loader2, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
dayjs.locale('fr');

const PERIODS = [
  { key: '7d',  label: '7 jours' },
  { key: '30d', label: '30 jours' },
  { key: '90d', label: '90 jours' },
  { key: '12m', label: '12 mois' },
];

const BRAND_COLORS = ['#f05a1a', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

function KpiCard({ label, current, previous, change, format, icon: Icon, color }: {
  label: string; current: number; previous: number; change: number;
  format: (v: number) => string; icon: any; color: string;
}) {
  const up = change > 0;
  const flat = change === 0;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={18} />
        </div>
        <div className={`flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded-full ${
          flat ? 'bg-gray-100 text-gray-500' : up ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
        }`}>
          {flat ? <Minus size={13} /> : up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
          {Math.abs(change)}%
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{format(current)}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      <p className="text-xs text-gray-400 mt-1">Période précédente : {format(previous)}</p>
    </div>
  );
}

function CustomTooltip({ active, payload, label, isMonthly }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm min-w-[160px]">
      <p className="font-semibold text-gray-700 mb-2">
        {isMonthly ? dayjs(label).format('MMM YYYY') : dayjs(label).format('DD MMM')}
      </p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-gray-500">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-semibold text-gray-800">
            {p.dataKey === 'revenue' ? formatCFA(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('30d');

  const { data: raw, isLoading } = useQuery({
    queryKey: ['analytics', period],
    queryFn: () => tenantsApi.analytics(period) as any,
    staleTime: 2 * 60 * 1000,
  });

  const isMonthly = period === '12m';
  const a = raw as any;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-brand-500" />
      </div>
    );
  }

  const kpis = a?.kpis ?? {};
  const timeline: any[] = a?.timeline ?? [];
  const topRoutes: any[] = a?.topRoutes ?? [];
  const statusBreakdown: any[] = a?.statusBreakdown ?? [];
  const paymentMethods: any[] = a?.paymentMethods ?? [];
  const recentBookings: any[] = a?.recentBookings ?? [];

  const maxRouteRevenue = topRoutes[0]?.revenue ?? 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytiques</h1>
          <p className="text-sm text-gray-500 mt-0.5">Performances et tendances de votre compagnie</p>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                period === p.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Chiffre d'affaires"
          current={kpis.revenue?.current ?? 0}
          previous={kpis.revenue?.previous ?? 0}
          change={kpis.revenue?.change ?? 0}
          format={formatCFA}
          icon={TrendingUp}
          color="text-green-600 bg-green-50"
        />
        <KpiCard
          label="Réservations"
          current={kpis.bookings?.current ?? 0}
          previous={kpis.bookings?.previous ?? 0}
          change={kpis.bookings?.change ?? 0}
          format={(v) => v.toLocaleString('fr')}
          icon={Ticket}
          color="text-blue-600 bg-blue-50"
        />
        <KpiCard
          label="Voyageurs uniques"
          current={kpis.passengers?.current ?? 0}
          previous={kpis.passengers?.previous ?? 0}
          change={kpis.passengers?.change ?? 0}
          format={(v) => v.toLocaleString('fr')}
          icon={Users}
          color="text-purple-600 bg-purple-50"
        />
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-orange-600 bg-orange-50">
              <Bus size={18} />
            </div>
            <span className="text-sm font-semibold text-gray-500">
              {kpis.occupancy?.totalTrips ?? 0} voyages
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{kpis.occupancy?.current ?? 0}%</p>
          <p className="text-sm text-gray-500 mt-0.5">Taux d'occupation</p>
          <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-400 rounded-full transition-all"
              style={{ width: `${kpis.occupancy?.current ?? 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Revenue timeline */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-900">Évolution des revenus et réservations</h2>
        </div>
        {timeline.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-gray-400 text-sm">Aucune donnée sur cette période</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={timeline} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f05a1a" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f05a1a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickFormatter={(v) => isMonthly ? dayjs(v).format('MMM') : dayjs(v).format('DD/MM')}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="rev"
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                width={45}
              />
              <YAxis
                yAxisId="bk"
                orientation="right"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                width={35}
              />
              <Tooltip content={<CustomTooltip isMonthly={isMonthly} />} />
              <Area
                yAxisId="rev"
                type="monotone"
                dataKey="revenue"
                name="Revenus"
                stroke="#f05a1a"
                strokeWidth={2}
                fill="url(#revGrad)"
                dot={false}
              />
              <Area
                yAxisId="bk"
                type="monotone"
                dataKey="bookings"
                name="Réservations"
                stroke="#3b82f6"
                strokeWidth={1.5}
                fill="none"
                dot={false}
                strokeDasharray="4 2"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top routes + Status breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Top routes */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-bold text-gray-900 mb-5">Top routes — Chiffre d'affaires</h2>
          {topRoutes.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">Aucune donnée sur cette période</p>
          ) : (
            <div className="space-y-4">
              {topRoutes.map((r, i) => (
                <div key={r.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-gray-400 w-4 shrink-0">{i + 1}.</span>
                      <span className="font-medium text-gray-800 truncate">
                        {r.origin} → {r.destination}
                      </span>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <span className="font-bold text-gray-900">{formatCFA(r.revenue)}</span>
                      <span className="text-xs text-gray-400 ml-1.5">({r.bookings} rés.)</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min((r.revenue / maxRouteRevenue) * 100, 100)}%`,
                        background: BRAND_COLORS[i % BRAND_COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status breakdown */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-bold text-gray-900 mb-4">Statut des réservations</h2>
          {statusBreakdown.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">Aucune donnée</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={statusBreakdown}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    strokeWidth={2}
                    stroke="#fff"
                  >
                    {statusBreakdown.map((s) => (
                      <Cell key={s.status} fill={s.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any, name: any) => [v, name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-2">
                {statusBreakdown.map((s) => (
                  <div key={s.status} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                      <span className="text-gray-600">{s.label}</span>
                    </div>
                    <span className="font-semibold text-gray-800">{s.count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Payment methods */}
      {paymentMethods.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-bold text-gray-900 mb-5">Répartition par méthode de paiement</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-center">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={paymentMethods} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#374151' }}
                  tickLine={false}
                  axisLine={false}
                  width={110}
                />
                <Tooltip formatter={(v: any) => [formatCFA(v), 'Revenus']} />
                <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
                  {paymentMethods.map((_, i) => (
                    <Cell key={i} fill={BRAND_COLORS[i % BRAND_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              {paymentMethods.map((m, i) => {
                const total = paymentMethods.reduce((s, x) => s + x.revenue, 0);
                const pct = total > 0 ? Math.round((m.revenue / total) * 100) : 0;
                return (
                  <div key={m.method}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 font-medium">{m.label}</span>
                      <span className="text-gray-500">{formatCFA(m.revenue)} · {pct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: BRAND_COLORS[i % BRAND_COLORS.length] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Recent bookings */}
      {recentBookings.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-bold text-gray-900 mb-4">Réservations récentes</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs text-gray-400 font-medium pb-3 pr-4">Passager</th>
                  <th className="text-left text-xs text-gray-400 font-medium pb-3 pr-4">Trajet</th>
                  <th className="text-left text-xs text-gray-400 font-medium pb-3 pr-4">Départ</th>
                  <th className="text-left text-xs text-gray-400 font-medium pb-3 pr-4">Statut</th>
                  <th className="text-right text-xs text-gray-400 font-medium pb-3">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentBookings.map((b: any) => (
                  <tr key={b.id} className="hover:bg-gray-50 transition">
                    <td className="py-3 pr-4 font-medium text-gray-800">
                      {b.passenger?.firstName} {b.passenger?.lastName}
                    </td>
                    <td className="py-3 pr-4 text-gray-600">
                      {b.trip?.route?.originCity?.name} → {b.trip?.route?.destinationCity?.name}
                    </td>
                    <td className="py-3 pr-4 text-gray-500">
                      {dayjs(b.trip?.departureAt).format('DD MMM · HH:mm')}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        b.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                        b.status === 'PENDING'   ? 'bg-yellow-100 text-yellow-700' :
                        b.status === 'CANCELLED' ? 'bg-red-100 text-red-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {b.status === 'CONFIRMED' ? 'Confirmée' : b.status === 'PENDING' ? 'En attente' : b.status === 'CANCELLED' ? 'Annulée' : 'Terminée'}
                      </span>
                    </td>
                    <td className="py-3 text-right font-semibold text-gray-900">
                      {formatCFA(b.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
