'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { bookingsApi, paymentsApi } from '@/lib/api';
import { formatCFA } from '@transpro/shared';
import {
  ArrowRight, Clock, Loader2, Ticket, MapPin, Users,
  CheckCircle, XCircle, CreditCard, Calendar,
  Bus, Crown, Zap, QrCode, ChevronRight,
} from 'lucide-react';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { useViewMode } from '@/hooks/useViewMode';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/fr';

dayjs.extend(duration);
dayjs.extend(relativeTime);
dayjs.locale('fr');

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS: Record<string, {
  label: string; bar: string; badge: string; dot: string; icon: any;
}> = {
  PENDING:   { label: 'En attente de paiement', bar: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700 border-amber-200',  dot: 'bg-amber-400',  icon: Clock },
  CONFIRMED: { label: 'Confirmée',              bar: 'bg-green-400', badge: 'bg-green-50  text-green-700  border-green-200',  dot: 'bg-green-500',  icon: CheckCircle },
  CANCELLED: { label: 'Annulée',               bar: 'bg-red-400',   badge: 'bg-red-50    text-red-600    border-red-200',    dot: 'bg-red-400',    icon: XCircle },
  COMPLETED: { label: 'Terminée',              bar: 'bg-gray-300',  badge: 'bg-gray-50   text-gray-600   border-gray-200',   dot: 'bg-gray-400',   icon: CheckCircle },
};

const CLASS_BADGE: Record<string, { label: string; cls: string; icon: any }> = {
  VIP:      { label: 'VIP',      cls: 'bg-amber-100 text-amber-700', icon: Crown },
  EXPRESS:  { label: 'Express',  cls: 'bg-blue-100 text-blue-700',   icon: Zap },
  STANDARD: { label: 'Standard', cls: 'bg-gray-100 text-gray-600',   icon: Bus },
};

type Tab = 'upcoming' | 'past' | 'cancelled';

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string | number; sub?: string;
  icon: any; accent: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
        <Icon size={17} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-400 font-medium leading-none mb-0.5">{label}</p>
        <p className="text-lg font-bold text-gray-900 leading-none truncate">{value}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Booking card ─────────────────────────────────────────────────────────────

function BookingCard({ b, onNavigate, onPay, paying }: {
  b: any; onNavigate: () => void; onPay: () => void; paying: boolean;
}) {
  const s        = STATUS[b.status] ?? STATUS.PENDING;
  const dep      = dayjs(b.trip?.departureAt);
  const now      = dayjs();
  const isPast   = dep.isBefore(now);
  const isUrgent = !isPast && dep.diff(now, 'hour') <= 24 && b.status === 'CONFIRMED';

  // Countdown
  let countdown: string | null = null;
  if (!isPast && ['PENDING', 'CONFIRMED'].includes(b.status)) {
    const h = dep.diff(now, 'hour');
    if (h < 1) {
      countdown = `${dep.diff(now, 'minute')} min`;
    } else if (h < 24) {
      countdown = `${h}h`;
    } else {
      const d = dep.diff(now, 'day');
      countdown = `${d}j ${h % 24}h`;
    }
  }

  const tc  = b.trip?.tripClass ?? 'STANDARD';
  const cls = CLASS_BADGE[tc] ?? CLASS_BADGE.STANDARD;
  const ClassIcon = cls.icon;
  const seats: string[] = b.seatNumbers ?? [];
  const hasTickets = b.tickets?.length > 0;

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden transition-all ${
      isUrgent ? 'border-orange-200 shadow-orange-100 shadow-md' : 'border-gray-100 hover:border-brand-200 hover:shadow-sm'
    }`}>
      {/* Status bar */}
      <div className={`h-1.5 ${s.bar}`} />

      <div className="p-4 space-y-3">
        {/* Row 1: status + countdown + class */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold border ${s.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            {s.label}
          </span>
          {countdown && (
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
              isUrgent
                ? 'bg-orange-100 text-orange-700 animate-pulse'
                : 'bg-brand-50 text-brand-600'
            }`}>
              Dans {countdown}
            </span>
          )}
          <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-semibold ml-auto ${cls.cls}`}>
            <ClassIcon size={9} /> {cls.label}
          </span>
        </div>

        {/* Row 2: route */}
        <button onClick={onNavigate} className="w-full text-left group/inner">
          <div className="flex items-center gap-2">
            {/* Date block */}
            <div className="shrink-0 text-center w-12">
              <p className="text-xl font-black text-gray-900 leading-none">{dep.format('D')}</p>
              <p className="text-[10px] text-gray-500 capitalize font-medium">{dep.format('MMM')}</p>
              <p className="text-[10px] text-gray-400">{dep.format('YYYY')}</p>
            </div>

            {/* Divider */}
            <div className="w-px h-10 bg-gray-100 shrink-0" />

            {/* Route */}
            <div className="flex-1 flex items-center gap-1 min-w-0">
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 font-medium">De</p>
                <p className="font-bold text-gray-900 text-sm leading-tight truncate max-w-[90px]">
                  {b.trip?.route?.originCity?.name ?? '—'}
                </p>
              </div>
              <div className="flex-1 flex items-center px-1">
                <div className="flex-1 border-t-2 border-dashed border-gray-200" />
                <ArrowRight size={13} className="text-brand-400 mx-0.5 shrink-0" />
              </div>
              <div className="min-w-0 text-right">
                <p className="text-[10px] text-gray-400 font-medium">À</p>
                <p className="font-bold text-gray-900 text-sm leading-tight truncate max-w-[90px]">
                  {b.trip?.route?.destinationCity?.name ?? '—'}
                </p>
              </div>
            </div>

            {/* Amount + arrow */}
            <div className="shrink-0 text-right pl-2">
              <p className="font-bold text-gray-900">{formatCFA(b.totalAmount)}</p>
              <ChevronRight size={14} className="text-gray-200 group-hover/inner:text-brand-400 transition ml-auto mt-0.5" />
            </div>
          </div>
        </button>

        {/* Row 3: meta */}
        <div className="flex items-center gap-3 pt-2.5 border-t border-dashed border-gray-100 text-xs text-gray-500 flex-wrap">
          <span className="flex items-center gap-1">
            <Clock size={10} /> {dep.format('HH:mm')}
          </span>
          {seats.length > 0 && (
            <span className="flex items-center gap-1">
              <Users size={10} /> {seats.join(', ')}
            </span>
          )}
          {b.trip?.vehicle?.plate && (
            <span className="text-gray-300">{b.trip.vehicle.plate}</span>
          )}
          {b.trip?.tenant?.name && (
            <span className="text-gray-400 ml-auto truncate max-w-[120px]">{b.trip.tenant.name}</span>
          )}
          {hasTickets && (
            <span className="flex items-center gap-1 text-brand-500 font-medium">
              <QrCode size={10} /> Tickets disponibles
            </span>
          )}
        </div>
      </div>

      {/* CTA zone for PENDING */}
      {b.status === 'PENDING' && (
        <div className="px-4 pb-4">
          <button
            onClick={(e) => { e.stopPropagation(); onPay(); }}
            disabled={paying}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {paying
              ? <><Loader2 size={14} className="animate-spin" /> Redirection...</>
              : <><CreditCard size={14} /> Payer {formatCFA(b.totalAmount)} maintenant</>}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BookingsPage() {
  const router  = useRouter();
  const [tab, setTab]           = useState<Tab>('upcoming');
  const [payingId, setPayingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useViewMode('passenger-bookings');

  const { data: raw, isLoading } = useQuery({
    queryKey: ['my-bookings'],
    queryFn:  () => bookingsApi.myBookings() as any,
  });

  const all: any[] = Array.isArray(raw) ? raw : [];
  const now = dayjs();

  const upcoming  = all.filter((b) => ['PENDING', 'CONFIRMED'].includes(b.status) && dayjs(b.trip?.departureAt).isAfter(now));
  const past      = all.filter((b) => b.status === 'COMPLETED' || (['PENDING', 'CONFIRMED'].includes(b.status) && dayjs(b.trip?.departureAt).isBefore(now)));
  const cancelled = all.filter((b) => b.status === 'CANCELLED');

  const totalSpent = all
    .filter((b) => ['CONFIRMED', 'COMPLETED'].includes(b.status))
    .reduce((s, b) => s + (b.totalAmount ?? 0), 0);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'upcoming',  label: 'À venir',  count: upcoming.length },
    { key: 'past',      label: 'Passés',   count: past.length },
    { key: 'cancelled', label: 'Annulés',  count: cancelled.length },
  ];

  const displayed = tab === 'upcoming' ? upcoming : tab === 'past' ? past : cancelled;

  async function handlePay(bookingId: string) {
    setPayingId(bookingId);
    try {
      const res = await paymentsApi.initiate(bookingId) as any;
      window.location.href = res.checkoutUrl;
    } catch (err: any) {
      const raw = err?.response?.data;
      const msg = raw?.error ?? raw?.message ?? err?.message ?? 'Erreur de paiement';
      toast.error(Array.isArray(msg) ? msg.join(' | ') : msg);
      setPayingId(null);
    }
  }

  // ── Empty states ─────────────────────────────────────────────────────────────

  const emptyConfig = {
    upcoming:  { icon: Calendar,     title: 'Aucun voyage à venir',  sub: 'Recherchez un voyage et réservez votre place', cta: true },
    past:      { icon: CheckCircle,  title: 'Aucun voyage passé',    sub: 'Vos voyages terminés apparaîtront ici', cta: false },
    cancelled: { icon: XCircle,      title: 'Aucune annulation',     sub: 'Vos réservations annulées apparaîtront ici', cta: false },
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mes réservations</h1>
          <p className="text-sm text-gray-400 mt-0.5">{all.length} réservation{all.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle value={viewMode} onChange={setViewMode} />
          <button
            onClick={() => router.push('/passenger/search')}
            className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition shadow-sm shadow-brand-500/20"
          >
            <MapPin size={14} /> Nouveau voyage
          </button>
        </div>
      </div>

      {/* Stats */}
      {!isLoading && all.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total voyages"   value={all.length}           icon={Ticket}      accent="bg-brand-500" />
          <StatCard label="À venir"         value={upcoming.length}      icon={Calendar}    accent="bg-sky-500" />
          <StatCard label="Terminés"        value={past.length}          icon={CheckCircle} accent="bg-green-500" />
          <StatCard label="Total dépensé"   value={formatCFA(totalSpent) as string} icon={CreditCard}  accent="bg-violet-500" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100/80 p-1 rounded-xl w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`text-[11px] px-1.5 py-px rounded-full font-bold min-w-[18px] text-center leading-none ${
                tab === t.key ? 'bg-brand-100 text-brand-600' : 'bg-gray-200 text-gray-500'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-brand-500" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 px-8 text-center">
          {(() => {
            const ec = emptyConfig[tab];
            const EmptyIcon = ec.icon;
            return (
              <>
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <EmptyIcon size={24} className="text-gray-300" />
                </div>
                <p className="font-semibold text-gray-700">{ec.title}</p>
                <p className="text-sm text-gray-400 mt-1">{ec.sub}</p>
                {ec.cta && (
                  <button
                    onClick={() => router.push('/passenger/search')}
                    className="mt-5 bg-brand-500 hover:bg-brand-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition"
                  >
                    Rechercher un voyage
                  </button>
                )}
              </>
            );
          })()}
        </div>
      ) : (
        <div className={viewMode === 'grid'
          ? 'grid grid-cols-1 sm:grid-cols-2 gap-3'
          : 'space-y-3'
        }>
          {displayed.map((b) => (
            <BookingCard
              key={b.id}
              b={b}
              onNavigate={() => router.push(`/passenger/bookings/${b.id}`)}
              onPay={() => handlePay(b.id)}
              paying={payingId === b.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
