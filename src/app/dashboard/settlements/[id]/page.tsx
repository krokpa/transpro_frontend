'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settlementsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { formatCFA } from '@transpro/shared';
import {
  ArrowLeft, CheckCircle2, XCircle, Clock, Loader2,
  ChevronRight, CreditCard, Banknote, Building2,
  AlertCircle, Hash, Calendar, Landmark, PenLine,
  Info, ShieldCheck, TrendingDown,
} from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

dayjs.locale('fr');

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ElementType; bg: string; desc: string }> = {
  PENDING:    {
    label: 'En attente de traitement',
    cls:   'text-amber-700',
    bg:    'bg-amber-50 border-amber-200',
    icon:  Clock,
    desc:  'Votre reversement est calculé. Soumettez vos coordonnées bancaires pour accélérer le traitement.',
  },
  PROCESSING: {
    label: 'Virement initié',
    cls:   'text-blue-700',
    bg:    'bg-blue-50 border-blue-200',
    icon:  Loader2,
    desc:  'TransPro a initié le virement bancaire. Il apparaîtra sur votre compte dans 1 à 3 jours ouvrés.',
  },
  PAID: {
    label: 'Reversement effectué',
    cls:   'text-emerald-700',
    bg:    'bg-emerald-50 border-emerald-200',
    icon:  CheckCircle2,
    desc:  'Le montant a été versé sur votre compte bancaire.',
  },
  FAILED: {
    label: 'Virement échoué',
    cls:   'text-red-600',
    bg:    'bg-red-50 border-red-200',
    icon:  XCircle,
    desc:  'Le virement a échoué. Mettez à jour vos coordonnées bancaires et contactez TransPro.',
  },
};

const METHOD_LABEL: Record<string, string> = {
  GENIUS_PAY:   'Genius Pay',
  ORANGE_MONEY: 'Orange Money',
  MTN_MOMO:     'MTN MoMo',
  WAVE:         'Wave',
  CARD:         'Carte bancaire',
  CASH:         'Espèces',
};

const CHANNEL_COLOR: Record<string, string> = {
  wave:         '#1B9AF7',
  orange_money: '#FF7900',
  mtn_momo:     '#FFC107',
  card:         '#6366F1',
  default:      '#94A3B8',
};

