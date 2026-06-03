'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { parcelsApi } from '@/lib/api';
import { formatCFA } from '@transpro/shared';
import {
  Package, ArrowLeft, MapPin, Clock, Scale, AlertCircle, CheckCircle2,
  Loader2, Home, X, ChevronRight, Image as ImageIcon,
} from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { toast } from 'sonner';
dayjs.locale('fr');

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  PENDING:    { label: 'En attente',      color: 'text-gray-600',    bg: 'bg-gray-50',    dot: 'bg-gray-400' },
  COLLECTED:  { label: 'Pris en charge',  color: 'text-blue-700',    bg: 'bg-blue-50',    dot: 'bg-blue-500' },
  IN_TRANSIT: { label: 'En transit',      color: 'text-purple-700',  bg: 'bg-purple-50',  dot: 'bg-purple-500' },
  ARRIVED:    { label: 'Arrivé à dest.', color: 'text-amber-700',   bg: 'bg-amber-50',   dot: 'bg-amber-400' },
  DELIVERING: { label: 'En livraison',    color: 'text-orange-700',  bg: 'bg-orange-50',  dot: 'bg-orange-400' },
  DELIVERED:  { label: 'Livré ✓',         color: 'text-green-700',   bg: 'bg-green-50',   dot: 'bg-green-500' },
  RETURNED:   { label: 'Retourné',        color: 'text-red-600',     bg: 'bg-red-50',     dot: 'bg-red-400' },
};

const DR_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING:    { label: 'En attente',    cls: 'bg-gray-100 text-gray-600' },
  ASSIGNED:   { label: 'Assignée',      cls: 'bg-blue-100 text-blue-700' },
  EN_ROUTE:   { label: 'En route',      cls: 'bg-purple-100 text-purple-700' },
  DELIVERED:  { label: 'Livrée ✓',      cls: 'bg-green-100 text-green-700' },
  FAILED:     { label: 'Échouée',       cls: 'bg-red-100 text-red-600' },
  CANCELLED:  { label: 'Annulée',       cls: 'bg-gray-100 text-gray-500' },
};

