'use client';

import { useQuery } from '@tanstack/react-query';
import { tenantsApi } from '@/lib/api';
import { TenantPlan, TenantStatus, formatCFA } from '@transpro/shared';
import {
  CreditCard, CheckCircle, AlertTriangle, XCircle, Clock,
  Truck, Users, Route, Mail, Phone, RefreshCw, Loader2,
} from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
dayjs.locale('fr');

// ── Config ────────────────────────────────────────────────────────────────────

const PLAN_CONFIG: Record<TenantPlan, {
  label: string;
  price: number;
  color: string;
  ring: string;
  features: string[];
}> = {
  BASIC: {
    label: 'Basic',
    price: 29_000,
    color: 'bg-gray-100 text-gray-700',
    ring: 'border-gray-300',
    features: [
      'Jusqu\'à 3 véhicules',
      'Jusqu\'à 5 utilisateurs',
      '10 itinéraires max',
      'Support par email',
    ],
  },
  PROFESSIONAL: {
    label: 'Professionnel',
    price: 79_000,
    color: 'bg-brand-100 text-brand-700',
    ring: 'border-brand-400',
    features: [
      'Jusqu\'à 20 véhicules',
      'Utilisateurs illimités',
      'Itinéraires illimités',
      'Analytiques avancées',
      'Support prioritaire',
    ],
  },
  ENTERPRISE: {
    label: 'Enterprise',
    price: 199_000,
    color: 'bg-purple-100 text-purple-700',
    ring: 'border-purple-400',
    features: [
      'Véhicules & utilisateurs illimités',
      'API complète',
      'Multi-agences',
      'Account manager dédié',
      'SLA 99,9%',
    ],
  },
};

const PLAN_LIMITS: Record<string, { vehicles: number; users: number; routes: number }> = {
  BASIC:        { vehicles: 3,        users: 5,        routes: 10 },
  PROFESSIONAL: { vehicles: 20,       users: 50,       routes: 9999 },
  ENTERPRISE:   { vehicles: 9999,     users: 9999,     routes: 9999 },
};

const SUB_HISTORY_STATUS: Record<string, string> = {
  paid:  'bg-green-100 text-green-700',
  free:  'bg-blue-100 text-blue-700',
  trial: 'bg-blue-100 text-blue-700',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null;
  return dayjs(date).diff(dayjs(), 'day');
}

function progressPct(daysLeft: number, totalDays: number): number {
  return Math.max(0, Math.min(100, ((totalDays - Math.max(0, daysLeft)) / totalDays) * 100));
}

// ── Status Banner ─────────────────────────────────────────────────────────────

