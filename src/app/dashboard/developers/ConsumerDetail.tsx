'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  KeyRound, Plus, Copy, Check, Trash2, Activity, Webhook,
  ShieldCheck, Eye, EyeOff, Loader2, AlertCircle, RotateCw, Download,
} from 'lucide-react';
import { apiConsumersApi, apiError } from '@/lib/api';
import { FormModal, FormField, Input } from '@/components/ui';
import { toast } from 'sonner';
import { confirm } from '@/lib/confirm';

const BASE_READ = ['trips:read', 'stations:read', 'routes:read', 'cities:read', 'companies:read', 'schedules:read', 'ratings:read', 'promotions:read', 'parcels:read'];
const PLAN_SCOPES: Record<string, string[]> = {
  STARTER: BASE_READ,
  BUSINESS: [...BASE_READ, 'bookings:read', 'bookings:write', 'parcels:write'],
  ENTERPRISE: [...BASE_READ, 'bookings:read', 'bookings:write', 'parcels:write'],
};
const PLAN_QUOTA: Record<string, string> = {
  STARTER: '5 000 req/mois',
  BUSINESS: '50 000 req/mois',
  ENTERPRISE: 'Illimité',
};
const PLAN_PRICE: Record<string, number> = { STARTER: 0, BUSINESS: 50_000, ENTERPRISE: 200_000 };

