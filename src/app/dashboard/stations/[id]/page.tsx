'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { confirm } from '@/lib/confirm';
import {
  Building2, Users, UserPlus, Trash2, ArrowLeft, Star,
  Bus, Ticket, TrendingUp, Clock, ChevronRight,
  Calendar, BarChart2, MapPin, CheckCircle2, XCircle,
  Wallet, Receipt, Plus, Loader2, Send, PackageCheck,
  AlertCircle,
} from 'lucide-react';
import { stationsApi, expensesApi, cashProvisionsApi } from '@/lib/api';
import { api } from '@/lib/api';
import { formatCFA } from '@transpro/shared';
import Link from 'next/link';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
dayjs.locale('fr');

type Member = {
  userId: string;
  stationId: string;
  isPrimary: boolean;
  assignedAt: string;
  user: { id: string; firstName: string; lastName: string; email: string; phone: string; role: string };
};

type TenantUser = { id: string; firstName: string; lastName: string; email: string; role: string };

const TABS = [
  { key: 'overview', label: 'Vue d\'ensemble', icon: BarChart2 },
  { key: 'trips',    label: 'Voyages du jour', icon: Bus },
  { key: 'agents',   label: 'Agents',          icon: Users },
  { key: 'caisse',   label: 'Caisse',          icon: Wallet },
] as const;

type Tab = typeof TABS[number]['key'];

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  FUEL: 'Carburant', MAINTENANCE: 'Entretien', SALARY: 'Salaires',
  OFFICE: 'Fournitures', CLEANING: 'Nettoyage', SECURITY: 'Sécurité',
  MEAL: 'Restauration', BANKING: 'Frais bancaires', COMMUNICATION: 'Communication',
  TRANSPORT: 'Transport', OTHER: 'Autres',
};

const TRIP_STATUS: Record<string, { label: string; cls: string }> = {
  SCHEDULED: { label: 'Planifié',  cls: 'bg-blue-100 text-blue-700' },
  BOARDING:  { label: 'Embarquement', cls: 'bg-amber-100 text-amber-700' },
  DEPARTED:  { label: 'En route',  cls: 'bg-green-100 text-green-700' },
  ARRIVED:   { label: 'Arrivé',    cls: 'bg-gray-100 text-gray-600' },
  CANCELLED: { label: 'Annulé',    cls: 'bg-red-100 text-red-700' },
};

const ROLE_LABEL: Record<string, string> = {
  COMPANY_OWNER: 'Propriétaire',
  COMPANY_ADMIN: 'Administrateur',
  COMPANY_AGENT: 'Agent',
  PASSENGER: 'Passager',
};

