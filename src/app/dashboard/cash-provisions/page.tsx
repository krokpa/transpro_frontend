'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cashProvisionsApi, stationsApi } from '@/lib/api';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { formatCFA } from '@transpro/shared';
import {
  Wallet, CheckCircle2, XCircle, Clock, Loader2, Plus,
  Filter, RefreshCw, Building2, Send, PackageCheck,
  ArrowRight, AlertCircle, ChevronRight,
} from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { toast } from 'sonner';

dayjs.locale('fr');

const STATUS_STEPS = ['REQUESTED', 'APPROVED', 'SENT', 'RECEIVED'];

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ElementType; step: number }> = {
  REQUESTED: { label: 'Demandée',  cls: 'bg-amber-100 text-amber-700',    icon: Clock,         step: 0 },
  APPROVED:  { label: 'Approuvée', cls: 'bg-blue-100 text-blue-700',      icon: CheckCircle2,  step: 1 },
  SENT:      { label: 'Envoyée',   cls: 'bg-indigo-100 text-indigo-700',  icon: Send,          step: 2 },
  RECEIVED:  { label: 'Reçue',     cls: 'bg-emerald-100 text-emerald-700', icon: PackageCheck, step: 3 },
  REJECTED:  { label: 'Rejetée',   cls: 'bg-red-100 text-red-600',        icon: XCircle,       step: -1 },
};

