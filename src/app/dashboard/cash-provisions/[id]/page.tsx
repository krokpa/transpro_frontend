'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cashProvisionsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { formatCFA } from '@transpro/shared';
import {
  ArrowLeft, CheckCircle2, XCircle, Clock, Building2,
  CalendarDays, User, FileText, Loader2, Send, PackageCheck,
  ArrowRight, AlertCircle,
} from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { toast } from 'sonner';
import Link from 'next/link';
import { useState } from 'react';

dayjs.locale('fr');

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ElementType; desc: string }> = {
  REQUESTED: { label: 'En attente',  cls: 'bg-amber-100 text-amber-700 border-amber-200',     icon: Clock,         desc: 'Demande soumise, en attente d\'approbation.' },
  APPROVED:  { label: 'Approuvée',   cls: 'bg-blue-100 text-blue-700 border-blue-200',         icon: CheckCircle2,  desc: 'Demande approuvée, en attente d\'envoi des fonds.' },
  SENT:      { label: 'En transit',  cls: 'bg-indigo-100 text-indigo-700 border-indigo-200',   icon: Send,          desc: 'Fonds envoyés, en attente de confirmation de réception.' },
  RECEIVED:  { label: 'Reçue',       cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: PackageCheck, desc: 'Fonds reçus et confirmés par la gare.' },
  REJECTED:  { label: 'Rejetée',     cls: 'bg-red-100 text-red-600 border-red-200',             icon: XCircle,       desc: 'Demande refusée par l\'approbateur.' },
};

const STEPS = [
  { key: 'REQUESTED', label: 'Demande' },
  { key: 'APPROVED',  label: 'Approbation' },
  { key: 'SENT',      label: 'Envoi' },
  { key: 'RECEIVED',  label: 'Réception' },
];