function StationCaisse({ stationId }: { stationId: string }) {
  const qc = useQueryClient();
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showProvisionForm, setShowProvisionForm] = useState(false);
  const [rejectExpenseId, setRejectExpenseId] = useState<string | null>(null);
  const [expenseForm, setExpenseForm] = useState({ category: 'FUEL', description: '', amount: '', date: dayjs().format('YYYY-MM-DD'), receiptNote: '' });
  const [provisionForm, setProvisionForm] = useState({ amount: '', reason: '', notes: '' });

  const currentMonth = dayjs().format('YYYY-MM');

  const { data: summary } = useQuery({
    queryKey: ['station-cash-summary', stationId, currentMonth],
    queryFn: () => expensesApi.stationSummary(stationId, currentMonth) as any,
    staleTime: 30_000,
  });
  const sum = summary as any;

  const { data: rawExpenses = [] } = useQuery({
    queryKey: ['station-expenses', stationId],
    queryFn: () => expensesApi.list({ stationId }) as any,
    staleTime: 30_000,
  });
  const expenses: any[] = Array.isArray(rawExpenses) ? rawExpenses : (rawExpenses as any)?.data ?? [];

  const { data: rawProvisions = [] } = useQuery({
    queryKey: ['station-provisions', stationId],
    queryFn: () => cashProvisionsApi.list({ stationId }) as any,
    staleTime: 30_000,
  });
  const provisions: any[] = Array.isArray(rawProvisions) ? rawProvisions : (rawProvisions as any)?.data ?? [];

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['station-expenses', stationId] });
    qc.invalidateQueries({ queryKey: ['station-provisions', stationId] });
    qc.invalidateQueries({ queryKey: ['station-cash-summary', stationId] });
  };

  const createExpense = useMutation({
    mutationFn: () => expensesApi.create({ stationId, ...expenseForm, amount: parseInt(expenseForm.amount) }) as any,
    onSuccess: () => { toast.success('Dépense enregistrée'); setShowExpenseForm(false); setExpenseForm({ category: 'FUEL', description: '', amount: '', date: dayjs().format('YYYY-MM-DD'), receiptNote: '' }); invalidateAll(); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });

  const createProvision = useMutation({
    mutationFn: () => cashProvisionsApi.create({ stationId, ...provisionForm, amount: parseInt(provisionForm.amount) }) as any,
    onSuccess: () => { toast.success('Demande envoyée'); setShowProvisionForm(false); setProvisionForm({ amount: '', reason: '', notes: '' }); invalidateAll(); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });

  const approveExpense = useMutation({
    mutationFn: (id: string) => expensesApi.approve(id) as any,
    onSuccess: () => { toast.success('Approuvée'); invalidateAll(); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });

  const rejectExpenseMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => expensesApi.reject(id, reason) as any,
    onSuccess: () => { toast.success('Rejetée'); setRejectExpenseId(null); invalidateAll(); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });

  const [rejectReason, setRejectReason] = useState('');

  const PROV_STATUS: Record<string, { label: string; cls: string }> = {
    REQUESTED: { label: 'En attente', cls: 'bg-amber-100 text-amber-700' },
    APPROVED:  { label: 'Approuvée',  cls: 'bg-blue-100 text-blue-700' },
    SENT:      { label: 'En transit', cls: 'bg-indigo-100 text-indigo-700' },
    RECEIVED:  { label: 'Reçue',      cls: 'bg-emerald-100 text-emerald-700' },
    REJECTED:  { label: 'Rejetée',    cls: 'bg-red-100 text-red-600' },
  };

  const EXP_STATUS: Record<string, { label: string; cls: string }> = {
    SUBMITTED: { label: 'En attente', cls: 'bg-amber-100 text-amber-700' },
    APPROVED:  { label: 'Approuvée',  cls: 'bg-emerald-100 text-emerald-700' },
    REJECTED:  { label: 'Rejetée',    cls: 'bg-red-100 text-red-600' },
  };

  const balanceColor = sum?.estimatedBalance >= 0 ? 'text-emerald-700' : 'text-red-600';

  return (
    <div className="space-y-6">
      {/* Balance + KPIs du mois */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 mb-1">Solde estimé (caisse)</p>
          <p className={`text-2xl font-bold ${balanceColor}`}>{formatCFA(sum?.estimatedBalance ?? 0)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Espèces − dépenses + approv.</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 mb-1">Ventes espèces (mois)</p>
          <p className="text-lg font-bold text-gray-900">{formatCFA(sum?.cashSales ?? 0)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 mb-1">Dépenses approuvées</p>
          <p className="text-lg font-bold text-red-600">{formatCFA(sum?.totalExpenses ?? 0)}</p>
          {(sum?.pendingExpenses ?? 0) > 0 && (
            <p className="text-xs text-amber-600 font-medium mt-0.5">{sum.pendingExpenses} en attente</p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 mb-1">Approv. reçus (mois)</p>
          <p className="text-lg font-bold text-blue-700">{formatCFA(sum?.totalProvisions ?? 0)}</p>
        </div>
      </div>

      {/* Dépenses par catégorie */}
      {sum?.byCategory && Object.keys(sum.byCategory).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Répartition des dépenses</h3>
          <div className="space-y-2">
            {Object.entries(sum.byCategory as Record<string, number>)
              .sort(([, a], [, b]) => b - a)
              .map(([cat, amount]) => {
                const total = sum.totalExpenses || 1;
                const pct = Math.round((amount / total) * 100);
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-28 shrink-0">{EXPENSE_CATEGORY_LABELS[cat] ?? cat}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
                      <div className="h-1.5 bg-indigo-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-gray-700 w-24 text-right">{formatCFA(amount)}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Dépenses récentes */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900">Dépenses récentes</h3>
            <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-1.5">{expenses.length}</span>
          </div>
          <button onClick={() => setShowExpenseForm(v => !v)}
            className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
            <Plus className="w-3.5 h-3.5" /> Ajouter
          </button>
        </div>

        {showExpenseForm && (
          <div className="border-b border-gray-100 p-4 bg-gray-50">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Catégorie</label>
                <select value={expenseForm.category} onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full text-xs border rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-300">
                  {Object.entries(EXPENSE_CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                <input type="date" value={expenseForm.date} onChange={e => setExpenseForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full text-xs border rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-300" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Description *</label>
                <input value={expenseForm.description} onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Ex: Achat gasoil groupe électrogène"
                  className="w-full text-xs border rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Montant (FCFA) *</label>
                <input type="number" value={expenseForm.amount} onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0" min="1"
                  className="w-full text-xs border rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Justificatif</label>
                <input value={expenseForm.receiptNote} onChange={e => setExpenseForm(f => ({ ...f, receiptNote: e.target.value }))}
                  placeholder="N° reçu, fournisseur…"
                  className="w-full text-xs border rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-300" />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => setShowExpenseForm(false)} className="text-xs px-3 py-1.5 text-gray-600 border rounded-lg hover:bg-gray-50">Annuler</button>
              <button onClick={() => createExpense.mutate()}
                disabled={!expenseForm.description || !expenseForm.amount || createExpense.isPending}
                className="text-xs px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1">
                {createExpense.isPending && <Loader2 className="w-3 h-3 animate-spin" />} Enregistrer
              </button>
            </div>
          </div>
        )}

        {expenses.length === 0 ? (
          <div className="py-10 flex flex-col items-center text-gray-400 text-sm gap-2">
            <Receipt className="w-8 h-8 opacity-30" /> Aucune dépense
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-50 text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Catégorie</th>
                <th className="px-4 py-2 text-left">Description</th>
                <th className="px-4 py-2 text-right">Montant</th>
                <th className="px-4 py-2 text-center">Statut</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {expenses.slice(0, 10).map((e: any) => {
                const sc = EXP_STATUS[e.status] ?? EXP_STATUS.SUBMITTED;
                return (
                  <tr key={e.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{dayjs(e.date).format('D MMM')}</td>
                    <td className="px-4 py-2.5 text-gray-600">{EXPENSE_CATEGORY_LABELS[e.category] ?? e.category}</td>
                    <td className="px-4 py-2.5 text-gray-700 max-w-[180px] truncate">{e.description}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{formatCFA(e.amount)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sc.cls}`}>{sc.label}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {e.status === 'SUBMITTED' && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => approveExpense.mutate(e.id)}
                            className="text-[11px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> OK
                          </button>
                          <button onClick={() => { setRejectExpenseId(e.id); setRejectReason(''); }}
                            className="text-[11px] text-red-600 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded-lg flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Rejeter
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Approvisionnements */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900">Approvisionnements</h3>
            <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-1.5">{provisions.length}</span>
          </div>
          <button onClick={() => setShowProvisionForm(v => !v)}
            className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
            <Plus className="w-3.5 h-3.5" /> Demander
          </button>
        </div>

        {showProvisionForm && (
          <div className="border-b border-gray-100 p-4 bg-gray-50">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Montant (FCFA) *</label>
                <input type="number" value={provisionForm.amount} onChange={e => setProvisionForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="Ex: 50000" min="1000"
                  className="w-full text-xs border rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-blue-300" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Motif *</label>
                <input value={provisionForm.reason} onChange={e => setProvisionForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="Ex: Réapprovisionnement hebdomadaire"
                  className="w-full text-xs border rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-blue-300" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optionnel)</label>
                <input value={provisionForm.notes} onChange={e => setProvisionForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Informations complémentaires…"
                  className="w-full text-xs border rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-blue-300" />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => setShowProvisionForm(false)} className="text-xs px-3 py-1.5 text-gray-600 border rounded-lg hover:bg-gray-50">Annuler</button>
              <button onClick={() => createProvision.mutate()}
                disabled={!provisionForm.reason || !provisionForm.amount || createProvision.isPending}
                className="text-xs px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1">
                {createProvision.isPending && <Loader2 className="w-3 h-3 animate-spin" />} Envoyer la demande
              </button>
            </div>
          </div>
        )}

        {provisions.length === 0 ? (
          <div className="py-10 flex flex-col items-center text-gray-400 text-sm gap-2">
            <Wallet className="w-8 h-8 opacity-30" /> Aucun approvisionnement
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {provisions.slice(0, 8).map((p: any) => {
              const sc = PROV_STATUS[p.status] ?? PROV_STATUS.REQUESTED;
              return (
                <div key={p.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{formatCFA(p.amount)}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sc.cls}`}>{sc.label}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{p.reason}</p>
                  </div>
                  <p className="text-xs text-gray-400 whitespace-nowrap">{dayjs(p.createdAt).format('D MMM')}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal reject dépense */}
      {rejectExpenseId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-3">
            <h3 className="font-bold text-gray-900">Motif du rejet</h3>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
              placeholder="Expliquez le motif…"
              className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 resize-none" />
            <div className="flex gap-3">
              <button onClick={() => setRejectExpenseId(null)} className="flex-1 py-2 text-sm text-gray-600 border rounded-lg">Annuler</button>
              <button onClick={() => rejectExpenseMut.mutate({ id: rejectExpenseId, reason: rejectReason })}
                disabled={!rejectReason.trim() || rejectExpenseMut.isPending}
                className="flex-1 py-2 text-sm text-white bg-red-600 rounded-lg disabled:opacity-50 flex items-center justify-center gap-1">
                {rejectExpenseMut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Rejeter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('overview');
  const [addModal, setAddModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);

  // Station info
  const { data: station } = useQuery({
    queryKey: ['station', id],
    queryFn: () => stationsApi.get(id) as any,
  });

  // Dashboard stats (today)
  const { data: dashboard } = useQuery({
    queryKey: ['station-dashboard', id],
    queryFn: () => stationsApi.getDashboard(id) as any,
    refetchInterval: 30_000,
  });

  // Today's trips
  const { data: todayTripsRaw } = useQuery({
    queryKey: ['station-trips-today', id],
    queryFn: () => stationsApi.getTodayTrips(id) as any,
    refetchInterval: 30_000,
    enabled: tab === 'trips' || tab === 'overview',
  });
  const todayTrips: any[] = Array.isArray(todayTripsRaw) ? todayTripsRaw : [];

  // Analytics (30 days trend)
  const { data: analytics } = useQuery({
    queryKey: ['station-analytics', id],
    queryFn: () => stationsApi.getAnalytics(id) as any,
    staleTime: 5 * 60_000,
    enabled: tab === 'overview',
  });

  // Members
  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ['station-members', id],
    queryFn: () => stationsApi.getMembers(id) as any,
  });

  // Tenant users for add modal
  const { data: tenantUsers = [] } = useQuery<TenantUser[]>({
    queryKey: ['team'],
    queryFn: async () => ((await api.get('/users/team')) ?? []) as TenantUser[],
    enabled: addModal,
  });

  const assignMut = useMutation({
    mutationFn: (data: { userId: string; isPrimary: boolean }) => stationsApi.assignMember(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['station-members', id] });
      toast.success('Agent affecté');
      setAddModal(false);
      setSelectedUserId('');
      setIsPrimary(false);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });

  const removeMut = useMutation({
    mutationFn: (userId: string) => stationsApi.removeMember(id, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['station-members', id] });
      toast.success('Affectation retirée');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });

  const alreadyAssigned = new Set(members.map((m) => m.userId));
  const availableUsers = tenantUsers.filter(
    (u) => !alreadyAssigned.has(u.id) && ['COMPANY_ADMIN', 'COMPANY_AGENT'].includes(u.role),
  );

  const stationData = station as any;
  const analyticsData = analytics as any;

  const kpiCards = [
    {
      label: 'Voyages aujourd\'hui',
      value: dashboard?.todayTrips ?? 0,
      icon: Bus,
      color: 'text-blue-600 bg-blue-100',
    },
    {
      label: 'Réservations du jour',
      value: dashboard?.todayBookings ?? 0,
      icon: Ticket,
      color: 'text-brand-600 bg-brand-50',
    },
    {
      label: 'Revenus du jour',
      value: formatCFA(dashboard?.todayRevenue ?? 0),
      icon: TrendingUp,
      color: 'text-green-600 bg-green-100',
    },
    {
      label: 'Agents affectés',
      value: members.length,
      icon: Users,
      color: 'text-purple-600 bg-purple-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/stations" className="text-gray-400 hover:text-gray-600 transition p-1.5 rounded-lg hover:bg-gray-100">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 size={20} className="text-brand-500" />
            {stationData?.name ?? 'Gare'}
            {stationData?.code && (
              <span className="text-sm bg-gray-100 text-gray-600 font-mono rounded px-2 py-0.5">{stationData.code}</span>
            )}
          </h1>
          <p className="text-gray-400 text-sm flex items-center gap-1">
            <MapPin size={12} /> {stationData?.city?.name ?? '—'}
            {stationData?.phone && <span className="ml-2">· {stationData.phone}</span>}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon size={14} /> {t.label}
            {t.key === 'agents' && <span className="text-xs bg-gray-200 text-gray-600 rounded-full px-1.5">{members.length}</span>}
          </button>
        ))}
      </div>

      {/* ── Overview ─────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiCards.map((card) => (
              <div key={card.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${card.color}`}>
                  <card.icon size={18} />
                </div>
                <p className="text-xl font-bold text-gray-900">{card.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
              </div>
            ))}
          </div>

          {/* Trend chart + next trips */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 30-day revenue trend */}
            <div className="lg:col-span-2 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Tendance 30 jours</h3>
                {analyticsData?.totals && (
                  <div className="flex gap-4 text-xs text-gray-400">
                    <span>Tx conv. <strong className="text-gray-700">{analyticsData.totals.conversionRate}%</strong></span>
                    <span>Occ. moy. <strong className="text-gray-700">{analyticsData.totals.avgOccupancy}%</strong></span>
                  </div>
                )}
              </div>
              {analyticsData?.trend?.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={analyticsData.trend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="stRevGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f05a1a" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#f05a1a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={4} />
                    <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} width={36} />
                    <Tooltip formatter={(v: any) => [formatCFA(v), 'Revenus']} />
                    <Area type="monotone" dataKey="revenue" stroke="#f05a1a" strokeWidth={2} fill="url(#stRevGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm gap-2">
                  <BarChart2 size={28} className="text-gray-200" /> Pas encore de données
                </div>
              )}
            </div>

            {/* Upcoming trips today */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Prochains départs</h3>
                <button onClick={() => setTab('trips')} className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-0.5">
                  Voir tout <ChevronRight size={12} />
                </button>
              </div>
              <div className="space-y-2.5">
                {todayTrips.slice(0, 5).map((trip: any) => {
                  const sc = TRIP_STATUS[trip.status] ?? { label: trip.status, cls: 'bg-gray-100 text-gray-500' };
                  const occupied = trip.totalSeats - trip.availableSeats;
                  const pct = trip.totalSeats > 0 ? Math.round((occupied / trip.totalSeats) * 100) : 0;
                  return (
                    <div key={trip.id} className="border border-gray-100 rounded-lg p-2.5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-gray-900 truncate">
                          {trip.route?.originCity?.name} → {trip.route?.destinationCity?.name}
                        </p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ml-1 ${sc.cls}`}>{sc.label}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1.5 text-[11px] text-gray-400">
                        <span className="flex items-center gap-1"><Clock size={10} /> {dayjs(trip.departureAt).format('HH:mm')}</span>
                        <span>{occupied}/{trip.totalSeats} sièges</span>
                      </div>
                      <div className="mt-1.5 h-1 bg-gray-100 rounded-full">
                        <div className={`h-1 rounded-full ${pct >= 80 ? 'bg-red-400' : 'bg-brand-400'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                {todayTrips.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400 text-sm gap-2">
                    <Calendar size={24} className="text-gray-200" />
                    Aucun départ prévu aujourd'hui
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Top routes + payment methods */}
          {(analyticsData?.topRoutes?.length > 0 || analyticsData?.byMethod) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {analyticsData?.topRoutes?.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <h3 className="font-semibold text-gray-900 mb-4">Top itinéraires (30 j)</h3>
                  <div className="space-y-3">
                    {analyticsData.topRoutes.map((r: any, i: number) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-5 h-5 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span>
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-gray-800 truncate">{r.label}</span>
                            <span className="text-gray-500 shrink-0 ml-2">{r.count} rés.</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full">
                            <div
                              className="h-1.5 bg-brand-400 rounded-full"
                              style={{ width: `${Math.min((r.count / (analyticsData.topRoutes[0]?.count || 1)) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {analyticsData?.byMethod && Object.keys(analyticsData.byMethod).length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <h3 className="font-semibold text-gray-900 mb-4">Moyens de paiement (30 j)</h3>
                  <div className="space-y-3">
                    {Object.entries(analyticsData.byMethod as Record<string, number>)
                      .sort(([, a], [, b]) => b - a)
                      .map(([method, amount]) => {
                        const total = Object.values(analyticsData.byMethod as Record<string, number>).reduce((s, v) => s + v, 0);
                        const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
                        const LABELS: Record<string, string> = { CASH: 'Espèces', GENIUS_PAY: 'Genius Pay', ORANGE_MONEY: 'Orange Money', MTN_MOMO: 'MTN MoMo', WAVE: 'Wave' };
                        return (
                          <div key={method} className="flex items-center gap-3">
                            <span className="text-xs text-gray-500 w-24 shrink-0">{LABELS[method] ?? method}</span>
                            <div className="flex-1 h-2 bg-gray-100 rounded-full">
                              <div className="h-2 bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-gray-700 w-12 text-right">{pct}%</span>
                          </div>
                        );
                      })}
                  </div>
                  <p className="text-xs text-gray-400 mt-3">
                    Total : <strong className="text-gray-700">{formatCFA(Object.values(analyticsData.byMethod as Record<string, number>).reduce((s, v) => s + v, 0))}</strong>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Trips today ──────────────────────────────────────────── */}
      {tab === 'trips' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <Bus size={16} className="text-gray-400" />
              <h2 className="font-semibold text-gray-900">Voyages du {dayjs().format('D MMMM YYYY')}</h2>
              <span className="text-xs bg-brand-50 text-brand-600 rounded-full px-2 py-0.5 font-semibold">{todayTrips.length}</span>
            </div>
          </div>
          {todayTrips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
              <Bus size={36} className="text-gray-200" />
              <p className="text-sm">Aucun voyage depuis cette gare aujourd'hui</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {todayTrips.map((trip: any) => {
                const sc = TRIP_STATUS[trip.status] ?? { label: trip.status, cls: 'bg-gray-100 text-gray-500' };
                const occupied = trip.totalSeats - trip.availableSeats;
                const pct = trip.totalSeats > 0 ? Math.round((occupied / trip.totalSeats) * 100) : 0;
                return (
                  <div key={trip.id} className="px-5 py-4">
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-center pt-0.5">
                        <span className="text-lg font-bold text-gray-900">{dayjs(trip.departureAt).format('HH:mm')}</span>
                        <span className="text-[10px] text-gray-400">départ</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900">
                            {trip.route?.originCity?.name} → {trip.route?.destinationCity?.name}
                          </p>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${sc.cls}`}>{sc.label}</span>
                          {trip.tripClass && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{trip.tripClass}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500">
                          {trip.vehicle && (
                            <span className="flex items-center gap-1">
                              <Bus size={11} /> {trip.vehicle.plate} · {trip.vehicle.brand} {trip.vehicle.model}
                            </span>
                          )}
                          {trip.driver && (
                            <span>{trip.driver.firstName} {trip.driver.lastName}</span>
                          )}
                          <span>{trip._count?.bookings ?? 0} rés.</span>
                        </div>
                        {/* Occupancy bar */}
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
                            <div
                              className={`h-1.5 rounded-full transition-all ${pct >= 90 ? 'bg-red-400' : pct >= 70 ? 'bg-amber-400' : 'bg-green-400'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-gray-400 shrink-0">{occupied}/{trip.totalSeats}</span>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {pct >= 90 ? (
                          <span className="text-[10px] text-red-500 font-semibold">Complet</span>
                        ) : pct >= 70 ? (
                          <span className="text-[10px] text-amber-500 font-semibold">Presque plein</span>
                        ) : (
                          <span className="text-[10px] text-green-500 font-semibold">Disponible</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Agents ───────────────────────────────────────────────── */}
      {tab === 'agents' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-gray-400" />
              <h2 className="font-semibold text-gray-900">Agents affectés</h2>
              <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{members.length}</span>
            </div>
            <button
              onClick={() => setAddModal(true)}
              className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium px-3 py-2 rounded-lg transition"
            >
              <UserPlus size={13} /> Affecter un agent
            </button>
          </div>

          {members.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm gap-2">
              <Users size={32} className="text-gray-200" />
              Aucun agent affecté à cette gare
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {members.map((m) => (
                <li key={m.userId} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-500 flex items-center justify-center text-sm font-bold">
                      {m.user.firstName[0]}{m.user.lastName[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                        {m.user.firstName} {m.user.lastName}
                        {m.isPrimary && <Star size={12} className="text-amber-400 fill-amber-400" />}
                      </p>
                      <p className="text-xs text-gray-500">{m.user.email}</p>
                      {m.user.phone && <p className="text-xs text-gray-400">{m.user.phone}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
                        {ROLE_LABEL[m.user.role] ?? m.user.role}
                      </span>
                      {m.isPrimary && (
                        <p className="text-[10px] text-amber-500 font-medium mt-1">Gare principale</p>
                      )}
                    </div>
                    <button
                      onClick={async () => { if (await confirm({ title: `Retirer ${m.user.firstName} ${m.user.lastName} ?`, description: 'Cette personne n\'aura plus accès à cette gare.', variant: 'danger', confirmLabel: 'Retirer' })) removeMut.mutate(m.userId); }}
                      disabled={removeMut.isPending}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Caisse ───────────────────────────────────────────────── */}
      {tab === 'caisse' && <StationCaisse stationId={id} />}

      {/* Add agent modal */}
      {addModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Affecter un agent</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Utilisateur</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">— Sélectionner —</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} ({ROLE_LABEL[u.role] ?? u.role})
                    </option>
                  ))}
                </select>
                {availableUsers.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">Tous les agents sont déjà affectés.</p>
                )}
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="rounded accent-brand-500"
                />
                Gare principale de cet agent
              </label>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setAddModal(false); setSelectedUserId(''); setIsPrimary(false); }}
                  className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition"
                >
                  Annuler
                </button>
                <button
                  onClick={() => { if (selectedUserId) assignMut.mutate({ userId: selectedUserId, isPrimary }); }}
                  disabled={!selectedUserId || assignMut.isPending}
                  className="flex-1 bg-brand-500 hover:bg-brand-600 text-white rounded-lg py-2.5 text-sm font-semibold transition disabled:opacity-50"
                >
                  {assignMut.isPending ? 'En cours…' : 'Affecter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
