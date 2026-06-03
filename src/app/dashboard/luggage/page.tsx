'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { luggageApi, tripsApi } from '@/lib/api';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { formatCFA } from '@transpro/shared';
import {
  Luggage, Package, Loader2, Search, QrCode, Check,
  AlertTriangle, ChevronDown, ChevronUp, User, Ticket, Scale, Camera,
} from 'lucide-react';
import { PhotoGallery } from '@/components/ui/photo-gallery';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

dayjs.locale('fr');

// ── Bag status config ─────────────────────────────────────────────────────────

const BAG_CFG: Record<string, { label: string; classes: string }> = {
  DECLARED:  { label: 'Déclaré',    classes: 'bg-gray-100 text-gray-600'    },
  LOADED:    { label: 'En soute',   classes: 'bg-blue-100 text-blue-700'    },
  ARRIVED:   { label: 'Arrivé',     classes: 'bg-amber-100 text-amber-700'  },
  CLAIMED:   { label: 'Récupéré',   classes: 'bg-green-100 text-green-700'  },
  MISSING:   { label: 'Manquant ⚠️', classes: 'bg-red-100 text-red-700'     },
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LuggagePage() {
  const qc            = useQueryClient();
  const [tripId, setTripId]   = useState('');
  const [scanCode, setScanCode] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const scanRef = useRef<HTMLInputElement>(null);

  const { data: trips = [] } = useQuery<any[]>({
    queryKey: ['trips-today-luggage'],
    queryFn: () => tripsApi.list({ date: dayjs().format('YYYY-MM-DD') }) as any,
    staleTime: 60_000,
  });

  const { data: declarations = [], isLoading } = useQuery<any[]>({
    queryKey: ['luggage', tripId],
    queryFn: () => (tripId
      ? luggageApi.getByTrip(tripId)
      : luggageApi.list()
    ) as any,
  });

  const scanMut = useMutation({
    mutationFn: (qrCode: string) => luggageApi.scanBag(qrCode, tripId || undefined),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['luggage'] });
      const bag     = res?.bag;
      const booking = res?.booking;
      const label   = BAG_CFG[bag?.status]?.label ?? bag?.status;
      toast.success(
        `✓ Sac scanné — ${label}` +
        (booking ? ` | Réf. ${booking.reference}` : ''),
      );
      setScanCode('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Code QR invalide');
      setScanCode('');
    },
  });

  const missingMut = useMutation({
    mutationFn: ({ bagId, note }: { bagId: string; note?: string }) =>
      luggageApi.reportMissing(bagId, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['luggage'] });
      toast.success('Signalement enregistré');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });

  function handleScan(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && scanCode.trim()) {
      scanMut.mutate(scanCode.trim().toUpperCase());
    }
  }

  const decls = declarations as any[];
  const totalBags    = decls.reduce((s, d) => s + (d.bagCount ?? 0), 0);
  const loadedBags   = decls.reduce((s, d) => s + d.bags.filter((b: any) => b.status === 'LOADED').length, 0);
  const missingBags  = decls.reduce((s, d) => s + d.bags.filter((b: any) => b.status === 'MISSING').length, 0);
  const claimedBags  = decls.reduce((s, d) => s + d.bags.filter((b: any) => b.status === 'CLAIMED').length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Luggage size={22} className="text-brand-500" /> Gestion des bagages
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Déclarez, scannez et tracez les bagages en soute</p>
      </div>

      {/* KPI chips */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: 'Déclarés',    value: totalBags,   color: 'gray'   },
          { label: 'En soute',    value: loadedBags,  color: 'blue'   },
          { label: 'Récupérés',   value: claimedBags, color: 'green'  },
          { label: 'Manquants',   value: missingBags, color: 'red'    },
        ].map(({ label, value, color }) => (
          <div key={label} className={`flex items-center gap-2 px-3 py-2 bg-${color}-50 border border-${color}-200 rounded-lg`}>
            <span className={`text-sm font-bold text-${color}-700`}>{value}</span>
            <span className={`text-xs text-${color}-600`}>{label}</span>
          </div>
        ))}
      </div>

      {/* Filters + scan */}
      <div className="flex flex-wrap gap-3 items-center">
        <SearchableSelect
          value={tripId}
          onChange={setTripId}
          placeholder="Tous les voyages"
          clearable
          className="min-w-[220px]"
          options={(trips as any[]).map((t) => ({
            value: t.id,
            label: `${t.route?.originCity?.name ?? '?'} → ${t.route?.destinationCity?.name ?? '?'}`,
            sub: dayjs(t.departureAt).format('HH[h]mm'),
          }))}
        />

        {/* QR scan input (press Enter or use barcode scanner) */}
        <div className="flex items-center gap-2 bg-white border border-brand-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-brand-500">
          <QrCode size={16} className="text-brand-500 shrink-0" />
          <input
            ref={scanRef}
            value={scanCode}
            onChange={(e) => setScanCode(e.target.value.toUpperCase())}
            onKeyDown={handleScan}
            placeholder="Scanner ou saisir code sac (Entrée)…"
            className="text-sm outline-none w-56 bg-transparent"
          />
          {scanMut.isPending && <Loader2 size={14} className="animate-spin text-brand-500" />}
        </div>
      </div>

      {/* Declaration list */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))
        ) : decls.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <Luggage size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Aucune déclaration de bagage</p>
            <p className="text-gray-400 text-sm mt-1">
              Sélectionnez un voyage ou déclarez des bagages via la billetterie
            </p>
          </div>
        ) : (
          decls.map((d) => {
            const isOpen = expanded === d.id;
            const missing = d.bags.filter((b: any) => b.status === 'MISSING');
            return (
              <div key={d.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Header row */}
                <button
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition text-left"
                  onClick={() => setExpanded(isOpen ? null : d.id)}
                >
                  <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center shrink-0">
                    <User size={18} className="text-brand-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">
                      {d.booking?.passenger?.firstName} {d.booking?.passenger?.lastName}
                      <span className="font-mono text-xs text-gray-400 ml-2">#{d.booking?.reference}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-3">
                      <span className="flex items-center gap-1"><Ticket size={10} /> {d.booking?.seatNumbers?.join(', ') || '—'}</span>
                      <span className="flex items-center gap-1"><Scale size={10} /> {d.totalWeightKg} kg</span>
                      <span className="flex items-center gap-1"><Package size={10} /> {d.bagCount} sac(s)</span>
                    </p>
                  </div>
                  {missing.length > 0 && (
                    <span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <AlertTriangle size={10} /> {missing.length} manquant{missing.length > 1 ? 's' : ''}
                    </span>
                  )}
                  {d.excessFeeXof > 0 && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${d.excessPaid ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-700'}`}>
                      Excédent : {formatCFA(d.excessFeeXof)} {d.excessPaid ? '✓' : '(impayé)'}
                    </span>
                  )}
                  {isOpen ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
                </button>

                {/* Bags list */}
                {isOpen && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {d.bags.length === 0 ? (
                      <p className="px-5 py-4 text-sm text-gray-400">Aucun sac enregistré</p>
                    ) : d.bags.map((bag: any) => {
                      const bcfg  = BAG_CFG[bag.status] ?? BAG_CFG['DECLARED'];
                      const bagPhotos: string[] = bag.photos ?? [];
                      return (
                        <div key={bag.id} className="px-5 py-3 space-y-2">
                          {/* Bag header row */}
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                              <Luggage size={14} className="text-gray-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800">
                                {bag.label || 'Sac sans description'}
                                {bag.weightKg && <span className="text-gray-400 ml-1 text-xs">({bag.weightKg} kg)</span>}
                              </p>
                              <div className="flex items-center gap-2">
                                <p className="font-mono text-xs text-gray-400">{bag.qrCode}</p>
                                {bagPhotos.length > 0 && (
                                  <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                                    <Camera size={10} /> {bagPhotos.length}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${bcfg.classes}`}>
                              {bcfg.label}
                            </span>
                            {bag.status !== 'MISSING' && bag.status !== 'CLAIMED' && (
                              <button
                                onClick={() => {
                                  if (confirm(`Signaler "${bag.label || bag.qrCode}" comme manquant ?`)) {
                                    missingMut.mutate({ bagId: bag.id });
                                  }
                                }}
                                className="text-xs text-red-400 hover:text-red-600 transition px-2 py-1 rounded hover:bg-red-50"
                              >
                                Manquant
                              </button>
                            )}
                            {bag.status !== 'MISSING' && bag.status !== 'CLAIMED' && (
                              <button
                                onClick={() => scanMut.mutate(bag.qrCode)}
                                className="text-xs text-brand-500 hover:text-brand-700 transition px-2 py-1 rounded hover:bg-brand-50 flex items-center gap-1"
                              >
                                <Check size={12} /> Scan
                              </button>
                            )}
                          </div>

                          {/* Photos miniatures */}
                          {bagPhotos.length > 0 && (
                            <div className="pl-11">
                              <PhotoGallery
                                photos={bagPhotos}
                                label={`Sac ${bag.label ?? bag.qrCode}`}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
