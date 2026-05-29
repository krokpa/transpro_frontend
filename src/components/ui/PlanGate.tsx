'use client';

import Link from 'next/link';
import { Lock, Sparkles } from 'lucide-react';
import { ReactNode } from 'react';

const PLAN_LABELS: Record<string, string> = {
  BASIC: 'Basique',
  PROFESSIONAL: 'Professionnel',
  ENTERPRISE: 'Entreprise',
};

interface PlanGateProps {
  requiredPlans: string[];
  currentPlan?: string;
  featureLabel?: string;
  children: ReactNode;
}

export function PlanGate({ requiredPlans, currentPlan, featureLabel, children }: PlanGateProps) {
  const hasAccess = currentPlan && requiredPlans.includes(currentPlan);
  if (hasAccess) return <>{children}</>;

  const planNames = requiredPlans.map((p) => PLAN_LABELS[p] ?? p).join(' ou ');

  return (
    <div className="relative min-h-[400px]">
      <div className="opacity-25 pointer-events-none select-none blur-sm" aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center max-w-sm mx-4">
          <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock size={24} className="text-brand-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Fonctionnalité réservée</h3>
          <p className="text-sm text-gray-500 mb-1">
            {featureLabel ?? 'Cette fonctionnalité'} est disponible à partir du plan
          </p>
          <p className="text-sm font-semibold text-brand-600 mb-6">{planNames}</p>
          <Link
            href="/dashboard/subscription"
            className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition"
          >
            <Sparkles size={14} />
            Mettre à niveau
          </Link>
          <p className="text-xs text-gray-400 mt-4">
            Plan actuel : <span className="font-medium">{PLAN_LABELS[currentPlan ?? ''] ?? currentPlan ?? 'Basique'}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