function StatusBanner({ tenant }: { tenant: any }) {
  const status: TenantStatus = tenant?.status ?? 'TRIAL';
  const plan: TenantPlan = tenant?.plan ?? 'BASIC';
  const planCfg = PLAN_CONFIG[plan];

  if (status === 'TRIAL') {
    const daysLeft = daysUntil(tenant?.trialEndsAt) ?? 90;
    const progress = progressPct(daysLeft, 90);
    const isUrgent = daysLeft <= 7;
    return (
      <div className={`rounded-2xl p-6 ${isUrgent ? 'bg-orange-50 border border-orange-200' : 'bg-blue-50 border border-blue-200'}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isUrgent ? 'bg-orange-100' : 'bg-blue-100'}`}>
              <Clock size={20} className={isUrgent ? 'text-orange-600' : 'text-blue-600'} />
            </div>
            <div>
              <h2 className={`font-bold text-lg ${isUrgent ? 'text-orange-900' : 'text-blue-900'}`}>
                Période d'essai gratuite
              </h2>
              <p className={`text-sm ${isUrgent ? 'text-orange-700' : 'text-blue-700'}`}>
                {daysLeft <= 0
                  ? 'Votre essai a expiré'
                  : `Il reste ${daysLeft} jour${daysLeft > 1 ? 's' : ''} sur votre essai de 90 jours`}
              </p>
            </div>
          </div>
          <a
            href="mailto:commercial@transpro.ci"
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
              isUrgent
                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            <Mail size={15} /> Activer mon abonnement
          </a>
        </div>
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Début d'essai</span>
            <span className={`font-semibold ${isUrgent ? 'text-orange-700' : 'text-blue-700'}`}>
              {daysLeft <= 0 ? 'Expiré' : `Expire le ${dayjs(tenant?.trialEndsAt).format('D MMM YYYY')}`}
            </span>
          </div>
          <div className="bg-white/60 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all ${isUrgent ? 'bg-orange-500' : 'bg-blue-500'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (status === 'ACTIVE') {
    const daysLeft = daysUntil(tenant?.subscriptionEndsAt);
    const isExpiringSoon = daysLeft !== null && daysLeft <= 7;
    const progress = daysLeft !== null ? progressPct(daysLeft, 30) : 50;
    return (
      <div className={`rounded-2xl p-6 ${isExpiringSoon ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isExpiringSoon ? 'bg-orange-100' : 'bg-green-100'}`}>
              <CheckCircle size={20} className={isExpiringSoon ? 'text-orange-600' : 'text-green-600'} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`font-bold text-lg ${isExpiringSoon ? 'text-orange-900' : 'text-green-900'}`}>
                  Abonnement {planCfg.label} actif
                </h2>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${planCfg.color}`}>
                  {planCfg.label}
                </span>
              </div>
              <p className={`text-sm ${isExpiringSoon ? 'text-orange-700' : 'text-green-700'}`}>
                {tenant?.subscriptionEndsAt
                  ? isExpiringSoon
                    ? `Expire dans ${daysLeft} jour${daysLeft !== 1 ? 's' : ''} — le ${dayjs(tenant.subscriptionEndsAt).format('D MMM YYYY')}`
                    : `Renouvelable le ${dayjs(tenant.subscriptionEndsAt).format('D MMMM YYYY')}`
                  : 'Abonnement actif'}
              </p>
            </div>
          </div>
          {isExpiringSoon && (
            <a
              href="mailto:commercial@transpro.ci"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white transition"
            >
              <RefreshCw size={15} /> Renouveler
            </a>
          )}
        </div>
        {tenant?.subscriptionEndsAt && (
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Période en cours</span>
              <span className="font-medium">{daysLeft} jours restants</span>
            </div>
            <div className="bg-white/60 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all ${isExpiringSoon ? 'bg-orange-500' : 'bg-green-500'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  if (status === 'SUSPENDED') {
    return (
      <div className="rounded-2xl p-6 bg-red-50 border border-red-200">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-red-900">Compte suspendu</h2>
              <p className="text-sm text-red-700">
                Votre accès est limité. Contactez-nous pour réactiver votre compte.
              </p>
            </div>
          </div>
          <a
            href="mailto:support@transpro.ci"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition"
          >
            <Mail size={15} /> Réactiver mon compte
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-6 bg-gray-50 border border-gray-200">
      <div className="flex items-center gap-3">
        <XCircle size={20} className="text-gray-500 shrink-0" />
        <div>
          <h2 className="font-bold text-gray-700">Abonnement résilié</h2>
          <p className="text-sm text-gray-500">Contactez-nous pour réactiver votre espace.</p>
        </div>
      </div>
    </div>
  );
}

// ── Usage Meter ───────────────────────────────────────────────────────────────

function UsageMeter({ label, icon, used, max }: {
  label: string;
  icon: React.ReactNode;
  used: number;
  max: number;
}) {
  const isUnlimited = max >= 9999;
  const pct = isUnlimited ? 0 : Math.min(100, Math.round((used / max) * 100));
  const isWarning = !isUnlimited && pct >= 80;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          {icon} {label}
        </div>
        <span className={`text-xs font-semibold ${isWarning ? 'text-orange-600' : 'text-gray-500'}`}>
          {used} / {isUnlimited ? '∞' : max}
        </span>
      </div>
      {!isUnlimited && (
        <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
          <div
            className={`h-2 rounded-full transition-all ${isWarning ? 'bg-orange-500' : 'bg-brand-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {isUnlimited && (
        <div className="bg-gray-100 rounded-full h-2">
          <div className="bg-brand-200 h-2 rounded-full w-1/4" />
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SubscriptionPage() {
  const { data: tenantRaw, isLoading: tenantLoading } = useQuery({
    queryKey: ['tenant-me'],
    queryFn: () => tenantsApi.me() as any,
  });

  const { data: historyRaw, isLoading: historyLoading } = useQuery({
    queryKey: ['tenant-subscriptions'],
    queryFn: () => tenantsApi.subscriptions() as any,
  });

  const tenant = tenantRaw as any;
  const history: any[] = Array.isArray(historyRaw) ? historyRaw : [];

  const plan: TenantPlan = tenant?.plan ?? 'BASIC';
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.BASIC;
  const usage = {
    vehicles: tenant?._count?.users ?? 0,   // vehicles count not in _count — use 0 as placeholder
    users: tenant?._count?.users ?? 0,
    routes: tenant?._count?.routes ?? 0,
  };

  if (tenantLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 size={28} className="animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Abonnement</h1>
        <span className="text-sm text-gray-400">
          Membre depuis {dayjs(tenant?.createdAt).format('MMMM YYYY')}
        </span>
      </div>

      {/* Status banner */}
      <StatusBanner tenant={tenant} />

      {/* Plan + Usage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Current plan */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Plan actuel</h2>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${PLAN_CONFIG[plan].color}`}>
              {PLAN_CONFIG[plan].label}
            </span>
          </div>

          <div>
            <p className="text-3xl font-bold text-gray-900">
              {new Intl.NumberFormat('fr-CI').format(PLAN_CONFIG[plan].price)}
              <span className="text-base font-normal text-gray-400"> FCFA/mois</span>
            </p>
            {tenant?.subscriptionEndsAt && (
              <p className="text-xs text-gray-400 mt-1">
                Prochain renouvellement : {dayjs(tenant.subscriptionEndsAt).format('D MMMM YYYY')}
              </p>
            )}
            {tenant?.status === 'TRIAL' && (
              <p className="text-xs text-blue-600 mt-1 font-medium">
                Gratuit pendant la période d'essai
              </p>
            )}
          </div>

          <ul className="space-y-2">
            {PLAN_CONFIG[plan].features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                <CheckCircle size={15} className="text-brand-500 shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Usage */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <h2 className="font-semibold text-gray-900">Utilisation du plan</h2>

          <UsageMeter
            label="Véhicules"
            icon={<Truck size={15} className="text-gray-400" />}
            used={tenant?._count?.trips ?? 0}
            max={limits.vehicles}
          />
          <UsageMeter
            label="Utilisateurs"
            icon={<Users size={15} className="text-gray-400" />}
            used={usage.users}
            max={limits.users}
          />
          <UsageMeter
            label="Itinéraires"
            icon={<Route size={15} className="text-gray-400" />}
            used={usage.routes}
            max={limits.routes}
          />

          <p className="text-xs text-gray-400 pt-1">
            Les compteurs se remettent à zéro à chaque renouvellement.
          </p>
        </div>
      </div>

      {/* Plan comparison */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <div>
          <h2 className="font-semibold text-gray-900">Changer de plan</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Contactez notre équipe commerciale pour modifier votre abonnement.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(Object.keys(PLAN_CONFIG) as TenantPlan[]).map((p) => {
            const cfg = PLAN_CONFIG[p];
            const isCurrent = p === plan;
            const isUpgrade = ['BASIC', 'PROFESSIONAL', 'ENTERPRISE'].indexOf(p) >
                              ['BASIC', 'PROFESSIONAL', 'ENTERPRISE'].indexOf(plan);
            return (
              <div
                key={p}
                className={`rounded-xl border-2 p-5 flex flex-col gap-3 transition ${
                  isCurrent
                    ? `${PLAN_CONFIG[p].ring} bg-brand-50`
                    : 'border-gray-100 hover:border-gray-200 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-900">{cfg.label}</span>
                    {isCurrent && (
                      <span className="text-xs bg-brand-500 text-white px-2 py-0.5 rounded-full font-medium">
                        Actuel
                      </span>
                    )}
                  </div>
                  <p className="text-xl font-bold text-gray-900">
                    {new Intl.NumberFormat('fr-CI').format(cfg.price)}
                    <span className="text-xs font-normal text-gray-400"> FCFA/mois</span>
                  </p>
                </div>

                <ul className="space-y-1.5 flex-1">
                  {cfg.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-gray-600">
                      <CheckCircle size={13} className="text-brand-400 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                {!isCurrent && (
                  <a
                    href="mailto:commercial@transpro.ci?subject=Changement de plan TransPro CI"
                    className={`w-full text-center py-2 rounded-lg text-sm font-semibold transition ${
                      isUpgrade
                        ? 'bg-brand-500 hover:bg-brand-600 text-white'
                        : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {isUpgrade ? `Passer à ${cfg.label}` : `Rétrograder`}
                  </a>
                )}
              </div>
            );
          })}
        </div>

        {/* Contact */}
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-400 flex-1">
            Toute modification de plan est effective au prochain cycle de facturation.
          </p>
          <div className="flex items-center gap-4 text-sm">
            <a
              href="mailto:commercial@transpro.ci"
              className="flex items-center gap-1.5 text-brand-600 hover:text-brand-700 font-medium"
            >
              <Mail size={14} /> commercial@transpro.ci
            </a>
            <a
              href="tel:+2250000000000"
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700"
            >
              <Phone size={14} /> +225 XX XX XX XX
            </a>
          </div>
        </div>
      </div>

      {/* Subscription history */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Historique des abonnements</h2>
        </div>

        {historyLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={22} className="animate-spin text-gray-300" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">
            <CreditCard size={32} className="mx-auto mb-2 text-gray-200" />
            Aucun historique d'abonnement
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Période</th>
                  <th className="px-5 py-3 text-left font-medium">Plan</th>
                  <th className="px-5 py-3 text-left font-medium">Montant</th>
                  <th className="px-5 py-3 text-left font-medium">Statut</th>
                  <th className="px-5 py-3 text-left font-medium">Payé le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {history.map((sub) => {
                  const isFree = sub.amount === 0;
                  return (
                    <tr key={sub.id} className="hover:bg-gray-50 transition">
                      <td className="px-5 py-3 text-gray-700">
                        {dayjs(sub.startDate).format('D MMM YYYY')}
                        {' → '}
                        {dayjs(sub.endDate).format('D MMM YYYY')}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          PLAN_CONFIG[sub.plan as TenantPlan]?.color ?? 'bg-gray-100 text-gray-600'
                        }`}>
                          {PLAN_CONFIG[sub.plan as TenantPlan]?.label ?? sub.plan}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {isFree ? (
                          <span className="text-blue-600">Gratuit</span>
                        ) : (
                          formatCFA(sub.amount)
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          sub.isPaid
                            ? 'bg-green-100 text-green-700'
                            : isFree
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {sub.isPaid ? 'Payé' : isFree ? 'Essai' : 'En attente'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-500">
                        {sub.paidAt ? dayjs(sub.paidAt).format('D MMM YYYY') : '—'}
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
