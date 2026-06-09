'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settlementsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { formatCFA } from '@transpro/shared';
import {
  ArrowLeft, Building2, Calendar, Banknote, CheckCircle2,
  XCircle, Clock, Loader2, ChevronRight, Hash, CreditCard,
} from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import Link from 'next/link';
import { toast } from 'sonner';

dayjs.locale('fr');

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  PENDING:    { label: 'En attente',   cls: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
  PROCESSING: { label: 'En cours',     cls: 'bg-blue-100 text-blue-700 border-blue-200',       icon: Loader2 },
  PAID:       { label: 'Reversé',      cls: 'bg-green-100 text-green-700 border-green-200',    icon: CheckCircle2 },
  FAILED:     { label: 'Échoué',       cls: 'bg-red-100 text-red-600 border-red-200',          icon: XCircle },
};

const METHOD_LABEL: Record<string, string> = {
  GENIUS_PAY:   'Genius Pay',
  ORANGE_MONEY: 'Orange Money',
  MTN_MOMO:     'MTN MoMo',
  WAVE:         'Wave',
  CARD:         'Carte',
  CASH:         'Espèces',
};

export default function SettlementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const [showProcessing, setShowProcessing] = useState(false);
  const [showPaid, setShowPaid] = useState(false);
  const [showFailed, setShowFailed] = useState(false);
  const [bankName, setBankName]       = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [transferRef, setTransferRef] = useState('');
  const [failNotes, setFailNotes]     = useState('');

  if (user?.role !== 'SUPER_ADMIN') {
    router.replace('/dashboard');
    return null;
  }

  const { data: settlement, isLoading } = useQuery({
    queryKey: ['settlement', id],
    queryFn: () => settlementsApi.get(id) as any,
    staleTime: 15_000,
  });

  const s = (settlement as any)?.data ?? settlement;

  const processingMut = useMutation({
    mutationFn: () => settlementsApi.markProcessing(id, { bankName, bankAccount }) as any,
    onSuccess: () => {
      toast.success('Reversement marqué "En cours"');
      qc.invalidateQueries({ queryKey: ['settlement', id] });
      qc.invalidateQueries({ queryKey: ['admin-settlements'] });
      setShowProcessing(false);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });

  const paidMut = useMutation({
    mutationFn: () => settlementsApi.markPaid(id, { transferRef }) as any,
    onSuccess: () => {
      toast.success('Reversement validé comme "Payé"');
      qc.invalidateQueries({ queryKey: ['settlement', id] });
      qc.invalidateQueries({ queryKey: ['admin-settlements'] });
      setShowPaid(false);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });

  const failedMut = useMutation({
    mutationFn: () => settlementsApi.markFailed(id, { notes: failNotes }) as any,
    onSuccess: () => {
      toast.success('Reversement marqué "Échoué"');
      qc.invalidateQueries({ queryKey: ['settlement', id] });
      qc.invalidateQueries({ queryKey: ['admin-settlements'] });
      setShowFailed(false);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Chargement…
      </div>
    );
  }

  if (!s) {
    return (
      <div className="text-center py-24 text-gray-400">
        <p>Reversement introuvable</p>
        <Link href="/dashboard/admin/settlements" className="text-indigo-600 text-sm mt-2 block">
          Retour à la liste
        </Link>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.PENDING;
  const StatusIcon = cfg.icon;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard/admin/settlements" className="hover:text-gray-700 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Reversements
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-900 font-medium">{s.tenant?.name}</span>
        <span>·</span>
        <span>{dayjs(s.periodStart).format('MMMM YYYY')}</span>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Banknote className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{s.tenant?.name}</h1>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Période : {dayjs(s.periodStart).format('D MMM')} → {dayjs(s.periodEnd).format('D MMM YYYY')}
                </span>
                <span className="flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5" />
                  {s.itemCount} transaction{s.itemCount > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border ${cfg.cls}`}>
            <StatusIcon className="w-4 h-4" />
            {cfg.label}
          </span>
        </div>

        {/* Montants */}
        <div className="mt-6 grid grid-cols-4 gap-4">
          {[
            { label: 'Montant brut',       value: formatCFA(s.totalAmount),   cls: 'text-gray-900' },
            { label: 'Frais Genius Pay 1%', value: `-${formatCFA(s.geniusPayFees)}`, cls: 'text-red-500' },
            { label: 'Commission 4%',       value: `-${formatCFA(s.commissions)}`,   cls: 'text-orange-500' },
            { label: 'Net à reverser',      value: formatCFA(s.netAmount),     cls: 'text-green-700 text-2xl font-bold' },
          ].map((m) => (
            <div key={m.label} className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 font-medium">{m.label}</p>
              <p className={`mt-1 font-semibold ${m.cls}`}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Infos virement */}
        {(s.bankName || s.transferRef) && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4 text-sm text-gray-600">
            {s.bankName    && <div><span className="text-xs text-gray-400 block">Banque</span>{s.bankName}</div>}
            {s.bankAccount && <div><span className="text-xs text-gray-400 block">Compte</span>{s.bankAccount}</div>}
            {s.transferRef && <div><span className="text-xs text-gray-400 block">Réf. virement</span>{s.transferRef}</div>}
            {s.processedAt && <div><span className="text-xs text-gray-400 block">Traité le</span>{dayjs(s.processedAt).format('D MMM YYYY HH:mm')}</div>}
          </div>
        )}

        {/* Actions */}
        {s.status === 'PENDING' && (
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => setShowProcessing(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Initier le virement
            </button>
            <button
              onClick={() => setShowFailed(true)}
              className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
            >
              Marquer échoué
            </button>
          </div>
        )}
        {s.status === 'PROCESSING' && (
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => setShowPaid(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              Confirmer le paiement
            </button>
            <button
              onClick={() => setShowFailed(true)}
              className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
            >
              Marquer échoué
            </button>
          </div>
        )}
      </div>

      {/* Lignes de détail */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Détail des transactions</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3 text-left">Référence réservation</th>
              <th className="px-5 py-3 text-left">Trajet</th>
              <th className="px-5 py-3 text-left">Départ</th>
              <th className="px-5 py-3 text-left">Canal</th>
              <th className="px-5 py-3 text-right">Brut</th>
              <th className="px-5 py-3 text-right">Frais GP</th>
              <th className="px-5 py-3 text-right">Commission</th>
              <th className="px-5 py-3 text-right">Net</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(s.items ?? []).map((item: any) => {
              const pmt = item.payment;
              const booking = pmt?.booking;
              const trip = booking?.trip;
              const route = trip?.route;
              return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-sm font-mono text-gray-700">
                    {booking?.reference ?? '—'}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">
                    {route ? `${route.originCity?.name} → ${route.destinationCity?.name}` : '—'}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500">
                    {trip?.departureAt ? dayjs(trip.departureAt).format('D MMM YYYY') : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                      <CreditCard className="w-3 h-3" />
                      {METHOD_LABEL[pmt?.method] ?? pmt?.method ?? '—'}
                      {pmt?.paymentChannel && ` · ${pmt.paymentChannel}`}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-sm text-gray-700">{formatCFA(item.amount)}</td>
                  <td className="px-5 py-3 text-right text-sm text-red-500">-{formatCFA(item.geniusPayFee)}</td>
                  <td className="px-5 py-3 text-right text-sm text-orange-500">-{formatCFA(item.commissionAmount)}</td>
                  <td className="px-5 py-3 text-right text-sm font-semibold text-gray-900">{formatCFA(item.netAmount)}</td>
                </tr>
              );
            })}
          </tbody>
          {s.items?.length > 0 && (
            <tfoot className="bg-gray-50 border-t border-gray-200 text-sm font-semibold text-gray-700">
              <tr>
                <td colSpan={4} className="px-5 py-3 text-right text-xs text-gray-400 uppercase tracking-wide">Total</td>
                <td className="px-5 py-3 text-right">{formatCFA(s.totalAmount)}</td>
                <td className="px-5 py-3 text-right text-red-500">-{formatCFA(s.geniusPayFees)}</td>
                <td className="px-5 py-3 text-right text-orange-500">-{formatCFA(s.commissions)}</td>
                <td className="px-5 py-3 text-right text-green-700">{formatCFA(s.netAmount)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Modal : Initier virement */}
      {showProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Initier le virement</h2>
            <p className="text-sm text-gray-500">
              Renseignez les coordonnées bancaires de la compagnie pour ce reversement de{' '}
              <strong>{formatCFA(s.netAmount)}</strong>.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Banque</label>
                <input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Ex: Ecobank, SGCI…"
                  className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Numéro de compte</label>
                <input
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  placeholder="CI12 XXXX XXXX XXXX"
                  className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowProcessing(false)} className="flex-1 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">Annuler</button>
              <button
                onClick={() => processingMut.mutate()}
                disabled={processingMut.isPending}
                className="flex-1 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processingMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal : Confirmer payé */}
      {showPaid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Confirmer le paiement</h2>
            <p className="text-sm text-gray-500">
              Renseignez la référence du virement bancaire effectué ({formatCFA(s.netAmount)}).
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Référence de virement *</label>
              <input
                value={transferRef}
                onChange={(e) => setTransferRef(e.target.value)}
                placeholder="Ex: VIR-2024-001234"
                className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-300"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowPaid(false)} className="flex-1 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">Annuler</button>
              <button
                onClick={() => paidMut.mutate()}
                disabled={!transferRef.trim() || paidMut.isPending}
                className="flex-1 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {paidMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Valider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal : Marquer échoué */}
      {showFailed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Marquer comme échoué</h2>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Motif (optionnel)</label>
              <textarea
                value={failNotes}
                onChange={(e) => setFailNotes(e.target.value)}
                rows={3}
                placeholder="Compte bancaire invalide, refus bancaire…"
                className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowFailed(false)} className="flex-1 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">Annuler</button>
              <button
                onClick={() => failedMut.mutate()}
                disabled={failedMut.isPending}
                className="flex-1 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {failedMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
