'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expensesApi, stationsApi } from '@/lib/api';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { formatCFA } from '@transpro/shared';
import {
  Receipt, CheckCircle2, XCircle, Clock, Loader2, Plus,
  Filter, RefreshCw, Building2, ChevronDown, AlertCircle,
} from 'lucide-react';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { useViewMode } from '@/hooks/useViewMode';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { toast } from 'sonner';

dayjs.locale('fr');

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  FUEL:          { label: 'Carburant',     color: 'bg-orange-100 text-orange-700' },
  MAINTENANCE:   { label: 'Entretien',     color: 'bg-red-100 text-red-700' },
  SALARY:        { label: 'Salaires',      color: 'bg-purple-100 text-purple-700' },
  OFFICE:        { label: 'Fournitures',   color: 'bg-blue-100 text-blue-700' },
  CLEANING:      { label: 'Nettoyage',     color: 'bg-cyan-100 text-cyan-700' },
  SECURITY:      { label: 'Sécurité',      color: 'bg-slate-100 text-slate-700' },
  MEAL:          { label: 'Restauration',  color: 'bg-yellow-100 text-yellow-700' },
  BANKING:       { label: 'Frais bancaires', color: 'bg-indigo-100 text-indigo-700' },
  COMMUNICATION: { label: 'Communication', color: 'bg-teal-100 text-teal-700' },
  TRANSPORT:     { label: 'Transport',     color: 'bg-sky-100 text-sky-700' },
  OTHER:         { label: 'Autres',        color: 'bg-gray-100 text-gray-600' },
};

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  SUBMITTED: { label: 'En attente',  cls: 'bg-amber-100 text-amber-700',   icon: Clock },
  APPROVED:  { label: 'Approuvée',   cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  REJECTED:  { label: 'Rejetée',     cls: 'bg-red-100 text-red-600',       icon: XCircle },
};

