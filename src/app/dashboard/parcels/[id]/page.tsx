'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { parcelsApi } from '@/lib/api';
import 'dayjs/locale/fr';
import { formatCFA } from '@transpro/shared';
import {
  ArrowLeft, Package, ChevronRight, Loader2, Check,
  Phone, MapPin, Scale, AlertCircle, User, Truck, Home, X, Camera,
} from 'lucide-react';
import { PhotoGallery } from '@/components/ui/photo-gallery';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

dayjs.locale('fr');

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  PENDING:    { label: 'En attente',      color: '#6B7280', bg: '#F3F4F6', icon: Package },
  COLLECTED:  { label: 'Pris en charge',  color: '#3B82F6', bg: '#EFF6FF', icon: Package },
  IN_TRANSIT: { label: 'En transit',      color: '#8B5CF6', bg: '#F5F3FF', icon: Truck },
  ARRIVED:    { label: 'Arrivé',          color: '#F59E0B', bg: '#FFFBEB', icon: MapPin },
  DELIVERING: { label: 'En livraison',    color: '#EA580C', bg: '#FFF7ED', icon: Home },
  DELIVERED:  { label: 'Livré ✓',         color: '#16A34A', bg: '#F0FDF4', icon: Check },
  RETURNED:   { label: 'Retourné',        color: '#EF4444', bg: '#FEF2F2', icon: ArrowLeft },
};

const DR_STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:   { label: 'En attente',   color: '#6B7280', bg: '#F3F4F6' },
  ASSIGNED:  { label: 'Assigné',      color: '#3B82F6', bg: '#EFF6FF' },
  EN_ROUTE:  { label: 'En chemin',    color: '#EA580C', bg: '#FFF7ED' },
  DELIVERED: { label: 'Livré',        color: '#16A34A', bg: '#F0FDF4' },
  FAILED:    { label: 'Échec',        color: '#EF4444', bg: '#FEF2F2' },
  CANCELLED: { label: 'Annulé',       color: '#6B7280', bg: '#F3F4F6' },
};

