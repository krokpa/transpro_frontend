'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { stationsApi } from '@/lib/api';
import { useBranding } from '@/lib/branding';
import { formatCFA } from '@transpro/shared';
import { TrendingUp, Ticket, Banknote, Bus, BarChart2, PieChart } from 'lucide-react';

const PERIOD_OPTIONS = [
  { label: '7 jours', days: 7 },
  { label: '30 jours', days: 30 },
  { label: '90 jours', days: 90 },
];

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Espèces', ORANGE_MONEY: 'Orange Money',
  MTN_MOMO: 'MTN MoMo', WAVE: 'Wave', CARD: 'Carte',
};

const METHOD_COLORS: Record<string, string> = {
  CASH: '#6b7280', ORANGE_MONEY: '#f97316',
  MTN_MOMO: '#eab308', WAVE: '#3b82f6', CARD: '#8b5cf6',
};

function MiniBar({ value, max, color = '#94a3b8' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 2;
  return (
    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function StationAnalyticsPage() {
  const { stationId } = useParams<{ stationId: string }>();
  const { primaryColor } = useBranding();
  const [days, setDays] = useState(30);

  const { data, isLoading } = useQuery({
    queryKey: ['station-analytics', stationId, days],
    queryFn: () => stationsApi.getAnalytics(stationId, days) as any,
  });

  const totals = data?.totals ?? {};
  const trend: any[] = data?.trend ?? [];
  const topRoutes: any[] = data?.topRoutes ?? [];
  const byMethod: Record<string, number> = data?.byMethod ?? {};

  const maxRevenue = Math.max(...trend.map((d: any) => d.revenue), 1);
  const maxCount = Math.max(...trend.map((d: any) => d.count), 1);

  const totalMethod = Object.values(byMethod).reduce((s, v) => s + v, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp size={20} className="text-brand-500" /> Analytiques
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">{data?.period ? `${data.period.start} → ${data.period.end}` : ''}</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              onClick={() => setDays(opt.days)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${days === opt.days ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-gray-400">Chargement des données...</div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Chiffre d\'affaires', value: formatCFA(totals.revenue ?? 0), icon: Banknote, color: 'text-green-500 bg-green-50' },
              { label: 'Billets vendus', value: totals.bookings ?? 0, icon: Ticket, color: 'text-brand-500 bg-brand-50' },
              { label: 'Taux de confirmation', value: `${totals.conversionRate ?? 0}%`, icon: TrendingUp, color: 'text-blue-500 bg-blue-50' },
              { label: 'Taux d\'occupation moy.', value: `${totals.avgOccupancy ?? 0}%`, icon: Bus, color: 'text-purple-500 bg-purple-50' },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`rounded-lg p-1.5 ${kpi.color}`}><kpi.icon size={14} /></div>
                  <p className="text-xs text-gray-500">{kpi.label}</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                {totals.cancelled > 0 && kpi.label === 'Billets vendus' && (
                  <p className="text-xs text-gray-400 mt-0.5">{totals.cancelled} annulé{totals.cancelled > 1 ? 's' : ''}</p>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Revenue trend */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 size={15} className="text-gray-400" />
                <h2 className="font-semibold text-gray-900 text-sm">Revenus par jour</h2>
              </div>
              {trend.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-gray-400 text-sm">Aucune donnée</div>
              ) : (
                <div className="space-y-1.5">
                  {trend.filter((_, i) => days <= 7 || i % Math.ceil(days / 14) === 0 || i === trend.length - 1).map((d: any) => (
                    <div key={d.date} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-12 shrink-0">{d.label}</span>
                      <div className="flex-1">
                        <MiniBar value={d.revenue} max={maxRevenue} color={primaryColor} />
                      </div>
                      <span className="text-xs font-medium text-gray-700 w-24 text-right shrink-0">{formatCFA(d.revenue)}</span>
                      <span className="text-xs text-gray-400 w-12 text-right shrink-0">{d.count} billet{d.count !== 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right column: payment methods + top routes */}
            <div className="space-y-5">
              {/* Payment methods */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <PieChart size={15} className="text-gray-400" />
                  <h2 className="font-semibold text-gray-900 text-sm">Modes de paiement</h2>
                </div>
                {Object.keys(byMethod).length === 0 ? (
                  <p className="text-xs text-gray-400">Aucune donnée</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(byMethod)
                      .sort(([, a], [, b]) => b - a)
                      .map(([method, amount]) => {
                        const pct = totalMethod > 0 ? Math.round((amount / totalMethod) * 100) : 0;
                        return (
                          <div key={method}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-600">{METHOD_LABELS[method] ?? method}</span>
                              <span className="font-medium">{pct}%</span>
                            </div>
                            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${pct}%`, background: METHOD_COLORS[method] ?? '#94a3b8' }}
                              />
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">{formatCFA(amount)}</p>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Top routes */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Bus size={15} className="text-gray-400" />
                  <h2 className="font-semibold text-gray-900 text-sm">Top trajets</h2>
                </div>
                {topRoutes.length === 0 ? (
                  <p className="text-xs text-gray-400">Aucune donnée</p>
                ) : (
                  <div className="space-y-3">
                    {topRoutes.map((route: any, i: number) => (
                      <div key={route.label}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-700 font-medium truncate pr-2">{route.label}</span>
                          <span className="text-gray-400 shrink-0">{route.count} billet{route.count !== 1 ? 's' : ''}</span>
                        </div>
                        <MiniBar value={route.count} max={topRoutes[0]?.count ?? 1} color={i === 0 ? primaryColor : '#94a3b8'} />
                        <p className="text-xs text-gray-400 mt-0.5">{formatCFA(route.revenue)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
