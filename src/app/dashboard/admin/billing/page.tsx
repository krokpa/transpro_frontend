'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, tenantsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { formatCFA } from '@transpro/shared';
import {
  CreditCard, Play, CheckCircle2, XCircle, Clock, AlertCircle,
  Building2, RefreshCw,
} from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { toast } from 'sonner';
import Link from 'next/link';

dayjs.locale('fr');

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  TRIAL:     { label: 'Essai',     cls: 'bg-yellow-100 text-yellow-700', icon: Clock },
  ACTIVE:    { label: 'Actif',     cls: 'bg-green-100 text-green-700',   icon: CheckCircle2 },
  SUSPENDED: { label: 'Suspendu', cls: 'bg-red-100 text-red-600',       icon: XCircle },
  CANCELLED: { label: 'Annulé',   cls: 'bg-gray-100 text-gray-500',     icon: AlertCircle },
};

const PLAN_CONFIG: Record<string, { label: string; cls: string; price: number }> = {
  BASIC:        { label: 'Basique',       cls: 'bg-slate-100 text-slate-600', price: 25000 },
  PROFESSIONAL: { label: 'Professionnel', cls: 'bg-blue-100 text-blue-700',   price: 50000 },
  ENTERPRISE:   { label: 'Entreprise',    cls: 'bg-purple-100 text-purple-700', price: 100000 },
};

export default function AdminBillingPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [runningCheck, setRunningCheck] = useState(false);

  if (user?.role !== 'SUPER_ADMIN') {
    router.replace('/dashboard');
    return null;
  }

  const { data: raw = [], isLoading } = useQuery({
    queryKey: ['admin-tenants'],
    queryFn: () => tenantsApi.list() as any,
    staleTime: 60_000,
  });

  const tenants: any[] = Array.isArray(raw) ? raw : [];

  const billingMut = useMutation({
    mutationFn: () => adminApi.runBillingCheck() as any,
    onMutate: () => setRunningCheck(true),
    onSuccess: () => {
      toast.success('Vérification de facturation déclenchée');
      qc.invalidateQueries({ queryKey: ['admin-tenants'] });
      setRunningCheck(false);
    },
    onError: () => {
      toast.error('Erreur lors du déclenchement');
      setRunningCheck(false);
    },
  });

  const activeSubscriptions = tenants.filter((t) => t.status === 'ACTIVE');
  const trialExpiringSoon = tenants.filter((t) => {
    if (t.status !== 'TRIAL' || !t.trialEndsAt) return false;
    const days = dayjs(t.trialEndsAt).diff(dayjs(), 'day');
    return days >= 0 && days <= 7;
  });
  const mrr = activeSubscriptions.reduce((sum, t) => sum + (PLAN_CONFIG[t.plan]?.price ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturation</h1>
          <p className="text-sm text-gray-500 mt-1">Abonnements et revenus mensuels récurrents</p>
        </div>
        <button
          onClick={() => billingMut.mutate()}
          disabled={runningCheck}
          className="flex items-center gap-2 bg-brand-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-brand-600 disabled:opacity-50 transition"
        >
          {runningCheck ? <RefreshCw size={15} className="animate-spin" /> : <Play size={15} />}
          Déclencher billing check
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'MRR estimé',     value: formatCFA(mrr),               color: 'text-brand-600', bg: 'bg-brand-50', icon: CreditCard },
          { label: 'Abonnés actifs', value: activeSubscriptions.length,   color: 'text-green-700', bg: 'bg-green-50', icon: CheckCircle2 },
          { label: 'En essai',       value: tenants.filter((t) => t.status === 'TRIAL').length, color: 'text-yellow-700', bg: 'bg-yellow-50', icon: Clock },
          { label: 'Essais expir. 7j', value: trialExpiringSoon.length,   color: 'text-red-600',   bg: 'bg-red-50',   icon: AlertCircle },
        ].map((k) => (
          <div key={k.label} className={`${k.bg} rounded-2xl p-4 flex items-center gap-3`}>
            <k.icon size={20} className={k.color} />
            <div>
              <p className="text-xs text-gray-500 font-medium">{k.label}</p>
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alerte essais expirant */}
      {trialExpiringSoon.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <h3 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
            <AlertCircle size={16} /> {trialExpiringSoon.length} essai(s) expirant dans 7 jours
          </h3>
          <div className="space-y-1">
            {trialExpiringSoon.map((t) => {
              const days = dayjs(t.trialEndsAt).diff(dayjs(), 'day');
              return (
                <Link
                  key={t.id}
                  href={`/dashboard/admin/tenants/${t.id}`}
                  className="flex items-center justify-between text-sm text-amber-700 hover:underline"
                >
                  <span>{t.name}</span>
                  <span className="font-medium">{days === 0 ? 'Expire aujourd\'hui' : `J-${days}`}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Table abonnements */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="font-semibold text-gray-900">État des abonnements</h2>
        </div>
        {isLoading ? (
          <div className="p-10 text-center text-gray-300">Chargement…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-500 text-xs">Compagnie</th>
                  <th className="px-4 py-3 font-semibold text-gray-500 text-xs">Plan</th>
                  <th className="px-4 py-3 font-semibold text-gray-500 text-xs">Statut</th>
                  <th className="px-4 py-3 font-semibold text-gray-500 text-xs">MRR</th>
                  <th className="px-4 py-3 font-semibold text-gray-500 text-xs hidden md:table-cell">Fin période</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tenants.map((t) => {
                  const sc = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.ACTIVE;
                  const pc = PLAN_CONFIG[t.plan] ?? PLAN_CONFIG.BASIC;
                  const endDate = t.subscriptionEndsAt ?? t.trialEndsAt;
                  const isExpiringSoon = t.status === 'TRIAL' && endDate &&
                    dayjs(endDate).diff(dayjs(), 'day') <= 7 && dayjs(endDate).diff(dayjs(), 'day') >= 0;

                  return (
                    <tr key={t.id} className={`hover:bg-gray-50 transition ${isExpiringSoon ? 'bg-amber-50/40' : ''}`}>
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/admin/tenants/${t.id}`} className="font-medium text-gray-900 hover:text-brand-600 transition">
                          {t.name}
                        </Link>
                        <p className="text-xs text-gray-400">{t.slug}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${pc.cls}`}>{pc.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full w-fit ${sc.cls}`}>
                          <sc.icon size={10} /> {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-700">
                        {t.status === 'ACTIVE' ? formatCFA(pc.price) : '—'}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {endDate ? (
                          <span className={`text-xs ${isExpiringSoon ? 'text-amber-600 font-semibold' : 'text-gray-400'}`}>
                            {dayjs(endDate).format('DD/MM/YYYY')}
                            {isExpiringSoon && ` (J-${dayjs(endDate).diff(dayjs(), 'day')})`}
                          </span>
                        ) : <span className="text-xs text-gray-300">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