function NewExpenseModal({
  stations, onClose, onCreated,
}: {
  stations: any[]; onClose: () => void; onCreated: () => void;
}) {
  const { user } = useAuthStore();
  const [form, setForm] = useState({
    stationId: user?.stationIds?.[0] ?? stations[0]?.id ?? '',
    category:  'FUEL',
    description: '',
    amount:    '',
    date:      dayjs().format('YYYY-MM-DD'),
    receiptNote: '',
  });

  const mut = useMutation({
    mutationFn: () => expensesApi.create({ ...form, amount: parseInt(form.amount) }) as any,
    onSuccess: () => { toast.success('Dépense enregistrée'); onCreated(); onClose(); },
    onError:   (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Nouvelle dépense</h2>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Gare *</label>
            <select value={form.stationId} onChange={e => set('stationId', e.target.value)}
              className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300">
              {stations.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Catégorie *</label>
            <select value={form.category} onChange={e => set('category', e.target.value)}
              className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300">
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date *</label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
              className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Description *</label>
            <input value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Ex: Achat gasoil pour groupe électrogène" maxLength={200}
              className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Montant (FCFA) *</label>
            <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)}
              placeholder="0" min="1"
              className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Justificatif (optionnel)</label>
            <textarea value={form.receiptNote} onChange={e => set('receiptNote', e.target.value)}
              rows={2} placeholder="N° reçu, fournisseur, note…"
              className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">Annuler</button>
          <button
            onClick={() => mut.mutate()}
            disabled={!form.stationId || !form.description || !form.amount || mut.isPending}
            className="flex-1 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {mut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

function RejectModal({ expenseId, onClose, onDone }: { expenseId: string; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const mut = useMutation({
    mutationFn: () => expensesApi.reject(expenseId, reason) as any,
    onSuccess: () => { toast.success('Dépense rejetée'); onDone(); onClose(); },
    onError:   (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Rejeter la dépense</h2>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Motif *</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
            placeholder="Expliquez pourquoi cette dépense est rejetée…"
            className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 resize-none" />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">Annuler</button>
          <button onClick={() => mut.mutate()} disabled={!reason.trim() || mut.isPending}
            className="flex-1 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {mut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Rejeter
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [filterStatus,   setFilterStatus]   = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStation,  setFilterStation]  = useState('');
  const [filterFrom,     setFilterFrom]     = useState('');
  const [filterTo,       setFilterTo]       = useState('');

  const canApprove = user?.perms?.includes('expenses:approve') || ['COMPANY_OWNER', 'COMPANY_ADMIN'].includes(user?.role ?? '');
  const canCreate  = user?.perms?.includes('expenses:manage');
  const [viewMode, setViewMode] = useViewMode('expenses');

  const { data: rawStations = [] } = useQuery({
    queryKey: ['stations-list'],
    queryFn: () => stationsApi.list() as any,
    staleTime: 120_000,
  });
  const stations: any[] = Array.isArray(rawStations) ? rawStations : (rawStations as any)?.data ?? [];

  const { data: rawExpenses = [], isLoading } = useQuery({
    queryKey: ['expenses', filterStatus, filterCategory, filterStation, filterFrom, filterTo],
    queryFn: () => expensesApi.list({
      ...(filterStatus   ? { status:    filterStatus }   : {}),
      ...(filterCategory ? { category:  filterCategory } : {}),
      ...(filterStation  ? { stationId: filterStation }  : {}),
      ...(filterFrom     ? { from:      filterFrom }     : {}),
      ...(filterTo       ? { to:        filterTo }       : {}),
    }) as any,
    staleTime: 30_000,
  });
  const expenses: any[] = Array.isArray(rawExpenses) ? rawExpenses : (rawExpenses as any)?.data ?? [];

  const approveMut = useMutation({
    mutationFn: (id: string) => expensesApi.approve(id) as any,
    onSuccess: () => {
      toast.success('Dépense approuvée');
      qc.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });

  const totalSubmitted = expenses.filter(e => e.status === 'SUBMITTED').reduce((a, e) => a + e.amount, 0);
  const totalApproved  = expenses.filter(e => e.status === 'APPROVED').reduce((a, e) => a + e.amount, 0);
  const totalRejected  = expenses.filter(e => e.status === 'REJECTED').reduce((a, e) => a + e.amount, 0);
  const pendingCount   = expenses.filter(e => e.status === 'SUBMITTED').length;

  const invalidate = () => qc.invalidateQueries({ queryKey: ['expenses'] });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dépenses</h1>
          <p className="text-sm text-gray-500 mt-1">Suivi et approbation des dépenses des gares</p>
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle value={viewMode} onChange={setViewMode} />
          {canCreate && (
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
              <Plus className="w-4 h-4" /> Nouvelle dépense
            </button>
          )}
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'En attente d\'approbation', value: formatCFA(totalSubmitted), count: pendingCount, cls: 'border-amber-200 bg-amber-50', textCls: 'text-amber-700' },
          { label: 'Approuvées (payées)',        value: formatCFA(totalApproved),  count: null,         cls: 'border-emerald-200 bg-emerald-50', textCls: 'text-emerald-700' },
          { label: 'Rejetées',                   value: formatCFA(totalRejected),  count: null,         cls: 'border-gray-200 bg-gray-50',   textCls: 'text-gray-500' },
        ].map(kpi => (
          <div key={kpi.label} className={`rounded-xl border p-4 ${kpi.cls}`}>
            <p className="text-xs font-medium text-gray-500">{kpi.label}</p>
            <p className={`text-xl font-bold mt-1 ${kpi.textCls}`}>{kpi.value}</p>
            {kpi.count !== null && kpi.count > 0 && (
              <p className="text-xs text-amber-600 mt-0.5 font-medium">{kpi.count} en attente</p>
            )}
          </div>
        ))}
      </div>

      {/* Alerte dépenses en attente */}
      {canApprove && pendingCount > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>{pendingCount} dépense{pendingCount > 1 ? 's' : ''}</strong> en attente d'approbation pour un total de{' '}
            <strong>{formatCFA(totalSubmitted)}</strong>.
          </p>
        </div>
      )}

      {/* Filtres */}
      <div className="flex items-center gap-3 flex-wrap bg-white rounded-xl border border-gray-200 p-3">
        <Filter className="w-4 h-4 text-gray-400" />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="text-sm border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-300">
          <option value="">Tous statuts</option>
          <option value="SUBMITTED">En attente</option>
          <option value="APPROVED">Approuvées</option>
          <option value="REJECTED">Rejetées</option>
        </select>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="text-sm border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-300">
          <option value="">Toutes catégories</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select value={filterStation} onChange={e => setFilterStation(e.target.value)}
          className="text-sm border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-300">
          <option value="">Toutes gares</option>
          {stations.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <div className="flex items-center gap-1.5">
          <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
            className="text-sm border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-300" />
          <span className="text-gray-400 text-sm">→</span>
          <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
            className="text-sm border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-300" />
        </div>
        {(filterStatus || filterCategory || filterStation || filterFrom || filterTo) && (
          <button onClick={() => { setFilterStatus(''); setFilterCategory(''); setFilterStation(''); setFilterFrom(''); setFilterTo(''); }}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Reset
          </button>
        )}
      </div>

      {/* Table / Grid */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-200 flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Chargement…
        </div>
      ) : expenses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 flex flex-col items-center py-16 text-gray-400">
          <Receipt className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">Aucune dépense trouvée</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Gare</th>
                <th className="px-4 py-3 text-left">Catégorie</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-right">Montant</th>
                <th className="px-4 py-3 text-center">Statut</th>
                <th className="px-4 py-3 text-left">Par</th>
                {canApprove && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {expenses.map((e: any) => {
                const sc  = STATUS_CONFIG[e.status] ?? STATUS_CONFIG.SUBMITTED;
                const cat = CATEGORY_LABELS[e.category] ?? CATEGORY_LABELS.OTHER;
                const SI  = sc.icon;
                return (
                  <tr key={e.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{dayjs(e.date).format('D MMM YYYY')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-sm text-gray-700">
                        <Building2 className="w-3.5 h-3.5 text-gray-400" />
                        {e.station?.name}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cat.color}`}>{cat.label}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
                      {e.description}
                      {e.receiptNote && <span className="text-xs text-gray-400 ml-1">· {e.receiptNote}</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{formatCFA(e.amount)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${sc.cls}`}>
                        <SI className="w-3.5 h-3.5" /> {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {e.submitter ? `${e.submitter.firstName} ${e.submitter.lastName[0]}.` : '—'}
                    </td>
                    {canApprove && (
                      <td className="px-4 py-3 text-right">
                        {e.status === 'SUBMITTED' && (
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => approveMut.mutate(e.id)} disabled={approveMut.isPending}
                              className="flex items-center gap-1 text-xs font-medium text-emerald-700 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approuver
                            </button>
                            <button onClick={() => setRejectId(e.id)}
                              className="flex items-center gap-1 text-xs font-medium text-red-600 px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 transition-colors">
                              <XCircle className="w-3.5 h-3.5" /> Rejeter
                            </button>
                          </div>
                        )}
                        {e.status === 'REJECTED' && e.approver && (
                          <span className="text-xs text-gray-400">par {e.approver.firstName}</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {expenses.map((e: any) => {
            const sc  = STATUS_CONFIG[e.status] ?? STATUS_CONFIG.SUBMITTED;
            const cat = CATEGORY_LABELS[e.category] ?? CATEGORY_LABELS.OTHER;
            const SI  = sc.icon;
            return (
              <div key={e.id} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cat.color}`}>{cat.label}</span>
                    <p className="text-sm font-semibold text-gray-900 mt-1.5 line-clamp-2">{e.description}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${sc.cls}`}>
                    <SI className="w-3 h-3" /> {sc.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="truncate">{e.station?.name ?? '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{dayjs(e.date).format('D MMM YYYY')}</span>
                  <span className="font-bold text-gray-900">{formatCFA(e.amount)}</span>
                </div>
                {e.submitter && (
                  <p className="text-[11px] text-gray-400">Par {e.submitter.firstName} {e.submitter.lastName[0]}.</p>
                )}
                {canApprove && e.status === 'SUBMITTED' && (
                  <div className="flex gap-2 pt-1 border-t border-gray-50">
                    <button onClick={() => approveMut.mutate(e.id)} disabled={approveMut.isPending}
                      className="flex-1 flex items-center justify-center gap-1 text-xs font-medium text-emerald-700 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approuver
                    </button>
                    <button onClick={() => setRejectId(e.id)}
                      className="flex-1 flex items-center justify-center gap-1 text-xs font-medium text-red-600 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 transition-colors">
                      <XCircle className="w-3.5 h-3.5" /> Rejeter
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showNew && <NewExpenseModal stations={stations} onClose={() => setShowNew(false)} onCreated={invalidate} />}
      {rejectId && (
        <RejectModal expenseId={rejectId} onClose={() => setRejectId(null)} onDone={invalidate} />
      )}
    </div>
  );
}
