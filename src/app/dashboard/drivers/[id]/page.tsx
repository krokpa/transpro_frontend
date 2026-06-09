'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driversApi } from '@/lib/api';
import { confirm } from '@/lib/confirm';
import {
  ArrowLeft, Star, Calendar, Loader2, Plus, Check, Trash2,
  AlertTriangle, Phone, ChevronLeft, ChevronRight, Bus,
  TrendingUp, Clock, Award, ShieldCheck, UserCheck,
  Edit2, X, Send,
} from 'lucide-react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

dayjs.locale('fr');

// ── Types ──────────────────────────────────────────────────────────────────────

interface Driver {
  id: string; firstName: string; lastName: string;
  phone: string; licenseNumber: string; licenseExpiry: string;
  isAvailable: boolean; _count?: { trips: number };
}

interface Stats {
  tripsTotal: number; tripsThisMonth: number; tripsLastMonth: number;
  tripsCompleted: number; tripsCancelled: number; completionRate: number | null;
  avgRating: number | null; avgPunctuality: number | null;
  avgSafety: number | null; avgService: number | null;
  evaluationCount: number; absencesThisYear: number; absencesPending: number;
  licenseExpiresInDays: number; isLicenseExpired: boolean;
}

interface ScheduleTrip {
  id: string; departureTime: string; status: string;
  route?: { origin: string; destination: string; name: string };
  vehicle?: { plate: string; brand: string; model: string; capacity: number };
  price: number; totalSeats: number; availableSeats: number;
}

interface Absence {
  id: string; startDate: string; endDate: string;
  type: 'LEAVE' | 'SICK' | 'OTHER'; reason?: string; approved: boolean;
}

interface Evaluation {
  id: string; createdAt: string; rating: number;
  punctuality?: number; safety?: number; service?: number;
  comment?: string;
  evaluatedBy?: { firstName: string; lastName: string };
  trip?: { route?: { origin: string; destination: string }; departureTime: string };
}

interface EvaluationsResponse {
  averageRating: number | null; evaluations: Evaluation[]; count: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const ABSENCE_LABEL: Record<string, string> = { LEAVE: 'Congé', SICK: 'Maladie', OTHER: 'Autre' };
const ABSENCE_COLOR: Record<string, string> = {
  LEAVE: 'bg-blue-50 text-blue-700 border-blue-100',
  SICK:  'bg-red-50 text-red-700 border-red-100',
  OTHER: 'bg-gray-50 text-gray-700 border-gray-200',
};

const STATUS_CFG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  SCHEDULED: { label: 'Planifié',      dot: 'bg-blue-400',   bg: 'bg-blue-50',   text: 'text-blue-700' },
  BOARDING:  { label: 'Embarquement',  dot: 'bg-amber-400',  bg: 'bg-amber-50',  text: 'text-amber-700' },
  DEPARTED:  { label: 'En route',      dot: 'bg-green-400',  bg: 'bg-green-50',  text: 'text-green-700' },
  ARRIVED:   { label: 'Arrivé',        dot: 'bg-slate-400',  bg: 'bg-slate-50',  text: 'text-slate-600' },
  CANCELLED: { label: 'Annulé',        dot: 'bg-red-400',    bg: 'bg-red-50',    text: 'text-red-600' },
  DELAYED:   { label: 'Retardé',       dot: 'bg-orange-400', bg: 'bg-orange-50', text: 'text-orange-700' },
};

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <Star key={n} size={size}
          className={n <= Math.round(value) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
      ))}
    </span>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <span className="flex gap-1">
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}>
          <Star size={20} className={n <= value ? 'text-amber-400 fill-amber-400' : 'text-gray-300'} />
        </button>
      ))}
    </span>
  );
}

