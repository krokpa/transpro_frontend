'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { stationsApi } from '@/lib/api';
import { formatCFA } from '@transpro/shared';
import { Banknote, Ticket, ChevronDown } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
dayjs.locale('fr');

const methodLabel: Record<string, string> = {
  CASH: 'Espèces', ORANGE_MONEY: 'Orange Money',
  MTN_MOMO: 'MTN MoMo', WAVE: 'Wave', CARD: 'Carte',
};

export default function StationCaissePage() {
  const { stationId } = useParams<{ stationId: string }>();
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));

  const { data, isLoading } = useQuery({
    queryKey: ['station-caisse', stationId, date],
    queryFn: () => stationsApi.getCaisse(stationId, date) as any,
  });

  const bookings: any[] = data?.bookings ?? [];
  const totalRevenue: number = data?.totalRevenue ?? 0;
  const byMethod: Record<string, number> = data?.byMethod ?? {};

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Caisse</h1>
          <p className="text-gray-400 text-sm">Ventes de la gare</p>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 col-span-1 sm:col-span-1">
          <p className="text-xs text-gray-500 font-medium mb-1">Total ventes</p>
          <p className="text-2xl font-bold text-brand-500">{formatCFA(totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500 font-medium mb-1">Billets émis</p>
          <p className="text-2xl font-bold text-gray-900">{bookings.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500 font-medium mb-2">Par mode de paiement</p>
          <div className="space-y-1">
            {Object.entries(byMethod).map(([method, amount]) => (
              <div key={method} className="flex justify-between text-xs">
                <span className="text-gray-500">{methodLabel[method] ?? method}</span>
                <span className="font-semibold">{formatCFA(amount)}</span>
              </div>
            ))}
            {Object.keys(byMethod).length === 0 && <p className="text-xs text-gray-300">Aucune vente</p>}
          </div>
        </div>
      </div>

      {/* Bookings table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
          <Ticket size={15} className="text-gray-400" />
          <h2 className="font-semibold text-gray-900 text-sm">Transactions</h2>
          <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{bookings.length}</span>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center h-24 text-gray-400 text-sm">Chargement...</div>
        ) : bookings.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-gray-400 text-sm">Aucune vente ce jour</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Réf.', 'Passager', 'Trajet', 'Sièges', 'Montant', 'Paiement', 'Heure'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{b.reference}</td>
                    <td className="px-4 py-3 text-gray-900">
                      {b.passenger?.firstName} {b.passenger?.lastName}
                      <span className="block text-xs text-gray-400">{b.passenger?.phone}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {b.trip?.route?.originCity?.name} → {b.trip?.route?.destinationCity?.name}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{b.seatNumbers?.join(', ')}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{formatCFA(b.totalAmount)}</td>
                    <td className="px-4 py-3 text-gray-600">{methodLabel[b.payment?.method] ?? b.payment?.method ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{dayjs(b.createdAt).format('HH:mm')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
