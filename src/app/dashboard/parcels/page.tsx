'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { parcelsApi, tripsApi, tenantsApi, usersApi } from '@/lib/api';
import { formatCFA } from '@transpro/shared';
import { PlanGate } from '@/components/ui/PlanGate';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { UserAvatar } from '@/components/ui/UserAvatar';
import {
  Plus, Package, X, Loader2, Search, ChevronRight,
  MapPin, Scale, User, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { useViewMode } from '@/hooks/useViewMode';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

dayjs.locale('fr');

// ── Types ─────────────────────────────────────────────────────────────────────

interface ParcelItem {
  id: string;
  trackingCode: string;
  status: string;
  senderName: string;
  senderPhone: string;
  recipientName: string;
  recipientPhone: string;
  deliveryCity: string;
  description: string;
  weightKg: number;
  fragile: boolean;
  fee: number;
  isPaid: boolean;
  createdAt: string;
  trip: {
    id: string;
    departureAt: string;
    route: { name: string; originCity: { name: string }; destinationCity: { name: string } };
  };
}

interface ParcelForm {
  tripId: string;
  senderId: string;
  senderName: string;
  senderPhone: string;
  senderEmail: string;
  recipientId: string;
  recipientName: string;
  recipientPhone: string;
  recipientEmail: string;
  deliveryCity: string;
  description: string;
  weightKg: string;
  fragile: boolean;
  declaredValue: string;
  fee: string;
  isPaid: boolean;
  paymentMethod: string;
  notes: string;
}

interface UserMatch {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar?: string | null;
}

const defaultForm: ParcelForm = {
  tripId: '', senderId: '', senderName: '', senderPhone: '', senderEmail: '',
  recipientId: '', recipientName: '', recipientPhone: '', recipientEmail: '',
  deliveryCity: '', description: '', weightKg: '', fragile: false,
  declaredValue: '', fee: '', isPaid: false, paymentMethod: 'CASH', notes: '',
};

// ── PhoneLookupBadge ──────────────────────────────────────────────────────────

function PhoneLookupBadge({
  looking, match, phone,
}: { looking: boolean; match: UserMatch | null; phone: string }) {
  const clean = phone.replace(/\s/g, '');
  if (looking) return (
    <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
      <Loader2 size={11} className="animate-spin" />
      Recherche du passager…
    </div>
  );
  if (match) return (
    <div className="mt-2 flex items-center gap-2.5 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
      <UserAvatar firstName={match.firstName} lastName={match.lastName} avatar={match.avatar} size={28} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-green-800 truncate">{match.firstName} {match.lastName}</p>
        <p className="text-[11px] text-green-600 truncate">{match.email}</p>
      </div>
      <CheckCircle2 size={14} className="text-green-500 shrink-0" />
    </div>
  );
  if (clean.length >= 10) return (
    <p className="mt-1.5 text-xs text-gray-400 flex items-center gap-1">
      <User size={11} className="shrink-0" />
      Numéro non inscrit — champ nom requis
    </p>
  );
  return null;
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; classes: string }> = {
  PENDING:    { label: 'En attente',     classes: 'bg-gray-100 text-gray-600' },
  COLLECTED:  { label: 'Pris en charge', classes: 'bg-blue-100 text-blue-700' },
  IN_TRANSIT: { label: 'En transit',     classes: 'bg-purple-100 text-purple-700' },
  ARRIVED:    { label: 'Arrivé',         classes: 'bg-amber-100 text-amber-700' },
  DELIVERED:  { label: 'Livré',          classes: 'bg-green-100 text-green-700' },
  RETURNED:   { label: 'Retourné',       classes: 'bg-red-100 text-red-700' },
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ParcelsPage() {
  const router   = useRouter();
  const qc       = useQueryClient();
  const [showPanel, setShowPanel] = useState(false);
  const [form, setForm]           = useState<ParcelForm>(defaultForm);
  const [estimatedFee, setEstimatedFee] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate,   setFilterDate]   = useState('');
  const [search, setSearch]             = useState('');
  const [viewMode, setViewMode]         = useViewMode('parcels');
  const [senderMatch,      setSenderMatch]      = useState<UserMatch | null>(null);
  const [recipientMatch,   setRecipientMatch]   = useState<UserMatch | null>(null);
  const [senderLooking,    setSenderLooking]    = useState(false);
  const [recipientLooking, setRecipientLooking] = useState(false);

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: tenantRaw } = useQuery({
    queryKey: ['tenant-me'],
    queryFn: () => tenantsApi.me() as any,
    staleTime: 5 * 60 * 1000,
  });
  const tenant = tenantRaw as any;
  const currentPlan: string = tenant?.plan ?? 'BASIC';

  const { data: parcels = [], isLoading } = useQuery<ParcelItem[]>({
    queryKey: ['parcels', filterStatus, filterDate],
    queryFn: () => parcelsApi.list({
      status: filterStatus || undefined,
      date: filterDate || undefined,
    }) as any,
    enabled: ['PROFESSIONAL', 'ENTERPRISE'].includes(currentPlan),
  });

  const { data: upcomingTrips = [] } = useQuery<any[]>({
    queryKey: ['trips-upcoming-for-parcels'],
    queryFn: () => tripsApi.list({ status: 'SCHEDULED' }) as any,
    enabled: showPanel,
    staleTime: 60_000,
  });

  // ── Fee estimation ────────────────────────────────────────────────────────

  useEffect(() => {
    const weight = parseFloat(form.weightKg);
    if (!form.tripId || isNaN(weight) || weight <= 0) {
      setEstimatedFee(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await parcelsApi.estimateFee(form.tripId, weight) as any;
        setEstimatedFee(res?.fee ?? null);
        if (!form.fee) setForm((p) => ({ ...p, fee: String(res?.fee ?? '') }));
      } catch {}
    }, 500);
    return () => clearTimeout(timer);
  }, [form.tripId, form.weightKg]);

  // ── Phone lookups ─────────────────────────────────────────────────────

  useEffect(() => {
    const phone = form.senderPhone.replace(/\s/g, '');
    if (phone.length < 10) { setSenderMatch(null); setSenderLooking(false); return; }
    setSenderLooking(true);
    const t = setTimeout(async () => {
      try {
        const raw = await usersApi.lookupByPhone(phone) as any;
        const res = raw?.id ? raw : null;
        setSenderMatch(res);
        if (res) {
          setForm((p) => ({
            ...p,
            senderId:    res.id,
            senderEmail: res.email,
            senderName:  p.senderName || `${res.firstName} ${res.lastName}`,
          }));
        } else {
          setForm((p) => ({ ...p, senderId: '' }));
        }
      } catch { setSenderMatch(null); }
      finally  { setSenderLooking(false); }
    }, 500);
    return () => clearTimeout(t);
  }, [form.senderPhone]);

  useEffect(() => {
    const phone = form.recipientPhone.replace(/\s/g, '');
    if (phone.length < 10) { setRecipientMatch(null); setRecipientLooking(false); return; }
    setRecipientLooking(true);
    const t = setTimeout(async () => {
      try {
        const raw = await usersApi.lookupByPhone(phone) as any;
        const res = raw?.id ? raw : null;
        setRecipientMatch(res);
        if (res) {
          setForm((p) => ({
            ...p,
            recipientId:    res.id,
            recipientEmail: res.email,
            recipientName:  p.recipientName || `${res.firstName} ${res.lastName}`,
          }));
        } else {
          setForm((p) => ({ ...p, recipientId: '' }));
        }
      } catch { setRecipientMatch(null); }
      finally  { setRecipientLooking(false); }
    }, 500);
    return () => clearTimeout(t);
  }, [form.recipientPhone]);

  // ── Create mutation ───────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (data: any) => parcelsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parcels'] });
      toast.success('Colis enregistré');
      setShowPanel(false);
      setForm(defaultForm);
      setEstimatedFee(null);
      setSenderMatch(null);
      setRecipientMatch(null);
      setSenderLooking(false);
      setRecipientLooking(false);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? 'Erreur lors de l\'enregistrement'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.tripId || !form.recipientName || !form.recipientPhone || !form.deliveryCity || !form.description || !form.weightKg) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    createMutation.mutate({
      tripId:         form.tripId,
      senderName:     form.senderName || undefined,
      senderPhone:    form.senderPhone || undefined,
      senderEmail:    form.senderEmail || undefined,
      recipientId:    form.recipientId || undefined,
      recipientName:  form.recipientName,
      recipientPhone: form.recipientPhone,
      recipientEmail: form.recipientEmail || undefined,
      deliveryCity:   form.deliveryCity,
      description:    form.description,
      weightKg:       parseFloat(form.weightKg),
      fragile:        form.fragile,
      declaredValue:  form.declaredValue ? parseInt(form.declaredValue) : undefined,
      fee:            form.fee ? parseInt(form.fee) : undefined,
      isPaid:         form.isPaid,
      paymentMethod:  form.isPaid ? form.paymentMethod : undefined,
      notes:          form.notes || undefined,
    });
  }

  // ── Filtered list ─────────────────────────────────────────────────────────

  const filtered = (parcels as ParcelItem[]).filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.trackingCode.toLowerCase().includes(q) ||
      p.senderName.toLowerCase().includes(q) ||
      p.recipientName.toLowerCase().includes(q) ||
      p.deliveryCity.toLowerCase().includes(q)
    );
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Colis</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gérez les envois de colis sur vos voyages</p>
        </div>
        {['PROFESSIONAL', 'ENTERPRISE'].includes(currentPlan) && (
          <button
            onClick={() => setShowPanel(true)}
            className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition"
          >
            <Plus size={16} /> Enregistrer un colis
          </button>
        )}
      </div>

      <PlanGate requiredPlans={['PROFESSIONAL', 'ENTERPRISE']} currentPlan={currentPlan}>
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Code, expéditeur, destinataire..."
              className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-64"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS_CFG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />

          {(filterStatus || filterDate || search) && (
            <button
              onClick={() => { setFilterStatus(''); setFilterDate(''); setSearch(''); }}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <X size={14} /> Effacer
            </button>
          )}
          <div className="ml-auto">
            <ViewToggle value={viewMode} onChange={setViewMode} />
          </div>
        </div>

        {/* Table / Grid */}
        {isLoading ? (
          <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 text-center py-16">
            <Package size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">
              {search || filterStatus || filterDate ? 'Aucun colis trouvé' : 'Aucun colis enregistré'}
            </p>
            <p className="text-gray-400 text-sm mt-1">
              {!search && !filterStatus && !filterDate && 'Enregistrez votre premier colis sur un voyage'}
            </p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Code</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Expéditeur</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Destinataire</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Trajet</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Poids</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Frais</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Statut</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((p) => {
                    const cfg = STATUS_CFG[p.status] ?? STATUS_CFG['PENDING'];
                    return (
                      <tr
                        key={p.id}
                        onClick={() => router.push(`/dashboard/parcels/${p.id}`)}
                        className="hover:bg-gray-50 transition cursor-pointer"
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded">
                            {p.trackingCode}
                          </span>
                          {p.fragile && (
                            <span className="ml-1.5 text-[10px] text-amber-600 font-semibold">⚠️ Fragile</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{p.senderName}</p>
                          <p className="text-gray-400 text-xs">{p.senderPhone}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{p.recipientName}</p>
                          <p className="text-gray-400 text-xs flex items-center gap-1">
                            <MapPin size={10} /> {p.deliveryCity}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          <p className="font-medium">{p.trip?.route?.name ?? '—'}</p>
                          <p className="text-gray-400">
                            {p.trip?.departureAt ? dayjs(p.trip.departureAt).format('D MMM, HH[h]mm') : '—'}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{p.weightKg} kg</td>
                        <td className="px-4 py-3">
                          <span className={`font-medium ${p.isPaid ? 'text-green-600' : 'text-gray-600'}`}>
                            {formatCFA(p.fee)}
                          </span>
                          {!p.isPaid && (
                            <span className="ml-1 text-[10px] text-amber-600">Non payé</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${cfg.classes}`}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                          {dayjs(p.createdAt).format('D MMM YYYY')}
                        </td>
                        <td className="px-4 py-3">
                          <ChevronRight size={16} className="text-gray-300" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => {
              const cfg = STATUS_CFG[p.status] ?? STATUS_CFG['PENDING'];
              return (
                <div
                  key={p.id}
                  onClick={() => router.push(`/dashboard/parcels/${p.id}`)}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3 cursor-pointer hover:border-brand-200 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded">
                      {p.trackingCode}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {p.fragile && <span className="text-[10px] text-amber-600 font-semibold">⚠️ Fragile</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.classes}`}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Expéditeur</p>
                      <p className="font-medium text-gray-900 truncate">{p.senderName}</p>
                      <p className="text-xs text-gray-400">{p.senderPhone}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Destinataire</p>
                      <p className="font-medium text-gray-900 truncate">{p.recipientName}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-0.5">
                        <MapPin size={10} /> {p.deliveryCity}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                    <p className="font-medium text-gray-700">{p.trip?.route?.name ?? '—'}</p>
                    <p className="text-gray-400">{p.trip?.departureAt ? dayjs(p.trip.departureAt).format('D MMM, HH[h]mm') : '—'}</p>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-gray-50 text-xs">
                    <span className="flex items-center gap-1 text-gray-500">
                      <Scale size={11} className="text-gray-400" /> {p.weightKg} kg
                    </span>
                    <span className={`font-semibold ${p.isPaid ? 'text-green-600' : 'text-amber-600'}`}>
                      {formatCFA(p.fee)}{!p.isPaid && ' · Non payé'}
                    </span>
                    <span className="text-gray-400">{dayjs(p.createdAt).format('D MMM')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PlanGate>

      {/* ── Create slide-over ─────────────────────────────────────────────── */}
      {showPanel && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setShowPanel(false)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-white shadow-2xl flex flex-col">
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Enregistrer un colis</h2>
                <p className="text-sm text-gray-400 mt-0.5">Le colis sera assigné au voyage sélectionné</p>
              </div>
              <button onClick={() => setShowPanel(false)} className="text-gray-400 hover:text-gray-600 transition">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="px-6 py-5 space-y-6">

                {/* ── Voyage ── */}
                <section>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Voyage</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Voyage de départ <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      value={form.tripId}
                      onChange={(v) => setForm((p) => ({ ...p, tripId: v, fee: '' }))}
                      placeholder="Sélectionner un voyage..."
                      options={(upcomingTrips as any[]).map((t: any) => ({
                        value: t.id,
                        label: `${t.route?.originCity?.name ?? '?'} → ${t.route?.destinationCity?.name ?? '?'}`,
                        sub: dayjs(t.departureAt).format('D MMM HH[h]mm'),
                      }))}
                    />
                  </div>
                </section>

                <hr className="border-gray-100" />

                {/* ── Expéditeur ── */}
                <section>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Expéditeur</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                      <PhoneInput
                        value={form.senderPhone}
                        onChange={(v) => {
                          setForm((p) => ({ ...p, senderPhone: v, senderId: '', senderName: '', senderEmail: '' }));
                          setSenderMatch(null);
                        }}
                      />
                      <PhoneLookupBadge looking={senderLooking} match={senderMatch} phone={form.senderPhone} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                      <input
                        type="text"
                        value={form.senderName}
                        onChange={(e) => setForm((p) => ({ ...p, senderName: e.target.value }))}
                        placeholder="Koné Amani"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-gray-400 font-normal">(optionnel)</span></label>
                      <input
                        type="email"
                        value={form.senderEmail}
                        onChange={(e) => setForm((p) => ({ ...p, senderEmail: e.target.value }))}
                        placeholder="expediteur@email.com"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                  </div>
                </section>

                <hr className="border-gray-100" />

                {/* ── Destinataire ── */}
                <section>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Destinataire</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Téléphone <span className="text-red-500">*</span>
                      </label>
                      <PhoneInput
                        value={form.recipientPhone}
                        onChange={(v) => {
                          setForm((p) => ({ ...p, recipientPhone: v, recipientId: '', recipientName: '', recipientEmail: '' }));
                          setRecipientMatch(null);
                        }}
                      />
                      <PhoneLookupBadge looking={recipientLooking} match={recipientMatch} phone={form.recipientPhone} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nom <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.recipientName}
                        onChange={(e) => setForm((p) => ({ ...p, recipientName: e.target.value }))}
                        placeholder="Traoré Fatou"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        required
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ville de livraison <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={form.deliveryCity}
                        onChange={(e) => setForm((p) => ({ ...p, deliveryCity: e.target.value }))}
                        placeholder="Bouaké"
                        className="w-full pl-8 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        required
                      />
                    </div>
                  </div>
                </section>

                <hr className="border-gray-100" />

                {/* ── Colis ── */}
                <section>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Description du colis</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.description}
                        onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                        placeholder="Vêtements, électronique, alimentaire..."
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Poids (kg) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Scale size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="number"
                            value={form.weightKg}
                            onChange={(e) => setForm((p) => ({ ...p, weightKg: e.target.value }))}
                            placeholder="2.5"
                            min="0.1"
                            max="50"
                            step="0.1"
                            className="w-full pl-8 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Valeur déclarée (FCFA)</label>
                        <input
                          type="number"
                          value={form.declaredValue}
                          onChange={(e) => setForm((p) => ({ ...p, declaredValue: e.target.value }))}
                          placeholder="Ex: 50 000"
                          min="0"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.fragile}
                        onChange={(e) => setForm((p) => ({ ...p, fragile: e.target.checked }))}
                        className="w-4 h-4 accent-brand-500"
                      />
                      <span className="text-sm text-gray-700 flex items-center gap-1.5">
                        <AlertCircle size={14} className="text-amber-500" />
                        Colis fragile — manipulation avec précaution
                      </span>
                    </label>
                  </div>
                </section>

                <hr className="border-gray-100" />

                {/* ── Frais & paiement ── */}
                <section>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Frais & paiement</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Frais d&apos;envoi (FCFA)
                        {estimatedFee !== null && (
                          <span className="ml-2 text-xs text-brand-500 font-normal">
                            Estimé : {formatCFA(estimatedFee)}
                          </span>
                        )}
                      </label>
                      <input
                        type="number"
                        value={form.fee}
                        onChange={(e) => setForm((p) => ({ ...p, fee: e.target.value }))}
                        placeholder={estimatedFee ? String(estimatedFee) : 'Calculé automatiquement'}
                        min="0"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>

                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.isPaid}
                        onChange={(e) => setForm((p) => ({ ...p, isPaid: e.target.checked }))}
                        className="w-4 h-4 accent-brand-500"
                      />
                      <span className="text-sm text-gray-700">Frais payés maintenant</span>
                    </label>

                    {form.isPaid && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Moyen de paiement</label>
                        <select
                          value={form.paymentMethod}
                          onChange={(e) => setForm((p) => ({ ...p, paymentMethod: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                          <option value="CASH">Espèces</option>
                          <option value="ORANGE_MONEY">Orange Money</option>
                          <option value="MTN_MOMO">MTN MoMo</option>
                          <option value="WAVE">Wave</option>
                        </select>
                      </div>
                    )}
                  </div>
                </section>

                <section>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes internes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="Informations supplémentaires..."
                    rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  />
                </section>

              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPanel(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition disabled:opacity-60"
                >
                  {createMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                  Enregistrer le colis
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
