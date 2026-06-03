'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminSmsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  MessageSquare, Zap, CheckCircle2, XCircle, AlertTriangle,
  Loader2, Send, Settings, List, Users, BarChart2,
  ChevronLeft, ChevronRight, RefreshCw, Plus, Pencil,
  ArrowUpDown, Wifi, WifiOff,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
dayjs.locale('fr');

// ── Helpers ────────────────────────────────────────────────────────────────────

const PROVIDER_COLORS: Record<string, string> = {
  ORANGE: '#F97316',
  MTN: '#FBBF24',
  AFRICASTALKING: '#60A5FA',
  MOCK: '#94A3B8',
};

const PROVIDER_LABELS: Record<string, string> = {
  ORANGE: 'Orange CI',
  MTN: 'MTN CI',
  AFRICASTALKING: "Africa's Talking",
  MOCK: 'Mock',
};

type Tab = 'overview' | 'logs' | 'credits' | 'config';

// ── Overview ───────────────────────────────────────────────────────────────────

function OverviewTab() {
  const [days, setDays] = useState(30);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-sms-overview', days],
    queryFn: () => adminSmsApi.overview(days) as any,
    refetchInterval: 60_000,
  });

  // Préparer la timeline pour recharts (pivot par jour)
  const d = data as any;
  const timelineMap = new Map<string, Record<string, number | string>>();
  for (const r of (d?.timeline ?? [])) {
    const day = dayjs(r.day).format('DD/MM');
    if (!timelineMap.has(day)) timelineMap.set(day, { day });
    timelineMap.get(day)![r.provider] = r.count;
  }
  const chartData = Array.from(timelineMap.values());

  const total = d?.total ?? 0;
  const sent  = d?.byStatus?.find((s: any) => s.status === 'sent')?.count  ?? 0;
  const failed = d?.byStatus?.find((s: any) => s.status === 'failed')?.count ?? 0;
  const successRate = total > 0 ? Math.round((sent / total) * 100) : 100;

  const kpis = [
    { label: 'Total SMS', value: total.toLocaleString('fr'), color: 'text-gray-900', bg: 'bg-gray-50', icon: MessageSquare },
    { label: 'Envoyés',   value: sent.toLocaleString('fr'),  color: 'text-green-700', bg: 'bg-green-50', icon: CheckCircle2 },
    { label: 'Échecs',    value: failed.toLocaleString('fr'), color: 'text-red-600',  bg: 'bg-red-50',   icon: XCircle },
    { label: 'Taux succès', value: `${successRate}%`, color: successRate >= 95 ? 'text-green-700' : 'text-amber-600', bg: 'bg-amber-50', icon: Zap },
  ];

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Vue d&apos;ensemble</h2>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${days === d ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {d}j
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      {isLoading ? (
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className={`${kpi.bg} rounded-xl p-4 flex items-start gap-3`}>
              <kpi.icon size={18} className={kpi.color} />
              <div>
                <p className="text-xs text-gray-500 font-medium">{kpi.label}</p>
                <p className={`text-2xl font-bold mt-0.5 ${kpi.color}`}>{kpi.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Répartition par provider */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Volume par jour</h3>
          {isLoading ? (
            <div className="h-48 bg-gray-100 rounded-lg animate-pulse" />
          ) : chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Aucune donnée sur cette période</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={32} />
                <Tooltip />
                {(['ORANGE', 'MTN', 'AFRICASTALKING', 'MOCK'] as const).map((p) => (
                  <Area key={p} type="monotone" dataKey={p} name={PROVIDER_LABELS[p]}
                    stroke={PROVIDER_COLORS[p]} fill={PROVIDER_COLORS[p]}
                    fillOpacity={0.15} strokeWidth={2} stackId="1" dot={false} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Par provider</h3>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}</div>
          ) : (
            <div className="space-y-3">
              {(d?.byProvider ?? []).sort((a: any, b: any) => b.count - a.count).map((r: any) => {
                const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
                return (
                  <div key={r.provider}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700">{PROVIDER_LABELS[r.provider] ?? r.provider}</span>
                      <span className="text-gray-500">{r.count.toLocaleString('fr')} · {pct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: PROVIDER_COLORS[r.provider] ?? '#94A3B8' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top compagnies */}
      {!isLoading && (d?.topTenants?.length ?? 0) > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Top compagnies envoyeuses</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={d.topTenants} layout="vertical" margin={{ left: 10, right: 20, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={120}
                tickFormatter={(v: string) => v?.length > 16 ? `${v.slice(0, 16)}…` : v} />
              <Tooltip formatter={(v: any) => [v, 'SMS']} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={20}>
                {d.topTenants.map((_: any, i: number) => <Cell key={i} fill={PROVIDER_COLORS.ORANGE} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ── Logs ───────────────────────────────────────────────────────────────────────

function LogsTab() {
  const [page, setPage]           = useState(1);
  const [tenantId, setTenantId]   = useState('');
  const [provider, setProvider]   = useState('');
  const [status, setStatus]       = useState('');
  const [search, setSearch]       = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');

  const { data: logsData, isLoading } = useQuery({
    queryKey: ['admin-sms-logs', page, tenantId, provider, status, search, dateFrom, dateTo],
    queryFn:  () => adminSmsApi.logs({ page, limit: 25, tenantId: tenantId || undefined,
      provider: provider || undefined, status: status || undefined,
      search: search || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }) as any,
    keepPreviousData: true,
  } as any);
  const data = logsData as any;

  function applySearch() { setSearch(searchInput); setPage(1); }
  function resetFilters() {
    setTenantId(''); setProvider(''); setStatus(''); setSearch('');
    setSearchInput(''); setDateFrom(''); setDateTo(''); setPage(1);
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Historique des envois</h2>

      {/* Filtres */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="flex gap-2 flex-1 min-w-[200px]">
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applySearch()}
              placeholder="Rechercher destinataire, message…"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button onClick={applySearch}
              className="px-3 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm transition">
              <ArrowUpDown size={14} />
            </button>
          </div>

          <select value={provider} onChange={(e) => { setProvider(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value="">Tous les providers</option>
            {Object.entries(PROVIDER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>

          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value="">Tous les statuts</option>
            <option value="sent">Envoyé</option>
            <option value="failed">Échec</option>
          </select>

          <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />

          {(provider || status || search || dateFrom || dateTo || tenantId) && (
            <button onClick={resetFilters}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg transition flex items-center gap-1">
              <RefreshCw size={13} /> Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}
          </div>
        ) : !data?.items?.length ? (
          <div className="text-center py-14 text-gray-400">
            <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucun log trouvé</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Compagnie', 'Destinataire', 'Message', 'Sender', 'Provider', 'Statut', 'Date'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.items.map((log: any) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        {log.tenant ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
                            {log.tenant.name}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Système</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{log.to}</td>
                      <td className="px-4 py-3 max-w-xs text-gray-600 hidden lg:table-cell">
                        <span className="truncate block max-w-[220px]" title={log.message}>{log.message}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 bg-gray-100 rounded font-medium text-gray-600">{log.sender}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: `${PROVIDER_COLORS[log.provider]}22`, color: PROVIDER_COLORS[log.provider] }}>
                          {PROVIDER_LABELS[log.provider] ?? log.provider}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {log.status === 'sent' ? (
                          <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                            <CheckCircle2 size={12} /> Envoyé
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
                            <XCircle size={12} /> Échec
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {dayjs(log.createdAt).format('DD/MM/YY HH:mm')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-50">
              <p className="text-xs text-gray-500">{data.total.toLocaleString('fr')} log(s)</p>
              <div className="flex items-center gap-2">
                <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                  className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition">
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs text-gray-600">{page} / {data.pages}</span>
                <button disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}
                  className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Crédits compagnies ─────────────────────────────────────────────────────────

function CreditsTab() {
  const qc = useQueryClient();
  const [grantModal, setGrantModal]   = useState<{ id: string; name: string } | null>(null);
  const [grantSms, setGrantSms]       = useState('');
  const [grantSender, setGrantSender] = useState('');
  const [grantNote, setGrantNote]     = useState('');
  const [pkgModal, setPkgModal]       = useState<any | null>(null); // null=fermé, {}=nouveau, {id,...}=édition

  const { data: credits = [], isLoading } = useQuery({
    queryKey: ['admin-sms-credits'],
    queryFn: () => adminSmsApi.credits() as any,
    refetchInterval: 30_000,
  });

  const { data: packages = [], isLoading: pkgLoading } = useQuery({
    queryKey: ['admin-sms-packages'],
    queryFn: () => adminSmsApi.listPackages() as any,
  });

  const grantMut = useMutation({
    mutationFn: () => adminSmsApi.grant(
      grantModal!.id,
      Number(grantSms),
      grantSender || undefined,
      grantNote || undefined,
    ) as any,
    onSuccess: () => {
      toast.success(`Crédits attribués à ${grantModal?.name}`);
      qc.invalidateQueries({ queryKey: ['admin-sms-credits'] });
      setGrantModal(null); setGrantSms(''); setGrantSender(''); setGrantNote('');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });

  const pkgMut = useMutation({
    mutationFn: (data: any) => pkgModal?.id
      ? adminSmsApi.updatePackage(pkgModal.id, data) as any
      : adminSmsApi.createPackage(data) as any,
    onSuccess: () => {
      toast.success(pkgModal?.id ? 'Pack mis à jour' : 'Pack créé');
      qc.invalidateQueries({ queryKey: ['admin-sms-packages'] });
      setPkgModal(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });

  return (
    <div className="space-y-6">
      {/* Crédits compagnies */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Crédits par compagnie</h2>
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Compagnie', 'SMS restants', 'Sender', 'Crédits actifs', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(credits as any[]).map((row: any) => (
                  <tr key={row.tenantId} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-bold ${row.totalRemaining === 0 ? 'text-red-500' : row.totalRemaining < 50 ? 'text-amber-500' : 'text-green-600'}`}>
                        {row.totalRemaining.toLocaleString('fr')}
                      </span>
                      {row.totalRemaining === 0 && (
                        <AlertTriangle size={12} className="inline ml-1 text-red-400" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 bg-gray-100 rounded font-mono text-gray-600">
                        {row.customSender ?? 'TRANSPRO-CI'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{row.credits.length} crédit(s)</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setGrantModal({ id: row.tenantId, name: row.name })}
                        className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1 transition"
                      >
                        <Plus size={13} /> Attribuer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Packs SMS */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Packs disponibles</h2>
          <button onClick={() => setPkgModal({})}
            className="flex items-center gap-2 px-3 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition">
            <Plus size={15} /> Nouveau pack
          </button>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          {pkgLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Nom', 'SMS', 'Prix FCFA', 'Sender perso', 'Ordre', 'Statut', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(packages as any[]).map((pkg: any) => (
                  <tr key={pkg.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-medium text-gray-900">{pkg.name}</td>
                    <td className="px-4 py-3 text-gray-700">{pkg.smsCount.toLocaleString('fr')}</td>
                    <td className="px-4 py-3 text-gray-700 font-mono">{pkg.priceXof.toLocaleString('fr')}</td>
                    <td className="px-4 py-3">
                      {pkg.hasCustomSender ? <CheckCircle2 size={15} className="text-green-500" /> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{pkg.sortOrder ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pkg.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {pkg.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setPkgModal(pkg)}
                        className="text-gray-400 hover:text-brand-500 transition">
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal attribution crédits */}
      {grantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => e.target === e.currentTarget && setGrantModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">
              Attribuer des crédits SMS
            </h3>
            <p className="text-sm text-gray-500">
              Compagnie : <span className="font-semibold text-gray-800">{grantModal.name}</span>
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nombre de SMS <span className="text-red-500">*</span></label>
              <input type="number" value={grantSms} onChange={(e) => setGrantSms(e.target.value)}
                min="1" placeholder="ex: 500"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Sender personnalisé <span className="text-gray-400">(optionnel)</span></label>
              <input value={grantSender} onChange={(e) => setGrantSender(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11))}
                placeholder="MONSENDER"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Note interne <span className="text-gray-400">(optionnel)</span></label>
              <input value={grantNote} onChange={(e) => setGrantNote(e.target.value)}
                placeholder="ex: Compensation suite incident"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setGrantModal(null)}
                className="flex-1 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition">
                Annuler
              </button>
              <button
                onClick={() => { if (!grantSms || Number(grantSms) <= 0) { toast.error('Nombre de SMS invalide'); return; } grantMut.mutate(); }}
                disabled={grantMut.isPending}
                className="flex-1 py-2.5 text-sm bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition disabled:opacity-60 flex items-center justify-center gap-2">
                {grantMut.isPending && <Loader2 size={14} className="animate-spin" />}
                Attribuer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pack SMS */}
      {pkgModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => e.target === e.currentTarget && setPkgModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">{pkgModal.id ? 'Modifier le pack' : 'Nouveau pack SMS'}</h3>
            <PackageForm
              initial={pkgModal}
              loading={pkgMut.isPending}
              onSubmit={(data) => pkgMut.mutate(data)}
              onCancel={() => setPkgModal(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PackageForm({ initial, loading, onSubmit, onCancel }: {
  initial: any; loading: boolean;
  onSubmit: (data: any) => void; onCancel: () => void;
}) {
  const [name, setName]               = useState(initial.name ?? '');
  const [smsCount, setSmsCount]       = useState(String(initial.smsCount ?? ''));
  const [priceXof, setPriceXof]       = useState(String(initial.priceXof ?? ''));
  const [hasSender, setHasSender]     = useState(initial.hasCustomSender ?? false);
  const [sortOrder, setSortOrder]     = useState(String(initial.sortOrder ?? ''));
  const [isActive, setIsActive]       = useState(initial.isActive !== false);

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Nom <span className="text-red-500">*</span></label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Pack Starter"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Nombre SMS <span className="text-red-500">*</span></label>
          <input type="number" value={smsCount} onChange={(e) => setSmsCount(e.target.value)} placeholder="500"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Prix FCFA <span className="text-red-500">*</span></label>
          <input type="number" value={priceXof} onChange={(e) => setPriceXof(e.target.value)} placeholder="15000"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Ordre d&apos;affichage</label>
          <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} placeholder="1"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
      </div>
      <label className="flex items-center gap-2.5 cursor-pointer">
        <input type="checkbox" checked={hasSender} onChange={(e) => setHasSender(e.target.checked)} className="w-4 h-4 accent-brand-500" />
        <span className="text-sm text-gray-700">Sender personnalisé inclus</span>
      </label>
      {initial.id && (
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 accent-brand-500" />
          <span className="text-sm text-gray-700">Pack actif</span>
        </label>
      )}
      <div className="flex gap-3 pt-2">
        <button onClick={onCancel} className="flex-1 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition">
          Annuler
        </button>
        <button
          onClick={() => {
            if (!name || !smsCount || !priceXof) { toast.error('Remplissez tous les champs obligatoires'); return; }
            onSubmit({ name, smsCount: Number(smsCount), priceXof: Number(priceXof), hasCustomSender: hasSender,
              sortOrder: sortOrder ? Number(sortOrder) : undefined, ...(initial.id ? { isActive } : {}) });
          }}
          disabled={loading}
          className="flex-1 py-2.5 text-sm bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition disabled:opacity-60 flex items-center justify-center gap-2">
          {loading && <Loader2 size={14} className="animate-spin" />}
          {initial.id ? 'Enregistrer' : 'Créer'}
        </button>
      </div>
    </div>
  );
}

// ── Configuration ──────────────────────────────────────────────────────────────

function ConfigTab() {
  const [testPhone, setTestPhone]     = useState('');
  const [testMessage, setTestMessage] = useState('Test SMS TransPro CI');

  const { data: status, isLoading, refetch } = useQuery({
    queryKey: ['admin-sms-providers'],
    queryFn: () => adminSmsApi.providers() as any,
    staleTime: 30_000,
  });

  const testMut = useMutation({
    mutationFn: () => adminSmsApi.test(testPhone, testMessage) as any,
    onSuccess: () => toast.success(`SMS de test envoyé à ${testPhone}`),
    onError:   (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur envoi'),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Configuration des providers</h2>
        <button onClick={() => refetch()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition">
          <RefreshCw size={14} /> Rafraîchir
        </button>
      </div>

      {/* Providers status */}
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="space-y-3">
          {status?.providers?.map((p: any) => (
            <div key={p.id}
              className={`flex items-center gap-4 p-4 rounded-xl border ${p.active ? 'bg-green-50 border-green-200' : p.configured ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="shrink-0">
                {p.active
                  ? <Wifi size={20} className="text-green-600" />
                  : <WifiOff size={20} className="text-gray-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 text-sm">{p.label}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    status.primary === p.id ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {status.primary === p.id ? 'Principal' : `Fallback #${p.order - 1}`}
                  </span>
                </div>
                <p className="text-xs mt-0.5 text-gray-500">
                  {p.active ? `Actif · Sender: ${p.sender || '—'}` : p.configured ? 'Configuré mais inactif' : 'Non configuré'}
                </p>
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {p.active ? 'Actif' : 'Inactif'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Test SMS */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Send size={15} className="text-brand-500" /> Envoyer un SMS de test
        </h3>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Numéro destinataire <span className="text-red-500">*</span></label>
          <input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="+2250700000000"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <p className="text-xs text-gray-400 mt-1">Format international requis (+225…)</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Message</label>
          <input value={testMessage} onChange={(e) => setTestMessage(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <p className="text-xs text-amber-600 flex items-center gap-1.5">
          <AlertTriangle size={12} /> Le préfixe [TEST TRANSPRO] sera ajouté automatiquement.
        </p>
        <button
          onClick={() => { if (!testPhone) { toast.error('Numéro requis'); return; } testMut.mutate(); }}
          disabled={testMut.isPending}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl transition disabled:opacity-60">
          {testMut.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          Envoyer le SMS de test
        </button>
      </div>

      {/* Variables d'env à configurer */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Variables d&apos;environnement</h3>
        <div className="space-y-1.5 text-xs font-mono text-slate-600">
          {[
            ['ORANGE_SMS_CLIENT_ID', 'Client ID de l\'app Orange Developer'],
            ['ORANGE_SMS_CLIENT_SECRET', 'Client Secret de l\'app Orange Developer'],
            ['ORANGE_SMS_SENDER', 'Sender alphanumérique enregistré (ex: TRANSPRO-CI)'],
            ['MTN_SMS_CLIENT_ID', 'Client ID MTN Developer Portal'],
            ['MTN_SMS_CLIENT_SECRET', '—'],
            ['MTN_SMS_SUBSCRIPTION_KEY', 'Clé de souscription MTN'],
            ['AFRICASTALKING_API_KEY', 'Clé API Africa\'s Talking'],
            ['AFRICASTALKING_USERNAME', 'Compte AT (≠ sandbox pour activer)'],
          ].map(([key, desc]) => (
            <div key={key} className="flex items-start gap-2">
              <span className="text-brand-600 font-semibold shrink-0">{key}</span>
              <span className="text-slate-400">— {desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: 'Vue globale',    icon: BarChart2 },
  { key: 'logs',     label: 'Logs',           icon: List },
  { key: 'credits',  label: 'Crédits',        icon: Users },
  { key: 'config',   label: 'Configuration',  icon: Settings },
];

export default function AdminSmsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>('overview');

  if (user?.role !== 'SUPER_ADMIN') {
    router.replace('/dashboard');
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
          <MessageSquare size={20} className="text-brand-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SMS — Administration</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Supervision plateforme · Orange CI principal · MTN + Africa&apos;s Talking en fallback
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'overview' && <OverviewTab />}
      {tab === 'logs'     && <LogsTab />}
      {tab === 'credits'  && <CreditsTab />}
      {tab === 'config'   && <ConfigTab />}
    </div>
  );
}