function SubScore({ label, value }: { label: string; value?: number | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 w-24">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(value / 5) * 100}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-700 w-6 text-right">{value}</span>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'schedule' | 'absences' | 'evaluations';

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [tab, setTab] = useState<Tab>('overview');
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [absenceForm, setAbsenceForm] = useState({ startDate: '', endDate: '', type: 'LEAVE', reason: '' });
  const [evalForm, setEvalForm] = useState({ rating: 4, punctuality: 4, safety: 4, service: 4, comment: '' });
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', phone: '', licenseNumber: '', licenseExpiry: '' });

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: driver, isLoading: loadingDriver } = useQuery<Driver>({
    queryKey: ['driver', id],
    queryFn: () => driversApi.get(id) as any,
    enabled: !!id,
  });

  const { data: stats, isLoading: loadingStats } = useQuery<Stats>({
    queryKey: ['driver-stats', id],
    queryFn: () => driversApi.getStats(id) as any,
    enabled: !!id,
  });

  const { data: schedule = [], isLoading: loadingSchedule } = useQuery<ScheduleTrip[]>({
    queryKey: ['driver-schedule', id, month],
    queryFn: () => driversApi.getSchedule(id, month) as any,
    enabled: !!id && (tab === 'schedule' || tab === 'overview'),
  });

  const { data: absences = [], isLoading: loadingAbsences } = useQuery<Absence[]>({
    queryKey: ['driver-absences', id],
    queryFn: () => driversApi.getAbsences(id) as any,
    enabled: !!id && (tab === 'absences' || tab === 'overview'),
  });

  const { data: evalData, isLoading: loadingEvals } = useQuery<EvaluationsResponse>({
    queryKey: ['driver-evaluations', id],
    queryFn: () => driversApi.getEvaluations(id) as any,
    enabled: !!id && (tab === 'evaluations' || tab === 'overview'),
  });

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const toggleAvail = useMutation({
    mutationFn: (val: boolean) => driversApi.update(id, { isAvailable: val }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['driver', id] }); qc.invalidateQueries({ queryKey: ['driver-stats', id] }); },
    onError: () => toast.error('Erreur'),
  });

  const inviteDriver = useMutation({
    mutationFn: () => driversApi.invite(id),
    onSuccess: () => toast.success(`Code de connexion envoyé au ${driver?.phone}`),
    onError: () => toast.error('Erreur lors de l\'envoi'),
  });

  const updateDriver = useMutation({
    mutationFn: (data: any) => driversApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver', id] });
      toast.success('Chauffeur mis à jour');
      setShowEditModal(false);
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const addAbsence = useMutation({
    mutationFn: (data: any) => driversApi.addAbsence(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver-absences', id] });
      qc.invalidateQueries({ queryKey: ['driver-stats', id] });
      toast.success('Absence enregistrée');
      setShowAbsenceModal(false);
      setAbsenceForm({ startDate: '', endDate: '', type: 'LEAVE', reason: '' });
    },
    onError: () => toast.error("Erreur"),
  });

  const approveAbsence = useMutation({
    mutationFn: (absenceId: string) => driversApi.updateAbsence(id, absenceId, { approved: true }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['driver-absences', id] }); toast.success('Absence approuvée'); },
    onError: () => toast.error('Erreur'),
  });

  const deleteAbsence = useMutation({
    mutationFn: (absenceId: string) => driversApi.deleteAbsence(id, absenceId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['driver-absences', id] }); qc.invalidateQueries({ queryKey: ['driver-stats', id] }); toast.success('Supprimé'); },
    onError: () => toast.error('Erreur'),
  });

  const addEval = useMutation({
    mutationFn: (data: any) => driversApi.addEvaluation(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver-evaluations', id] });
      qc.invalidateQueries({ queryKey: ['driver-stats', id] });
      toast.success('Évaluation enregistrée');
      setShowEvalModal(false);
      setEvalForm({ rating: 4, punctuality: 4, safety: 4, service: 4, comment: '' });
    },
    onError: () => toast.error("Erreur"),
  });

  const deleteEval = useMutation({
    mutationFn: (evalId: string) => driversApi.deleteEvaluation(id, evalId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['driver-evaluations', id] }); qc.invalidateQueries({ queryKey: ['driver-stats', id] }); toast.success('Supprimé'); },
    onError: () => toast.error('Erreur'),
  });

  // ── Derived ───────────────────────────────────────────────────────────────────

  if (loadingDriver) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={28} className="animate-spin text-brand-500" />
    </div>
  );

  if (!driver) return <div className="text-center py-20 text-slate-400">Chauffeur introuvable</div>;

  const initials = `${driver.firstName[0]}${driver.lastName[0]}`.toUpperCase();
  const licenseExpiry = dayjs(driver.licenseExpiry);
  const licenseExpired = licenseExpiry.isBefore(dayjs(), 'day');
  const daysToExpiry = licenseExpiry.diff(dayjs(), 'day');
  const licenseWarn = !licenseExpired && daysToExpiry <= 60;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview',    label: 'Vue d\'ensemble', icon: <TrendingUp size={14} /> },
    { key: 'schedule',    label: 'Planning',         icon: <Calendar size={14} /> },
    { key: 'absences',    label: 'Absences',          icon: <Clock size={14} /> },
    { key: 'evaluations', label: 'Évaluations',       icon: <Star size={14} /> },
  ];

  return (
    <div className="space-y-6">

      {/* ── Header card ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Gradient band */}
        <div className="h-24 bg-gradient-to-r from-brand-500 via-brand-400 to-orange-300 relative">
          <button
            onClick={() => router.push('/dashboard/drivers')}
            className="absolute top-4 left-4 p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition backdrop-blur-sm"
          >
            <ArrowLeft size={16} className="text-white" />
          </button>
        </div>

        <div className="px-6 pb-5 relative">
          <div className="flex items-end gap-5 -mt-10 mb-4">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-bold text-brand-500">{initials}</span>
            </div>

            <div className="flex-1 pb-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900">{driver.firstName} {driver.lastName}</h1>
                {/* Availability badge */}
                <button
                  onClick={() => toggleAvail.mutate(!driver.isAvailable)}
                  disabled={toggleAvail.isPending}
                  className={`text-xs px-3 py-1 rounded-full font-semibold border transition disabled:opacity-50 ${
                    driver.isAvailable
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {driver.isAvailable ? '● Disponible' : '○ Indisponible'}
                </button>
                {/* License badge */}
                {licenseExpired ? (
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
                    <AlertTriangle size={11} /> Permis expiré
                  </span>
                ) : licenseWarn ? (
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                    <AlertTriangle size={11} /> Expire dans {daysToExpiry}j
                  </span>
                ) : (
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-green-50 text-green-700 border border-green-200 flex items-center gap-1">
                    <ShieldCheck size={11} /> Permis valide
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1.5 text-sm text-slate-500">
                <span className="flex items-center gap-1.5"><Phone size={12} />{driver.phone}</span>
                <span className="font-mono text-xs">{driver.licenseNumber}</span>
                <span className="text-xs">Exp. {licenseExpiry.format('DD/MM/YYYY')}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => inviteDriver.mutate()}
                disabled={inviteDriver.isPending}
                title="Envoyer un code de connexion par SMS au chauffeur"
                className="flex items-center gap-1.5 px-3 py-2 border border-brand-200 bg-brand-50 rounded-xl text-sm text-brand-700 hover:bg-brand-100 transition disabled:opacity-50"
              >
                {inviteDriver.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                Envoyer le code
              </button>
              <button
                onClick={() => { setEditForm({ firstName: driver.firstName, lastName: driver.lastName, phone: driver.phone, licenseNumber: driver.licenseNumber, licenseExpiry: licenseExpiry.format('YYYY-MM-DD') }); setShowEditModal(true); }}
                className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition"
              >
                <Edit2 size={13} /> Modifier
              </button>
            </div>
          </div>

          {/* Stats row */}
          {loadingStats ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon={<Bus size={16} className="text-brand-500" />} label="Voyages ce mois"
                value={stats.tripsThisMonth.toString()}
                sub={stats.tripsLastMonth > 0 ? `${stats.tripsLastMonth} le mois dernier` : 'Aucun le mois dernier'} />
              <StatCard icon={<Award size={16} className="text-amber-500" />} label="Note moyenne"
                value={stats.avgRating ? `${stats.avgRating}/5` : '—'}
                sub={`${stats.evaluationCount} évaluation${stats.evaluationCount !== 1 ? 's' : ''}`} />
              <StatCard icon={<UserCheck size={16} className="text-emerald-500" />} label="Taux de réalisation"
                value={stats.completionRate !== null ? `${stats.completionRate}%` : '—'}
                sub={`${stats.tripsCompleted} terminé${stats.tripsCompleted !== 1 ? 's' : ''} / ${stats.tripsTotal} total`} />
              <StatCard icon={<Clock size={16} className="text-purple-500" />} label="Absences cette année"
                value={stats.absencesThisYear.toString()}
                sub={stats.absencesPending > 0 ? `${stats.absencesPending} en attente d'approbation` : 'Toutes traitées'}
                alert={stats.absencesPending > 0} />
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1">
          {tabs.map(({ key, label, icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition ${
                tab === key
                  ? 'border-brand-500 text-brand-600 bg-brand-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Tab: Vue d'ensemble ── */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Prochains voyages */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Calendar size={15} className="text-brand-500" /> Voyages ce mois</h3>
              <button onClick={() => setTab('schedule')} className="text-xs text-brand-500 hover:underline font-medium">Voir tout →</button>
            </div>
            {loadingSchedule ? (
              <div className="space-y-2 p-4">{Array.from({length:3}).map((_,i) => <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse"/>)}</div>
            ) : schedule.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <Bus size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aucun voyage ce mois</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {schedule.slice(0, 5).map((trip) => {
                  const sc = STATUS_CFG[trip.status] ?? STATUS_CFG['SCHEDULED'];
                  return (
                    <div key={trip.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition">
                      <div className="w-12 text-center flex-shrink-0">
                        <p className="text-xs font-bold text-slate-700 capitalize">{dayjs(trip.departureTime).format('ddd')}</p>
                        <p className="text-lg font-bold text-slate-900 leading-tight">{dayjs(trip.departureTime).format('DD')}</p>
                        <p className="text-xs text-slate-400">{dayjs(trip.departureTime).format('HH:mm')}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 truncate">
                          {trip.route ? `${trip.route.origin} → ${trip.route.destination}` : '—'}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{trip.vehicle ? `${trip.vehicle.plate} · ${trip.vehicle.brand} ${trip.vehicle.model}` : '—'}</p>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${sc.bg} ${sc.text}`}>
                        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${sc.dot}`} />
                        {sc.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Performance & dernières évals */}
          <div className="space-y-4">
            {/* Scores détaillés */}
            {stats && stats.evaluationCount > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><Star size={15} className="text-amber-400" /> Performance</h3>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-4xl font-bold text-slate-900">{stats.avgRating?.toFixed(1)}</span>
                  <div>
                    <Stars value={stats.avgRating ?? 0} size={16} />
                    <p className="text-xs text-slate-400 mt-0.5">{stats.evaluationCount} éval.</p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  <SubScore label="Ponctualité" value={stats.avgPunctuality} />
                  <SubScore label="Sécurité" value={stats.avgSafety} />
                  <SubScore label="Service" value={stats.avgService} />
                </div>
              </div>
            )}

            {/* Dernières absences en attente */}
            {stats && stats.absencesPending > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <h3 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                  <AlertTriangle size={14} /> {stats.absencesPending} absence{stats.absencesPending > 1 ? 's' : ''} en attente
                </h3>
                {(absences as Absence[]).filter(a => !a.approved).slice(0, 3).map(a => (
                  <div key={a.id} className="flex items-center justify-between py-1.5">
                    <div>
                      <p className="text-xs font-medium text-amber-900">{ABSENCE_LABEL[a.type]}</p>
                      <p className="text-xs text-amber-700">{dayjs(a.startDate).format('DD/MM')} – {dayjs(a.endDate).format('DD/MM/YYYY')}</p>
                    </div>
                    <button onClick={() => approveAbsence.mutate(a.id)}
                      className="text-xs px-2 py-1 bg-white border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition font-medium">
                      Approuver
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Info permis */}
            <div className={`rounded-2xl border p-4 ${licenseExpired ? 'bg-red-50 border-red-200' : licenseWarn ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
              <h3 className={`font-semibold mb-1 flex items-center gap-2 text-sm ${licenseExpired ? 'text-red-800' : licenseWarn ? 'text-amber-800' : 'text-green-800'}`}>
                <ShieldCheck size={14} /> Permis de conduire
              </h3>
              <p className={`text-xs font-mono mb-1 ${licenseExpired ? 'text-red-700' : licenseWarn ? 'text-amber-700' : 'text-green-700'}`}>{driver.licenseNumber}</p>
              <p className={`text-xs ${licenseExpired ? 'text-red-600' : licenseWarn ? 'text-amber-600' : 'text-green-600'}`}>
                {licenseExpired ? `Expiré depuis ${Math.abs(daysToExpiry)} jour${Math.abs(daysToExpiry) > 1 ? 's' : ''}`
                  : `Expire le ${licenseExpiry.format('DD/MM/YYYY')} (${daysToExpiry}j)`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Planning ── */}
      {tab === 'schedule' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setMonth(dayjs(month).subtract(1,'month').format('YYYY-MM'))}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition">
              <ChevronLeft size={15} />
            </button>
            <span className="text-sm font-semibold text-slate-700 capitalize min-w-[140px] text-center">
              {dayjs(month).format('MMMM YYYY')}
            </span>
            <button onClick={() => setMonth(dayjs(month).add(1,'month').format('YYYY-MM'))}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition">
              <ChevronRight size={15} />
            </button>
            <span className="text-xs text-slate-400 ml-2">{schedule.length} voyage{schedule.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {loadingSchedule ? (
              <div className="space-y-3 p-6">{Array.from({length:4}).map((_,i)=><div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse"/>)}</div>
            ) : schedule.length === 0 ? (
              <div className="text-center py-16">
                <Calendar size={40} className="text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400">Aucun trajet ce mois</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['Date & heure', 'Trajet', 'Véhicule', 'Places', 'Statut'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {schedule.map(trip => {
                    const sc = STATUS_CFG[trip.status] ?? STATUS_CFG['SCHEDULED'];
                    return (
                      <tr key={trip.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-slate-800 capitalize">{dayjs(trip.departureTime).format('ddd DD MMM')}</p>
                          <p className="text-xs text-slate-400">{dayjs(trip.departureTime).format('HH:mm')}</p>
                        </td>
                        <td className="px-5 py-3.5 font-medium text-slate-900">
                          {trip.route ? `${trip.route.origin} → ${trip.route.destination}` : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-500 font-mono">
                          {trip.vehicle ? `${trip.vehicle.plate}` : '—'}
                          {trip.vehicle && <span className="text-slate-400 font-sans"> · {trip.vehicle.brand} {trip.vehicle.model}</span>}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-slate-600">
                          {trip.availableSeats}/{trip.totalSeats}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold ${sc.bg} ${sc.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{sc.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Absences ── */}
      {tab === 'absences' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{absences.length} absence{absences.length !== 1 ? 's' : ''} enregistrée{absences.length !== 1 ? 's' : ''}</p>
            <button onClick={() => setShowAbsenceModal(true)}
              className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition shadow-sm shadow-brand-500/20">
              <Plus size={14} /> Déclarer une absence
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {loadingAbsences ? (
              <div className="space-y-3 p-6">{Array.from({length:3}).map((_,i)=><div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse"/>)}</div>
            ) : absences.length === 0 ? (
              <div className="text-center py-16">
                <Clock size={40} className="text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400">Aucune absence enregistrée</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {absences.map(absence => {
                  const days = dayjs(absence.endDate).diff(dayjs(absence.startDate), 'day') + 1;
                  return (
                    <div key={absence.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition">
                      <div className={`w-2 h-10 rounded-full flex-shrink-0 ${absence.type === 'LEAVE' ? 'bg-blue-400' : absence.type === 'SICK' ? 'bg-red-400' : 'bg-slate-300'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${ABSENCE_COLOR[absence.type]}`}>
                            {ABSENCE_LABEL[absence.type]}
                          </span>
                          <span className="text-xs text-slate-400">{days} jour{days > 1 ? 's' : ''}</span>
                        </div>
                        <p className="text-sm text-slate-700">
                          {dayjs(absence.startDate).format('DD MMM')} — {dayjs(absence.endDate).format('DD MMM YYYY')}
                        </p>
                        {absence.reason && <p className="text-xs text-slate-400 truncate mt-0.5">{absence.reason}</p>}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${absence.approved ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                          {absence.approved ? '✓ Approuvée' : '⏳ En attente'}
                        </span>
                        {!absence.approved && (
                          <button onClick={() => approveAbsence.mutate(absence.id)} disabled={approveAbsence.isPending}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition disabled:opacity-50" title="Approuver">
                            <Check size={15} />
                          </button>
                        )}
                        <button onClick={async () => { if (await confirm({ title: 'Supprimer cette absence ?', variant: 'danger' })) deleteAbsence.mutate(absence.id); }}
                          disabled={deleteAbsence.isPending}
                          className="p-1.5 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition disabled:opacity-50">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Évaluations ── */}
      {tab === 'evaluations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            {evalData && evalData.count > 0 && (
              <div className="flex items-center gap-4 bg-white border border-slate-100 shadow-sm rounded-2xl px-5 py-3">
                <div className="text-center">
                  <p className="text-4xl font-black text-slate-900">{evalData.averageRating?.toFixed(1) ?? '—'}</p>
                  <p className="text-xs text-slate-400">/5</p>
                </div>
                <div>
                  <Stars value={evalData.averageRating ?? 0} size={18} />
                  <p className="text-xs text-slate-500 mt-1">{evalData.count} évaluation{evalData.count !== 1 ? 's' : ''}</p>
                </div>
                {stats && (
                  <div className="pl-4 border-l border-slate-100 space-y-1.5">
                    <SubScore label="Ponctualité" value={stats.avgPunctuality} />
                    <SubScore label="Sécurité" value={stats.avgSafety} />
                    <SubScore label="Service" value={stats.avgService} />
                  </div>
                )}
              </div>
            )}
            <button onClick={() => setShowEvalModal(true)}
              className="ml-auto flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition shadow-sm shadow-brand-500/20">
              <Plus size={14} /> Évaluer
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {loadingEvals ? (
              <div className="space-y-3 p-6">{Array.from({length:3}).map((_,i)=><div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse"/>)}</div>
            ) : !evalData || evalData.count === 0 ? (
              <div className="text-center py-16">
                <Star size={40} className="text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400">Aucune évaluation pour ce chauffeur</p>
                <p className="text-xs text-slate-300 mt-1">Évaluez ses voyages pour suivre ses performances</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {evalData.evaluations.map(ev => (
                  <div key={ev.id} className="px-5 py-4 hover:bg-slate-50 transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1.5">
                          <Stars value={ev.rating} size={14} />
                          <span className="text-xs font-bold text-slate-700">{ev.rating}/5</span>
                          {ev.trip?.route && (
                            <span className="text-xs text-slate-400">
                              · {ev.trip.route.origin} → {ev.trip.route.destination}
                            </span>
                          )}
                        </div>
                        {(ev.punctuality || ev.safety || ev.service) && (
                          <div className="flex gap-4 mb-1.5">
                            {ev.punctuality && <span className="text-xs text-slate-500">Ponctualité: <strong>{ev.punctuality}</strong></span>}
                            {ev.safety && <span className="text-xs text-slate-500">Sécurité: <strong>{ev.safety}</strong></span>}
                            {ev.service && <span className="text-xs text-slate-500">Service: <strong>{ev.service}</strong></span>}
                          </div>
                        )}
                        {ev.comment && <p className="text-sm text-slate-600 italic">"{ev.comment}"</p>}
                        <p className="text-xs text-slate-400 mt-1">
                          {ev.evaluatedBy ? `${ev.evaluatedBy.firstName} ${ev.evaluatedBy.lastName} · ` : ''}
                          {dayjs(ev.createdAt).format('DD MMM YYYY')}
                        </p>
                      </div>
                      <button onClick={async () => { if (await confirm({ title: 'Supprimer cette évaluation ?', variant: 'danger' })) deleteEval.mutate(ev.id); }}
                        className="p-1.5 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {showAbsenceModal && (
        <Modal title="Déclarer une absence" onClose={() => setShowAbsenceModal(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <ModalField label="Date début">
                <input type="date" value={absenceForm.startDate} onChange={e => setAbsenceForm(f => ({...f, startDate: e.target.value}))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500" />
              </ModalField>
              <ModalField label="Date fin">
                <input type="date" value={absenceForm.endDate} onChange={e => setAbsenceForm(f => ({...f, endDate: e.target.value}))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500" />
              </ModalField>
            </div>
            <ModalField label="Type">
              <select value={absenceForm.type} onChange={e => setAbsenceForm(f => ({...f, type: e.target.value}))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                <option value="LEAVE">Congé</option>
                <option value="SICK">Maladie</option>
                <option value="OTHER">Autre</option>
              </select>
            </ModalField>
            <ModalField label="Motif (optionnel)">
              <input type="text" value={absenceForm.reason} onChange={e => setAbsenceForm(f => ({...f, reason: e.target.value}))}
                placeholder="Précisez le motif…"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500" />
            </ModalField>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => setShowAbsenceModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition">Annuler</button>
            <button disabled={!absenceForm.startDate || !absenceForm.endDate || addAbsence.isPending}
              onClick={() => addAbsence.mutate(absenceForm)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50">
              {addAbsence.isPending && <Loader2 size={14} className="animate-spin" />} Enregistrer
            </button>
          </div>
        </Modal>
      )}

      {showEvalModal && (
        <Modal title="Évaluer le chauffeur" onClose={() => setShowEvalModal(false)}>
          <div className="space-y-4">
            {[
              { key: 'rating',      label: 'Note globale *' },
              { key: 'punctuality', label: 'Ponctualité' },
              { key: 'safety',      label: 'Sécurité' },
              { key: 'service',     label: 'Service & attitude' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700 w-36">{label}</span>
                <StarPicker value={(evalForm as any)[key]} onChange={v => setEvalForm(f => ({...f, [key]: v}))} />
              </div>
            ))}
            <ModalField label="Commentaire (optionnel)">
              <textarea value={evalForm.comment} onChange={e => setEvalForm(f => ({...f, comment: e.target.value}))}
                rows={3} placeholder="Observations sur ce chauffeur…"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
            </ModalField>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => setShowEvalModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition">Annuler</button>
            <button onClick={() => addEval.mutate(evalForm)} disabled={addEval.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50">
              {addEval.isPending && <Loader2 size={14} className="animate-spin" />} Enregistrer
            </button>
          </div>
        </Modal>
      )}

      {showEditModal && (
        <Modal title="Modifier le chauffeur" onClose={() => setShowEditModal(false)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <ModalField label="Prénom"><input value={editForm.firstName} onChange={e => setEditForm(f=>({...f,firstName:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"/></ModalField>
              <ModalField label="Nom"><input value={editForm.lastName} onChange={e => setEditForm(f=>({...f,lastName:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"/></ModalField>
            </div>
            <ModalField label="Téléphone"><input value={editForm.phone} onChange={e => setEditForm(f=>({...f,phone:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"/></ModalField>
            <ModalField label="N° Permis"><input value={editForm.licenseNumber} onChange={e => setEditForm(f=>({...f,licenseNumber:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"/></ModalField>
            <ModalField label="Expiration permis"><input type="date" value={editForm.licenseExpiry} onChange={e => setEditForm(f=>({...f,licenseExpiry:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"/></ModalField>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition">Annuler</button>
            <button onClick={() => updateDriver.mutate(editForm)} disabled={updateDriver.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50">
              {updateDriver.isPending && <Loader2 size={14} className="animate-spin" />} Sauvegarder
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Reusable micro-components ──────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, alert = false }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; alert?: boolean;
}) {
  return (
    <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${alert ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${alert ? 'bg-amber-100' : 'bg-white shadow-sm'}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 truncate">{label}</p>
        <p className={`text-lg font-bold leading-tight ${alert ? 'text-amber-800' : 'text-slate-900'}`}>{value}</p>
        {sub && <p className={`text-xs truncate ${alert ? 'text-amber-600' : 'text-slate-400'}`}>{sub}</p>}
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
