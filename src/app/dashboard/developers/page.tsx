'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  KeyRound, Plus, Copy, Check, Trash2, Activity, Webhook,
  ShieldCheck, Eye, EyeOff, Loader2, AlertCircle, ExternalLink,
} from 'lucide-react';
import { apiConsumersApi, apiError } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { FormModal, FormField, Input, Select } from '@/components/ui';
import { toast } from 'sonner';
import { confirm } from '@/lib/confirm';

const PLANS = ['STARTER', 'BUSINESS', 'ENTERPRISE'] as const;
const PLAN_SCOPES: Record<string, string[]> = {
  STARTER: ['trips:read', 'stations:read', 'routes:read', 'parcels:read'],
  BUSINESS: ['trips:read', 'stations:read', 'routes:read', 'bookings:read', 'bookings:write', 'parcels:read', 'parcels:write'],
  ENTERPRISE: ['trips:read', 'stations:read', 'routes:read', 'bookings:read', 'bookings:write', 'parcels:read', 'parcels:write'],
};
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
            href={(process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3001') + '/developers'}
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

// ── Détail d'une intégration : clés, usage, webhooks ──────────────────────────
function ConsumerDetail({ consumerId }: { consumerId: string }) {
  const qc = useQueryClient();
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [keyEnv, setKeyEnv] = useState<'LIVE' | 'TEST'>('LIVE');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);

  const { data: consumer } = useQuery({
    queryKey: ['api-consumer', consumerId],
    queryFn: () => apiConsumersApi.get(consumerId) as any,
  });
  const { data: usage } = useQuery({
    queryKey: ['api-consumer-usage', consumerId],
    queryFn: () => apiConsumersApi.usage(consumerId) as any,
  });
  const { data: deliveries = [] } = useQuery({
    queryKey: ['api-consumer-webhooks', consumerId],
    queryFn: () => apiConsumersApi.webhooks(consumerId) as any,
    refetchInterval: 30_000,
  });

  const createKeyMut = useMutation({
    mutationFn: () => apiConsumersApi.createKey(consumerId, { name: keyName, environment: keyEnv }),
    onSuccess: (res: any) => {
      setNewKey(res?.key ?? null);
      setKeyName('');
      qc.invalidateQueries({ queryKey: ['api-consumer', consumerId] });
      qc.invalidateQueries({ queryKey: ['api-consumers'] });
    },
    onError: (e) => toast.error(apiError(e, 'Création de clé impossible')),
  });

  const revokeKeyMut = useMutation({
    mutationFn: (keyId: string) => apiConsumersApi.revokeKey(consumerId, keyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api-consumer', consumerId] });
      qc.invalidateQueries({ queryKey: ['api-consumers'] });
      toast.success('Clé révoquée');
    },
    onError: (e) => toast.error(apiError(e, 'Révocation impossible')),
  });

  const saveWebhookMut = useMutation({
    mutationFn: (url: string) => apiConsumersApi.update(consumerId, { webhookUrl: url }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api-consumer', consumerId] });
      toast.success('URL webhook enregistrée');
    },
    onError: (e) => toast.error(apiError(e, 'Enregistrement impossible')),
  });

  const requestProdMut = useMutation({
    mutationFn: () => apiConsumersApi.requestProduction(consumerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api-consumer', consumerId] });
      qc.invalidateQueries({ queryKey: ['api-consumers'] });
      toast.success('Demande d\'activation production envoyée');
    },
    onError: (e) => toast.error(apiError(e, 'Demande impossible')),
  });

  if (!consumer) {
    return <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">Chargement…</div>;
  }

  const keys = (consumer.keys ?? []) as any[];
  const quotaUsed = usage?.quota?.used ?? 0;
  const quotaLimit = usage?.quota?.limit ?? null;
  const quotaPct = quotaLimit ? Math.min(100, Math.round((quotaUsed / quotaLimit) * 100)) : 0;
  const effectiveWebhookUrl = webhookUrl ?? consumer.webhookUrl ?? '';
  const access = consumer.accessStatus ?? 'SANDBOX';
  const isApproved = access === 'APPROVED';

  async function confirmRevoke(keyId: string, name: string) {
    if (await confirm({ title: `Révoquer la clé "${name}" ?`, description: 'Les applications utilisant cette clé perdront immédiatement l\'accès.', variant: 'danger' })) {
      revokeKeyMut.mutate(keyId);
    }
  }

  return (
    <div className="space-y-5">
      {/* Statut d'accès (sandbox → production) */}
      <AccessBanner
        access={access}
        reason={consumer.prodRejectionReason}
        onRequest={() => requestProdMut.mutate()}
        requesting={requestProdMut.isPending}
      />

      {/* Usage / quota */}
      <Card icon={<Activity size={16} className="text-brand-500" />} title="Quota mensuel">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-500">{consumer.plan}</span>
          <span className="font-medium text-gray-900">
            {quotaUsed.toLocaleString()}{quotaLimit ? ` / ${quotaLimit.toLocaleString()}` : ' (illimité)'}
          </span>
        </div>
        {quotaLimit && (
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div className={`h-full rounded-full ${quotaPct > 90 ? 'bg-red-500' : quotaPct > 70 ? 'bg-orange-500' : 'bg-brand-500'}`} style={{ width: `${quotaPct}%` }} />
          </div>
        )}
        {usage?.topEndpoints?.length > 0 && (
          <div className="mt-4 space-y-1">
            <p className="text-xs font-medium text-gray-400 mb-1">Endpoints les plus appelés</p>
            {usage.topEndpoints.slice(0, 5).map((e: any) => (
              <div key={e.endpoint} className="flex items-center justify-between text-xs text-gray-600">
                <span className="font-mono truncate">{e.endpoint}</span>
                <span className="text-gray-400 ml-2 shrink-0">{e.count}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Clés API */}
      <Card
        icon={<KeyRound size={16} className="text-brand-500" />}
        title="Clés API"
        action={
          <button onClick={() => { setNewKey(null); setKeyEnv(isApproved ? 'LIVE' : 'TEST'); setShowKeyModal(true); }} className="text-xs font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1">
            <Plus size={13} /> Nouvelle clé
          </button>
        }
      >
        {keys.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">Aucune clé. Créez-en une pour commencer.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {keys.map((k) => {
              const revoked = !k.isActive || k.revokedAt;
              return (
                <div key={k.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 text-sm">{k.name}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${k.environment === 'TEST' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                        {k.environment === 'TEST' ? 'TEST' : 'LIVE'}
                      </span>
                      {revoked && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">Révoquée</span>}
                    </div>
                    <p className="font-mono text-xs text-gray-400 mt-0.5">{k.keyPrefix}••••••••</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {k.lastUsedAt ? `Utilisée le ${new Date(k.lastUsedAt).toLocaleDateString('fr-FR')}` : 'Jamais utilisée'}
                    </p>
                  </div>
                  {!revoked && (
                    <button onClick={() => confirmRevoke(k.id, k.name)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition shrink-0" title="Révoquer">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Webhooks */}
      <Card icon={<Webhook size={16} className="text-brand-500" />} title="Webhooks">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">URL de réception</label>
            <div className="flex gap-2">
              <Input value={effectiveWebhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://exemple.com/webhooks/transpro" />
              <button
                onClick={() => saveWebhookMut.mutate(effectiveWebhookUrl)}
                disabled={saveWebhookMut.isPending}
                className="px-3 py-2 text-sm font-semibold bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition disabled:opacity-50 shrink-0"
              >
                Enregistrer
              </button>
            </div>
          </div>

          {consumer.webhookSecret && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Secret de signature</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 truncate">
                  {showSecret ? consumer.webhookSecret : '•'.repeat(28)}
                </code>
                <button onClick={() => setShowSecret((s) => !s)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg" title={showSecret ? 'Masquer' : 'Afficher'}>
                  {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
                <CopyButton value={consumer.webhookSecret} />
              </div>
              <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                <AlertCircle size={11} /> Sert à vérifier la signature HMAC des appels reçus.
              </p>
            </div>
          )}

          {/* Livraisons récentes */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">Dernières livraisons</p>
            {deliveries.length === 0 ? (
              <p className="text-sm text-gray-400 py-1">Aucune livraison pour l'instant.</p>
            ) : (
              <div className="space-y-1 max-h-56 overflow-y-auto">
                {deliveries.slice(0, 15).map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50 last:border-0">
                    <div className="min-w-0">
                      <span className="font-mono text-gray-700">{d.event}</span>
                      <span className="text-gray-400 ml-2">{new Date(d.createdAt).toLocaleString('fr-FR')}</span>
                    </div>
                    <DeliveryBadge status={d.status} attempts={d.attempts} code={d.statusCode} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Modal nouvelle clé */}
      <FormModal
        isOpen={showKeyModal}
        onClose={() => setShowKeyModal(false)}
        title={newKey ? 'Clé créée' : 'Nouvelle clé API'}
        description={newKey ? undefined : 'Donnez un nom pour identifier cette clé.'}
      >
        {newKey ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-lg p-3">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>Copiez cette clé maintenant — elle ne sera plus jamais affichée.</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-xs bg-gray-900 text-green-300 rounded-lg px-3 py-2.5 break-all">{newKey}</code>
              <CopyButton value={newKey} />
            </div>
            <button onClick={() => setShowKeyModal(false)} className="w-full mt-1 px-4 py-2 text-sm font-semibold bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition">
              J'ai copié ma clé
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <FormField label="Nom de la clé" required>
              <Input value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="Production, Serveur backend…" autoFocus />
            </FormField>
            <FormField label="Environnement">
              <div className="grid grid-cols-2 gap-2">
                {(['TEST', 'LIVE'] as const).map((env) => {
                  const disabled = env === 'LIVE' && !isApproved;
                  return (
                    <button
                      key={env}
                      type="button"
                      disabled={disabled}
                      title={disabled ? 'Activez l\'accès production pour créer des clés LIVE' : undefined}
                      onClick={() => setKeyEnv(env)}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold border transition ${
                        disabled
                          ? 'border-gray-100 text-gray-300 cursor-not-allowed bg-gray-50'
                          : keyEnv === env
                            ? env === 'TEST' ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-blue-400 bg-blue-50 text-blue-700'
                            : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {env === 'TEST' ? 'Test (sandbox)' : 'Production'}
                      <span className="block text-[10px] font-mono font-normal opacity-70">
                        {env === 'TEST' ? 'tpk_test_…' : disabled ? 'verrouillé' : 'tpk_live_…'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </FormField>
            <p className="text-xs text-gray-400">
              {keyEnv === 'TEST'
                ? 'Les clés de test ne décomptent pas le quota ; les réservations renvoient une réponse simulée (sans persistance).'
                : <>Cette clé héritera des scopes de votre plan ({consumer.plan}) : <span className="font-mono">{(PLAN_SCOPES[consumer.plan] ?? []).join(', ')}</span>.</>}
            </p>
            <button
              onClick={() => keyName.trim() && createKeyMut.mutate()}
              disabled={!keyName.trim() || createKeyMut.isPending}
              className="w-full px-4 py-2 text-sm font-semibold bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {createKeyMut.isPending && <Loader2 size={14} className="animate-spin" />} Générer la clé
            </button>
          </div>
        )}
      </FormModal>
    </div>
  );
}

// ── Petits composants ─────────────────────────────────────────────────────────
function Card({ icon, title, action, children }: { icon: React.ReactNode; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function AccessBanner({ access, reason, onRequest, requesting }: { access: string; reason?: string | null; onRequest: () => void; requesting: boolean }) {
  const cfg: Record<string, { bg: string; text: string; title: string; desc: string; canRequest: boolean }> = {
    SANDBOX: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', title: 'Mode sandbox', desc: 'Seules les clés de test (tpk_test_) sont disponibles. Demandez l\'activation production pour générer des clés LIVE.', canRequest: true },
    PENDING: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', title: 'Activation en cours de validation', desc: 'Votre demande d\'accès production est en attente de validation par un administrateur.', canRequest: false },
    APPROVED: { bg: 'bg-green-50 border-green-200', text: 'text-green-800', title: 'Production activée', desc: 'Vous pouvez générer des clés LIVE (tpk_live_).', canRequest: false },
    REJECTED: { bg: 'bg-red-50 border-red-200', text: 'text-red-800', title: 'Demande refusée', desc: reason || 'Votre demande d\'activation production a été refusée.', canRequest: true },
  };
  const c = cfg[access] ?? cfg.SANDBOX;
  return (
    <div className={`rounded-2xl border p-4 flex items-start justify-between gap-4 ${c.bg}`}>
      <div className="flex items-start gap-2.5">
        <ShieldCheck size={18} className={`${c.text} shrink-0 mt-0.5`} />
        <div>
          <p className={`text-sm font-semibold ${c.text}`}>{c.title}</p>
          <p className={`text-xs mt-0.5 ${c.text} opacity-80`}>{c.desc}</p>
        </div>
      </div>
      {c.canRequest && (
        <button
          onClick={onRequest}
          disabled={requesting}
          className="shrink-0 px-3 py-2 text-xs font-semibold bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          {requesting && <Loader2 size={12} className="animate-spin" />}
          {access === 'REJECTED' ? 'Refaire une demande' : 'Demander l\'activation production'}
        </button>
      )}
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

function DeliveryBadge({ status, attempts, code }: { status: string; attempts: number; code?: number | null }) {
  const map: Record<string, string> = {
    DELIVERED: 'bg-green-100 text-green-700',
    PENDING: 'bg-amber-100 text-amber-700',
    FAILED: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${map[status] ?? map.PENDING}`}>
      {status}{code ? ` · ${code}` : ''}{attempts > 1 ? ` · ${attempts}×` : ''}
    </span>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-2 text-gray-400 hover:text-brand-600 rounded-lg shrink-0"
      title="Copier"
    >
      {copied ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
    </button>
  );
}
