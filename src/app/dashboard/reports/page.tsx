'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tripsApi } from '@/lib/api';
import {
  Calendar, TrendingUp, Bus, Download, Loader2, FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
dayjs.locale('fr');

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

async function downloadReport(path: string, filename: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let msg = 'Erreur lors de la génération du rapport';
    try { msg = JSON.parse(text)?.message ?? msg; } catch {}
    throw new Error(msg);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function SectionCard({
  icon, iconColor, title, description, children,
}: {
  icon: React.ReactNode;
  iconColor: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-5">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
          {icon}
        </div>
        <div>
          <h2 className="font-bold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>
      <div className="flex-1 space-y-4">{children}</div>
    </div>
  );
}

function DlButton({
  label, format, isLoading, disabled, onClick,
}: {
  label: string;
  format: 'pdf' | 'csv';
  isLoading?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const isPdf = format === 'pdf';
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-40 ${
        isPdf
          ? 'bg-brand-500 hover:bg-brand-600 text-white shadow-sm shadow-brand-500/20'
          : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
      }`}
    >
      {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
      {label}
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-600 mb-1.5">{children}</label>;
}

const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white';

// ─── Page ────────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const today = dayjs().format('YYYY-MM-DD');
  // Monday of current week
  const monday = dayjs().day(1).format('YYYY-MM-DD');

  const [dailyDate, setDailyDate]   = useState(today);
  const [weekStart, setWeekStart]   = useState(monday);
  const [tripId, setTripId]         = useState('');
  const [loading, setLoading]       = useState<string | null>(null);

  const { data: tripsRaw } = useQuery({
    queryKey: ['trips-list-reports'],
    queryFn: () => tripsApi.list({ limit: 100 }) as any,
    staleTime: 5 * 60 * 1000,
  });
  const trips: any[] = Array.isArray(tripsRaw)
    ? tripsRaw
    : (tripsRaw?.items ?? tripsRaw?.data ?? []);

  async function handle(
    key: string,
    apiPath: string,
    filename: string,
  ) {
    setLoading(key);
    try {
      await downloadReport(apiPath, filename);
    } catch (err: any) {
      toast.error(err.message ?? 'Erreur lors du téléchargement');
    } finally {
      setLoading(null);
    }
  }

  const weekEndLabel = dayjs(weekStart).add(6, 'day').format('DD/MM/YYYY');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center shrink-0">
          <FileText size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rapports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Exportez vos données comptables en PDF ou CSV</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Daily Sales ─────────────────────────────────────────── */}
        <SectionCard
          icon={<Calendar size={18} />}
          iconColor="text-blue-600 bg-blue-50"
          title="Ventes journalières"
          description="Liste de toutes les réservations d'une journée : passager, trajet, montant et mode de paiement."
        >
          <div>
            <FieldLabel>Date</FieldLabel>
            <input
              type="date"
              value={dailyDate}
              max={today}
              onChange={e => setDailyDate(e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="flex gap-2">
            <DlButton
              label="Télécharger PDF"
              format="pdf"
              isLoading={loading === 'daily-pdf'}
              onClick={() => handle(
                'daily-pdf',
                `/reports/daily-sales?date=${dailyDate}&format=pdf`,
                `ventes-${dailyDate}.pdf`,
              )}
            />
            <DlButton
              label="CSV"
              format="csv"
              isLoading={loading === 'daily-csv'}
              onClick={() => handle(
                'daily-csv',
                `/reports/daily-sales?date=${dailyDate}&format=csv`,
                `ventes-${dailyDate}.csv`,
              )}
            />
          </div>
        </SectionCard>

        {/* ── Weekly Summary ───────────────────────────────────────── */}
        <SectionCard
          icon={<TrendingUp size={18} />}
          iconColor="text-green-600 bg-green-50"
          title="Bilan hebdomadaire"
          description="Revenus, réservations confirmées et annulées agrégés par jour sur une semaine."
        >
          <div>
            <FieldLabel>Premier jour de la semaine</FieldLabel>
            <input
              type="date"
              value={weekStart}
              max={today}
              onChange={e => setWeekStart(e.target.value)}
              className={inputCls}
            />
            <p className="text-xs text-gray-400 mt-1.5">
              Période : {dayjs(weekStart).format('DD/MM')} – {weekEndLabel}
            </p>
          </div>
          <div className="flex gap-2">
            <DlButton
              label="Télécharger PDF"
              format="pdf"
              isLoading={loading === 'weekly-pdf'}
              onClick={() => handle(
                'weekly-pdf',
                `/reports/weekly-summary?weekStart=${weekStart}&format=pdf`,
                `bilan-${weekStart}.pdf`,
              )}
            />
            <DlButton
              label="CSV"
              format="csv"
              isLoading={loading === 'weekly-csv'}
              onClick={() => handle(
                'weekly-csv',
                `/reports/weekly-summary?weekStart=${weekStart}&format=csv`,
                `bilan-${weekStart}.csv`,
              )}
            />
          </div>
        </SectionCard>

        {/* ── Trip Report ──────────────────────────────────────────── */}
        <SectionCard
          icon={<Bus size={18} />}
          iconColor="text-orange-600 bg-orange-50"
          title="Rapport par voyage"
          description="Manifeste complet des passagers, revenus et taux d'occupation pour un voyage spécifique."
        >
          <div>
            <FieldLabel>Sélectionner un voyage</FieldLabel>
            <select
              value={tripId}
              onChange={e => setTripId(e.target.value)}
              className={inputCls}
            >
              <option value="">— Choisir un voyage —</option>
              {trips.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.route?.originCity?.name ?? t.route?.name}
                  {t.route?.destinationCity?.name ? ` → ${t.route.destinationCity?.name}` : ''}
                  {' · '}
                  {dayjs(t.departureAt).format('DD/MM HH:mm')}
                </option>
              ))}
            </select>
            {trips.length === 0 && (
              <p className="text-xs text-gray-400 mt-1.5">Aucun voyage disponible</p>
            )}
          </div>
          <div className="flex gap-2">
            <DlButton
              label="Télécharger PDF"
              format="pdf"
              disabled={!tripId}
              isLoading={loading === 'trip-pdf'}
              onClick={() => handle(
                'trip-pdf',
                `/reports/trip/${tripId}?format=pdf`,
                `voyage-${tripId}.pdf`,
              )}
            />
            <DlButton
              label="CSV"
              format="csv"
              disabled={!tripId}
              isLoading={loading === 'trip-csv'}
              onClick={() => handle(
                'trip-csv',
                `/reports/trip/${tripId}?format=csv`,
                `voyage-${tripId}.csv`,
              )}
            />
          </div>
        </SectionCard>

      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700 flex items-start gap-2.5">
        <FileText size={16} className="shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Formats disponibles</p>
          <p className="mt-0.5 text-blue-600">
            <strong>PDF</strong> — rapport mis en page, prêt à imprimer ou partager.
            {' '}
            <strong>CSV</strong> — données brutes pour Excel / comptabilité, encodé UTF-8 avec BOM.
          </p>
        </div>
      </div>
    </div>
  );
}
