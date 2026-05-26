'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { stationsApi } from '@/lib/api';
import { FileText, Download, Loader2, Calendar, Bus } from 'lucide-react';
import { toast } from 'sonner';
import dayjs from 'dayjs';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

async function downloadReport(url: string, filename: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) { toast.error('Erreur lors de la génération du rapport'); return; }
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href; a.download = filename; a.click();
  URL.revokeObjectURL(href);
}

type DlButtonProps = { stationId: string; endpoint: string; params: Record<string, string>; label: string; filenameBase: string };

function DlButtons({ stationId, endpoint, params, label, filenameBase }: DlButtonProps) {
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingCsv, setLoadingCsv] = useState(false);

  async function dl(format: 'pdf' | 'csv') {
    const qs = new URLSearchParams({ ...params, format }).toString();
    const url = `${API_URL}/stations/${stationId}/${endpoint}?${qs}`;
    const ext = format === 'pdf' ? 'pdf' : 'csv';
    if (format === 'pdf') setLoadingPdf(true); else setLoadingCsv(true);
    try { await downloadReport(url, `${filenameBase}.${ext}`); }
    finally { if (format === 'pdf') setLoadingPdf(false); else setLoadingCsv(false); }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => dl('pdf')}
        disabled={loadingPdf}
        className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold px-3 py-2 rounded-lg transition disabled:opacity-60"
      >
        {loadingPdf ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} PDF
      </button>
      <button
        onClick={() => dl('csv')}
        disabled={loadingCsv}
        className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-2 rounded-lg transition disabled:opacity-60"
      >
        {loadingCsv ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} CSV
      </button>
    </div>
  );
}

function getWeekStart(offset = 0) {
  const d = dayjs().subtract(offset * 7, 'day');
  return d.startOf('week').add(1, 'day').format('YYYY-MM-DD'); // lundi
}

export default function StationRapportsPage() {
  const { stationId } = useParams<{ stationId: string }>();

  const [dailyDate, setDailyDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedTripId, setSelectedTripId] = useState('');

  const weekStart = getWeekStart(weekOffset);
  const weekEnd = dayjs(weekStart).add(6, 'day').format('DD/MM/YYYY');

  const { data: todayTrips = [] } = useQuery<any[]>({
    queryKey: ['station-today-trips', stationId],
    queryFn: () => stationsApi.getTodayTrips(stationId) as any,
  });

  const cardCls = 'bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4';
  const inputCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <FileText size={20} className="text-brand-500" /> Rapports
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">Générez et exportez les rapports de votre gare</p>
      </div>

      {/* Ventes journalières */}
      <div className={cardCls}>
        <div>
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Calendar size={15} className="text-brand-500" /> Ventes journalières
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Liste de tous les billets vendus à cette gare pour une journée donnée</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="date"
            value={dailyDate}
            onChange={(e) => setDailyDate(e.target.value)}
            max={dayjs().format('YYYY-MM-DD')}
            className={inputCls}
          />
          <DlButtons
            stationId={stationId}
            endpoint="reports/daily-sales"
            params={{ date: dailyDate }}
            label="Ventes journalières"
            filenameBase={`gare-ventes-${dailyDate}`}
          />
        </div>
      </div>

      {/* Bilan hebdomadaire */}
      <div className={cardCls}>
        <div>
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Calendar size={15} className="text-brand-500" /> Bilan hebdomadaire
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Récapitulatif des ventes et revenus sur une semaine complète</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekOffset((o) => o + 1)}
              className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition"
            >
              ‹
            </button>
            <span className="text-sm text-gray-700 font-medium min-w-[160px] text-center">
              {dayjs(weekStart).format('DD/MM')} – {weekEnd}
            </span>
            <button
              onClick={() => setWeekOffset((o) => Math.max(0, o - 1))}
              disabled={weekOffset === 0}
              className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition disabled:opacity-40"
            >
              ›
            </button>
          </div>
          <DlButtons
            stationId={stationId}
            endpoint="reports/weekly-summary"
            params={{ weekStart }}
            label="Bilan hebdomadaire"
            filenameBase={`gare-bilan-${weekStart}`}
          />
        </div>
      </div>

      {/* Manifeste voyage */}
      <div className={cardCls}>
        <div>
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Bus size={15} className="text-brand-500" /> Manifeste de voyage
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Liste des passagers embarqués pour un voyage spécifique</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={selectedTripId}
            onChange={(e) => setSelectedTripId(e.target.value)}
            className={inputCls + ' min-w-[220px]'}
          >
            <option value="">-- Choisir un voyage --</option>
            {todayTrips.map((t: any) => (
              <option key={t.id} value={t.id}>
                {t.route?.originCity?.name} → {t.route?.destinationCity?.name} · {dayjs(t.departureAt).format('HH:mm')}
              </option>
            ))}
          </select>
          {selectedTripId && (
            <DlButtons
              stationId={stationId}
              endpoint={`reports/trip/${selectedTripId}`}
              params={{}}
              label="Manifeste"
              filenameBase={`gare-manifeste-${selectedTripId}`}
            />
          )}
        </div>
        {todayTrips.length === 0 && (
          <p className="text-xs text-gray-400">Aucun voyage aujourd'hui. Les voyages d'autres jours ne sont pas listés ici.</p>
        )}
      </div>
    </div>
  );
}