function StatusTimeline({ status }: { status: string }) {
  const stepIndex = STEPS.findIndex(s => s.key === status);
  const rejected  = status === 'REJECTED';

  return (
    <div className="flex items-center justify-between px-4 py-3">
      {STEPS.map((step, i) => {
        const done   = !rejected && stepIndex > i;
        const active = !rejected && stepIndex === i;
        return (
          <div key={step.key} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                ${done ? 'bg-emerald-500 text-white' : active ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                {done ? '✓' : i + 1}
              </div>
              <span className={`text-[10px] font-medium ${active ? 'text-indigo-600' : done ? 'text-emerald-600' : 'text-gray-400'}`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-4 ${done ? 'bg-emerald-400' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function CashProvisionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [showReject, setShowReject] = useState(false);
  const [showSend,   setShowSend]   = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [sendNotes,    setSendNotes]    = useState('');

  const canApprove = user?.perms?.includes('provisions:approve') || ['COMPANY_OWNER', 'COMPANY_ADMIN'].includes(user?.role ?? '');
  const canSend    = ['COMPANY_OWNER', 'COMPANY_ADMIN', 'COMPANY_ACCOUNTANT'].includes(user?.role ?? '');

  const { data: provision, isLoading } = useQuery({
    queryKey: ['cash-provision', id],
    queryFn: () => cashProvisionsApi.get(id) as any,
  });
  const p = provision as any;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['cash-provision', id] });
    qc.invalidateQueries({ queryKey: ['cash-provisions'] });
  };

  const approveMut = useMutation({
    mutationFn: () => cashProvisionsApi.approve(id) as any,
    onSuccess: () => { toast.success('Demande approuvée'); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });

  const sendMut = useMutation({
    mutationFn: () => cashProvisionsApi.send(id, sendNotes) as any,
    onSuccess: () => { toast.success('Envoi confirmé'); setShowSend(false); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });

  const receiveMut = useMutation({
    mutationFn: () => cashProvisionsApi.receive(id) as any,
    onSuccess: () => { toast.success('Réception confirmée'); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });

  const rejectMut = useMutation({
    mutationFn: () => cashProvisionsApi.reject(id, rejectReason) as any,
    onSuccess: () => { toast.success('Demande rejetée'); setShowReject(false); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Chargement…
      </div>
    );
  }

  if (!p) return null;

  const stat = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.REQUESTED;
  const SI   = stat.icon;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/cash-provisions"
          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Approvisionnement</h1>
          <p className="text-xs text-gray-400 font-mono mt-0.5">{p.id.slice(0, 8)}…</p>
        </div>
      </div>

      {/* Statut */}
      <div className={`flex items-start gap-3 rounded-xl border p-4 ${stat.cls}`}>
        <SI className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-sm">{stat.label}</p>
          <p className="text-xs mt-0.5 opacity-80">{stat.desc}</p>
          {p.status === 'REJECTED' && p.rejectedReason && (
            <p className="text-sm font-medium mt-1">Motif : {p.rejectedReason}</p>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl border border-gray-200 py-2">
        <StatusTimeline status={p.status} />
      </div>

      {/* Montant */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Montant demandé</p>
        <p className="text-4xl font-bold text-gray-900">{formatCFA(p.amount)}</p>
      </div>

      {/* Détails */}
      <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
        {[
          { icon: Building2,    label: 'Gare',           value: p.station?.name ?? '—' },
          { icon: FileText,     label: 'Motif',          value: p.reason ?? '—' },
          { icon: FileText,     label: 'Notes',          value: p.notes ?? '—' },
          { icon: User,         label: 'Demandé par',    value: p.requestedBy ? `${p.requestedBy.firstName} ${p.requestedBy.lastName}` : '—' },
          { icon: CalendarDays, label: 'Demandé le',     value: dayjs(p.createdAt).format('dddd D MMMM YYYY, HH:mm') },
          ...(p.approvedBy ? [{ icon: User, label: 'Approuvé par', value: `${p.approvedBy.firstName} ${p.approvedBy.lastName}` }] : []),
          ...(p.approvedAt ? [{ icon: CalendarDays, label: 'Approuvé le', value: dayjs(p.approvedAt).format('D MMMM YYYY, HH:mm') }] : []),
          ...(p.sentAt     ? [{ icon: CalendarDays, label: 'Envoyé le',   value: dayjs(p.sentAt).format('D MMMM YYYY, HH:mm') }] : []),
          ...(p.receivedAt ? [{ icon: CalendarDays, label: 'Reçu le',     value: dayjs(p.receivedAt).format('D MMMM YYYY, HH:mm') }] : []),
        ].map(row => (
          <div key={row.label} className="flex items-center gap-4 px-5 py-3.5">
            <row.icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <p className="text-xs text-gray-400 w-32 shrink-0">{row.label}</p>
            <p className="text-sm text-gray-900 font-medium">{row.value}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {canApprove && p.status === 'REQUESTED' && (
          <div className="flex gap-3">
            <button onClick={() => approveMut.mutate()} disabled={approveMut.isPending}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50">
              {approveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Approuver
            </button>
            <button onClick={() => setShowReject(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3 border border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-50">
              <XCircle className="w-4 h-4" /> Rejeter
            </button>
          </div>
        )}

        {canSend && p.status === 'APPROVED' && (
          <button onClick={() => setShowSend(true)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700">
            <Send className="w-4 h-4" /> Confirmer l'envoi des fonds <ArrowRight className="w-4 h-4" />
          </button>
        )}

        {p.status === 'SENT' && (
          <button onClick={() => receiveMut.mutate()} disabled={receiveMut.isPending}
            className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50">
            {receiveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
            Confirmer la réception des fonds
          </button>
        )}
      </div>

      {/* Reject modal */}
      {showReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" /> Rejeter la demande
            </h3>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
              placeholder="Expliquez le motif du rejet…"
              className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 resize-none" />
            <div className="flex gap-3">
              <button onClick={() => setShowReject(false)} className="flex-1 py-2 text-sm text-gray-600 border rounded-lg">Annuler</button>
              <button onClick={() => rejectMut.mutate()} disabled={!rejectReason.trim() || rejectMut.isPending}
                className="flex-1 py-2 text-sm text-white bg-red-600 rounded-lg disabled:opacity-50 flex items-center justify-center gap-1">
                {rejectMut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Rejeter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send modal */}
      {showSend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4">
            <h3 className="font-bold text-gray-900">Confirmer l'envoi</h3>
            <p className="text-sm text-gray-500">Vous attestez que <strong>{formatCFA(p.amount)}</strong> ont été envoyés à la gare <strong>{p.station?.name}</strong>.</p>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Référence de transfert (optionnel)</label>
              <input value={sendNotes} onChange={e => setSendNotes(e.target.value)}
                placeholder="N° virement, référence Mobile Money…"
                className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowSend(false)} className="flex-1 py-2 text-sm text-gray-600 border rounded-lg">Annuler</button>
              <button onClick={() => sendMut.mutate()} disabled={sendMut.isPending}
                className="flex-1 py-2 text-sm text-white bg-indigo-600 rounded-lg disabled:opacity-50 flex items-center justify-center gap-1">
                {sendMut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
