'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { parcelsApi } from '@/lib/api';
import { PlanGate } from '@/components/ui/PlanGate';
import {
  Home, Package, Loader2, MapPin, Phone, User, ChevronRight,
  Clock, Truck, Check, X, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

dayjs.locale('fr');

// ── Status config ─────────────────────────────────────────────────────────────

const DR_CFG: Record<string, { label: string; classes: string; icon: any }> = {
  PENDING:   { label: 'En attente',  classes: 'bg-gray-100 text-gray-600',    icon: Clock },
  ASSIGNED:  { label: 'Assigné',     classes: 'bg-blue-100 text-blue-700',    icon: User },
  EN_ROUTE:  { label: 'En chemin',   classes: 'bg-orange-100 text-orange-700',icon: Truck },
  DELIVERED: { label: 'Livré',       classes: 'bg-green-100 text-green-700',  icon: Check },
  FAILED:    { label: 'Échec',       classes: 'bg-red-100 text-red-600',      icon: AlertTriangle },
  CANCELLED: { label: 'Annulé',      classes: 'bg-gray-100 text-gray-400',    icon: X },
};

const NEXT_ACTIONS: Record<string, string[]> = {
  PENDING:   ['ASSIGNED', 'CANCELLED'],
  ASSIGNED:  ['EN_ROUTE', 'CANCELLED'],
  EN_ROUTE:  ['DELIVERED', 'FAILED'],
  DELIVERED: [],
  FAILED:    ['EN_ROUTE'],
  CANCELLED: [],
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DeliveryRequestsPage() {
  const router   = useRouter();
  const qc       = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('');
  const [selected, setSelected]         = useState<any | null>(null);
  const [action,   setAction]           = useState('');
  const [notes,    setNotes]            = useState('');
  const [fee,      setFee]              = useState('');

  const { data: requests = [], isLoading } = useQuery<any[]>({
    queryKey: ['delivery-requests', filterStatus],
    queryFn: () => parcelsApi.listDeliveryRequests(filterStatus ? { status: filterStatus } : {}) as any,
  });

  const updateMut = useMutation({
    mutationFn: ({ reqId, data }: { reqId: string; data: any }) =>
      parcelsApi.updateDeliveryRequest(reqId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delivery-requests'] });
      toast.success('Demande mise à jour');
      setSelected(null);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? 'Erreur'),
  });

  function openAction(req: any, act: string) {
    setSelected(req);
    setAction(act);
    setNotes('');
    setFee(req.deliveryFee ?? '');
  }

  const pending   = (requests as any[]).filter((r) => r.status === 'PENDING').length;
  const enRoute   = (requests as any[]).filter((r) => r.status === 'EN_ROUTE').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Home size={22} className="text-orange-500" /> Livraisons à domicile
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Gérez les demandes de livraison à domicile des colis</p>
        </div>
        {/* KPI chips */}
        <div className="flex gap-3">
          {pending > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
              <Clock size={13} className="text-amber-600" />
              <span className="text-sm font-semibold text-amber-700">{pending} en attente</span>
            </div>
          )}
          {enRoute > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg">
              <Truck size={13} className="text-orange-500" />
              <span className="text-sm font-semibold text-orange-600">{enRoute} en chemin</span>
            </div>
          )}
        </div>
      </div>

      <PlanGate requiredPlans={['PROFESSIONAL', 'ENTERPRISE']} currentPlan="PROFESSIONAL">
        {/* Filter */}
        <div className="flex gap-2 flex-wrap">
          {['', 'PENDING', 'ASSIGNED', 'EN_ROUTE', 'DELIVERED', 'FAILED', 'CANCELLED'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                filterStatus === s
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
              }`}
            >
              {s ? (DR_CFG[s]?.label ?? s) : 'Tous'}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
            ))
          ) : (requests as any[]).length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <Home size={40} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Aucune demande de livraison</p>
              <p className="text-gray-400 text-sm mt-1">Les demandes apparaîtront ici lorsque des clients en feront</p>
            </div>
          ) : (
            (requests as any[]).map((req) => {
              const cfg   = DR_CFG[req.status] ?? DR_CFG['PENDING'];
              const Icon  = cfg.icon;
              const nexts = NEXT_ACTIONS[req.status] ?? [];
              return (
                <div key={req.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start gap-4">
                    {/* Status icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.classes.replace('text-', 'text-').split(' ')[0]}`}
                      style={{ backgroundColor: `${cfg.classes.includes('orange') ? '#FFF7ED' : cfg.classes.includes('blue') ? '#EFF6FF' : cfg.classes.includes('green') ? '#F0FDF4' : cfg.classes.includes('red') ? '#FEF2F2' : '#F9FAFB'}` }}
                    >
                      <Icon size={18} className={cfg.classes.split(' ').find((c) => c.startsWith('text-')) ?? 'text-gray-500'} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="font-mono text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded cursor-pointer hover:bg-brand-50 hover:text-brand-600"
                          onClick={() => router.push(`/dashboard/parcels/${req.parcel?.id}`)}
                        >
                          {req.parcel?.trackingCode ?? '—'}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.classes}`}>
                          {cfg.label}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm mt-2">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <MapPin size={12} className="text-gray-400 shrink-0" />
                          <span className="truncate">{req.address}{req.district ? `, ${req.district}` : ''}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Phone size={12} className="text-gray-400 shrink-0" />
                          <span>{req.contactPhone} — {req.contactName}</span>
                        </div>
                        {req.landmark && (
                          <div className="flex items-center gap-1.5 text-gray-400 text-xs col-span-2">
                            📍 {req.landmark}
                          </div>
                        )}
                        {req.handler && (
                          <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                            <User size={11} className="shrink-0" /> {req.handler.firstName} {req.handler.lastName}
                          </div>
                        )}
                        {req.deliveryFee != null && (
                          <div className={`text-xs font-semibold ${req.isPaid ? 'text-green-600' : 'text-amber-600'}`}>
                            {req.deliveryFee.toLocaleString('fr-FR')} FCFA {req.isPaid ? '✓' : '(impayé)'}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-3">
                        {nexts.map((act: string) => {
                          const aCfg = DR_CFG[act];
                          const isNeg = act === 'CANCELLED' || act === 'FAILED';
                          return (
                            <button
                              key={act}
                              onClick={() => openAction(req, act)}
                              className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition ${
                                isNeg
                                  ? 'border-red-200 text-red-500 hover:bg-red-50'
                                  : 'border-orange-200 text-orange-700 hover:bg-orange-50'
                              }`}
                            >
                              {aCfg?.label ?? act}
                            </button>
                          );
                        })}
                        <span className="ml-auto text-xs text-gray-400">
                          {dayjs(req.createdAt).format('D MMM HH:mm')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PlanGate>

      {/* Action modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => e.target === e.currentTarget && setSelected(null)}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Confirmer</h3>
            <p className="text-sm text-gray-500 mb-4">
              Colis <span className="font-mono font-semibold">{selected.parcel?.trackingCode}</span> →{' '}
              <span className="font-semibold">{DR_CFG[action]?.label ?? action}</span>
            </p>

            {action === 'ASSIGNED' && (
              <div className="mb-3">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Frais de livraison (FCFA)</label>
                <input
                  type="number"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  placeholder="Ex: 1 500"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            )}

            {action === 'FAILED' && (
              <div className="mb-3">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Motif d&apos;échec</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Destinataire absent, adresse incorrecte..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            )}

            {!['ASSIGNED', 'FAILED'].includes(action) && (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes optionnelles..."
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            )}

            <div className="flex gap-3 mt-4">
              <button onClick={() => setSelected(null)}
                className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={() => updateMut.mutate({
                  reqId: selected.id,
                  data: {
                    status: action,
                    failReason:    action === 'FAILED'   ? (notes || undefined) : undefined,
                    deliveryNotes: !['ASSIGNED', 'FAILED'].includes(action) ? (notes || undefined) : undefined,
                    deliveryFee:   action === 'ASSIGNED' && fee ? parseInt(fee) : undefined,
                  },
                })}
                disabled={updateMut.isPending}
                className="flex-1 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg flex items-center justify-center gap-2"
              >
                {updateMut.isPending && <Loader2 size={14} className="animate-spin" />}
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
