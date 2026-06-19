'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { tenantsApi, billingApi } from '@/lib/api';
import { toast } from 'sonner';
import {
  TenantPlan, TenantStatus, formatCFA,
  PLAN_PRICING, PLAN_LIMITS, PLAN_FEATURES,
} from '@transpro/shared';
import {
  CreditCard, CheckCircle, XCircle, AlertTriangle, Clock,
  Truck, Users, Route, Building2, UserCheck, Mail,
  RefreshCw, Loader2, ExternalLink,
} from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
dayjs.locale('fr');

// ── Helpers ───────────────────────────────────────────────────────────────────

const PLAN_ORDER: TenantPlan[] = [TenantPlan.BASIC, TenantPlan.PROFESSIONAL, TenantPlan.ENTERPRISE];

const PLAN_UI: Record<TenantPlan, { color: string; ring: string; badge: string }> = {
  [TenantPlan.BASIC]:        { color: 'bg-slate-100 text-slate-700',  ring: 'border-slate-300',  badge: 'bg-slate-100 text-slate-700' },
  [TenantPlan.PROFESSIONAL]: { color: 'bg-brand-100 text-brand-700',  ring: 'border-brand-400',  badge: 'bg-brand-500 text-white' },
  [TenantPlan.ENTERPRISE]:   { color: 'bg-purple-100 text-purple-700',ring: 'border-purple-400', badge: 'bg-purple-600 text-white' },
};

const FEATURES_TABLE: { key: keyof typeof PLAN_FEATURES[TenantPlan]; label: string }[] = [
  { key: 'schedulesAuto',      label: 'Plannings automatiques' },
  { key: 'ticketTemplates',    label: 'Modèles de tickets personnalisés' },
  { key: 'parcels',            label: 'Gestion colis & bagages' },
  { key: 'reportsExport',      label: 'Export rapports PDF / CSV' },
  { key: 'analyticsAdvanced',  label: 'Analytiques avancées' },
  { key: 'webPush',            label: 'Notifications Web Push dashboard' },
  { key: 'auditLogs',          label: 'Journal d\'audit' },
  { key: 'deliveryRequests',   label: 'Livraisons à domicile' },
  { key: 'customRbacProfiles', label: 'Profils de permissions personnalisés' },
];

function daysUntil(date?: string | null) {
  if (!date) return null;
  return dayjs(date).diff(dayjs(), 'day');
}

// ── Status Banner ─────────────────────────────────────────────────────────────

