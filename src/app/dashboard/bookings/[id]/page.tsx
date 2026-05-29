'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsApi, luggageApi } from '@/lib/api';
import { formatCFA } from '@transpro/shared';
import {
  ArrowLeft, Luggage, Plus, Loader2, User, Ticket, Scale,
  Package, QrCode, AlertTriangle, Check, Printer,
} from 'lucide-react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

dayjs.locale('fr');

// ── Bag status config ─────────────────────────────────────────────────────────

const BAG_CFG: Record<string, { label: string; color: string; bg: string }> = {
  DECLARED:  { label: 'Déclaré',    color: '#6B7280', bg: '#F3F4F6' },
  LOADED:    { label: 'En soute',   color: '#3B82F6', bg: '#EFF6FF' },
  ARRIVED:   { label: 'Arrivé',     color: '#F59E0B', bg: '#FFFBEB' },
  CLAIMED:   { label: 'Récupéré',   color: '#16A34A', bg: '#F0FDF4' },
  MISSING:   { label: 'Manquant',   color: '#EF4444', bg: '#FEF2F2' },
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BookingDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();
  const qc      = useQueryClient();
  const [showLuggageForm, setShowLuggageForm] = useState(false);
  const [luggageForm, setLuggageForm] = useState({
    bagCount: 1,
    totalWeightKg: '',
    freeWeightKg: 20,
    excessPaid: false,
    excessPaymentMethod: 'CASH',
    bagLabels: [''],
    bagWeights: [''],
  });

  const { data: booking, isLoading: bLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingsApi.get(id) as any,
  });

  const { data: luggage, refetch: refetchLuggage } = useQuery({
    queryKey: ['luggage-booking', id],
    queryFn: () => luggageApi.getByBooking(id).catch(() => null) as any,
    enabled: !!id,
  });

  const declareMut = useMutation({
    mutationFn: (data: any) => luggageApi.declare(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['luggage-booking', id] });
      qc.invalidateQueries({ queryKey: ['luggage'] });
      toast.success('Bagages déclarés');
      setShowLuggageForm(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });

  const missingMut = useMutation({
    mutationFn: ({ bagId }: { bagId: string }) => luggageApi.reportMissing(bagId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['luggage-booking', id] }); toast.success('Signalé manquant'); },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });

  const scanMut = useMutation({
    mutationFn: (qrCode: string) => luggageApi.scanBag(qrCode),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['luggage-booking', id] }); toast.success('Sac scanné'); },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });

  if (bLoading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 size={28} className="animate-spin text-gray-400" />
    </div>
  );

  const b   = booking as any;
  const lug = luggage as any;

  const FREE_KG    = 20;
  const RATE_XOF   = 300;
  const totalWt    = parseFloat(luggageForm.totalWeightKg) || 0;
  const excessKg   = Math.max(0, totalWt - luggageForm.freeWeightKg);
  const excessFee  = Math.round(excessKg * RATE_XOF);

  function submitLuggage() {
    declareMut.mutate({
      bookingId: id,
      bagCount:       luggageForm.bagCount,
      totalWeightKg:  totalWt || undefined,
      freeWeightKg:   luggageForm.freeWeightKg,
      excessPaid:     luggageForm.excessPaid,
      excessPaymentMethod: luggageForm.excessPaid ? luggageForm.excessPaymentMethod : undefined,
      bagLabels:  luggageForm.bagLabels.slice(0, luggageForm.bagCount).filter(Boolean),
      bagWeights: luggageForm.bagWeights.slice(0, luggageForm.bagCount).map(Number).filter(Boolean),
    });
  }

  function printLabel(bag: any) {
    const w = window.open('', '_blank', 'width=300,height=300');
    if (!w) return;
    w.document.write(`
      <html><body style="font-family:monospace;text-align:center;padding:16px">
        <h3 style="margin:0">🧳 TransPro CI</h3>
        <p style="font-size:22px;font-weight:bold;margin:12px 0">${bag.qrCode}</p>
        <p>${bag.label || 'Sac'} ${bag.weightKg ? `· ${bag.weightKg} kg` : ''}</p>
        <p style="font-size:11px">Réf: ${b?.reference}</p>
        <p style="font-size:11px">${b?.passenger?.firstName} ${b?.passenger?.lastName}</p>
        <script>window.print();window.close();</script>
      </body></html>
    `);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <button
        onClick={() => router.push('/dashboard/bookings')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
      >
        <ArrowLeft size={15} /> Retour aux réservations
      </button>

      {b && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 font-mono">{b.reference}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{b.trip?.route?.name ?? '—'}</p>
            </div>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
              b.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
              b.status === 'CANCELLED' ? 'bg-red-100 text-red-600' :
              'bg-gray-100 text-gray-600'
            }`}>
              {b.status}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Passager</p>
              <p className="font-medium">{b.passenger?.firstName} {b.passenger?.lastName}</p>
              <p className="text-gray-400 text-xs">{b.passenger?.phone}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Sièges</p>
              <p className="font-medium">{b.seatNumbers?.join(', ') || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Montant</p>
              <p className="font-semibold text-brand-500">{b.totalAmount ? formatCFA(b.totalAmount) : '—'}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Luggage section ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Luggage size={16} className="text-brand-500" /> Bagages en soute
          </h2>
          <button
            onClick={() => setShowLuggageForm(!showLuggageForm)}
            className="flex items-center gap-1.5 text-sm text-brand-500 hover:text-brand-600 font-medium"
          >
            <Plus size={14} /> {lug ? 'Modifier' : 'Déclarer'}
          </button>
        </div>

        {/* Luggage form */}
        {showLuggageForm && (
          <div className="border border-brand-100 bg-brand-50 rounded-xl p-5 mb-4 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre de sacs *</label>
                <input
                  type="number"
                  min={0} max={20}
                  value={luggageForm.bagCount}
                  onChange={(e) => {
                    const n = parseInt(e.target.value) || 0;
                    setLuggageForm((p) => ({
                      ...p,
                      bagCount: n,
                      bagLabels: Array.from({ length: n }, (_, i) => p.bagLabels[i] ?? ''),
                      bagWeights: Array.from({ length: n }, (_, i) => p.bagWeights[i] ?? ''),
                    }));
                  }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Poids total (kg)</label>
                <input
                  type="number"
                  min={0}
                  value={luggageForm.totalWeightKg}
                  onChange={(e) => setLuggageForm((p) => ({ ...p, totalWeightKg: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Franchise (kg)</label>
                <input
                  type="number"
                  min={0}
                  value={luggageForm.freeWeightKg}
                  onChange={(e) => setLuggageForm((p) => ({ ...p, freeWeightKg: parseFloat(e.target.value) || FREE_KG }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            {excessKg > 0 && (
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <Scale size={14} className="text-amber-600 shrink-0" />
                <span className="text-sm text-amber-700">
                  Excédent <strong>{excessKg.toFixed(1)} kg</strong> → frais : <strong>{formatCFA(excessFee)}</strong>
                </span>
                <label className="ml-auto flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={luggageForm.excessPaid}
                    onChange={(e) => setLuggageForm((p) => ({ ...p, excessPaid: e.target.checked }))}
                    className="w-4 h-4 accent-brand-500"
                  />
                  <span className="text-xs font-medium text-amber-700">Payé maintenant</span>
                </label>
                {luggageForm.excessPaid && (
                  <select
                    value={luggageForm.excessPaymentMethod}
                    onChange={(e) => setLuggageForm((p) => ({ ...p, excessPaymentMethod: e.target.value }))}
                    className="border border-amber-300 rounded-lg px-2 py-1 text-xs focus:outline-none bg-white"
                  >
                    <option value="CASH">Espèces</option>
                    <option value="ORANGE_MONEY">Orange Money</option>
                    <option value="MTN_MOMO">MTN MoMo</option>
                    <option value="WAVE">Wave</option>
                  </select>
                )}
              </div>
            )}

            {/* Per-bag details */}
            {luggageForm.bagCount > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500">Détails des sacs (optionnel)</p>
                {Array.from({ length: luggageForm.bagCount }).map((_, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      placeholder={`Description sac ${i + 1} (ex: valise rouge)`}
                      value={luggageForm.bagLabels[i] ?? ''}
                      onChange={(e) => setLuggageForm((p) => {
                        const l = [...p.bagLabels]; l[i] = e.target.value; return { ...p, bagLabels: l };
                      })}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <input
                      type="number"
                      placeholder="kg"
                      value={luggageForm.bagWeights[i] ?? ''}
                      onChange={(e) => setLuggageForm((p) => {
                        const w = [...p.bagWeights]; w[i] = e.target.value; return { ...p, bagWeights: w };
                      })}
                      className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowLuggageForm(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={submitLuggage}
                disabled={declareMut.isPending || luggageForm.bagCount === 0}
                className="flex-1 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {declareMut.isPending && <Loader2 size={14} className="animate-spin" />}
                Valider la déclaration
              </button>
            </div>
          </div>
        )}

        {/* Existing luggage */}
        {lug ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4 text-sm text-gray-700">
              <span className="flex items-center gap-1.5"><Package size={13} /> <strong>{lug.bagCount}</strong> sac(s)</span>
              <span className="flex items-center gap-1.5"><Scale size={13} /> <strong>{lug.totalWeightKg} kg</strong> total</span>
              {lug.excessFeeXof > 0 && (
                <span className={`flex items-center gap-1.5 font-semibold ${lug.excessPaid ? 'text-green-600' : 'text-amber-600'}`}>
                  Excédent : {formatCFA(lug.excessFeeXof)} {lug.excessPaid ? '✓' : '(impayé)'}
                </span>
              )}
            </div>

            <div className="divide-y divide-gray-50 rounded-xl border border-gray-100 overflow-hidden">
              {lug.bags.map((bag: any) => {
                const cfg = BAG_CFG[bag.status] ?? BAG_CFG['DECLARED'];
                return (
                  <div key={bag.id} className="flex items-center gap-3 px-4 py-3 bg-white">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                      <Luggage size={14} className="text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">
                        {bag.label || 'Sac'}{bag.weightKg ? ` · ${bag.weightKg} kg` : ''}
                      </p>
                      <p className="font-mono text-xs text-gray-400">{bag.qrCode}</p>
                    </div>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ color: cfg.color, backgroundColor: cfg.bg }}
                    >
                      {cfg.label}
                    </span>
                    <button
                      onClick={() => printLabel(bag)}
                      className="text-gray-400 hover:text-gray-600 p-1.5 rounded hover:bg-gray-100"
                      title="Imprimer l'étiquette"
                    >
                      <Printer size={13} />
                    </button>
                    {!['MISSING', 'CLAIMED'].includes(bag.status) && (
                      <>
                        <button
                          onClick={() => scanMut.mutate(bag.qrCode)}
                          disabled={scanMut.isPending}
                          className="text-brand-500 hover:text-brand-700 p-1.5 rounded hover:bg-brand-50"
                          title="Scanner (avancer le statut)"
                        >
                          <QrCode size={13} />
                        </button>
                        <button
                          onClick={() => { if (confirm('Signaler ce sac comme manquant ?')) missingMut.mutate({ bagId: bag.id }); }}
                          className="text-red-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50"
                          title="Signaler manquant"
                        >
                          <AlertTriangle size={13} />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Luggage size={32} className="text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Aucun bagage déclaré pour cette réservation</p>
          </div>
        )}
      </div>
    </div>
  );
}
