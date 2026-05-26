'use client';

import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { paymentsApi } from '@/lib/api';
import { formatCFA } from '@transpro/shared';
import {
  CreditCard, Loader2, ArrowRight, CheckCircle,
  XCircle, Clock, TrendingUp, RefreshCw,
} from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';

dayjs.locale('fr');
dayjs.extend(relativeTime);

const STATUS_STYLE: Record<string, { label: string; icon: any; cls: string; dot: string }> = {
  SUCCESS:    { label: 'Réussi',   icon: CheckCircle, cls: 'bg-green-100 text-green-700',   dot: 'bg-green-500' },
  FAILED:     { label: 'Échoué',   icon: XCircle,     cls: 'bg-red-100 text-red-600',       dot: 'bg-red-400' },
  PROCESSING: { label: 'En cours', icon: Clock,       cls: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400' },
};

const METHOD_LABEL: Record<string, string> = {
  GENIUS_PAY: 'Genius Pay',
  CASH:       'Espèces',
  CARD:       'Carte bancaire',
};

const FAIL_REASON: Record<string, string> = {
  'payment.failed':    'Paiement refusé',
  'payment.expired':   'Session expirée',
  'payment.cancelled': 'Annulé par l\'utilisateur',
};

export default function TransactionsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const { data: raw, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['my-payments'],
    queryFn: () => paymentsApi.myPayments() as any,
  });

  const payments: any[] = Array.isArray(raw) ? raw : [];

  const totalPaid   = payments.filter((p) => p.status === 'SUCCESS').reduce((s, p) => s + p.amount, 0);
  const countOk     = payments.filter((p) => p.status === 'SUCCESS').length;
  const countFailed = payments.filter((p) => p.status === 'FAILED').length;

  const checkMut = useMutation({
    mutationFn: (paymentId: string) => paymentsApi.checkStatus(paymentId) as any,
    onSuccess: (data: any) => {
      if (data?.updated) {
        qc.invalidateQueries({ queryKey: ['my-payments'] });
        qc.invalidateQueries({ queryKey: ['my-bookings'] });
        if (data.status === 'SUCCESS') {
          toast.success('Paiement confirmé ! Votre billet est prêt.');
        } else if (data.status === 'FAILED') {
          toast.error('Paiement échoué ou annulé.');
        }
      } else {
        toast.info('Toujours en attente de confirmation.');
      }
      setLastRefresh(new Date());
    },
    onError: () => toast.error('Impossible de vérifier le statut.'),
  });

  const handleGlobalRefresh = useCallback(async () => {
    await refetch();
    setLastRefresh(new Date());
    toast.success('Liste actualisée');
  }, [refetch]);

  const handleRowCheck = useCallback((paymentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    checkMut.mutate(paymentId);
  }, [checkMut]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mes transactions</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {payments.length} transaction{payments.length !== 1 ? 's' : ''}
            {' · '}
            <span className="text-gray-400">mis à jour {dayjs(lastRefresh).fromNow()}</span>
          </p>
        </div>
        <button
          onClick={handleGlobalRefresh}
          disabled={isFetching}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 hover:border-gray-300 px-3 py-2 rounded-lg transition disabled:opacity-50"
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin text-brand-500' : ''} />
          Actualiser
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 border-t-2 border-t-brand-400 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            <TrendingUp size={13} className="text-brand-400" /> Total payé
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCFA(totalPaid)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 border-t-2 border-t-green-400 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            <CheckCircle size={13} className="text-green-500" /> Réussis
          </div>
          <p className="text-2xl font-bold text-gray-900">{countOk}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 border-t-2 border-t-red-400 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            <XCircle size={13} className="text-red-400" /> Échoués
          </div>
          <p className="text-2xl font-bold text-gray-900">{countFailed}</p>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-brand-500" />
        </div>
      ) : payments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CreditCard size={24} className="text-gray-300" />
          </div>
          <p className="font-semibold text-gray-700">Aucune transaction</p>
          <p className="text-sm text-gray-400 mt-1">Vos paiements apparaîtront ici</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Historique</p>
            {isFetching && !isLoading && (
              <span className="flex items-center gap-1.5 text-xs text-brand-500">
                <Loader2 size={11} className="animate-spin" /> Actualisation…
              </span>
            )}
          </div>
          <div className="divide-y divide-gray-100">
            {payments.map((p) => {
              const s = STATUS_STYLE[p.status] ?? STATUS_STYLE.PROCESSING;
              const StatusIcon = s.icon;
              const dep    = p.booking?.trip?.departureAt;
              const origin = p.booking?.trip?.route?.originCity?.name;
              const dest   = p.booking?.trip?.route?.destinationCity?.name;
              const isChecking = checkMut.isPending && checkMut.variables === p.id;

              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-4 px-5 py-4 transition ${
                    p.bookingId ? 'hover:bg-gray-50 cursor-pointer group' : ''
                  }`}
                  onClick={() => p.bookingId && router.push(`/passenger/bookings/${p.bookingId}`)}
                >
                  {/* Status icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.cls}`}>
                    {isChecking
                      ? <Loader2 size={18} className="animate-spin" />
                      : <StatusIcon size={18} />}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900">
                        {origin && dest ? `${origin} → ${dest}` : 'Paiement'}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${s.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                        {s.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400 flex-wrap">
                      <span>{dayjs(p.createdAt).format('ddd D MMM YYYY · HH:mm')}</span>
                      {p.booking?.reference && <span className="font-mono">{p.booking.reference}</span>}
                      <span>{METHOD_LABEL[p.method] ?? p.method}</span>
                      {dep && <span>Départ {dayjs(dep).format('D MMM')}</span>}
                    </div>
                    {p.status === 'FAILED' && p.failReason && (
                      <p className="text-xs text-red-500 mt-0.5">
                        {FAIL_REASON[p.failReason] ?? p.failReason}
                      </p>
                    )}
                  </div>

                  {/* Amount */}
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${p.status === 'SUCCESS' ? 'text-gray-900' : 'text-gray-400'}`}>
                      {formatCFA(p.amount)}
                    </p>
                    {p.providerRef && (
                      <p className="text-xs text-gray-400 mt-0.5 font-mono">{p.providerRef.slice(0, 12)}…</p>
                    )}
                  </div>

                  {/* Vérifier (PROCESSING) ou flèche navigation */}
                  {p.status === 'PROCESSING' ? (
                    <button
                      onClick={(e) => handleRowCheck(p.id, e)}
                      disabled={isChecking}
                      title="Interroger Genius Pay pour le statut réel"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 transition disabled:opacity-40 shrink-0"
                    >
                      <RefreshCw size={12} className={isChecking ? 'animate-spin' : ''} />
                      Vérifier
                    </button>
                  ) : (
                    <ArrowRight size={15} className="text-gray-200 group-hover:text-brand-400 transition shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