// ── Détail d'une intégration : clés, usage, webhooks ──────────────────────────
export function ConsumerDetail({ consumerId, wide = false }: { consumerId: string; wide?: boolean }) {
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
  const { data: invoices = [] } = useQuery({
    queryKey: ['api-consumer-invoices', consumerId],
    queryFn: () => apiConsumersApi.invoices(consumerId) as any,
  });

  async function downloadInvoice(paymentId: string) {
    try {
      const blob = (await apiConsumersApi.downloadInvoice(consumerId, paymentId)) as any as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `facture-${paymentId.slice(-8)}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(apiError(e, 'Téléchargement impossible'));
    }
  }

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

  const rotateKeyMut = useMutation({
    mutationFn: (keyId: string) => apiConsumersApi.rotateKey(consumerId, keyId),
    onSuccess: (res: any) => {
      setNewKey(res?.key ?? null);
      setShowKeyModal(true);
      qc.invalidateQueries({ queryKey: ['api-consumer', consumerId] });
      toast.success('Clé renouvelée — l\'ancienne reste valable 24 h');
    },
    onError: (e) => toast.error(apiError(e, 'Rotation impossible')),
  });

  const regenSecretMut = useMutation({
    mutationFn: () => apiConsumersApi.regenerateWebhookSecret(consumerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api-consumer', consumerId] });
      toast.success('Secret de signature régénéré');
    },
    onError: (e) => toast.error(apiError(e, 'Régénération impossible')),
  });

  const resendMut = useMutation({
    mutationFn: (deliveryId: string) => apiConsumersApi.resendWebhook(consumerId, deliveryId),
    onSuccess: () => {
      setTimeout(() => qc.invalidateQueries({ queryKey: ['api-consumer-webhooks', consumerId] }), 1200);
      toast.success('Livraison relancée');
    },
    onError: (e) => toast.error(apiError(e, 'Relance impossible')),
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

  const subscribeMut = useMutation({
    mutationFn: (plan: string) => apiConsumersApi.subscribePlan(consumerId, plan),
    onSuccess: (res: any) => {
      if (res?.checkoutUrl) {
        toast.info('Redirection vers le paiement…');
        window.location.href = res.checkoutUrl;
        return;
      }
      qc.invalidateQueries({ queryKey: ['api-consumer', consumerId] });
      qc.invalidateQueries({ queryKey: ['api-consumers'] });
      toast.success('Plan mis à jour');
    },
    onError: (e) => toast.error(apiError(e, 'Changement de plan impossible')),
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

  const banner = (
    <AccessBanner
      access={access}
      reason={consumer.prodRejectionReason}
      onRequest={() => requestProdMut.mutate()}
      requesting={requestProdMut.isPending}
    />
  );

  const quotaCard = (
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
      {usage?.byDay?.length > 0 && <UsageChart data={usage.byDay} />}
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
  );

  const planCard = (
    <Card icon={<ShieldCheck size={16} className="text-brand-500" />} title="Plan & facturation">
      {consumer.planExpiresAt && (
        <p className="text-xs text-gray-500 mb-3">
          Plan actif jusqu'au {new Date(consumer.planExpiresAt).toLocaleDateString('fr-FR')}.
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {(['STARTER', 'BUSINESS', 'ENTERPRISE'] as const).map((plan) => {
          const current = consumer.plan === plan;
          return (
            <div key={plan} className={`rounded-xl border p-3 ${current ? 'border-brand-400 bg-brand-50' : 'border-gray-200'}`}>
              <p className="font-semibold text-gray-900 text-sm">{plan.charAt(0) + plan.slice(1).toLowerCase()}</p>
              <p className="text-xs text-gray-500 mt-0.5">{PLAN_QUOTA[plan]}</p>
              <p className="text-sm font-bold text-gray-900 mt-2">
                {PLAN_PRICE[plan] === 0 ? 'Gratuit' : `${PLAN_PRICE[plan].toLocaleString('fr-FR')} F`}
                {PLAN_PRICE[plan] > 0 && <span className="text-[11px] font-normal text-gray-400">/mois</span>}
              </p>
              {current ? (
                <span className="mt-2 block text-center text-[11px] font-semibold text-brand-600">Plan actuel</span>
              ) : (
                <button
                  onClick={() => subscribeMut.mutate(plan)}
                  disabled={subscribeMut.isPending}
                  className="mt-2 w-full px-2 py-1.5 text-xs font-semibold bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition disabled:opacity-50"
                >
                  {PLAN_PRICE[plan] === 0 ? 'Rétrograder' : 'Choisir'}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-gray-400 mt-2">Paiement sécurisé via Genius Pay. Renouvellement mensuel.</p>

      {invoices.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-400 mb-2">Factures</p>
          <div className="space-y-1">
            {invoices.slice(0, 6).map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between text-xs">
                <span className="text-gray-600">
                  {inv.plan} · {new Date(inv.paidAt).toLocaleDateString('fr-FR')} · {Number(inv.amount).toLocaleString('fr-FR')} F
                </span>
                <button onClick={() => downloadInvoice(inv.id)} className="text-brand-600 hover:text-brand-700 font-medium inline-flex items-center gap-1">
                  <Download size={12} /> PDF
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );

  const keysCard = (
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
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => rotateKeyMut.mutate(k.id)} disabled={rotateKeyMut.isPending} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition disabled:opacity-50" title="Faire tourner (l'ancienne reste valable 24 h)">
                      <RotateCw size={15} />
                    </button>
                    <button onClick={() => confirmRevoke(k.id, k.name)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Révoquer">
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );

  const webhooksCard = (
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
              <button
                onClick={async () => {
                  if (await confirm({ title: 'Régénérer le secret ?', description: 'L\'ancien secret cessera immédiatement d\'être valide pour vérifier les signatures.', variant: 'danger' })) {
                    regenSecretMut.mutate();
                  }
                }}
                disabled={regenSecretMut.isPending}
                className="p-2 text-gray-400 hover:text-brand-600 rounded-lg disabled:opacity-50"
                title="Régénérer le secret"
              >
                <RotateCw size={15} />
              </button>
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
                  <div className="flex items-center gap-1.5 shrink-0">
                    <DeliveryBadge status={d.status} attempts={d.attempts} code={d.statusCode} />
                    {d.status !== 'DELIVERED' && (
                      <button
                        onClick={() => resendMut.mutate(d.id)}
                        disabled={resendMut.isPending}
                        className="p-1 text-gray-400 hover:text-brand-600 rounded disabled:opacity-50"
                        title="Relancer cette livraison"
                      >
                        <RotateCw size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );

  const keyModal = (
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
  );

  // Layout empilé (par défaut — utilisé dans la colonne étroite du dashboard compagnie).
  if (!wide) {
    return (
      <div className="space-y-5">
        {banner}
        {quotaCard}
        {planCard}
        {keysCard}
        {webhooksCard}
        {keyModal}
      </div>
    );
  }

  // Layout pleine largeur (espace développeur) : contenu principal + rail latéral.
  return (
    <div className="space-y-5">
      {banner}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 space-y-5">
          {keysCard}
          {webhooksCard}
        </div>
        <div className="space-y-5 lg:sticky lg:top-20">
          {quotaCard}
          {planCard}
        </div>
      </div>
      {keyModal}
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

function UsageChart({ data }: { data: Array<{ day: string; count: number }> }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const recent = data.slice(-30);
  return (
    <div className="mt-4">
      <p className="text-xs font-medium text-gray-400 mb-2">Requêtes / jour (30 j)</p>
      <div className="flex items-end gap-[3px] h-20">
        {recent.map((d) => (
          <div
            key={d.day}
            className="flex-1 bg-brand-200 hover:bg-brand-400 rounded-t transition-colors"
            style={{ height: `${Math.max(4, Math.round((d.count / max) * 100))}%` }}
            title={`${new Date(d.day).toLocaleDateString('fr-FR')} — ${d.count} req`}
          />
        ))}
      </div>
    </div>
  );
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
