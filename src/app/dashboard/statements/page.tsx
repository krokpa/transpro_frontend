'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen, Building2, Wallet, Download, FileSpreadsheet, FileText, Loader2,
  TrendingUp, Clock, CheckCircle2, XCircle, ChevronDown, ChevronUp, BanknoteIcon,
  ArrowDownToLine, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { settlementsApi, expensesApi, stationsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
dayjs.locale('fr');

type Format = 'pdf' | 'xlsx';

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  PENDING:    { label: 'En attente',  className: 'bg-amber-100 text-amber-700',  icon: <Clock size={11} /> },
  PROCESSING: { label: 'En cours',    className: 'bg-blue-100 text-blue-700',    icon: <ArrowDownToLine size={11} /> },
  PAID:       { label: 'Versé',       className: 'bg-green-100 text-green-700',  icon: <CheckCircle2 size={11} /> },
  FAILED:     { label: 'Échoué',      className: 'bg-red-100 text-red-700',      icon: <XCircle size={11} /> },
};

function fmtXOF(n: number) {
  return new Intl.NumberFormat('fr-CI', { style: 'decimal', maximumFractionDigits: 0 }).format(n) + ' FCFA';
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function monthRange() {
  return dayjs().format('YYYY-MM');
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, className }: { label: string; value: string; sub?: string; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5 ${className ?? ''}`}>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ── Settlement row with expandable bank form ──────────────────────────────────

function SettlementRow({ s, canSubmitBank }: { s: any; canSubmitBank: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [bankForm, setBankForm] = useState({ bankName: s.bankName ?? '', bankAccount: s.bankAccount ?? '', notes: '' });
  const cfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.PENDING;

  const submitBank = useMutation({
    mutationFn: (data: typeof bankForm) => settlementsApi.submitBankDetails(s.id, data),
    onSuccess: () => {
      toast.success('Coordonnées bancaires soumises');
      qc.invalidateQueries({ queryKey: ['settlements-list'] });
      setOpen(false);
    },
    onError: () => toast.error('Erreur lors de la soumission'),
  });

  const period = dayjs(s.periodStart).format('MMMM YYYY');

  return (
    <>
      <tr
        className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer ${open ? 'bg-gray-50/50' : ''}`}
        onClick={() => setOpen(v => !v)}
      >
        <td className="px-5 py-3.5">
          <p className="text-sm font-medium text-gray-900 capitalize">{period}</p>
          <p className="text-xs text-gray-400">{s.itemCount} paiement{s.itemCount > 1 ? 's' : ''}</p>
        </td>
        <td className="px-5 py-3.5 text-sm text-gray-700">{fmtXOF(s.totalAmount)}</td>
        <td className="px-5 py-3.5 text-sm text-gray-500">−{fmtXOF(s.geniusPayFees + s.commissions)}</td>
        <td className="px-5 py-3.5">
          <span className="text-sm font-semibold text-gray-900">{fmtXOF(s.netAmount)}</span>
        </td>
        <td className="px-5 py-3.5">
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.className}`}>
            {cfg.icon} {cfg.label}
          </span>
          {s.transferRef && (
            <p className="text-xs text-gray-400 mt-0.5 font-mono">{s.transferRef}</p>
          )}
        </td>
        <td className="px-5 py-3.5 text-right">
          {open ? <ChevronUp size={14} className="text-gray-400 ml-auto" /> : <ChevronDown size={14} className="text-gray-400 ml-auto" />}
        </td>
      </tr>

      {open && (
        <tr className="bg-gray-50/80">
          <td colSpan={6} className="px-5 pb-4 pt-2">
            <div className="grid grid-cols-3 gap-4 text-xs text-gray-600 mb-3">
              <div>
                <span className="text-gray-400 block mb-0.5">Période</span>
                {dayjs(s.periodStart).format('DD/MM/YYYY')} → {dayjs(s.periodEnd).format('DD/MM/YYYY')}
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Frais GeniusPay</span>
                {fmtXOF(s.geniusPayFees)}
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Commission TransPro</span>
                {fmtXOF(s.commissions)}
              </div>
              {s.bankName && (
                <div>
                  <span className="text-gray-400 block mb-0.5">Banque</span>
                  {s.bankName}
                </div>
              )}
              {s.bankAccount && (
                <div>
                  <span className="text-gray-400 block mb-0.5">Compte</span>
                  <span className="font-mono">{s.bankAccount}</span>
                </div>
              )}
              {s.notes && (
                <div className="col-span-2">
                  <span className="text-gray-400 block mb-0.5">Notes</span>
                  {s.notes}
                </div>
              )}
            </div>

            {/* Bank detail form for PENDING with canSubmitBank */}
            {canSubmitBank && (s.status === 'PENDING' || s.status === 'PROCESSING') && (
              <div className="border-t border-gray-200 pt-3 mt-1">
                <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <BanknoteIcon size={13} className="text-brand-500" />
                  {s.bankName ? 'Modifier les coordonnées bancaires' : 'Soumettre les coordonnées bancaires'}
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Banque</label>
                    <input
                      type="text"
                      value={bankForm.bankName}
                      onChange={e => setBankForm(p => ({ ...p, bankName: e.target.value }))}
                      placeholder="ex. SGBCI, Ecobank…"
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">N° de compte / IBAN</label>
                    <input
                      type="text"
                      value={bankForm.bankAccount}
                      onChange={e => setBankForm(p => ({ ...p, bankAccount: e.target.value }))}
                      placeholder="CI…"
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Note (optionnel)</label>
                    <input
                      type="text"
                      value={bankForm.notes}
                      onChange={e => setBankForm(p => ({ ...p, notes: e.target.value }))}
                      placeholder="Informations complémentaires"
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-2">
                  <button
                    disabled={!bankForm.bankName || !bankForm.bankAccount || submitBank.isPending}
                    onClick={e => { e.stopPropagation(); submitBank.mutate(bankForm); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-medium transition disabled:opacity-50"
                  >
                    {submitBank.isPending && <Loader2 size={11} className="animate-spin" />}
                    Soumettre
                  </button>
                </div>
              </div>
            )}

            {s.status === 'PAID' && (
              <div className="border-t border-gray-200 pt-3 mt-1 flex items-center gap-2 text-xs text-green-700">
                <CheckCircle2 size={13} className="text-green-500" />
                Versement confirmé
                {s.processedAt && <> · {dayjs(s.processedAt).format('DD/MM/YYYY')}</>}
                {s.transferRef && <> · Réf. <span className="font-mono">{s.transferRef}</span></>}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ── Export card ───────────────────────────────────────────────────────────────

function CompanyExportCard() {
  const [from, setFrom] = useState(monthRange());
  const [to, setTo]     = useState(monthRange());
  const [loading, setLoading] = useState<Format | null>(null);

  async function download(format: Format) {
    setLoading(format);
    try {
      const res = await settlementsApi.exportStatement({ from, to, format });
      const ext = format === 'pdf' ? 'pdf' : 'xlsx';
      triggerDownload(res.data as Blob, `releve-reversements-${from}-${to}.${ext}`);
      toast.success('Relevé téléchargé');
    } catch { toast.error('Erreur lors du téléchargement'); }
    finally { setLoading(null); }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
          <Building2 size={15} className="text-indigo-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">Relevé reversements</p>
          <p className="text-xs text-gray-400">Historique des versements</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] text-gray-500 mb-1">Du</label>
          <input type="month" value={from} onChange={e => setFrom(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <div>
          <label className="block text-[11px] text-gray-500 mb-1">Au</label>
          <input type="month" value={to} min={from} onChange={e => setTo(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => download('pdf')} disabled={!!loading}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition">
          {loading === 'pdf' ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />} PDF
        </button>
        <button onClick={() => download('xlsx')} disabled={!!loading}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition">
          {loading === 'xlsx' ? <Loader2 size={12} className="animate-spin" /> : <FileSpreadsheet size={12} />} Excel
        </button>
      </div>
    </div>
  );
}

function StationExportCard() {
  const [stationId, setStationId] = useState('');
  const [from, setFrom]           = useState(monthRange());
  const [to, setTo]               = useState(monthRange());
  const [loading, setLoading]     = useState<Format | null>(null);

  const { data: stationsRaw } = useQuery({
    queryKey: ['stations'],
    queryFn: () => stationsApi.list(),
    staleTime: 5 * 60 * 1000,
  });
  const stations: any[] = (stationsRaw as any)?.data ?? [];

  async function download(format: Format) {
    if (!stationId) { toast.error('Sélectionnez une gare'); return; }
    setLoading(format);
    try {
      const res = await expensesApi.exportStationStatement(stationId, { from, to, format });
      const stationName = stations.find(s => s.id === stationId)?.name ?? stationId;
      const ext = format === 'pdf' ? 'pdf' : 'xlsx';
      triggerDownload(res.data as Blob, `releve-caisse-${stationName.toLowerCase().replace(/\s/g, '-')}-${from}-${to}.${ext}`);
      toast.success('Relevé téléchargé');
    } catch { toast.error('Erreur lors du téléchargement'); }
    finally { setLoading(null); }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center shrink-0">
          <Wallet size={15} className="text-orange-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">Relevé caisse gare</p>
          <p className="text-xs text-gray-400">Dépenses, appros & solde estimé</p>
        </div>
      </div>

      <div>
        <label className="block text-[11px] text-gray-500 mb-1">Gare</label>
        <select value={stationId} onChange={e => setStationId(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">Sélectionner une gare…</option>
          {stations.map((s: any) => (
            <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] text-gray-500 mb-1">Du</label>
          <input type="month" value={from} onChange={e => setFrom(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <div>
          <label className="block text-[11px] text-gray-500 mb-1">Au</label>
          <input type="month" value={to} min={from} onChange={e => setTo(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => download('pdf')} disabled={!!loading || !stationId}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition">
          {loading === 'pdf' ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />} PDF
        </button>
        <button onClick={() => download('xlsx')} disabled={!!loading || !stationId}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition">
          {loading === 'xlsx' ? <Loader2 size={12} className="animate-spin" /> : <FileSpreadsheet size={12} />} Excel
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StatementsPage() {
  const { user } = useAuthStore();
  const role = user?.role ?? '';
  const canSeeSummary = role === 'COMPANY_OWNER' || role === 'COMPANY_ADMIN' || role === 'SUPER_ADMIN';
  const canSubmitBank = role === 'COMPANY_OWNER' || role === 'COMPANY_ADMIN';
  const isSuperAdmin  = role === 'SUPER_ADMIN';

  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data: summary } = useQuery({
    queryKey: ['settlements-summary'],
    queryFn: () => settlementsApi.mySummary() as any,
    enabled: canSeeSummary && !isSuperAdmin,
  });
  const sum = (summary as any)?.data ?? summary;

  const { data: settlementsRaw, isLoading: settlementsLoading } = useQuery({
    queryKey: ['settlements-list', statusFilter],
    queryFn: () => settlementsApi.list(statusFilter ? { status: statusFilter } : {}) as any,
    enabled: canSeeSummary,
  });
  const settlements: any[] = Array.isArray((settlementsRaw as any)?.data)
    ? (settlementsRaw as any).data
    : Array.isArray(settlementsRaw)
      ? settlementsRaw
      : [];

  const STATUS_TABS = [
    { key: '',           label: 'Tous' },
    { key: 'PENDING',    label: 'En attente' },
    { key: 'PROCESSING', label: 'En cours' },
    { key: 'PAID',       label: 'Versés' },
    { key: 'FAILED',     label: 'Échoués' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-slate-100 rounded-xl">
          <BookOpen size={22} className="text-slate-700" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Relevés & Reversements</h1>
          <p className="text-sm text-gray-500">États financiers exportables et suivi des reversements</p>
        </div>
      </div>

      {/* KPI row */}
      {canSeeSummary && !isSuperAdmin && sum && (
        <div className="grid grid-cols-4 gap-4">
          <KpiCard
            label="Total versé"
            value={fmtXOF(sum.totalPaid ?? 0)}
            sub={`${settlements.filter((s: any) => s.status === 'PAID').length} reversement(s)`}
          />
          <KpiCard
            label="En attente"
            value={fmtXOF(sum.totalPending ?? 0)}
            sub="Validation TransPro"
          />
          <KpiCard
            label="En cours de virement"
            value={fmtXOF(sum.totalProcessing ?? 0)}
            sub="Virement initié"
          />
          <KpiCard
            label="Brut total"
            value={fmtXOF(sum.totalGross ?? 0)}
            sub={`Frais: ${fmtXOF((sum.totalFees ?? 0) + (sum.totalCommission ?? 0))}`}
          />
        </div>
      )}

      {/* Main layout: settlements list + export column */}
      <div className="grid grid-cols-3 gap-5 items-start">

        {/* Left — settlements list */}
        {canSeeSummary && (
          <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-base font-semibold text-gray-900">Historique des reversements</h2>
              <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
                {STATUS_TABS.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                      statusFilter === tab.key
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {settlementsLoading ? (
              <div className="divide-y divide-gray-50">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="px-5 py-3.5 flex gap-4">
                    <div className="h-4 bg-gray-100 rounded w-28 animate-pulse" />
                    <div className="h-4 bg-gray-100 rounded w-24 animate-pulse" />
                    <div className="h-4 bg-gray-100 rounded w-20 animate-pulse" />
                    <div className="h-4 bg-gray-100 rounded w-20 animate-pulse ml-auto" />
                  </div>
                ))}
              </div>
            ) : settlements.length === 0 ? (
              <div className="py-16 text-center">
                <TrendingUp size={32} className="text-gray-200 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-400">Aucun reversement</p>
                <p className="text-xs text-gray-300 mt-1">Les reversements apparaissent chaque début de mois</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-50 bg-gray-50/50">
                      <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500">Période</th>
                      <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500">Brut</th>
                      <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500">Frais</th>
                      <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500">Net</th>
                      <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500">Statut</th>
                      <th className="px-5 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {settlements.map((s: any) => (
                      <SettlementRow key={s.id} s={s} canSubmitBank={canSubmitBank} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {canSubmitBank && settlements.some((s: any) => s.status === 'PENDING' && !s.bankName) && (
              <div className="px-5 py-3 border-t border-gray-50 bg-amber-50 flex items-center gap-2 text-xs text-amber-700">
                <AlertTriangle size={13} className="text-amber-500 shrink-0" />
                Des reversements en attente nécessitent vos coordonnées bancaires. Cliquez sur la ligne pour les soumettre.
              </div>
            )}
          </div>
        )}

        {/* Right — exports */}
        <div className={`space-y-4 ${!canSeeSummary ? 'col-span-2 mx-auto w-full max-w-lg' : ''}`}>
          <div className="flex items-center gap-2 px-1">
            <Download size={14} className="text-gray-400" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Exports</p>
          </div>

          {!isSuperAdmin && <CompanyExportCard />}
          <StationExportCard />

          <div className="px-1">
            <p className="text-xs text-gray-400 leading-relaxed">
              Les fichiers sont générés côté serveur. Les données sont filtrées selon votre compagnie et vos droits d'accès.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
