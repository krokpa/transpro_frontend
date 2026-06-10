'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Building2, Wallet, Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { settlementsApi, expensesApi, stationsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

type Format = 'pdf' | 'xlsx';

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function monthRange() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// ── Relevé compagnie (reversements) ──────────────────────────────────────────

function CompanyStatement() {
  const { user } = useAuthStore();
  const [from, setFrom]     = useState(monthRange());
  const [to, setTo]         = useState(monthRange());
  const [loading, setLoading] = useState<Format | null>(null);

  async function download(format: Format) {
    setLoading(format);
    try {
      const res = await settlementsApi.exportStatement({ from, to, format });
      const ext = format === 'pdf' ? 'pdf' : 'xlsx';
      triggerDownload(res.data as Blob, `releve-reversements-${from}-${to}.${ext}`);
      toast.success('Relevé téléchargé');
    } catch {
      toast.error('Erreur lors du téléchargement');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-50 rounded-lg">
          <Building2 size={20} className="text-indigo-600" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">Relevé compagnie</h2>
          <p className="text-sm text-gray-500">Historique des reversements sur une période</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Période du</label>
          <input
            type="month"
            value={from}
            onChange={e => setFrom(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Au</label>
          <input
            type="month"
            value={to}
            min={from}
            onChange={e => setTo(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
          />
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <p className="text-xs text-gray-500 leading-relaxed">
          Le relevé inclut tous les reversements (commission TransPro déduite) sur la période sélectionnée,
          avec le détail par trajet, les montants bruts, frais et nets, et le statut de chaque paiement.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => download('pdf')}
          disabled={!!loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {loading === 'pdf' ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
          Télécharger PDF
        </button>
        <button
          onClick={() => download('xlsx')}
          disabled={!!loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {loading === 'xlsx' ? <Loader2 size={15} className="animate-spin" /> : <FileSpreadsheet size={15} />}
          Télécharger Excel
        </button>
      </div>
    </div>
  );
}

// ── Relevé caisse gare ────────────────────────────────────────────────────────

function StationStatement() {
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
    } catch {
      toast.error('Erreur lors du téléchargement');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-orange-50 rounded-lg">
          <Wallet size={20} className="text-orange-600" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">Relevé de caisse gare</h2>
          <p className="text-sm text-gray-500">Dépenses, approvisionnements et solde estimé</p>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Gare</label>
        <select
          value={stationId}
          onChange={e => setStationId(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
        >
          <option value="">Sélectionner une gare…</option>
          {stations.map((s: any) => (
            <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Période du</label>
          <input
            type="month"
            value={from}
            onChange={e => setFrom(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Au</label>
          <input
            type="month"
            value={to}
            min={from}
            onChange={e => setTo(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
          />
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <p className="text-xs text-gray-500 leading-relaxed">
          Le relevé de caisse inclut toutes les dépenses approuvées, les approvisionnements reçus,
          les ventes en espèces, et le solde estimé de la caisse pour la gare et la période sélectionnées.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => download('pdf')}
          disabled={!!loading || !stationId}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {loading === 'pdf' ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
          Télécharger PDF
        </button>
        <button
          onClick={() => download('xlsx')}
          disabled={!!loading || !stationId}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {loading === 'xlsx' ? <Loader2 size={15} className="animate-spin" /> : <FileSpreadsheet size={15} />}
          Télécharger Excel
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StatementsPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-slate-100 rounded-xl">
          <BookOpen size={22} className="text-slate-700" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Relevés exportables</h1>
          <p className="text-sm text-gray-500">Générez vos états financiers en PDF ou Excel</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <Download size={16} className="text-blue-500 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-700">
          Les fichiers sont générés côté serveur et téléchargés directement. Les données correspondent
          à votre compagnie et sont filtrées selon vos droits d'accès.
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {!isSuperAdmin && <CompanyStatement />}
        <StationStatement />
      </div>
    </div>
  );
}