function StatusBanner({ tenant }: { tenant: any }) {
  const status: TenantStatus = tenant?.status ?? 'TRIAL';
  const plan: TenantPlan = tenant?.plan ?? TenantPlan.BASIC;
  const cfg = PLAN_PRICING[plan];

  if (status === 'TRIAL') {
    const daysLeft = daysUntil(tenant?.trialEndsAt) ?? 90;
    const urgent = daysLeft <= 7;
    const pct = Math.max(0, Math.min(100, ((90 - Math.max(0, daysLeft)) / 90) * 100));
    return (
      <div className={`rounded-2xl p-6 ${urgent ? 'bg-orange-50 border border-orange-200' : 'bg-blue-50 border border-blue-200'}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${urgent ? 'bg-orange-100' : 'bg-blue-100'}`}>
              <Clock size={20} className={urgent ? 'text-orange-600' : 'text-blue-600'} />
            </div>
            <div>
              <h2 className={`font-bold text-lg ${urgent ? 'text-orange-900' : 'text-blue-900'}`}>Période d'essai</h2>
              <p className={`text-sm ${urgent ? 'text-orange-700' : 'text-blue-700'}`}>
                {daysLeft <= 0 ? 'Essai expiré' : `${daysLeft} jour${daysLeft > 1 ? 's' : ''} restant${daysLeft > 1 ? 's' : ''} sur votre essai de 90 jours`}
              </p>
            </div>
          </div>
          <a href="mailto:commercial@transpro.ci" className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition ${urgent ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600'}`}>
            <Mail size={15} /> Activer mon abonnement
          </a>
        </div>
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Progression de l'essai</span>
            <span className={`font-semibold ${urgent ? 'text-orange-700' : 'text-blue-700'}`}>
              {daysLeft <= 0 ? 'Expiré' : `Expire le ${dayjs(tenant?.trialEndsAt).format('D MMM YYYY')}`}
            </span>
          </div>
          <div className="bg-white/60 rounded-full h-2.5 overflow-hidden">
            <div className={`h-2.5 rounded-full ${urgent ? 'bg-orange-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    );
  }

  if (status === 'ACTIVE') {
    const daysLeft = daysUntil(tenant?.subscriptionEndsAt);
    const expiring = daysLeft !== null && daysLeft <= 7;
    return (
      <div className={`rounded-2xl p-6 ${expiring ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${expiring ? 'bg-orange-100' : 'bg-green-100'}`}>
              <CheckCircle size={20} className={expiring ? 'text-orange-600' : 'text-green-600'} />
            </div>
            <div>
              <h2 className={`font-bold text-lg ${expiring ? 'text-orange-900' : 'text-green-900'}`}>Abonnement {cfg.label} actif</h2>
              <p className={`text-sm ${expiring ? 'text-orange-700' : 'text-green-700'}`}>
                {tenant?.subscriptionEndsAt
                  ? expiring
                    ? `Expire dans ${daysLeft} jour${daysLeft !== 1 ? 's' : ''} — ${dayjs(tenant.subscriptionEndsAt).format('D MMM YYYY')}`
                    : `Prochain renouvellement le ${dayjs(tenant.subscriptionEndsAt).format('D MMMM YYYY')}`
                  : 'Abonnement actif'}
              </p>
            </div>
          </div>
          {expiring && (
            <a href="mailto:commercial@transpro.ci" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white transition">
              <RefreshCw size={15} /> Renouveler
            </a>
          )}
        </div>
      </div>
    );
  }

  if (status === 'SUSPENDED') {
    return (
      <div className="rounded-2xl p-6 bg-red-50 border border-red-200 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <AlertTriangle size={20} className="text-red-600 shrink-0" />
          <div>
            <h2 className="font-bold text-lg text-red-900">Compte suspendu</h2>
            <p className="text-sm text-red-700">Contactez-nous pour réactiver votre accès.</p>
          </div>
        </div>
        <a href="mailto:support@transpro.ci" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition">
          <Mail size={15} /> Réactiver
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-6 bg-gray-50 border border-gray-200 flex items-center gap-3">
      <XCircle size={20} className="text-gray-400 shrink-0" />
      <div>
        <h2 className="font-bold text-gray-700">Abonnement résilié</h2>
        <p className="text-sm text-gray-500">Contactez-nous pour réactiver votre espace.</p>
      </div>
    </div>
  );
}

// ── Usage Meter ───────────────────────────────────────────────────────────────

function UsageMeter({ label, icon: Icon, used, max }: { label: string; icon: React.ElementType; used: number; max: number }) {
  const unlimited = max >= 999;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / max) * 100));
  const warning = !unlimited && pct >= 80;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Icon size={14} className="text-gray-400" /> {label}
        </div>
        <span className={`text-xs font-semibold ${warning ? 'text-orange-600' : 'text-gray-500'}`}>
          {used} / {unlimited ? '∞' : max}
        </span>
      </div>
      <div className="bg-gray-100 rounded-full h-1.5 overflow-hidden">
        {unlimited
          ? <div className="bg-brand-200 h-1.5 rounded-full w-1/5" />
          : <div className={`h-1.5 rounded-full ${warning ? 'bg-orange-500' : 'bg-brand-500'}`} style={{ width: `${pct}%` }} />
        }
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SubscriptionPage() {
  const [subscribingPlan, setSubscribingPlan] = useState<string | null>(null);

  const subscribeMut = useMutation({
    mutationFn: (plan: string) => billingApi.subscribe(plan) as any,
    onSuccess: (data: any) => {
      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Erreur lors de l\'initiation du paiement');
      setSubscribingPlan(null);
    },
  });

  const handleSubscribe = (plan: string) => {
    setSubscribingPlan(plan);
    subscribeMut.mutate(plan);
  };

  const { data: tenantRaw, isLoading } = useQuery({
    queryKey: ['tenant-me'],
    queryFn: () => tenantsApi.me() as any,
  });
  const { data: historyRaw } = useQuery({
    queryKey: ['tenant-subscriptions'],
    queryFn: () => tenantsApi.subscriptions() as any,
  });
  const { data: usageRaw } = useQuery({
    queryKey: ['tenant-usage'],
    queryFn: () => tenantsApi.usage() as any,
  });

  const tenant = tenantRaw as any;
  const history: any[] = Array.isArray(historyRaw) ? historyRaw : [];
  const plan: TenantPlan = tenant?.plan ?? TenantPlan.BASIC;
  const planCfg = PLAN_PRICING[plan];
  const limits = PLAN_LIMITS[plan];
  const features = PLAN_FEATURES[plan];
  const usage = usageRaw?.usage ?? {};

  if (isLoading) {
    return <div className="flex justify-center py-24"><Loader2 size={28} className="animate-spin text-brand-500" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Abonnement</h1>
        <span className="text-sm text-gray-400">Membre depuis {dayjs(tenant?.createdAt).format('MMMM YYYY')}</span>
      </div>

      <StatusBanner tenant={tenant} />

      {/* ── Corps principal : 3 colonnes ──────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-5 items-start">

        {/* Colonne gauche : plan actuel + utilisation */}
        <div className="space-y-5">

          {/* Plan actuel */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Plan actuel</h2>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${PLAN_UI[plan].color}`}>{planCfg.label}</span>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">
                {formatCFA(planCfg.priceMonthly)}
                <span className="text-base font-normal text-gray-400">/mois</span>
              </p>
              <p className="text-sm text-gray-500 mt-1">{planCfg.description}</p>
            </div>
            <ul className="space-y-1.5">
              {FEATURES_TABLE.map((f) => {
                const included = features[f.key];
                return (
                  <li key={f.key} className={`flex items-center gap-2 text-sm ${included ? 'text-gray-700' : 'text-gray-300'}`}>
                    {included
                      ? <CheckCircle size={14} className="text-green-500 shrink-0" />
                      : <XCircle size={14} className="text-gray-200 shrink-0" />
                    }
                    {f.label}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Utilisation */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Utilisation</h2>
            <UsageMeter label="Utilisateurs staff" icon={Users}     used={usage.users    ?? 0} max={limits.maxUsers} />
            <UsageMeter label="Gares"               icon={Building2} used={usage.stations  ?? 0} max={limits.maxStations} />
            <UsageMeter label="Véhicules"           icon={Truck}     used={usage.vehicles  ?? 0} max={limits.maxVehicles} />
            <UsageMeter label="Chauffeurs"          icon={UserCheck} used={usage.drivers   ?? 0} max={limits.maxDrivers} />
            <UsageMeter label="Itinéraires"         icon={Route}     used={usage.routes    ?? 0} max={limits.maxRoutes} />
            <p className="text-xs text-gray-400 pt-1 border-t border-gray-50">
              Passez au plan supérieur pour augmenter les limites.
            </p>
          </div>

        </div>

        {/* Colonnes centrale + droite : comparatif plans (col-span-2) */}
        <div className="col-span-2 bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-gray-900">Comparer les plans</h2>
              <p className="text-sm text-gray-500 mt-0.5">Contactez notre équipe commerciale pour modifier votre abonnement.</p>
            </div>
            <a href="mailto:commercial@transpro.ci" className="shrink-0 flex items-center gap-1.5 text-brand-600 hover:text-brand-700 font-medium text-sm">
              <Mail size={14} /> commercial@transpro.ci
            </a>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {PLAN_ORDER.map((p) => {
              const cfg = PLAN_PRICING[p];
              const lim = PLAN_LIMITS[p];
              const feat = PLAN_FEATURES[p];
              const ui = PLAN_UI[p];
              const isCurrent = p === plan;
              const isUpgrade = PLAN_ORDER.indexOf(p) > PLAN_ORDER.indexOf(plan);

              return (
                <div key={p} className={`rounded-xl border-2 p-5 flex flex-col gap-3 ${isCurrent ? `${ui.ring} bg-brand-50/50` : 'border-gray-100'}`}>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-900">{cfg.label}</span>
                      {isCurrent && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ui.badge}`}>Actuel</span>}
                    </div>
                    <p className="text-xl font-bold text-gray-900">
                      {formatCFA(cfg.priceMonthly)}<span className="text-xs font-normal text-gray-400">/mois</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{cfg.description}</p>
                  </div>

                  <div className="space-y-0.5 text-xs text-gray-500">
                    <p>{lim.maxUsers >= 999 ? 'Utilisateurs illimités' : `Jusqu'à ${lim.maxUsers} utilisateurs`}</p>
                    <p>{lim.maxStations >= 999 ? 'Gares illimitées' : `Jusqu'à ${lim.maxStations} gare${lim.maxStations > 1 ? 's' : ''}`}</p>
                    <p>{lim.maxVehicles >= 999 ? 'Véhicules illimités' : `Jusqu'à ${lim.maxVehicles} véhicules`}</p>
                  </div>

                  <ul className="space-y-1 flex-1">
                    {FEATURES_TABLE.filter((f) => feat[f.key]).map((f) => (
                      <li key={f.key} className="flex items-start gap-1.5 text-xs text-gray-600">
                        <CheckCircle size={11} className="text-green-500 shrink-0 mt-0.5" />
                        {f.label}
                      </li>
                    ))}
                  </ul>

                  {!isCurrent && (
                    isUpgrade ? (
                      <button
                        onClick={() => handleSubscribe(p)}
                        disabled={subscribeMut.isPending}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold bg-brand-500 hover:bg-brand-600 text-white transition disabled:opacity-50"
                      >
                        {subscribeMut.isPending && subscribingPlan === p
                          ? <Loader2 size={14} className="animate-spin" />
                          : <ExternalLink size={14} />
                        }
                        {`Passer à ${cfg.label}`}
                      </button>
                    ) : (
                      <a
                        href={`mailto:commercial@transpro.ci?subject=Demande de passage au plan ${cfg.label}`}
                        className="w-full text-center py-2 rounded-lg text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                      >
                        Rétrograder (contacter)
                      </a>
                    )
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-xs text-gray-400 pt-3 border-t border-gray-100">
            Toute modification est effective au prochain cycle de facturation.
          </p>
        </div>

      </div>

      {/* ── Historique ────────────────────────────────────────────────────── */}
      {history.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900">Historique des abonnements</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Période</th>
                <th className="px-5 py-3 text-left font-medium">Plan</th>
                <th className="px-5 py-3 text-left font-medium">Montant</th>
                <th className="px-5 py-3 text-left font-medium">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {history.map((sub) => (
                <tr key={sub.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-600 text-xs">
                    {dayjs(sub.startDate).format('D MMM YY')} → {dayjs(sub.endDate).format('D MMM YY')}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PLAN_UI[sub.plan as TenantPlan]?.color ?? ''}`}>
                      {PLAN_PRICING[sub.plan as TenantPlan]?.label ?? sub.plan}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-medium text-gray-700">
                    {sub.amount === 0 ? <span className="text-blue-600 text-xs">Gratuit</span> : formatCFA(sub.amount)}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sub.isPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {sub.isPaid ? 'Payé' : 'Impayé'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
