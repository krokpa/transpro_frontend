'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { settlementsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { formatCFA } from '@transpro/shared';
import {
  Banknote, Clock, CheckCircle2, XCircle, Loader2,
  ChevronRight, TrendingUp, ArrowUpRight, Wallet,
  Info, AlertCircle, BarChart3,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import Link from 'next/link';

dayjs.locale('fr');

const STATUS_CONFIG: Record<string, { label: string; cls: string; dot: string; icon: React.ElementType; desc: string }> = {
  PENDING:    {
    label: 'En attente',
    cls:   'bg-amber-50 text-amber-700 border border-amber-200',
    dot:   'bg-amber-400',
    icon:  Clock,
    desc:  'Le reversement est calculé et attend le traitement de TransPro.',
  },
  PROCESSING: {
    label: 'Virement initié',
    cls:   'bg-blue-50 text-blue-700 border border-blue-200',
    dot:   'bg-blue-400',
    icon:  Loader2,
    desc:  'Le virement bancaire a été initié par TransPro.',
  },
  PAID: {
    label: 'Reversé',
    cls:   'bg-emerald-50 text-emerald-700 border border-emerald-200',
    dot:   'bg-emerald-400',
    icon:  CheckCircle2,
    desc:  'Le montant a été versé sur votre compte bancaire.',
  },
  FAILED: {
    label: 'Échoué',
    cls:   'bg-red-50 text-red-600 border border-red-200',
    dot:   'bg-red-400',
    icon:  XCircle,
    desc:  'Le virement a échoué. Vérifiez vos coordonnées bancaires.',
  },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs space-y-1.5">
      <p className="font-semibold text-gray-700 capitalize">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name} :</span>
          <span className="font-semibold text-gray-800">{formatCFA(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function SettlementsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'paid'>('all');

  if (user?.role === 'SUPER_ADMIN') {
    router.replace('/dashboard/admin/settlements');
    return null;
  }
  if (user?.role === 'PASSENGER' || user?.role === 'DRIVER') {
    router.replace('/dashboard');
    return null;
  }

  const { data: summaryRaw, isLoading: loadingSummary } = useQuery({
    queryKey: ['settlements-summary'],
    queryFn: () => settlementsApi.mySummary() as any,
    staleTime: 60_000,
  });

  const { data: listRaw = [], isLoading: loadingList } = useQuery({
    queryKey: ['settlements-list', activeTab],
    queryFn: () => settlementsApi.list(activeTab !== 'all' ? {
      status: activeTab === 'pending' ? 'PENDING' : 'PAID',
    } : {}) as any,
    staleTime: 30_000,
  });

  const summary = (summaryRaw as any)?.data ?? summaryRaw;
  const settlements: any[] = Array.isArray(listRaw)
    ? listRaw
    : (listRaw as any)?.data ?? [];

  const monthly: any[] = summary?.monthly ?? [];
  const hasPendingNoBank = settlements.some(
    (s) => s.status === 'PENDING' && (!s.bankName || !s.bankAccount),
  );

  return (
    <div className="space-y-7">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mes reversements</h1>
        <p className="text-sm text-gray-500 mt-1">
          Suivi de vos reversements TransPro — revenus des billets payés en ligne, déduction des frais et commissions.
        </p>
      </div>

      {/* Alerte coordonnées bancaires manquantes */}
      {hasPendingNoBank && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Coordonnées bancaires manquantes</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Vous avez un ou plusieurs reversements en attente sans coordonnées bancaires.
              Ajoutez vos informations bancaires pour que TransPro puisse traiter votre virement.
            </p>
          </div>
        </div>
      )}

      {/* KPI cards */}
      {loadingSummary ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label:   'Total reversé',
              value:   formatCFA(summary?.totalPaid ?? 0),
              sub:     'Virements confirmés',
              icon:    CheckCircle2,
              iconBg:  'bg-emerald-100',
              iconCls: 'text-emerald-600',
              border:  'border-emerald-100',
            },
            {
              label:   'En attente',
              value:   formatCFA((summary?.totalPending ?? 0) + (summary?.totalProcessing ?? 0)),
              sub:     'Reversements à venir',
              icon:    Clock,
              iconBg:  'bg-amber-100',
              iconCls: 'text-amber-600',
              border:  'border-amber-100',
            },
            {
              label:   'Frais Genius Pay',
              value:   formatCFA(summary?.totalFees ?? 0),
              sub:     '1% sur paiements en ligne',
              icon:    Banknote,
              iconBg:  'bg-slate-100',
              iconCls: 'text-slate-500',
              border:  'border-slate-100',
            },
            {
              label:   'Commission TransPro',
              value:   formatCFA(summary?.totalCommission ?? 0),
              sub:     '4% par transaction',
              icon:    BarChart3,
              iconBg:  'bg-indigo-100',
              iconCls: 'text-indigo-500',
              border:  'border-indigo-100',
            },
          ].map((kpi) => (
            <div key={kpi.label} className={`bg-white rounded-2xl border ${kpi.border} p-5 flex flex-col gap-3`}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-500">{kpi.label}</p>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${kpi.iconBg}`}>
                  <kpi.icon className={`w-4 h-4 ${kpi.iconCls}`} />
                </div>
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{kpi.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{kpi.sub}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Graphiques */}
      {monthly.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Évolution mensuelle */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Évolution des reversements</h2>
                <p className="text-xs text-gray-400 mt-0.5">12 derniers mois</p>
              </div>
              <TrendingUp className="w-4 h-4 text-gray-400" />
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthly} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="netAmount"
                  name="Net reversé"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#netGrad)"
                  dot={{ r: 3, fill: '#6366f1' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Décomposition mensuelle */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Décomposition par mois</h2>
                <p className="text-xs text-gray-400 mt-0.5">Brut · Frais · Commission</p>
              </div>
              <BarChart3 className="w-4 h-4 text-gray-400" />
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthly} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar dataKey="netAmount"    name="Net"        fill="#6366f1" radius={[3, 3, 0, 0]} stackId="a" />
                <Bar dataKey="geniusPayFees" name="Frais GP"  fill="#f59e0b" radius={[0, 0, 0, 0]} stackId="a" />
                <Bar dataKey="commissions"  name="Commission" fill="#e5e7eb" radius={[3, 3, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Explications */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex gap-3">
        <Info className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-700 space-y-1">
          <p className="font-semibold">Comment sont calculés vos reversements ?</p>
          <p>
            Pour chaque billet payé en ligne (Genius Pay), TransPro déduit <strong>1% de frais Genius Pay</strong> et{' '}
            <strong>4% de commission</strong>. Le <strong>montant net</strong> restant vous est reversé chaque mois
            par virement bancaire.
          </p>
          <p>Les paiements en espèces (CASH) ne font pas l'objet de reversement — vous les encaissez directement en gare.</p>
        </div>
      </div>

      {/* Historique */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">Historique des reversements</h2>
          <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs">
            {(['all', 'pending', 'paid'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  activeTab === tab ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {{ all: 'Tous', pending: 'En attente', paid: 'Reversés' }[tab]}
              </button>
            ))}
          </div>
        </div>

        {loadingList ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Chargement…
          </div>
        ) : settlements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Wallet className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">Aucun reversement pour l'instant</p>
            <p className="text-xs mt-1 text-gray-400 max-w-xs text-center">
              Vos reversements apparaissent ici dès qu'un mois de ventes en ligne est clôturé.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {settlements.map((s: any) => {
              const cfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.PENDING;
              const Icon = cfg.icon;
              const needsBank = s.status === 'PENDING' && (!s.bankName || !s.bankAccount);
              return (
                <Link
                  key={s.id}
                  href={`/dashboard/settlements/${s.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group"
                >
                  {/* Icône statut */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    s.status === 'PAID' ? 'bg-emerald-100' :
                    s.status === 'PROCESSING' ? 'bg-blue-100' :
                    s.status === 'FAILED' ? 'bg-red-100' : 'bg-amber-100'
                  }`}>
                    <Icon className={`w-5 h-5 ${
                      s.status === 'PAID' ? 'text-emerald-600' :
                      s.status === 'PROCESSING' ? 'text-blue-600' :
                      s.status === 'FAILED' ? 'text-red-500' : 'text-amber-600'
                    }`} />
                  </div>

                  {/* Période */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 capitalize">
                        {dayjs(s.periodStart).format('MMMM YYYY')}
                      </p>
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                      {needsBank && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200">
                          <AlertCircle className="w-3 h-3" /> Coordonnées requises
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {s.itemCount} transaction{s.itemCount > 1 ? 's' : ''} · Brut {formatCFA(s.totalAmount)}
                      {s.transferRef && ` · Réf. ${s.transferRef}`}
                    </p>
                  </div>

                  {/* Montant net */}
                  <div className="text-right flex-shrink-0">
                    <p className={`text-base font-bold ${s.status === 'PAID' ? 'text-emerald-700' : 'text-gray-900'}`}>
                      {formatCFA(s.netAmount)}
                    </p>
                    <p className="text-xs text-gray-400">net à reverser</p>
                  </div>

                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0 transition-colors" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
