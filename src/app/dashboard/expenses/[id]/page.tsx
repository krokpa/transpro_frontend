'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expensesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { formatCFA } from '@transpro/shared';
import {
  ArrowLeft, CheckCircle2, XCircle, Clock, Building2,
  CalendarDays, User, FileText, Loader2, AlertCircle, Tag,
} from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { toast } from 'sonner';
import Link from 'next/link';
import { useState } from 'react';

dayjs.locale('fr');

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  FUEL:          { label: 'Carburant',       color: 'bg-orange-100 text-orange-700' },
  MAINTENANCE:   { label: 'Entretien',       color: 'bg-red-100 text-red-700' },
  SALARY:        { label: 'Salaires',        color: 'bg-purple-100 text-purple-700' },
  OFFICE:        { label: 'Fournitures',     color: 'bg-blue-100 text-blue-700' },
  CLEANING:      { label: 'Nettoyage',       color: 'bg-cyan-100 text-cyan-700' },
  SECURITY:      { label: 'Sécurité',        color: 'bg-slate-100 text-slate-700' },
  MEAL:          { label: 'Restauration',    color: 'bg-yellow-100 text-yellow-700' },
  BANKING:       { label: 'Frais bancaires', color: 'bg-indigo-100 text-indigo-700' },
  COMMUNICATION: { label: 'Communication',   color: 'bg-teal-100 text-teal-700' },
  TRANSPORT:     { label: 'Transport',       color: 'bg-sky-100 text-sky-700' },
  OTHER:         { label: 'Autres',          color: 'bg-gray-100 text-gray-600' },
};

const STATUS: Record<string, { label: string; cls: string; icon: React.ElementType; desc: string }> = {
  SUBMITTED: { label: 'En attente d\'approbation', cls: 'bg-amber-100 text-amber-700 border-amber-200',   icon: Clock,         desc: 'Cette dépense attend validation.' },
  APPROVED:  { label: 'Approuvée',                  cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2, desc: 'Dépense validée et prise en compte dans le solde.' },
  REJECTED:  { label: 'Rejetée',                    cls: 'bg-red-100 text-red-600 border-red-200',         icon: XCircle,       desc: 'Dépense non validée par l\'approbateur.' },
};

export default function ExpenseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const canApprove = user?.perms?.includes('expenses:approve') || ['COMPANY_OWNER', 'COMPANY_ADMIN'].includes(user?.role ?? '');

  const { data: expense, isLoading } = useQuery({
    queryKey: ['expense', id],
    queryFn: () => expensesApi.get(id) as any,
  });
  const e = expense as any;

  const approveMut = useMutation({
    mutationFn: () => expensesApi.approve(id) as any,
    onSuccess: () => {
      toast.success('Dépense approuvée');
      qc.invalidateQueries({ queryKey: ['expense', id] });
      qc.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });

  const rejectMut = useMutation({
    mutationFn: () => expensesApi.reject(id, rejectReason) as any,
    onSuccess: () => {
      toast.success('Dépense rejetée');
      qc.invalidateQueries({ queryKey: ['expense', id] });
      qc.invalidateQueries({ queryKey: ['expenses'] });
      setShowReject(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Chargement…
      </div>
    );
  }

  if (!e) return null;

  const cat  = CATEGORY_LABELS[e.category] ?? CATEGORY_LABELS.OTHER;
  const stat = STATUS[e.status] ?? STATUS.SUBMITTED;
  const SI   = stat.icon;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/expenses"
          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dépense</h1>
          <p className="text-xs text-gray-400 font-mono mt-0.5">{e.id.slice(0, 8)}…</p>
        </div>
      </div>

      {/* Statut */}
      <div className={`flex items-start gap-3 rounded-xl border p-4 ${stat.cls}`}>
        <SI className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-sm">{stat.label}</p>
          <p className="text-xs mt-0.5 opacity-80">{stat.desc}</p>
          {e.status === 'REJECTED' && e.rejectedReason && (
            <p className="text-sm font-medium mt-1">Motif : {e.rejectedReason}</p>
          )}
        </div>
      </div>

      {/* Montant principal */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Montant</p>
        <p className="text-4xl font-bold text-gray-900">{formatCFA(e.amount)}</p>
        <span className={`inline-block mt-3 text-xs font-medium px-3 py-1 rounded-full ${cat.color}`}>
          {cat.label}
        </span>
      </div>

      {/* Détails */}
      <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
        {[
          { icon: FileText,     label: 'Description',   value: e.description },
          { icon: Building2,    label: 'Gare',           value: e.station?.name ?? '—' },
          { icon: CalendarDays, label: 'Date',           value: dayjs(e.date).format('dddd D MMMM YYYY') },
          { icon: Tag,          label: 'Justificatif',   value: e.receiptNote || '—' },
          { icon: User,         label: 'Soumis par',     value: e.submitter ? `${e.submitter.firstName} ${e.submitter.lastName}` : '—' },
          ...(e.approver ? [{ icon: User, label: e.status === 'APPROVED' ? 'Approuvé par' : 'Traité par', value: `${e.approver.firstName} ${e.approver.lastName}` }] : []),
          ...(e.approvedAt ? [{ icon: CalendarDays, label: e.status === 'APPROVED' ? 'Approuvé le' : 'Traité le', value: dayjs(e.approvedAt ?? e.rejectedAt).format('D MMMM YYYY, HH:mm') }] : []),
        ].map(row => (
          <div key={row.label} className="flex items-center gap-4 px-5 py-3.5">
            <row.icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <p className="text-xs text-gray-400 w-32 shrink-0">{row.label}</p>
            <p className="text-sm text-gray-900 font-medium">{row.value}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      {canApprove && e.status === 'SUBMITTED' && (
        <div className="flex gap-3">
          <button
            onClick={() => approveMut.mutate()}
            disabled={approveMut.isPending}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {approveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Approuver la dépense
          </button>
          <button
            onClick={() => setShowReject(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 border border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors"
          >
            <XCircle className="w-4 h-4" /> Rejeter
          </button>
        </div>
      )}

      {/* Reject modal */}
      {showReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" /> Rejeter la dépense
            </h3>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
              placeholder="Expliquez le motif du rejet…"
              className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 resize-none" />
            <div className="flex gap-3">
              <button onClick={() => setShowReject(false)}
                className="flex-1 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">Annuler</button>
              <button onClick={() => rejectMut.mutate()} disabled={!rejectReason.trim() || rejectMut.isPending}
                className="flex-1 py-2 text-sm text-white bg-red-600 rounded-lg disabled:opacity-50 flex items-center justify-center gap-1">
                {rejectMut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Rejeter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
