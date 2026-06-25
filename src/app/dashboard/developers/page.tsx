'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { KeyRound, Plus, ShieldCheck, Loader2, ExternalLink } from 'lucide-react';
import { apiConsumersApi, apiError } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { FormModal, FormField, Input, Select } from '@/components/ui';
import { toast } from 'sonner';
import { ConsumerDetail } from './ConsumerDetail';

const PLANS = ['STARTER', 'BUSINESS', 'ENTERPRISE'] as const;
const PLAN_QUOTA: Record<string, string> = {
  STARTER: '5 000 req/mois',
  BUSINESS: '50 000 req/mois',
  ENTERPRISE: 'Illimité',
};

interface Consumer {
  id: string;
  name: string;
  email: string;
  plan: string;
  status: string;
  webhookUrl?: string | null;
  _count?: { keys: number };
  createdAt: string;
}

export default function DevelopersPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', plan: 'STARTER', webhookUrl: '' });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Retour de paiement Genius Pay (?billing=success|error).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const billing = params.get('billing');
    if (!billing) return;
    if (billing === 'success') {
      toast.success('Paiement reçu — votre plan sera activé sous peu.');
      qc.invalidateQueries({ queryKey: ['api-consumers'] });
      qc.invalidateQueries({ queryKey: ['api-consumer'] });
    } else if (billing === 'error') {
      toast.error('Le paiement a échoué ou a été annulé.');
    }
    window.history.replaceState({}, '', '/dashboard/developers');
  }, [qc]);

  if (user?.role === 'DEVELOPER') {
    router.replace(`/developer/console${typeof window !== 'undefined' ? window.location.search : ''}`);
    return null;
  }
  if (user?.role !== 'COMPANY_OWNER') {
    router.replace('/dashboard');
    return null;
  }

  const { data: rawConsumers = [], isLoading } = useQuery({
    queryKey: ['api-consumers'],
    queryFn: () => apiConsumersApi.list() as any,
    staleTime: 30_000,
  });
  const consumers: Consumer[] = Array.isArray(rawConsumers) ? rawConsumers : [];

  const createMut = useMutation({
    mutationFn: (data: typeof form) =>
      apiConsumersApi.create({
        name: data.name,
        email: data.email,
        plan: data.plan,
        webhookUrl: data.webhookUrl || undefined,
      }),
    onSuccess: (created: any) => {
      qc.invalidateQueries({ queryKey: ['api-consumers'] });
      setShowCreate(false);
      setForm({ name: '', email: '', plan: 'STARTER', webhookUrl: '' });
      setSelectedId(created?.id ?? null);
      toast.success('Intégration créée');
    },
    onError: (e) => toast.error(apiError(e, 'Création impossible')),
  });

  function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    createMut.mutate(form);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API & Webhooks</h1>
          <p className="text-sm text-gray-500 mt-1">
            Intégrez TransPro à vos applications : recherche de voyages, réservations, suivi de colis.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/developer/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition"
          >
            <ExternalLink size={15} /> Documentation
          </a>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm"
          >
            <Plus size={16} /> Nouvelle intégration
          </button>
        </div>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">Chargement…</div>
      ) : consumers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-4">
            <KeyRound size={26} className="text-brand-500" />
          </div>
          <p className="text-gray-900 font-semibold">Aucune intégration</p>
          <p className="text-sm text-gray-500 mt-1 mb-5">
            Créez une intégration pour obtenir des clés API et recevoir des webhooks.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition"
          >
            <Plus size={16} /> Créer ma première intégration
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Liste des intégrations */}
          <div className="space-y-2 lg:col-span-1">
            {consumers.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-left bg-white rounded-xl border p-4 transition ${
                  selectedId === c.id ? 'border-brand-400 ring-1 ring-brand-200' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">{c.name}</span>
                  <StatusBadge status={c.status} />
                </div>
                <p className="text-xs text-gray-500 mt-1">{c.email}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  <span className="inline-flex items-center gap-1"><ShieldCheck size={12} /> {c.plan}</span>
                  <span className="inline-flex items-center gap-1"><KeyRound size={12} /> {c._count?.keys ?? 0} clé(s)</span>
                </div>
              </button>
            ))}
          </div>

          {/* Détail */}
          <div className="lg:col-span-2">
            {selectedId ? (
              <ConsumerDetail consumerId={selectedId} />
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
                Sélectionnez une intégration pour gérer ses clés et webhooks.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal création */}
      <FormModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Nouvelle intégration API"
        description="Donnez un nom à votre application et choisissez un plan."
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition">
              Annuler
            </button>
            <button
              onClick={submitCreate}
              disabled={createMut.isPending}
              className="px-4 py-2 text-sm font-semibold bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition disabled:opacity-50 inline-flex items-center gap-2"
            >
              {createMut.isPending && <Loader2 size={14} className="animate-spin" />} Créer
            </button>
          </div>
        }
      >
        <form onSubmit={submitCreate} className="space-y-4">
          <FormField label="Nom de l'application" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mon agrégateur de voyages" />
          </FormField>
          <FormField label="Email de contact" required>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="dev@exemple.com" />
          </FormField>
          <FormField label="Plan">
            <Select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>
              {PLANS.map((p) => <option key={p} value={p}>{p} — {PLAN_QUOTA[p]}</option>)}
            </Select>
          </FormField>
          <FormField label="URL Webhook (optionnel)">
            <Input value={form.webhookUrl} onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })} placeholder="https://exemple.com/webhooks/transpro" />
          </FormField>
        </form>
      </FormModal>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700',
    SUSPENDED: 'bg-orange-100 text-orange-700',
    CANCELLED: 'bg-gray-100 text-gray-500',
  };
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${map[status] ?? map.CANCELLED}`}>{status}</span>;
}
