'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, tenantsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { formatCFA } from '@transpro/shared';
import {
  ArrowLeft, Building2, Users, Route, Bus, Ticket, MapPin,
  Truck, CheckCircle2, XCircle, Clock, AlertCircle, CreditCard,
} from 'lucide-react';
import Link from 'next/link';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { toast } from 'sonner';

dayjs.locale('fr');

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  TRIAL:     { label: 'Essai',     cls: 'bg-yellow-100 text-yellow-700', icon: Clock },
  ACTIVE:    { label: 'Actif',     cls: 'bg-green-100 text-green-700',   icon: CheckCircle2 },
  SUSPENDED: { label: 'Suspendu', cls: 'bg-red-100 text-red-600',       icon: XCircle },
  CANCELLED: { label: 'Annulé',   cls: 'bg-gray-100 text-gray-500',     icon: AlertCircle },
};

const PLAN_CONFIG: Record<string, { label: string; cls: string }> = {
  BASIC:        { label: 'Basique',       cls: 'bg-slate-100 text-slate-600' },
  PROFESSIONAL: { label: 'Professionnel', cls: 'bg-blue-100 text-blue-700' },
  ENTERPRISE:   { label: 'Entreprise',    cls: 'bg-purple-100 text-purple-700' },
};

const ROLE_LABELS: Record<string, string> = {
  COMPANY_OWNER: 'Propriétaire',
  COMPANY_ADMIN: 'Admin',
  COMPANY_AGENT: 'Agent',
  PASSENGER: 'Passager',
};

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  if (user?.role !== 'SUPER_ADMIN') {
    router.replace('/dashboard');
    return null;
  }

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['admin-tenant-detail', id],
    queryFn: () => adminApi.tenantFullDetail(id) as any,
    staleTime: 30_000,
  });

  const updateMut = useMutation({
    mutationFn: (data: any) => tenantsApi.updateById(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-tenant-detail', id] });
      qc.invalidateQueries({ queryKey: ['admin-tenants'] });
      toast.success('Compagnie mise à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  if (isLoading) {
    return <div className="p-12 text-center text-gray-400">Chargement…</div>;
  }

  if (!tenant) {
    return <div className="p-12 text-center text-gray-400">Compagnie introuvable</div>;
  }

  const sc = STATUS_CONFIG[tenant.status] ?? STATUS_CONFIG.ACTIVE;
  const pc = PLAN_CONFIG[tenant.plan] ?? PLAN_CONFIG.BASIC;

  const counters = [
    { label: 'Utilisateurs',   value: tenant._count?.users ?? 0,    icon: Users },
    { label: 'Itinéraires',    value: tenant._count?.routes ?? 0,   icon: Route },
    { label: 'Voyages',        value: tenant._count?.trips ?? 0,    icon: Bus },
    { label: 'Réservations',   value: tenant._count?.bookings ?? 0, icon: Ticket },
    { label: 'Chauffeurs',     value: tenant._count?.drivers ?? 0,  icon: Users },
    { label: 'Véhicules',      value: tenant._count?.vehicles ?? 0, icon: Truck },
    { label: 'Gares',          value: tenant._count?.stations ?? 0, icon: MapPin },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/admin/tenants" className="text-gray-400 hover:text-gray-600 transition">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {tenant.logo ? (
            <img src={tenant.logo} alt="" className="w-12 h-12 rounded-xl object-contain bg-gray-100 border border-gray-200 shrink-0" />
          ) : (
            <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center shrink-0">
              <Building2 size={20} className="text-brand-500" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">{tenant.name}</h1>
            <p className="text-sm text-gray-400">{tenant.slug} · {tenant.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${sc.cls}`}>
            <sc.icon size={11} /> {sc.label}
          </span>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${pc.cls}`}>{pc.label}</span>
        </div>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-4 lg:grid-cols-7 gap-3">
        {counters.map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <c.icon size={16} className="text-gray-400 mx-auto mb-1" />
            <p className="text-xl font-bold text-gray-900">{c.value}</p>
            <p className="text-[11px] text-gray-400">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Infos & Actions */}
        <div className="space-y-4">
          {/* Finances */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Finances</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Revenu total</span>
                <span className="font-semibold text-gray-900">{formatCFA(tenant.stats?.totalRevenue ?? 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Commission perçue</span>
                <span className="font-semibold text-brand-600">{formatCFA(tenant.stats?.totalCommission ?? 0)}</span>
              </div>
            </div>
          </div>

          {/* Modifier plan/statut */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Modifier</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Plan</label>
                <select
                  value={tenant.plan}
                  onChange={(e) => updateMut.mutate({ plan: e.target.value })}
                  disabled={updateMut.isPending}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
                >
                  <option value="BASIC">Basique</option>
                  <option value="PROFESSIONAL">Professionnel</option>
                  <option value="ENTERPRISE">Entreprise</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Statut</label>
                <select
                  value={tenant.status}
                  onChange={(e) => updateMut.mutate({ status: e.target.value })}
                  disabled={updateMut.isPending}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
                >
                  <option value="TRIAL">Essai</option>
                  <option value="ACTIVE">Actif</option>
                  <option value="SUSPENDED">Suspendu</option>
                  <option value="CANCELLED">Annulé</option>
                </select>
              </div>
              {tenant.trialEndsAt && (
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Fin d'essai</label>
                  <p className="text-sm text-gray-700">{dayjs(tenant.trialEndsAt).format('DD MMMM YYYY')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Abonnements */}
          {tenant.subscriptions?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Abonnements</h2>
              <div className="space-y-2">
                {tenant.subscriptions.slice(0, 3).map((s: any) => (
                  <div key={s.id} className="flex justify-between items-center text-sm">
                    <div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full mr-2 ${PLAN_CONFIG[s.plan]?.cls ?? ''}`}>
                        {PLAN_CONFIG[s.plan]?.label ?? s.plan}
                      </span>
                      <span className="text-gray-400 text-xs">{dayjs(s.startDate).format('MMM YYYY')}</span>
                    </div>
                    <span className={`text-xs font-semibold ${s.isPaid ? 'text-green-600' : 'text-red-500'}`}>
                      {s.isPaid ? 'Payé' : 'Impayé'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Utilisateurs */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900">Utilisateurs ({tenant._count?.users ?? 0})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50 text-left">
                  <th className="px-4 py-2.5 font-semibold text-gray-500 text-xs">Nom</th>
                  <th className="px-4 py-2.5 font-semibold text-gray-500 text-xs">Rôle</th>
                  <th className="px-4 py-2.5 font-semibold text-gray-500 text-xs">Statut</th>
                  <th className="px-4 py-2.5 font-semibold text-gray-500 text-xs hidden sm:table-cell">Dernière connexion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(tenant.recentUsers ?? []).map((u: any) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{u.firstName} {u.lastName}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {u.isActive ? 'Actif' : 'Désactivé'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 hidden sm:table-cell">
                      {u.lastLoginAt ? dayjs(u.lastLoginAt).format('DD/MM/YY HH:mm') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