function ProvisionTimeline({ status }: { status: string }) {
  const currentStep = STATUS_CONFIG[status]?.step ?? -1;
  if (status === 'REJECTED') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-red-500">
        <XCircle className="w-3.5 h-3.5" /> Rejetée
      </div>
    );
  }
  return (
    <div className="flex items-center gap-0.5">
      {STATUS_STEPS.map((s, i) => {
        const done = currentStep > i;
        const active = currentStep === i;
        return (
          <div key={s} className="flex items-center gap-0.5">
            <div className={`w-2 h-2 rounded-full ${done ? 'bg-emerald-500' : active ? 'bg-indigo-500' : 'bg-gray-200'}`} />
            {i < STATUS_STEPS.length - 1 && (
              <div className={`w-4 h-0.5 ${done ? 'bg-emerald-300' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function NewProvisionModal({
  stations, onClose, onCreated,
}: {
  stations: any[]; onClose: () => void; onCreated: () => void;
}) {
  const { user } = useAuthStore();
  const [form, setForm] = useState({
    stationId: user?.stationIds?.[0] ?? stations[0]?.id ?? '',
    amount: '',
    reason: '',
    notes: '',
  });

  const mut = useMutation({
    mutationFn: () => cashProvisionsApi.create({ ...form, amount: parseInt(form.amount) }) as any,
    onSuccess: () => { toast.success('Demande envoyée'); onCreated(); onClose(); },
    onError:   (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Demande d'approvisionnement</h2>
          <p className="text-sm text-gray-500 mt-0.5">La demande sera traitée après approbation du responsable.</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Gare *</label>
            <select value={form.stationId} onChange={e => set('stationId', e.target.value)}
              className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300">
              {stations.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Montant demandé (FCFA) *</label>
            <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)}
              placeholder="Ex: 50000" min="1000"
              className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Motif *</label>
            <input value={form.reason} onChange={e => set('reason', e.target.value)}
              placeholder="Ex: Réapprovisionnement hebdomadaire de la caisse" maxLength={200}
              className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optionnel)</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              rows={2} placeholder="Informations complémentaires…"
              className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">Annuler</button>
          <button
            onClick={() => mut.mutate()}
            disabled={!form.stationId || !form.reason || !form.amount || mut.isPending}
            className="flex-1 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {mut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Envoyer la demande
          </button>
        </div>
      </div>
    </div>
  );
}

function RejectModal({ id, onClose, onDone }: { id: string; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const mut = useMutation({
    mutationFn: () => cashProvisionsApi.reject(id, reason) as any,
    onSuccess: () => { toast.success('Demande rejetée'); onDone(); onClose(); },
    onError:   (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Rejeter la demande</h2>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Motif *</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
            placeholder="Expliquez le motif du rejet…"
            className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 resize-none" />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">Annuler</button>
          <button onClick={() => mut.mutate()} disabled={!reason.trim() || mut.isPending}
            className="flex-1 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {mut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Rejeter
          </button>
        </div>
      </div>
    </div>
  );
}

function SendModal({ id, onClose, onDone }: { id: string; onClose: () => void; onDone: () => void }) {
  const [notes, setNotes] = useState('');
  const mut = useMutation({
    mutationFn: () => cashProvisionsApi.send(id, notes) as any,
    onSuccess: () => { toast.success('Envoi confirmé'); onDone(); onClose(); },
    onError:   (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Confirmer l'envoi des fonds</h2>
        <p className="text-sm text-gray-500">En confirmant, vous attestez que les fonds ont été envoyés à la gare.</p>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Notes de transfert (optionnel)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            placeholder="N° virement, référence, note…"
            className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">Annuler</button>
          <button onClick={() => mut.mutate()} disabled={mut.isPending}
            className="flex-1 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {mut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirmer l'envoi
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CashProvisionsPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [showNew,    setShowNew]    = useState(false);
  const [rejectId,   setRejectId]   = useState<string | null>(null);
  const [sendId,     setSendId]     = useState<string | null>(null);
  const [filterStatus,  setFilterStatus]  = useState('');
  const [filterStation, setFilterStation] = useState('');

  const canApprove  = user?.perms?.includes('provisions:approve') || ['COMPANY_OWNER', 'COMPANY_ADMIN'].includes(user?.role ?? '');
  const canCreate   = user?.perms?.includes('provisions:manage');
  const canSend     = ['COMPANY_OWNER', 'COMPANY_ADMIN', 'COMPANY_ACCOUNTANT'].includes(user?.role ?? '');

  const { data: rawStations = [] } = useQuery({
    queryKey: ['stations-list'],
    queryFn: () => stationsApi.list() as any,
    staleTime: 120_000,
  });
  const stations: any[] = Array.isArray(rawStations) ? rawStations : (rawStations as any)?.data ?? [];

  const { data: rawProvisions = [], isLoading } = useQuery({
    queryKey: ['cash-provisions', filterStatus, filterStation],
    queryFn: () => cashProvisionsApi.list({
      ...(filterStatus  ? { status:    filterStatus }  : {}),
      ...(filterStation ? { stationId: filterStation } : {}),
    }) as any,
    staleTime: 30_000,
  });
  const provisions: any[] = Array.isArray(rawProvisions) ? rawProvisions : (rawProvisions as any)?.data ?? [];

  const approveMut = useMutation({
    mutationFn: (id: string) => cashProvisionsApi.approve(id) as any,
    onSuccess: () => { toast.success('Demande approuvée'); qc.invalidateQueries({ queryKey: ['cash-provisions'] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });

  const receiveMut = useMutation({
    mutationFn: (id: string) => cashProvisionsApi.receive(id) as any,
    onSuccess: () => { toast.success('Réception confirmée'); qc.invalidateQueries({ queryKey: ['cash-provisions'] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['cash-provisions'] });

  const pending   = provisions.filter(p => p.status === 'REQUESTED');
  const approved  = provisions.filter(p => p.status === 'APPROVED');
  const sent      = provisions.filter(p => p.status === 'SENT');
  const received  = provisions.filter(p => p.status === 'RECEIVED');

  const totalPending  = pending.reduce((a, p) => a + p.amount, 0);
  const totalApproved = approved.reduce((a, p) => a + p.amount, 0);
  const totalSent     = sent.reduce((a, p) => a + p.amount, 0);
  const totalReceived = received.reduce((a, p) => a + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Approvisionnement de caisse</h1>
          <p className="text-sm text-gray-500 mt-1">Gestion des dotations en espèces pour les gares</p>
        </div>
        {canCreate && (
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
            <Plus className="w-4 h-4" /> Nouvelle demande
          </button>
        )}
      </div>

      {/* KPI pipeline */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'En attente',      count: pending.length,  value: totalPending,  cls: 'border-amber-200 bg-amber-50',   textCls: 'text-amber-700',   dotCls: 'bg-amber-400' },
          { label: 'Approuvées',      count: approved.length, value: totalApproved, cls: 'border-blue-200 bg-blue-50',     textCls: 'text-blue-700',    dotCls: 'bg-blue-400' },
          { label: 'En transit',      count: sent.length,     value: totalSent,     cls: 'border-indigo-200 bg-indigo-50', textCls: 'text-indigo-700',  dotCls: 'bg-indigo-400' },
          { label: 'Reçues (mois)',   count: received.length, value: totalReceived, cls: 'border-emerald-200 bg-emerald-50', textCls: 'text-emerald-700', dotCls: 'bg-emerald-400' },
        ].map((kpi, i) => (
          <div key={i} className={`rounded-xl border p-3 ${kpi.cls}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <div className={`w-2 h-2 rounded-full ${kpi.dotCls}`} />
              <p className="text-xs font-medium text-gray-500">{kpi.label}</p>
            </div>
            <p className={`text-lg font-bold ${kpi.textCls}`}>{formatCFA(kpi.value)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{kpi.count} demande{kpi.count !== 1 ? 's' : ''}</p>
          </div>
        ))}
      </div>

      {/* Alertes */}
      {canApprove && pending.length > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>{pending.length} demande{pending.length > 1 ? 's' : ''}</strong> en attente d'approbation — total{' '}
            <strong>{formatCFA(totalPending)}</strong>.
          </p>
        </div>
      )}
      {canSend && sent.length > 0 && (
        <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl p-3">
          <Send className="w-4 h-4 text-indigo-500 flex-shrink-0" />
          <p className="text-sm text-indigo-800">
            <strong>{sent.length} envoi{sent.length > 1 ? 's' : ''}</strong> en transit — en attente de confirmation de réception par les gares.
          </p>
        </div>
      )}

      {/* Filtres */}
      <div className="flex items-center gap-3 flex-wrap bg-white rounded-xl border border-gray-200 p-3">
        <Filter className="w-4 h-4 text-gray-400" />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="text-sm border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-300">
          <option value="">Tous statuts</option>
          <option value="REQUESTED">En attente</option>
          <option value="APPROVED">Approuvées</option>
          <option value="SENT">Envoyées</option>
          <option value="RECEIVED">Reçues</option>
          <option value="REJECTED">Rejetées</option>
        </select>
        <select value={filterStation} onChange={e => setFilterStation(e.target.value)}
          className="text-sm border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-300">
          <option value="">Toutes gares</option>
          {stations.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {(filterStatus || filterStation) && (
          <button onClick={() => { setFilterStatus(''); setFilterStation(''); }}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Reset
          </button>
        )}
      </div>

      {/* Liste */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-200">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Chargement…
          </div>
        ) : provisions.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-200">
            <Wallet className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">Aucune demande d'approvisionnement</p>
          </div>
        ) : (
          provisions.map((p: any) => {
            const sc = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.REQUESTED;
            const SI = sc.icon;
            return (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${sc.cls}`}>
                    <SI className="w-4 h-4" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-sm font-semibold text-gray-900">{p.station?.name}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sc.cls}`}>{sc.label}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5">{p.reason}</p>
                        {p.notes && <p className="text-xs text-gray-400 mt-0.5">{p.notes}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-bold text-gray-900">{formatCFA(p.amount)}</p>
                        <p className="text-xs text-gray-400">{dayjs(p.createdAt).format('D MMM YYYY')}</p>
                      </div>
                    </div>

                    {/* Timeline + Actions */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <ProvisionTimeline status={p.status} />
                        <span className="text-xs text-gray-400">
                          par {p.requester ? `${p.requester.firstName} ${p.requester.lastName[0]}.` : '—'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Approve */}
                        {canApprove && p.status === 'REQUESTED' && (
                          <>
                            <button
                              onClick={() => approveMut.mutate(p.id)}
                              disabled={approveMut.isPending}
                              className="flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approuver
                            </button>
                            <button
                              onClick={() => setRejectId(p.id)}
                              className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-800 px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Rejeter
                            </button>
                          </>
                        )}
                        {/* Send */}
                        {canSend && p.status === 'APPROVED' && (
                          <button
                            onClick={() => setSendId(p.id)}
                            className="flex items-center gap-1 text-xs font-medium text-indigo-700 hover:text-indigo-900 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors"
                          >
                            <Send className="w-3.5 h-3.5" /> Confirmer envoi <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                        {/* Receive */}
                        {p.status === 'SENT' && (
                          <button
                            onClick={() => receiveMut.mutate(p.id)}
                            disabled={receiveMut.isPending}
                            className="flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-900 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors"
                          >
                            {receiveMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PackageCheck className="w-3.5 h-3.5" />}
                            Marquer reçu
                          </button>
                        )}
                        {/* Rejected reason */}
                        {p.status === 'REJECTED' && p.rejectedReason && (
                          <span className="text-xs text-red-500 max-w-[200px] truncate" title={p.rejectedReason}>
                            {p.rejectedReason}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showNew && <NewProvisionModal stations={stations} onClose={() => setShowNew(false)} onCreated={invalidate} />}
      {rejectId && <RejectModal id={rejectId} onClose={() => setRejectId(null)} onDone={invalidate} />}
      {sendId   && <SendModal   id={sendId}   onClose={() => setSendId(null)}   onDone={invalidate} />}
    </div>
  );
}
