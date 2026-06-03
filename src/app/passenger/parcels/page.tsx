'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { parcelsApi } from '@/lib/api';
import { formatCFA } from '@transpro/shared';
import {
  Package, Search, ArrowRight, Clock, Loader2, MapPin,
  ChevronRight, QrCode, AlertCircle,
} from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
dayjs.locale('fr');

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; cls: string; dot: string }> = {
  PENDING:    { label: 'En attente',     cls: 'bg-gray-100 text-gray-600',    dot: 'bg-gray-400' },
  COLLECTED:  { label: 'Pris en charge', cls: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500' },
  IN_TRANSIT: { label: 'En transit',     cls: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  ARRIVED:    { label: 'Arrivé',         cls: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-400' },
  DELIVERING: { label: 'En livraison',   cls: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400' },
  DELIVERED:  { label: 'Livré',          cls: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
  RETURNED:   { label: 'Retourné',       cls: 'bg-red-100 text-red-600',      dot: 'bg-red-400' },
};

const ACTIVE_STATUSES  = ['PENDING', 'COLLECTED', 'IN_TRANSIT', 'ARRIVED', 'DELIVERING'];
const DONE_STATUSES    = ['DELIVERED', 'RETURNED'];

type Tab = 'sent' | 'received' | 'track';

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PassengerParcelsPage() {
  const router = useRouter();
  const [tab,       setTab]       = useState<Tab>('sent');
  const [trackCode, setTrackCode] = useState('');
  const [searched,  setSearched]  = useState('');

  // ── Envoyés ──
  const { data: sentRaw, isLoading: sentLoading } = useQuery({
    queryKey: ['my-parcels-sent'],
    queryFn:  () => parcelsApi.myParcels() as any,
  });
  const sent: any[] = Array.isArray(sentRaw) ? sentRaw : [];

  // ── Reçus ──
  const { data: recvRaw, isLoading: recvLoading } = useQuery({
    queryKey: ['my-parcels-received'],
    queryFn:  () => parcelsApi.myReceivedParcels() as any,
  });
  const received: any[] = Array.isArray(recvRaw) ? recvRaw : [];

  // ── Tracking public ──
  const { data: tracked, isLoading: tracking, error: trackErr } = useQuery({
    queryKey: ['track-parcel', searched],
    queryFn:  () => parcelsApi.track(searched) as any,
    enabled:  !!searched,
    retry:    false,
  });

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'sent',     label: 'Envoyés',          count: sent.length },
    { key: 'received', label: 'Reçus',             count: received.length },
    { key: 'track',    label: 'Suivre un colis',   count: 0 },
  ];

  const displayed   = tab === 'sent' ? sent : received;
  const listLoading = tab === 'sent' ? sentLoading : recvLoading;
  const emptyLabel  = tab === 'sent'
    ? { title: 'Aucun colis envoyé', sub: 'Les colis dont vous êtes l\'expéditeur apparaîtront ici' }
    : { title: 'Aucun colis reçu',   sub: 'Les colis dont vous êtes le destinataire apparaîtront ici' };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mes colis</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {sent.length} envoyé{sent.length !== 1 ? 's' : ''} · {received.length} reçu{received.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                tab === t.key ? 'bg-brand-100 text-brand-600' : 'bg-gray-200 text-gray-500'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Liste envois / reçus ── */}
      {tab !== 'track' && (
        listLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Package size={40} className="text-gray-200" />
            <p className="font-semibold text-gray-500">{emptyLabel.title}</p>
            <p className="text-sm text-gray-400">{emptyLabel.sub}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayed.map((p: any) => (
              <ParcelCard
                key={p.id}
                parcel={p}
                role={tab as 'sent' | 'received'}
                onClick={() => router.push(`/passenger/parcels/${p.id}`)}
              />
            ))}
          </div>
        )
      )}

      {/* ── Tracking public ── */}
      {tab === 'track' && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <p className="text-sm font-medium text-gray-700 mb-3">
              Entrez le code de suivi du colis
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <QrCode size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={trackCode}
                  onChange={(e) => setTrackCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && setSearched(trackCode.trim())}
                  placeholder="Ex: TP-COL-ABC123"
                  className="w-full pl-9 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                />
              </div>
              <button
                onClick={() => setSearched(trackCode.trim())}
                disabled={!trackCode.trim()}
                className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-semibold transition disabled:opacity-40 flex items-center gap-1.5"
              >
                {tracking ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                Rechercher
              </button>
            </div>
          </div>

          {tracking && (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin text-brand-500" />
            </div>
          )}

          {!tracking && trackErr && searched && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
              <AlertCircle size={18} className="shrink-0" />
              <p>Colis introuvable. Vérifiez le code de suivi.</p>
            </div>
          )}

          {!tracking && tracked && (
            <TrackedParcelCard data={tracked as any} />
          )}
        </div>
      )}
    </div>
  );
}

// ── Parcel card (my parcels) ──────────────────────────────────────────────────