const STEPS = ['PENDING', 'COLLECTED', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED'];

const TRANSITIONS: Record<string, string[]> = {
  PENDING:    ['COLLECTED', 'RETURNED'],
  COLLECTED:  ['IN_TRANSIT', 'RETURNED'],
  IN_TRANSIT: ['ARRIVED', 'RETURNED'],
  ARRIVED:    ['DELIVERING', 'DELIVERED', 'RETURNED'],
  DELIVERING: ['DELIVERED', 'ARRIVED', 'RETURNED'],
  DELIVERED:  [],
  RETURNED:   [],
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ParcelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const qc      = useQueryClient();
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [nextStatus, setNextStatus]           = useState('');
  const [notes, setNotes]                     = useState('');

  const [showDrModal, setShowDrModal] = useState(false);
  const [drAction,    setDrAction]    = useState('');
  const [drNotes,     setDrNotes]     = useState('');
  const [drFee,       setDrFee]       = useState('');

  const { data: parcel, isLoading, error } = useQuery({
    queryKey: ['parcel', id],
    queryFn: () => parcelsApi.get(id) as any,
  });

  const { data: deliveryRequest, refetch: refetchDr } = useQuery({
    queryKey: ['parcel-dr', id],
    queryFn: () => parcelsApi.getDeliveryRequest(id).catch(() => null) as any,
    enabled: !!id,
  });

  const drMutation = useMutation({
    mutationFn: ({ reqId, data }: { reqId: string; data: any }) =>
      parcelsApi.updateDeliveryRequest(reqId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parcel', id] });
      qc.invalidateQueries({ queryKey: ['parcel-dr', id] });
      qc.invalidateQueries({ queryKey: ['delivery-requests'] });
      toast.success('Demande de livraison mise à jour');
      setShowDrModal(false);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? 'Erreur'),
  });

  const statusMutation = useMutation({
    mutationFn: (data: { status: string; notes?: string }) =>
      parcelsApi.updateStatus(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parcel', id] });
      qc.invalidateQueries({ queryKey: ['parcels'] });
      toast.success('Statut mis à jour');
      setShowStatusModal(false);
      setNotes('');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? 'Erreur lors de la mise à jour'),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 size={28} className="animate-spin text-gray-400" />
    </div>
  );

  if (error || !parcel) return (
    <div className="text-center py-16">
      <p className="text-gray-500">Colis introuvable</p>
      <button onClick={() => router.back()} className="mt-3 text-sm text-brand-500 hover:underline">
        Retour
      </button>
    </div>
  );

  const p      = parcel as any;
  const status = p.status as string;
  const cfg    = STATUS_CFG[status] ?? STATUS_CFG['PENDING'];
  const nextAllowed = TRANSITIONS[status] ?? [];
  const currentStepIdx = STEPS.indexOf(status);

  function openStatusModal(s: string) {
    setNextStatus(s);
    setNotes('');
    setShowStatusModal(true);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <button
        onClick={() => router.push('/dashboard/parcels')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
      >
        <ArrowLeft size={15} /> Retour aux colis
      </button>

      {/* Header card */}
      <div
        className="rounded-2xl p-6 border"
        style={{ backgroundColor: cfg.bg, borderColor: `${cfg.color}30` }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ color: cfg.color, backgroundColor: `${cfg.color}18` }}
              >
                {cfg.label}
              </span>
              {p.fragile && (
                <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertCircle size={10} /> Fragile
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-gray-900 font-mono tracking-wide">
              {p.trackingCode}
            </h1>
            <p className="text-sm text-gray-500 mt-1">{p.description}</p>
          </div>

          {nextAllowed.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {nextAllowed.filter((s: string) => s !== 'RETURNED').map((s: string) => (
                <button
                  key={s}
                  onClick={() => openStatusModal(s)}
                  className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-brand-400 text-sm font-medium px-3 py-1.5 rounded-lg transition shadow-sm"
                  style={{ color: STATUS_CFG[s]?.color }}
                >
                  <ChevronRight size={14} />
                  {STATUS_CFG[s]?.label ?? s}
                </button>
              ))}
              {nextAllowed.includes('RETURNED') && (
                <button
                  onClick={() => openStatusModal('RETURNED')}
                  className="flex items-center gap-1.5 bg-white border border-red-200 hover:border-red-400 text-red-500 text-sm font-medium px-3 py-1.5 rounded-lg transition shadow-sm"
                >
                  Retourner
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stepper */}
      {status !== 'RETURNED' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-500 mb-4">Progression</h2>
          <div className="flex items-center gap-0">
            {STEPS.map((step, i) => {
              const stepCfg  = STATUS_CFG[step]!;
              const isDone   = i < currentStepIdx;
              const isCurrent = i === currentStepIdx;
              const isPending = i > currentStepIdx;
              return (
                <div key={step} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all"
                      style={{
                        borderColor: isDone || isCurrent ? stepCfg.color : '#E5E7EB',
                        backgroundColor: isCurrent ? stepCfg.color : isDone ? `${stepCfg.color}18` : '#F9FAFB',
                      }}
                    >
                      {isDone ? (
                        <Check size={16} style={{ color: stepCfg.color }} />
                      ) : isCurrent ? (
                        <stepCfg.icon size={16} className="text-white" />
                      ) : (
                        <stepCfg.icon size={14} className="text-gray-300" />
                      )}
                    </div>
                    <span
                      className="text-[10px] font-medium text-center leading-tight max-w-[64px]"
                      style={{ color: isPending ? '#9CA3AF' : stepCfg.color }}
                    >
                      {stepCfg.label.split(' ')[0]}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className="flex-1 h-0.5 mx-1 mb-5"
                      style={{ backgroundColor: i < currentStepIdx ? STATUS_CFG[STEPS[i]]?.color : '#E5E7EB' }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Two-column detail */}
      <div className="grid grid-cols-2 gap-4">
        {/* Expéditeur */}
        <InfoCard title="Expéditeur" icon={User}>
          <InfoRow label="Nom"       value={p.senderName} />
          <InfoRow label="Téléphone" value={p.senderPhone} />
          {p.senderEmail && <InfoRow label="Email" value={p.senderEmail} />}
          {p.sender && (
            <InfoRow label="Compte" value="Passager enregistré" className="text-brand-600" />
          )}
        </InfoCard>

        {/* Destinataire */}
        <InfoCard title="Destinataire" icon={MapPin}>
          <InfoRow label="Nom"       value={p.recipientName} />
          <InfoRow label="Téléphone" value={p.recipientPhone} />
          <InfoRow label="Destination" value={p.deliveryCity} />
        </InfoCard>

        {/* Colis */}
        <InfoCard title="Colis" icon={Scale}>
          <InfoRow label="Description" value={p.description} />
          <InfoRow label="Poids"       value={`${p.weightKg} kg`} />
          {p.declaredValue && <InfoRow label="Valeur déclarée" value={formatCFA(p.declaredValue)} />}
          <InfoRow label="Fragile"     value={p.fragile ? '⚠️ Oui' : 'Non'} />
        </InfoCard>

        {/* Paiement */}
        <InfoCard title="Frais & paiement" icon={Package}>
          <InfoRow label="Frais"   value={formatCFA(p.fee)} />
          <InfoRow
            label="Statut paiement"
            value={p.isPaid ? 'Payé ✓' : 'Non payé'}
            className={p.isPaid ? 'text-green-600 font-semibold' : 'text-amber-600'}
          />
          {p.paymentMethod && <InfoRow label="Méthode" value={p.paymentMethod} />}
        </InfoCard>

        {/* Voyage */}
        {p.trip && (
          <InfoCard title="Voyage" icon={Truck}>
            <InfoRow label="Route"   value={p.trip.route?.name ?? '—'} />
            <InfoRow label="Départ"  value={dayjs(p.trip.departureAt).format('D MMM YYYY, HH[h]mm')} />
            <InfoRow label="Statut"  value={p.trip.status} />
            {p.station && <InfoRow label="Gare" value={p.station.name} />}
          </InfoCard>
        )}

        {/* Historique */}
        <InfoCard title="Historique" icon={Check}>
          <InfoRow label="Enregistré"    value={dayjs(p.createdAt).format('D MMM YYYY HH:mm')} />
          {p.collectedAt && <InfoRow label="Pris en charge" value={dayjs(p.collectedAt).format('D MMM YYYY HH:mm')} />}
          {p.departedAt  && <InfoRow label="En transit"     value={dayjs(p.departedAt).format('D MMM YYYY HH:mm')} />}
          {p.arrivedAt   && <InfoRow label="Arrivé"         value={dayjs(p.arrivedAt).format('D MMM YYYY HH:mm')} />}
          {p.deliveredAt && <InfoRow label="Livré"          value={dayjs(p.deliveredAt).format('D MMM YYYY HH:mm')} className="text-green-600 font-semibold" />}
          {p.returnedAt  && <InfoRow label="Retourné"       value={dayjs(p.returnedAt).format('D MMM YYYY HH:mm')} className="text-red-500" />}
        </InfoCard>
      </div>

      {p.notes && (
        <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</p>
          <p className="text-sm text-gray-700">{p.notes}</p>
        </div>
      )}

      {/* Photos prises par l'agent */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Camera size={15} className="text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-500">
            Photos du colis
            {(p.photos?.length ?? 0) > 0 && (
              <span className="ml-2 text-xs text-gray-400 font-normal">
                {p.photos.length} photo{p.photos.length > 1 ? 's' : ''} prise{p.photos.length > 1 ? 's' : ''} par l&apos;agent
              </span>
            )}
          </h2>
        </div>
        <PhotoGallery
          photos={p.photos ?? []}
          label="Photo colis"
          emptyMessage="Aucune photo prise par l'agent"
        />
      </div>

      {/* Delivery request card */}
      {deliveryRequest && (() => {
        const dr = deliveryRequest as any;
        const drCfg = DR_STATUS_CFG[dr.status] ?? DR_STATUS_CFG['PENDING'];
        const drNext: Record<string, string[]> = {
          PENDING:   ['ASSIGNED', 'CANCELLED'],
          ASSIGNED:  ['EN_ROUTE', 'CANCELLED'],
          EN_ROUTE:  ['DELIVERED', 'FAILED'],
          DELIVERED: [],
          FAILED:    ['EN_ROUTE'],
          CANCELLED: [],
        };
        const nextActions = drNext[dr.status] ?? [];
        return (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Home size={16} className="text-orange-500" />
                <h2 className="font-semibold text-gray-900">Livraison à domicile</h2>
              </div>
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ color: drCfg.color, backgroundColor: drCfg.bg }}
              >
                {drCfg.label}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Adresse</p>
                <p className="font-medium text-gray-800">{dr.address}</p>
                {dr.district && <p className="text-gray-500 text-xs">{dr.district}</p>}
                {dr.landmark && <p className="text-gray-400 text-xs italic">📍 {dr.landmark}</p>}
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Contact</p>
                <p className="font-medium text-gray-800">{dr.contactName}</p>
                <p className="text-gray-500 text-xs">{dr.contactPhone}</p>
              </div>
              {dr.handler && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Agent assigné</p>
                  <p className="font-medium text-gray-800">{dr.handler.firstName} {dr.handler.lastName}</p>
                </div>
              )}
              {dr.deliveryFee != null && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Frais livraison</p>
                  <p className={`font-semibold ${dr.isPaid ? 'text-green-600' : 'text-amber-600'}`}>
                    {dr.deliveryFee.toLocaleString('fr-FR')} FCFA {dr.isPaid ? '✓' : '(impayé)'}
                  </p>
                </div>
              )}
            </div>
            {nextActions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {nextActions.map((action: string) => {
                  const isCancel  = action === 'CANCELLED';
                  const isFailed  = action === 'FAILED';
                  const cfg = DR_STATUS_CFG[action];
                  return (
                    <button
                      key={action}
                      onClick={() => { setDrAction(action); setDrNotes(''); setDrFee(dr.deliveryFee ?? ''); setShowDrModal(true); }}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition ${
                        isCancel || isFailed
                          ? 'border-red-200 text-red-500 hover:bg-red-50'
                          : 'border-orange-200 text-orange-700 hover:bg-orange-100'
                      }`}
                    >
                      {cfg?.label ?? action}
                    </button>
                  );
                })}
              </div>
            )}
            {dr.failReason && (
              <p className="text-xs text-red-500 mt-2">Motif : {dr.failReason}</p>
            )}
          </div>
        );
      })()}

      {/* Delivery request update modal */}
      {showDrModal && deliveryRequest && (() => {
        const dr = deliveryRequest as any;
        const cfg = DR_STATUS_CFG[drAction] ?? { label: drAction, color: '#f97316' };
        const needsFee    = drAction === 'ASSIGNED';
        const needsReason = drAction === 'FAILED';
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowDrModal(false)}
          >
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Confirmer l&apos;action</h3>
              <p className="text-sm text-gray-500 mb-4">
                Passer la demande en <span className="font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
              </p>
              {needsFee && (
                <div className="mb-3">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Frais de livraison (FCFA)</label>
                  <input
                    type="number"
                    value={drFee}
                    onChange={(e) => setDrFee(e.target.value)}
                    placeholder="Ex: 1500"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              )}
              {needsReason && (
                <div className="mb-3">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Motif d&apos;échec</label>
                  <input
                    type="text"
                    value={drNotes}
                    onChange={(e) => setDrNotes(e.target.value)}
                    placeholder="Destinataire absent, adresse introuvable..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              )}
              {!needsFee && !needsReason && (
                <textarea
                  value={drNotes}
                  onChange={(e) => setDrNotes(e.target.value)}
                  placeholder="Notes optionnelles..."
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              )}
              <div className="flex gap-3 mt-4">
                <button onClick={() => setShowDrModal(false)}
                  className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                >Annuler</button>
                <button
                  onClick={() => drMutation.mutate({
                    reqId: dr.id,
                    data: {
                      status: drAction,
                      deliveryNotes: !needsFee && !needsReason ? (drNotes || undefined) : undefined,
                      failReason: needsReason ? (drNotes || undefined) : undefined,
                      deliveryFee: needsFee && drFee ? parseInt(drFee) : undefined,
                    },
                  })}
                  disabled={drMutation.isPending}
                  className="flex-1 py-2 text-sm font-semibold text-white rounded-lg flex items-center justify-center gap-2 transition"
                  style={{ backgroundColor: cfg.color }}
                >
                  {drMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Status change modal */}
      {showStatusModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => e.target === e.currentTarget && setShowStatusModal(false)}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Confirmer le changement</h3>
            <p className="text-sm text-gray-500 mb-4">
              Passer le colis <strong>{p.trackingCode}</strong> en{' '}
              <span className="font-semibold" style={{ color: STATUS_CFG[nextStatus]?.color }}>
                {STATUS_CFG[nextStatus]?.label}
              </span>
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Note optionnelle (ex: remis à l'agent de la gare)..."
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowStatusModal(false)}
                className="flex-1 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg transition"
              >
                Annuler
              </button>
              <button
                onClick={() => statusMutation.mutate({ status: nextStatus, notes: notes || undefined })}
                disabled={statusMutation.isPending}
                className="flex-1 py-2 text-sm font-semibold text-white rounded-lg flex items-center justify-center gap-2 transition"
                style={{ backgroundColor: STATUS_CFG[nextStatus]?.color ?? '#f97316' }}
              >
                {statusMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InfoCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={15} className="text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-500">{title}</h2>
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-xs text-gray-400 whitespace-nowrap">{label}</span>
      <span className={`text-sm text-right ${className || 'text-gray-700 font-medium'}`}>{value}</span>
    </div>
  );
}