export default function CompanySettlementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const [editingBank, setEditingBank] = useState(false);
  const [bankName,    setBankName]    = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankNotes,   setBankNotes]   = useState('');

  if (user?.role === 'SUPER_ADMIN') {
    router.replace(`/dashboard/admin/settlements/${id}`);
    return null;
  }

  const { data: raw, isLoading } = useQuery({
    queryKey: ['my-settlement', id],
    queryFn: () => settlementsApi.get(id) as any,
    staleTime: 15_000,
  });

  const s = (raw as any)?.data ?? raw;

  useEffect(() => {
    if (s) {
      setBankName(s.bankName ?? '');
      setBankAccount(s.bankAccount ?? '');
      setBankNotes(s.notes ?? '');
    }
  }, [s?.id]);

  const bankMut = useMutation({
    mutationFn: () => settlementsApi.submitBankDetails(id, {
      bankName:    bankName.trim(),
      bankAccount: bankAccount.trim(),
      notes:       bankNotes.trim() || undefined,
    }) as any,
    onSuccess: () => {
      toast.success('Coordonnées bancaires enregistrées');
      qc.invalidateQueries({ queryKey: ['my-settlement', id] });
      qc.invalidateQueries({ queryKey: ['settlements-list'] });
      setEditingBank(false);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur lors de l\'enregistrement'),
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
        <Link href="/dashboard/settlements" className="text-indigo-600 text-sm mt-2 block">Retour</Link>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.PENDING;
  const StatusIcon = cfg.icon;
  const needsBank = (s.status === 'PENDING' || s.status === 'FAILED') && (!s.bankName || !s.bankAccount);

  // Distribution des canaux de paiement
  const channelMap: Record<string, number> = {};
  (s.items ?? []).forEach((item: any) => {
    const ch = item.payment?.paymentChannel ?? item.payment?.method ?? 'other';
    channelMap[ch] = (channelMap[ch] ?? 0) + item.amount;
  });
  const pieData = Object.entries(channelMap).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard/settlements" className="hover:text-gray-700 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Reversements
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-900 font-medium capitalize">
          {dayjs(s.periodStart).format('MMMM YYYY')}
        </span>
      </div>

      {/* Bannière statut */}
      <div className={`flex items-start gap-3 rounded-xl border p-4 ${cfg.bg}`}>
        <StatusIcon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${cfg.cls}`} />
        <div>
          <p className={`text-sm font-semibold ${cfg.cls}`}>{cfg.label}</p>
          <p className={`text-xs mt-0.5 ${cfg.cls} opacity-80`}>{cfg.desc}</p>
          {s.status === 'PAID' && s.processedAt && (
            <p className={`text-xs mt-1 font-medium ${cfg.cls}`}>
              Versé le {dayjs(s.processedAt).format('D MMMM YYYY')}
              {s.transferRef && ` · Réf : ${s.transferRef}`}
            </p>
          )}
        </div>
      </div>

      {/* Alerte coordonnées manquantes */}
      {needsBank && (
        <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-800">Action requise : coordonnées bancaires</p>
            <p className="text-xs text-orange-700 mt-0.5">
              Pour que TransPro traite votre reversement de <strong>{formatCFA(s.netAmount)}</strong>,
              veuillez renseigner vos coordonnées bancaires ci-dessous.
            </p>
          </div>
        </div>
      )}

      {/* Grille principale */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Col gauche — montants + camembert */}
        <div className="lg:col-span-2 space-y-5">
          {/* Décomposition financière */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Banknote className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Décomposition financière</h2>
                <p className="text-xs text-gray-400">
                  Période : {dayjs(s.periodStart).format('D MMM')} → {dayjs(s.periodEnd).format('D MMM YYYY')}
                </p>
              </div>
            </div>

            {/* Barre de décomposition visuelle */}
            <div className="relative h-4 rounded-full overflow-hidden bg-gray-100 mb-4">
              <div
                className="absolute left-0 top-0 h-full bg-indigo-500"
                style={{ width: `${(s.netAmount / s.totalAmount) * 100}%` }}
              />
              <div
                className="absolute top-0 h-full bg-amber-400"
                style={{
                  left:  `${(s.netAmount / s.totalAmount) * 100}%`,
                  width: `${(s.geniusPayFees / s.totalAmount) * 100}%`,
                }}
              />
              <div
                className="absolute top-0 h-full bg-slate-300"
                style={{
                  left:  `${((s.netAmount + s.geniusPayFees) / s.totalAmount) * 100}%`,
                  width: `${(s.commissions / s.totalAmount) * 100}%`,
                }}
              />
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500 mb-6">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Net</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Frais GP</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-300" /> Commission</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Montant brut collecté',  value: formatCFA(s.totalAmount),    cls: 'text-gray-900', sub: `${s.itemCount} transactions en ligne` },
                { label: 'Frais Genius Pay (1%)',   value: `-${formatCFA(s.geniusPayFees)}`, cls: 'text-amber-600', sub: 'Frais prestataire paiement' },
                { label: 'Commission TransPro (4%)', value: `-${formatCFA(s.commissions)}`, cls: 'text-slate-500', sub: 'Commission plateforme' },
                { label: 'Net à vous reverser',     value: formatCFA(s.netAmount),     cls: 'text-2xl font-bold text-indigo-700', sub: '✓ Montant qui vous est dû' },
              ].map((row) => (
                <div key={row.label} className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 font-medium">{row.label}</p>
                  <p className={`mt-1 font-semibold ${row.cls}`}>{row.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{row.sub}</p>
                </div>
              ))}
            </div>

            {/* Note explicative */}
            <div className="mt-4 flex gap-2 text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>
                Les paiements en espèces (CASH) sont exclus de ce calcul — vous les encaissez directement en gare.
                Seuls les paiements Genius Pay (mobile money, carte) sont inclus.
              </span>
            </div>
          </div>

          {/* Répartition par canal */}
          {pieData.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-sm font-bold text-gray-900 mb-4">Répartition par canal de paiement</h2>
              <div className="flex items-center">
                <ResponsiveContainer width="50%" height={180}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={CHANNEL_COLOR[entry.name] ?? CHANNEL_COLOR.default} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => formatCFA(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2.5">
                  {pieData.map((entry) => (
                    <div key={entry.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ background: CHANNEL_COLOR[entry.name] ?? CHANNEL_COLOR.default }}
                        />
                        <span className="text-gray-600 capitalize">{entry.name.replace('_', ' ')}</span>
                      </div>
                      <span className="font-semibold text-gray-800">{formatCFA(entry.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Col droite — coordonnées bancaires + infos */}
        <div className="space-y-4">
          {/* Coordonnées bancaires */}
          {(s.status === 'PENDING' || s.status === 'FAILED') && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-gray-500" />
                  <h3 className="text-sm font-bold text-gray-900">Coordonnées bancaires</h3>
                </div>
                {!editingBank && (s.bankName || s.bankAccount) && (
                  <button
                    onClick={() => setEditingBank(true)}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                  >
                    <PenLine className="w-3.5 h-3.5" /> Modifier
                  </button>
                )}
              </div>

              {!editingBank && (s.bankName || s.bankAccount) ? (
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400">Banque</p>
                    <p className="text-sm font-semibold text-gray-800 mt-0.5">{s.bankName || '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400">Numéro de compte</p>
                    <p className="text-sm font-semibold text-gray-800 mt-0.5 font-mono">{s.bankAccount || '—'}</p>
                  </div>
                  {s.notes && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-400">Note</p>
                      <p className="text-xs text-gray-600 mt-0.5">{s.notes}</p>
                    </div>
                  )}
                  <div className="flex gap-1.5 text-xs text-emerald-600 bg-emerald-50 rounded-lg p-2.5">
                    <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>Coordonnées transmises à TransPro. Votre reversement sera traité prochainement.</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {needsBank && !editingBank && (
                    <p className="text-xs text-gray-500 mb-3">
                      Renseignez vos coordonnées bancaires pour recevoir votre reversement de{' '}
                      <strong className="text-indigo-700">{formatCFA(s.netAmount)}</strong>.
                    </p>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Banque *</label>
                    <input
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="Ex: Ecobank, Société Générale CI…"
                      className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Numéro de compte *</label>
                    <input
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      placeholder="CI12 XXXX XXXX XXXX"
                      className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Message (optionnel)</label>
                    <textarea
                      value={bankNotes}
                      onChange={(e) => setBankNotes(e.target.value)}
                      rows={2}
                      placeholder="Informations complémentaires pour TransPro…"
                      className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    {editingBank && (
                      <button
                        onClick={() => setEditingBank(false)}
                        className="flex-1 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50"
                      >
                        Annuler
                      </button>
                    )}
                    <button
                      onClick={() => bankMut.mutate()}
                      disabled={!bankName.trim() || !bankAccount.trim() || bankMut.isPending}
                      className="flex-1 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {bankMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                      Soumettre ma demande
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Infos virement (si PROCESSING ou PAID) */}
          {(s.status === 'PROCESSING' || s.status === 'PAID') && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-bold text-gray-900">Informations du virement</h3>
              </div>
              {s.bankName && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Banque</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">{s.bankName}</p>
                </div>
              )}
              {s.bankAccount && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Compte destinataire</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5 font-mono">{s.bankAccount}</p>
                </div>
              )}
              {s.transferRef && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Référence virement</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5 font-mono">{s.transferRef}</p>
                </div>
              )}
              {s.processedAt && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Date de traitement</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">
                    {dayjs(s.processedAt).format('D MMMM YYYY [à] HH[h]mm')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Récap compact */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
            <h3 className="text-sm font-bold text-gray-900">Résumé</h3>
            {[
              { icon: Calendar, label: 'Période',        value: `${dayjs(s.periodStart).format('D MMM')} → ${dayjs(s.periodEnd).format('D MMM YYYY')}` },
              { icon: Hash,     label: 'Transactions',   value: `${s.itemCount} paiement${s.itemCount > 1 ? 's' : ''}` },
              { icon: TrendingDown, label: 'Taux total', value: `5% (1% GP + 4% commission)` },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-3 text-sm">
                <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <row.icon className="w-3.5 h-3.5 text-gray-500" />
                </div>
                <span className="text-gray-500 text-xs flex-1">{row.label}</span>
                <span className="text-gray-800 font-medium text-xs">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tableau des transactions */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">
            Transactions incluses
            <span className="ml-2 text-xs font-normal text-gray-400">({s.items?.length ?? 0})</span>
          </h2>
          <div className="text-xs text-gray-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Données auditées
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-5 py-3 text-left">Réservation</th>
                <th className="px-5 py-3 text-left">Trajet</th>
                <th className="px-5 py-3 text-left">Date</th>
                <th className="px-5 py-3 text-left">Canal</th>
                <th className="px-5 py-3 text-right">Brut</th>
                <th className="px-5 py-3 text-right">
                  <span className="text-amber-500">Frais GP</span>
                </th>
                <th className="px-5 py-3 text-right">
                  <span className="text-slate-500">Commission</span>
                </th>
                <th className="px-5 py-3 text-right text-indigo-600">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(s.items ?? []).map((item: any) => {
                const pmt   = item.payment;
                const book  = pmt?.booking;
                const route = book?.trip?.route;
                return (
                  <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3">
                      <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                        {book?.reference ?? '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {route
                        ? <span className="flex items-center gap-1 text-xs">
                            {route.originCity?.name}
                            <ChevronRight className="w-3 h-3 text-gray-300" />
                            {route.destinationCity?.name}
                          </span>
                        : '—'}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {book?.trip?.departureAt ? dayjs(book.trip.departureAt).format('D MMM YYYY') : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                        <CreditCard className="w-3 h-3" />
                        {pmt?.paymentChannel
                          ? pmt.paymentChannel.replace('_', ' ')
                          : (METHOD_LABEL[pmt?.method] ?? '—')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-sm text-gray-700 tabular-nums">
                      {formatCFA(item.amount)}
                    </td>
                    <td className="px-5 py-3 text-right text-sm text-amber-500 tabular-nums">
                      -{formatCFA(item.geniusPayFee)}
                    </td>
                    <td className="px-5 py-3 text-right text-sm text-slate-400 tabular-nums">
                      -{formatCFA(item.commissionAmount)}
                    </td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-indigo-700 tabular-nums">
                      {formatCFA(item.netAmount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {(s.items?.length ?? 0) > 0 && (
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td colSpan={4} className="px-5 py-3 text-xs font-bold text-gray-400 uppercase">Total</td>
                  <td className="px-5 py-3 text-right text-sm font-bold text-gray-800 tabular-nums">{formatCFA(s.totalAmount)}</td>
                  <td className="px-5 py-3 text-right text-sm font-bold text-amber-500 tabular-nums">-{formatCFA(s.geniusPayFees)}</td>
                  <td className="px-5 py-3 text-right text-sm font-bold text-slate-400 tabular-nums">-{formatCFA(s.commissions)}</td>
                  <td className="px-5 py-3 text-right text-sm font-bold text-indigo-700 tabular-nums">{formatCFA(s.netAmount)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
