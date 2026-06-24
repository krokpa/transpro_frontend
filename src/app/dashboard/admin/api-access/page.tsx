'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Check, X, Clock, Loader2 } from 'lucide-react';
import { apiConsumersApi, apiError } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';

interface Consumer {
  id: string;
  name: string;
  email: string;
  companyName?: string | null;
  plan: string;
  accessStatus: string;
  prodRequestedAt?: string | null;
  prodRejectionReason?: string | null;
  tenantId?: string | null;
}

const STATUS_STYLE: Record<string, string> = {
  SANDBOX: 'bg-amber-100 text-amber-700',
  PENDING: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

export default function ApiAccessReviewPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  if (user?.role !== 'SUPER_ADMIN') {
    router.replace('/dashboard');
    return null;
  }

  const { data: raw = [], isLoading } = useQuery({
    queryKey: ['admin-api-consumers'],
    queryFn: () => apiConsumersApi.list() as any,
    staleTime: 15_000,
  });
  const consumers: Consumer[] = Array.isArray(raw) ? raw : [];

  const reviewMut = useMutation({
    mutationFn: ({ id, approve, reason }: { id: string; approve: boolean; reason?: string }) =>
      apiConsumersApi.reviewProduction(id, approve, reason),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['admin-api-consumers'] });
      toast.success(v.approve ? 'Accès production approuvé' : 'Demande rejetée');
    },
    onError: (e) => toast.error(apiError(e, 'Action impossible')),
  });

  function reject(id: string) {
    const reason = window.prompt('Motif du refus (optionnel) :') ?? undefined;
    reviewMut.mutate({ id, approve: false, reason });
  }

  const pending = consumers.filter((c) => c.accessStatus === 'PENDING');
  const others = consumers.filter((c) => c.accessStatus !== 'PENDING');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Accès API — Validation production</h1>
        <p className="text-sm text-gray-500 mt-1">
          Approuvez ou rejetez les demandes d'activation production des intégrations tierces.
        </p>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">Chargement…</div>
      ) : (
        <>
          {/* En attente */}
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Clock size={15} className="text-blue-500" /> En attente ({pending.length})
            </h2>
            {pending.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
                Aucune demande en attente.
              </div>
            ) : (
              <div className="space-y-2">
                {pending.map((c) => (
                  <div key={c.id} className="bg-white rounded-xl border border-blue-200 p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{c.name}</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{c.plan}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{c.email}{c.companyName ? ` · ${c.companyName}` : ''}</p>
                      {c.prodRequestedAt && (
                        <p className="text-[11px] text-gray-400 mt-0.5">Demandé le {new Date(c.prodRequestedAt).toLocaleDateString('fr-FR')}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => reviewMut.mutate({ id: c.id, approve: true })}
                        disabled={reviewMut.isPending}
                        className="px-3 py-2 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50 inline-flex items-center gap-1.5"
                      >
                        <Check size={14} /> Approuver
                      </button>
                      <button
                        onClick={() => reject(c.id)}
                        disabled={reviewMut.isPending}
                        className="px-3 py-2 text-xs font-semibold bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50 inline-flex items-center gap-1.5"
                      >
                        <X size={14} /> Rejeter
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Toutes les intégrations */}
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <ShieldCheck size={15} className="text-gray-400" /> Toutes les intégrations ({others.length})
            </h2>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left">
                    <th className="px-4 py-3 font-semibold text-gray-600">Intégration</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Plan</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Statut</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {others.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">{c.name}</span>
                        <span className="block text-xs text-gray-400">{c.email}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{c.plan}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_STYLE[c.accessStatus] ?? STATUS_STYLE.SANDBOX}`}>
                          {c.accessStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {c.accessStatus === 'APPROVED' ? (
                          <button onClick={() => reject(c.id)} className="text-xs font-medium text-red-500 hover:text-red-700">Révoquer</button>
                        ) : c.accessStatus === 'REJECTED' ? (
                          <button onClick={() => reviewMut.mutate({ id: c.id, approve: true })} className="text-xs font-medium text-green-600 hover:text-green-700">Approuver</button>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  ))}
                  {others.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Aucune intégration.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
