'use client';

import Link from 'next/link';
import { Lock, Sparkles } from 'lucide-react';
import { ReactNode } from 'react';

interface PlanGateProps {
  /** Plans that have access to this feature. */
  requiredPlans: string[];
  /** Current tenant plan — if undefined, access is denied. */
  currentPlan?: string;
  children: ReactNode;
}

/**
 * Wraps content that requires a specific subscription plan.
 * Shows a locked overlay with upgrade CTA for users on lower plans.
 */
export function PlanGate({ requiredPlans, currentPlan, children }: PlanGateProps) {
  const hasAccess = currentPlan && requiredPlans.includes(currentPlan);

  if (hasAccess) return <>{children}</>;

  return (
    <div className="relative min-h-[400px]">
      {/* Blurred preview */}
      <div className="opacity-30 pointer-events-none select-none blur-[2px]" aria-hidden>
        {children}
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center max-w-sm mx-4">
          <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock size={24} className="text-brand-500" />
          </div>

          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Fonctionnalité réservée
          </h3>
          <p className="text-sm text-gray-500 mb-1">
            La gestion des colis est disponible à partir du plan
          </p>
          <p className="text-sm font-semibold text-brand-600 mb-6">
            {requiredPlans.join(' ou ')}
          </p>

          <Link
            href="/dashboard/subscription"
            className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition"
          >
            <Sparkles size={14} />
            Mettre à niveau
          </Link>

          <p className="text-xs text-gray-400 mt-4">
            Plan actuel : <span className="font-medium">{currentPlan ?? 'BASIC'}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