function ParcelCard({ parcel, role = 'sent', onClick }: { parcel: any; role?: 'sent' | 'received'; onClick: () => void }) {
  const cfg    = STATUS_CFG[parcel.status] ?? STATUS_CFG.PENDING;
  const origin = parcel.trip?.route?.originCity?.name ?? '?';
  const dest   = parcel.trip?.route?.destinationCity?.name ?? '?';
  const depAt  = parcel.trip?.departureAt;

  return (
    <button
      onClick={onClick}
      className="w-full bg-white border border-gray-100 rounded-xl p-4 hover:border-brand-200 hover:shadow-sm transition-all text-left group"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center shrink-0">
          <Package size={18} className="text-brand-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-mono text-xs font-semibold text-gray-500 truncate">
                {parcel.trackingCode}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${
                role === 'received' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {role === 'received' ? 'Reçu' : 'Envoyé'}
              </span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cfg.cls} shrink-0`}>
              {cfg.label}
            </span>
          </div>
          <p className="text-sm font-semibold text-gray-900 truncate">{parcel.description}</p>
          {role === 'received' && parcel.senderName && (
            <p className="text-xs text-gray-400 mt-0.5">De : {parcel.senderName}</p>
          )}
          {role === 'sent' && parcel.recipientName && (
            <p className="text-xs text-gray-400 mt-0.5">Pour : {parcel.recipientName}</p>
          )}
          <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
            <MapPin size={11} />
            <span className="truncate">{origin} → {parcel.deliveryCity || dest}</span>
            {depAt && (
              <>
                <span>·</span>
                <Clock size={11} />
                <span>{dayjs(depAt).format('D MMM')}</span>
              </>
            )}
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-400">
              {parcel.weightKg} kg
              {parcel.fee ? ` · ${formatCFA(parcel.fee)}` : ''}
            </p>
            <div className="flex items-center gap-1 text-xs text-gray-400 group-hover:text-brand-500 transition">
              Détail <ChevronRight size={13} />
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

// ── Tracked parcel card (public tracking) ────────────────────────────────────

const PROGRESS_STEPS = ['PENDING', 'COLLECTED', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED'];

function TrackedParcelCard({ data }: { data: any }) {
  const cfg        = STATUS_CFG[data.status] ?? STATUS_CFG.PENDING;
  const currentIdx = PROGRESS_STEPS.indexOf(data.status);
  const origin     = data.trip?.route?.originCity?.name ?? '—';
  const dest       = data.trip?.route?.destinationCity?.name ?? '—';

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
      {/* Status header */}
      <div className={`px-5 py-4 flex items-center gap-3 ${cfg.cls}`}>
        <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
        <div>
          <p className="font-bold text-sm">{cfg.label}</p>
          <p className="text-xs opacity-70 font-mono mt-0.5">{data.trackingCode}</p>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Progress bar */}
        {data.status !== 'RETURNED' && (
          <div className="flex items-center">
            {PROGRESS_STEPS.map((step, i) => {
              const stepCfg  = STATUS_CFG[step]!;
              const isDone   = i < currentIdx;
              const isCurrent = i === currentIdx;
              return (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${
                      isCurrent ? `${stepCfg.dot} border-transparent` :
                      isDone    ? 'bg-brand-500 border-brand-500' :
                                  'bg-gray-100 border-gray-200'
                    }`}>
                      {(isDone || isCurrent) ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-white" />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                      )}
                    </div>
                    <span className={`text-[9px] font-medium text-center leading-tight ${
                      isCurrent ? 'text-gray-800' : isDone ? 'text-brand-600' : 'text-gray-400'
                    }`}>
                      {stepCfg.label.split(' ')[0]}
                    </span>
                  </div>
                  {i < PROGRESS_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 -mt-4 rounded-full ${i < currentIdx ? 'bg-brand-500' : 'bg-gray-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Info rows */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            ['De',          origin],
            ['Vers',         dest],
            ['Ville livraison', data.deliveryCity ?? '—'],
            ['Description',  data.description ?? '—'],
            ['Poids',        `${data.weightKg} kg`],
            data.fee && ['Frais',     formatCFA(data.fee)],
            data.fragile && ['Fragile', '⚠️ Oui'],
          ].filter(Boolean).map(([label, value]: any) => (
            <div key={label} className="bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-400 mb-0.5">{label}</p>
              <p className="font-semibold text-gray-800 text-xs truncate">{value}</p>
            </div>
          ))}
        </div>

        {/* CTA livraison à domicile */}
        {(data.status === 'ARRIVED' || data.status === 'DELIVERING') && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {data.status === 'DELIVERING' ? 'Livraison à domicile en cours' : 'Votre colis est arrivé'}
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                {data.status === 'ARRIVED' ? 'Vous pouvez demander une livraison à domicile' : 'Le livreur est en route'}
              </p>
            </div>
            <ArrowRight size={18} className="text-amber-500 shrink-0" />
          </div>
        )}
      </div>
    </div>
  );
}
