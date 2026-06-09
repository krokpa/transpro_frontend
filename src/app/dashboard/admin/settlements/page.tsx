'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settlementsApi, tenantsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { formatCFA } from '@transpro/shared';
import {
  Banknote, Clock, CheckCircle2, XCircle, Loader2, RefreshCw,
  ChevronRight, Filter, Play, Building2, Calendar,
} from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { toast } from 'sonner';
import Link from 'next/link';

dayjs.locale('fr');

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  PENDING:    { label: 'En attente',   cls: 'bg-yellow-100 text-yellow-700', icon: Clock },
  PROCESSING: { label: 'En cours',     cls: 'bg-blue-100 text-blue-700',     icon: Loader2 },
  PAID:       { label: 'Reversé',      cls: 'bg-green-100 text-green-700',   icon: CheckCircle2 },
  FAILED:     { label: 'Échoué',       cls: 'bg-red-100 text-red-600',       icon: XCircle },
};

export default function AdminSettlementsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const [filterStatus, setFilterStatus] = useState('');
  const [filterTenant, setFilterTenant] = useState('');
  const [showTrigger, setShowTrigger] = useState(false);
  const [triggerTenant, setTriggerTenant] = useState('');
  const [triggerYear, setTriggerYear]   = useState(String(new Date().getFullYear()));
  const [triggerMonth, setTriggerMonth] = useState(String(new Date().getMonth() || 12));

  if (user?.role !== 'SUPER_ADMIN') {
    router.replace('/dashboard');
    return null;
  }

  const { data: rawSettlements = [], isLoading } = useQuery({
    queryKey: ['admin-settlements', filterStatus, filterTenant],
    queryFn: () => settlementsApi.list({
      ...(filterStatus ? { status: filterStatus } : {}),
      ...(filterTenant ? { tenantId: filterTenant } : {}),
    }) as any,
    staleTime: 30_000,
  });

  const { data: rawTenants = [] } = useQuery({
    queryKey: ['admin-tenants'],
    queryFn: () => tenantsApi.list() as any,
    staleTime: 60_000,
  });

  const settlements: any[] = Array.isArray(rawSettlements) ? rawSettlements : (rawSettlements as any)?.data ?? [];
  const tenants: any[]     = Array.isArray(rawTenants) ? rawTenants : (rawTenants as any)?.data ?? [];

  const triggerMut = useMutation({
    mutationFn: () => settlementsApi.trigger({
      tenantId: triggerTenant,
      year:  parseInt(triggerYear),
      month: parseInt(triggerMonth),
    }) as any,
    onSuccess: () => {
      toast.success('Reversement calculé avec succès');
      qc.invalidateQueries({ queryKey: ['admin-settlements'] });
      setShowTrigger(false);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Erreur lors du calcul';
      toast.error(msg);
    },
  });

  const totalPending    = settlements.filter((s) => s.status === 'PENDING').reduce((a, s) => a + s.netAmount, 0);
  const totalProcessing = settlements.filter((s) => s.status === 'PROCESSING').reduce((a, s) => a + s.netAmount, 0);
  const totalPaid       = settlements.filter((s) => s.status === 'PAID').reduce((a, s) => a + s.netAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reversements</h1>
          <p className="text-sm text-gray-500 mt-1">
            Suivi des reversements aux compagnies (tickets en ligne - frais Genius Pay 1% - commission 4%)
          </p>
        </div>
        <button
          onClick={() => setShowTrigger(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Play className="w-4 h-4" />
          Calculer manuellement
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'En attente',   amount: totalPending,    cls: 'border-yellow-200 bg-yellow-50', textCls: 'text-yellow-700' },
          { label: 'En cours',     amount: totalProcessing, cls: 'border-blue-200 bg-blue-50',     textCls: 'text-blue-700' },
          { label: 'Reversé',      amount: totalPaid,       cls: 'border-green-200 bg-green-50',   textCls: 'text-green-700' },
        ].map((kpi) => (
          <div key={kpi.label} className={`rounded-xl border p-4 ${kpi.cls}`}>
            <p className="text-xs font-medium text-gray-500">{kpi.label}</p>
            <p className={`text-xl font-bold mt-1 ${kpi.textCls}`}>{formatCFA(kpi.amount)}</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="w-4 h-4 text-gray-400" />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-sm border rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="">Tous les statuts</option>
          <option value="PENDING">En attente</option>
          <option value="PROCESSING">En cours</option>
          <option value="PAID">Reversé</option>
          <option value="FAILED">Échoué</option>
        </select>
        <select
          value={filterTenant}
          onChange={(e) => setFilterTenant(e.target.value)}
          className="text-sm border rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="">Toutes les compagnies</option>
          {tenants.map((t: any) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        {(filterStatus || filterTenant) && (
          <button
            onClick={() => { setFilterStatus(''); setFilterTenant(''); }}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Réinitialiser
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Chargement…
          </div>
        ) : settlements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Banknote className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm">Aucun reversement trouvé</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-5 py-3 text-left">Compagnie</th>
                <th className="px-5 py-3 text-left">Période</th>
                <th className="px-5 py-3 text-right">Brut</th>
                <th className="px-5 py-3 text-right">Frais GP</th>
                <th className="px-5 py-3 text-right">Commission</th>
                <th className="px-5 py-3 text-right">Net à reverser</th>
                <th className="px-5 py-3 text-center">Transactions</th>
                <th className="px-5 py-3 text-center">Statut</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {settlements.map((s: any) => {
                const cfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.PENDING;
                const Icon = cfg.icon;
                return (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-900">
                          {s.tenant?.name ?? s.tenantId}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {dayjs(s.periodStart).format('MMM YYYY')}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right text-sm text-gray-600">
                      {formatCFA(s.totalAmount)}
                    </td>
                    <td className="px-5 py-3 text-right text-sm text-red-500">
                      -{formatCFA(s.geniusPayFees)}
                    </td>
                    <td className="px-5 py-3 text-right text-sm text-orange-500">
                      -{formatCFA(s.commissions)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-sm font-bold text-gray-900">{formatCFA(s.netAmount)}</span>
                    </td>
                    <td className="px-5 py-3 text-center text-sm text-gray-600">
                      {s.itemCount}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.cls}`}>
                        <Icon className="w-3.5 h-3.5" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/dashboard/admin/settlements/${s.id}`}
                        className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Voir <ChevronRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal trigger manuel */}
      {showTrigger && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
            <h2 className="text-lg font-bold text-gray-900">Calculer un reversement</h2>
            <p className="text-sm text-gray-500">
              Sélectionnez la compagnie et la période. Le système calculera tous les paiements Genius Pay
              de ce mois non encore reversés.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Compagnie</label>
                <select
                  value={triggerTenant}
                  onChange={(e) => setTriggerTenant(e.target.value)}
                  className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  <option value="">Sélectionner une compagnie…</option>
                  {tenants.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Année</label>
                  <input
                    type="number"
                    value={triggerYear}
                    onChange={(e) => setTriggerYear(e.target.value)}
                    min="2024"
                    max="2030"
                    className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Mois (1–12)</label>
                  <input
                    type="number"
                    value={triggerMonth}
                    onChange={(e) => setTriggerMonth(e.target.value)}
                    min="1"
                    max="12"
                    className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowTrigger(false)}
                className="flex-1 py-2 text-sm font-medium text-gray-600 border rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={() => triggerMut.mutate()}
                disabled={!triggerTenant || triggerMut.isPending}
                className="flex-1 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {triggerMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Calculer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
