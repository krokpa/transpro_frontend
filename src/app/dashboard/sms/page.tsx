'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Zap, Crown, Star, CheckCircle2,
  Loader2, ArrowUpRight, ChevronLeft, ChevronRight,
  Clock, AlertCircle,
} from 'lucide-react';
import { smsPackagesApi } from '@/lib/api';

type SmsPackage = {
  id: string;
  name: string;
  smsCount: number;
  priceXof: number;
  hasCustomSender: boolean;
};

type PurchaseModalProps = {
  pkg: SmsPackage;
  onClose: () => void;
};

function formatXof(n: number) {
  return n.toLocaleString('fr-CI') + ' FCFA';
}

function PackageIcon({ pkg }: { pkg: SmsPackage }) {
  if (pkg.hasCustomSender) return <Crown size={20} className="text-amber-500" />;
  if (pkg.smsCount >= 2000) return <Star size={20} className="text-brand-500" />;
  return <Zap size={20} className="text-slate-500" />;
}

function PurchaseModal({ pkg, onClose }: PurchaseModalProps) {
  const [customSender, setCustomSender] = useState('');
  const [senderError, setSenderError] = useState('');

  const mutation = useMutation({
    mutationFn: () => smsPackagesApi.purchase(pkg.id, pkg.hasCustomSender ? customSender : undefined) as any,
    onSuccess: (data: any) => {
      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? err?.message ?? 'Erreur de paiement');
    },
  });

  function validate() {
    if (pkg.hasCustomSender) {
      if (!customSender.trim()) { setSenderError('Requis pour cette formule'); return false; }
      if (!/^[A-Z0-9]{3,11}$/i.test(customSender)) {
        setSenderError('3-11 caractères alphanumériques, sans espaces'); return false;
      }
    }
    return true;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
            <PackageIcon pkg={pkg} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{pkg.name}</h2>
            <p className="text-slate-500 text-sm">{pkg.smsCount.toLocaleString('fr-CI')} SMS · {formatXof(pkg.priceXof)}</p>
          </div>
        </div>

        {pkg.hasCustomSender && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Sender personnalisé <span className="text-red-500">*</span>
            </label>
            <input
              value={customSender}
              onChange={(e) => { setCustomSender(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11)); setSenderError(''); }}
              placeholder="ex. SOTRAC-CI"
              className={`w-full border rounded-xl px-4 py-3 text-sm uppercase font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 transition ${senderError ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-slate-50'}`}
            />
            {senderError && <p className="text-red-500 text-xs mt-1">{senderError}</p>}
            <p className="text-xs text-slate-400 mt-1">Affiché comme expéditeur sur tous vos SMS (3-11 caractères)</p>
          </div>
        )}

        <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600 space-y-1.5">
          <div className="flex justify-between">
            <span>Nombre de SMS</span>
            <span className="font-semibold text-slate-900">{pkg.smsCount.toLocaleString('fr-CI')}</span>
          </div>
          <div className="flex justify-between">
            <span>Sender</span>
            <span className="font-semibold text-slate-900">{pkg.hasCustomSender ? (customSender || '—') : 'TRANSPRO-CI'}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
            <span className="font-medium text-slate-700">Total</span>
            <span className="font-bold text-brand-600 text-base">{formatXof(pkg.priceXof)}</span>
          </div>
        </div>

        <p className="text-xs text-slate-400 text-center">Paiement sécurisé via Genius Pay (Wave, Orange Money, MTN MoMo)</p>

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 border border-slate-200 rounded-xl py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
            Annuler
          </button>
          <button
            onClick={() => { if (validate()) mutation.mutate(); }}
            disabled={mutation.isPending}
            className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl py-3 text-sm transition flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {mutation.isPending ? <><Loader2 size={15} className="animate-spin" /> Redirection…</> : <>Payer <ArrowUpRight size={15} /></>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function SmsDashboardPage() {
  const qc = useQueryClient();
  const [selectedPkg, setSelectedPkg] = useState<SmsPackage | null>(null);
  const [logsPage, setLogsPage] = useState(1);

  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ['sms-balance'],
    queryFn: () => smsPackagesApi.balance() as any,
    refetchInterval: 30_000,
  });

  const { data: packages, isLoading: pkgLoading } = useQuery({
    queryKey: ['sms-packages'],
    queryFn: () => smsPackagesApi.listActive() as any,
    staleTime: 5 * 60 * 1000,
  });

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['sms-logs', logsPage],
    queryFn: () => smsPackagesApi.logs(logsPage) as any,
  });

  const total = balance?.total ?? 0;
  const customSender = balance?.customSender ?? 'TRANSPRO-CI';
  const pkgList: SmsPackage[] = (packages as SmsPackage[]) ?? [];

  // Couleur de la jauge selon niveau
  const gaugeColor = total > 200 ? 'bg-green-500' : total > 50 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Crédits SMS</h1>
        <p className="text-slate-500 text-sm mt-1">Gérez vos crédits SMS et envoyez des notifications à vos passagers.</p>
      </div>

      {/* Balance card */}
      <div className="bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl p-6 text-white shadow-lg shadow-brand-500/20">
        {balanceLoading ? (
          <div className="flex items-center gap-3 py-2"><Loader2 size={20} className="animate-spin opacity-70" /> Chargement…</div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-brand-100 text-sm font-medium">SMS disponibles</p>
                <p className="text-4xl font-bold mt-0.5">{total.toLocaleString('fr-CI')}</p>
              </div>
              <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center">
                <MessageSquare size={28} />
              </div>
            </div>

            {/* Gauge bar */}
            {balance?.credits?.length > 0 && (
              <div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full bg-white`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (total / (balance.credits[0]?.remaining + total || 1)) * 100)}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="text-brand-100">Sender : <span className="font-semibold text-white">{customSender}</span></span>
              {total === 0 && (
                <span className="flex items-center gap-1 text-amber-200 font-medium">
                  <AlertCircle size={14} /> Crédits épuisés
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Packages */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Acheter des SMS</h2>
        {pkgLoading ? (
          <div className="flex items-center gap-3 text-slate-500"><Loader2 size={18} className="animate-spin" /> Chargement des formules…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {pkgList.map((pkg, i) => {
              const featured = pkg.hasCustomSender || i === 1;
              return (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className={`relative rounded-2xl border-2 p-5 flex flex-col gap-4 transition cursor-default ${
                    featured
                      ? 'border-brand-500 bg-brand-50 shadow-md shadow-brand-500/10'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  {featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-xs font-bold px-3 py-0.5 rounded-full">
                      {pkg.hasCustomSender ? 'Sender perso' : 'Populaire'}
                    </div>
                  )}

                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${featured ? 'bg-brand-100' : 'bg-slate-100'}`}>
                      <PackageIcon pkg={pkg} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{pkg.name}</p>
                      <p className="text-xs text-slate-500">{pkg.smsCount.toLocaleString('fr-CI')} SMS</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-2xl font-bold text-slate-900">{formatXof(pkg.priceXof)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      ~{Math.round(pkg.priceXof / pkg.smsCount)} FCFA / SMS
                    </p>
                  </div>

                  <ul className="space-y-1.5 text-xs text-slate-600 flex-1">
                    <li className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-green-500 flex-shrink-0" /> {pkg.smsCount.toLocaleString('fr-CI')} SMS inclus</li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className={`flex-shrink-0 ${pkg.hasCustomSender ? 'text-green-500' : 'text-slate-300'}`} />
                      {pkg.hasCustomSender ? 'Sender personnalisé inclus' : 'Sender : TRANSPRO-CI'}
                    </li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-green-500 flex-shrink-0" /> Sans expiration</li>
                  </ul>

                  <button
                    onClick={() => setSelectedPkg(pkg)}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold transition ${
                      featured
                        ? 'bg-brand-500 hover:bg-brand-600 text-white shadow-sm shadow-brand-500/30'
                        : 'border border-slate-300 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    Acheter
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Logs */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Historique des envois</h2>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {logsLoading ? (
            <div className="flex items-center gap-3 text-slate-500 p-6"><Loader2 size={18} className="animate-spin" /> Chargement…</div>
          ) : !logs?.items?.length ? (
            <div className="text-center py-12 text-slate-400">
              <MessageSquare size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Aucun SMS envoyé pour l'instant</p>
            </div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase">Destinataire</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase hidden md:table-cell">Message</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase">Sender</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase">Statut</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase hidden sm:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.items.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">{log.to}</td>
                      <td className="px-4 py-3 text-slate-600 hidden md:table-cell max-w-xs truncate" title={log.message}>{log.message}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-slate-100 rounded-md text-xs font-medium text-slate-600">{log.sender}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1 text-xs font-medium w-fit ${log.status === 'sent' ? 'text-green-600' : 'text-red-500'}`}>
                          {log.status === 'sent' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                          {log.status === 'sent' ? 'Envoyé' : 'Échec'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs hidden sm:table-cell">
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {new Date(log.createdAt).toLocaleDateString('fr-CI', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {logs.pages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
                  <p className="text-xs text-slate-500">{logs.total} envoi(s) total</p>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={logsPage === 1}
                      onClick={() => setLogsPage((p) => p - 1)}
                      className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span className="text-xs text-slate-600">{logsPage} / {logs.pages}</span>
                    <button
                      disabled={logsPage === logs.pages}
                      onClick={() => setLogsPage((p) => p + 1)}
                      className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal achat */}
      <AnimatePresence>
        {selectedPkg && (
          <PurchaseModal pkg={selectedPkg} onClose={() => setSelectedPkg(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