const STEPS = ['PENDING', 'COLLECTED', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED'];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ParcelDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const qc       = useQueryClient();

  const [drForm,     setDrForm]     = useState({ address: '', recipientPhone: '', notes: '' });
  const [showDrForm, setShowDrForm] = useState(false);
  const [lightbox,   setLightbox]   = useState<string | null>(null);

  const { data: parcel, isLoading } = useQuery({
    queryKey: ['my-parcel', id],
    queryFn:  () => parcelsApi.myParcel(id) as any,
  });

  const { data: dr } = useQuery({
    queryKey: ['my-parcel-dr', id],
    queryFn:  () => parcelsApi.myDeliveryRequest(id) as any,
    enabled:  !!parcel && ['ARRIVED', 'DELIVERING', 'DELIVERED'].includes(parcel?.status),
    retry:    false,
  });

  const createDrMut = useMutation({
    mutationFn: () => parcelsApi.createMyDeliveryRequest(id, drForm),
    onSuccess:  () => {
      toast.success('Demande de livraison créée');
      setShowDrForm(false);
      qc.invalidateQueries({ queryKey: ['my-parcel-dr', id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });

  const cancelDrMut = useMutation({
    mutationFn: () => parcelsApi.cancelMyDeliveryRequest(id),
    onSuccess:  () => {
      toast.success('Demande annulée');
      qc.invalidateQueries({ queryKey: ['my-parcel-dr', id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });

  if (isLoading) return (
    <div className="space-y-4 max-w-2xl">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
      ))}
    </div>
  );

  if (!parcel) return (
    <div className="flex flex-col items-center py-20 gap-3 text-center text-gray-400">
      <Package size={40} className="text-gray-200" />
      <p className="font-semibold">Colis introuvable</p>
    </div>
  );

  const cfg        = STATUS_CFG[parcel.status] ?? STATUS_CFG.PENDING;
  const currentIdx = STEPS.indexOf(parcel.status);
  const origin     = parcel.trip?.route?.originCity?.name ?? '—';
  const dest       = parcel.trip?.route?.destinationCity?.name ?? '—';
  const photos: string[] = parcel.photos ?? [];

  const canRequestDr  = ['ARRIVED'].includes(parcel.status) && !dr;
  const hasDr         = !!dr && !['CANCELLED'].includes(dr?.status);

  function fmtDate(iso?: string) {
    if (!iso) return '—';
    return dayjs(iso).format('D MMM YYYY à HH:mm');
  }

  return (
    <>
      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button className="absolute top-4 right-4 text-white/60 hover:text-white">
            <X size={24} />
          </button>
          <img src={lightbox} className="max-h-[90vh] max-w-full rounded-lg object-contain" alt="Photo colis" />
        </div>
      )}

      <div className="space-y-5 max-w-2xl">
        {/* Back */}
        <button onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition">
          <ArrowLeft size={15} /> Retour
        </button>

        {/* Status banner */}
        <div className={`${cfg.bg} rounded-2xl p-5 flex items-start gap-4`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${cfg.bg} border border-current/10 shrink-0`}>
            <Package size={22} className={cfg.color} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              <p className={`font-bold text-base ${cfg.color}`}>{cfg.label}</p>
            </div>
            <p className="font-mono text-xs text-gray-500">{parcel.trackingCode}</p>
            <p className="text-sm text-gray-600 mt-1 truncate">{parcel.description}</p>
          </div>
        </div>

        {/* Progress stepper */}
        {parcel.status !== 'RETURNED' && (
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex items-start">
              {STEPS.map((step, i) => {
                const sCfg     = STATUS_CFG[step]!;
                const isDone   = i < currentIdx;
                const isCurrent = i === currentIdx;
                return (
                  <div key={step} className="flex items-start flex-1">
                    <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                        isCurrent ? `${sCfg.dot} border-transparent`
                        : isDone  ? 'bg-brand-500 border-brand-500'
                                  : 'bg-gray-100 border-gray-200'
                      }`}>
                        {isDone ? (
                          <CheckCircle2 size={14} className="text-white" />
                        ) : isCurrent ? (
                          <div className="w-2.5 h-2.5 rounded-full bg-white" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                        )}
                      </div>
                      <span className={`text-[9px] font-semibold text-center leading-tight max-w-[48px] ${
                        isCurrent ? cfg.color : isDone ? 'text-brand-600' : 'text-gray-400'
                      }`}>
                        {sCfg.label.split(' ')[0]}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mt-4 mx-1 rounded-full ${i < currentIdx ? 'bg-brand-500' : 'bg-gray-200'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-50">
          {[
            { label: 'Trajet',             value: `${origin} → ${dest}`, icon: MapPin },
            { label: 'Ville de livraison', value: parcel.deliveryCity ?? '—', icon: MapPin },
            { label: 'Départ',             value: parcel.trip?.departureAt ? dayjs(parcel.trip.departureAt).format('D MMM YYYY à HH:mm') : '—', icon: Clock },
            { label: 'Poids',              value: `${parcel.weightKg} kg`, icon: Scale },
            parcel.fee && { label: 'Frais d\'envoi', value: formatCFA(parcel.fee), icon: null },
            parcel.isPaid && { label: 'Paiement', value: '✓ Réglé', icon: null },
          ].filter(Boolean).map((row: any) => (
            <div key={row.label} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="text-gray-500 flex items-center gap-1.5">
                {row.icon && <row.icon size={13} className="text-gray-400" />}
                {row.label}
              </span>
              <span className="font-semibold text-gray-800">{row.value}</span>
            </div>
          ))}
          {parcel.fragile && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-amber-700">
              <AlertCircle size={14} />
              <span>Colis fragile — manipulation avec précaution</span>
            </div>
          )}
          {parcel.notes && (
            <div className="px-4 py-3 text-sm text-gray-500">
              <p className="text-xs font-medium text-gray-400 mb-0.5">Notes</p>
              <p>{parcel.notes}</p>
            </div>
          )}
        </div>

        {/* Historique */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Historique</p>
          {[
            { label: 'Enregistré',    date: parcel.createdAt },
            { label: 'Pris en charge', date: parcel.collectedAt },
            { label: 'En transit',    date: parcel.departedAt },
            { label: 'Arrivé',        date: parcel.arrivedAt },
            { label: 'Livré',         date: parcel.deliveredAt },
            { label: 'Retourné',      date: parcel.returnedAt },
          ].filter((r) => r.date).map((r) => (
            <div key={r.label} className="flex items-center justify-between text-sm">
              <span className="text-gray-500">{r.label}</span>
              <span className="text-gray-700 font-medium">{fmtDate(r.date)}</span>
            </div>
          ))}
        </div>

        {/* Photos */}
        {photos.length > 0 && (
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <ImageIcon size={13} /> Photos
            </p>
            <div className="flex gap-3 flex-wrap">
              {photos.map((src, i) => (
                <button key={i} onClick={() => setLightbox(src)} className="group relative">
                  <img
                    src={src}
                    alt={`Photo ${i + 1}`}
                    className="w-28 h-28 object-cover rounded-xl border border-gray-100 group-hover:opacity-90 transition"
                  />
                  <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/10 transition flex items-center justify-center">
                    <ImageIcon size={20} className="text-white opacity-0 group-hover:opacity-100 transition" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Livraison à domicile */}
        {(canRequestDr || hasDr) && (
          <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Home size={13} /> Livraison à domicile
            </p>

            {hasDr && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Statut</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${DR_STATUS[dr.status]?.cls ?? ''}`}>
                    {DR_STATUS[dr.status]?.label ?? dr.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Adresse</span>
                  <span className="text-sm font-semibold text-gray-800 text-right max-w-[55%]">{dr.address}</span>
                </div>
                {dr.deliveryFee && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Frais</span>
                    <span className="text-sm font-semibold text-gray-800">{formatCFA(dr.deliveryFee)}</span>
                  </div>
                )}
                {['PENDING', 'ASSIGNED'].includes(dr.status) && (
                  <button
                    onClick={() => cancelDrMut.mutate()}
                    disabled={cancelDrMut.isPending}
                    className="w-full mt-2 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 transition disabled:opacity-50"
                  >
                    {cancelDrMut.isPending ? 'Annulation…' : 'Annuler la demande'}
                  </button>
                )}
              </div>
            )}

            {canRequestDr && !showDrForm && (
              <button
                onClick={() => setShowDrForm(true)}
                className="w-full flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl p-4 hover:bg-amber-100 transition text-left"
              >
                <div>
                  <p className="font-semibold text-amber-800 text-sm">Demander la livraison à domicile</p>
                  <p className="text-xs text-amber-600 mt-0.5">Votre colis est arrivé à la gare</p>
                </div>
                <ChevronRight size={16} className="text-amber-500 shrink-0" />
              </button>
            )}

            {canRequestDr && showDrForm && (
              <div className="space-y-3 border border-gray-100 rounded-xl p-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Adresse de livraison <span className="text-red-500">*</span></label>
                  <input
                    value={drForm.address}
                    onChange={(e) => setDrForm((p) => ({ ...p, address: e.target.value }))}
                    placeholder="Rue, quartier, ville…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Téléphone destinataire</label>
                  <input
                    value={drForm.recipientPhone}
                    onChange={(e) => setDrForm((p) => ({ ...p, recipientPhone: e.target.value }))}
                    placeholder="+225 07 XX XX XX XX"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optionnel)</label>
                  <input
                    value={drForm.notes}
                    onChange={(e) => setDrForm((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="Indications supplémentaires…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowDrForm(false)}
                    className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
                    Annuler
                  </button>
                  <button
                    onClick={() => createDrMut.mutate()}
                    disabled={!drForm.address || createDrMut.isPending}
                    className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {createDrMut.isPending ? <><Loader2 size={13} className="animate-spin" /> Envoi…</> : 'Confirmer'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
