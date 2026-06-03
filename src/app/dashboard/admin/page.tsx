'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { formatCFA } from '@transpro/shared';
import {
  Building2, Users, Ticket, Bus, TrendingUp, CreditCard,
  CheckCircle2, Clock, XCircle, AlertCircle, ArrowRight, MessageSquare,
} from 'lucide-react';
import Link from 'next/link';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
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

export default function SuperAdminHomePage() {
  const router = useRouter();
  const { user } = useAuthStore();

  if (user?.role !== 'SUPER_ADMIN') {
    router.replace('/dashboard');
    return null;
  }

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-platform-stats'],
    queryFn: () => adminApi.platformStats() as any,
    staleTime: 60_000,
  });

  const kpis = [
    {
      label: 'Compagnies actives',
      value: stats?.tenants?.active ?? '—',
      sub: `${stats?.tenants?.trial ?? 0} en essai · ${stats?.tenants?.suspended ?? 0} suspendu(s)`,
      icon: Building2,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Utilisateurs inscrits',
      value: stats?.users?.total ?? '—',
      sub: 'tous rôles confondus',
      icon: Users,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      label: 'Réservations confirmées',
      value: stats?.bookings?.confirmed ?? '—',
      sub: 'total plateforme',
      icon: Ticket,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Revenu total',
      value: stats ? formatCFA(stats.revenue.total) : '—',
      sub: `${stats ? formatCFA(stats.revenue.thisMonth) : '—'} ce mois`,
      icon: CreditCard,
      color: 'text-brand-600',
      bg: 'bg-brand-50',
    },
    {
      label: 'Voyages créés',
      value: stats?.trips?.total ?? '—',
      sub: 'total plateforme',
      icon: Bus,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Nouvelles compagnies',
      value: stats?.tenants?.newThisMonth ?? '—',
      sub: 'ce mois (30 j)',
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Administration TransPro CI</h1>
        <p className="text-sm text-gray-500 mt-1">Vue globale de la plateforme</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4">
            <div className={`${kpi.bg} p-3 rounded-xl shrink-0`}>
              <kpi.icon size={20} className={kpi.color} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 font-medium">{kpi.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">
                {isLoading ? <span className="text-gray-300">…</span> : kpi.value}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{kpi.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Gérer les compagnies', href: '/dashboard/admin/tenants', icon: Building2 },
          { label: 'Gérer les utilisateurs', href: '/dashboard/admin/users',   icon: Users },
          { label: 'Facturation',           href: '/dashboard/admin/billing',  icon: CreditCard },
          { label: 'SMS & Providers',       href: '/dashboard/admin/sms',      icon: MessageSquare },
          { label: 'Villes',                href: '/dashboard/cities',         icon: Building2 },
        ].map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="flex items-center justify-between gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 hover:border-brand-200 hover:bg-brand-50/30 transition group"
          >
            <div className="flex items-center gap-3">
              <a.icon size={16} className="text-gray-400 group-hover:text-brand-500 transition" />
              <span className="text-sm font-medium text-gray-700">{a.label}</span>
            </div>
            <ArrowRight size={14} className="text-gray-300 group-hover:text-brand-400 transition" />
          </Link>
        ))}
      </div>

      {/* Compagnies récentes */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Compagnies récentes</h2>
          <Link href="/dashboard/admin/tenants" className="text-xs text-brand-600 hover:underline">
            Voir tout →
          </Link>
        </div>
        {isLoading ? (
          <div className="p-10 text-center text-gray-300">Chargement…</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {(stats?.recentTenants ?? []).map((t: any) => {
              const sc = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.ACTIVE;
              const pc = PLAN_CONFIG[t.plan] ?? PLAN_CONFIG.BASIC;
              return (
                <Link
                  key={t.id}
                  href={`/dashboard/admin/tenants/${t.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center shrink-0">
                      <Building2 size={15} className="text-brand-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-400">{t.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${pc.cls}`}>{pc.label}</span>
                    <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${sc.cls}`}>
                      <sc.icon size={10} /> {sc.label}
                    </span>
                    <span className="text-xs text-gray-400 hidden sm:block">{dayjs(t.createdAt).format('DD/MM/YY')}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
