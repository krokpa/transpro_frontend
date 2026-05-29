'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driversApi } from '@/lib/api';
import {
  ArrowLeft, Star, Calendar, X, Loader2, Plus, Check, Trash2,
  AlertTriangle, Phone, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

dayjs.locale('fr');

// ── Types ─────────────────────────────────────────────────────────────────────

interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry: string;
  isAvailable: boolean;
}

interface ScheduleTrip {
  id: string;
  departureTime: string;
  arrivalTime: string;
  status: string;
  route?: { origin: string; destination: string };
  vehicle?: { plate: string; brand: string; model: string };
}

interface Absence {
  id: string;
  startDate: string;
  endDate: string;
  type: 'LEAVE' | 'SICK' | 'OTHER';
  reason?: string;
  approved: boolean;
}

interface Evaluation {
  id: string;
  createdAt: string;
  rating: number;
  punctuality?: number;
  safety?: number;
  service?: number;
  comment?: string;
  evaluatedBy?: { firstName: string; lastName: string };
  trip?: { route?: { origin: string; destination: string }; departureTime: string };
}

interface EvaluationsResponse {
  averageRating: number;
  evaluations: Evaluation[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const absenceTypeLabel: Record<string, string> = {
  LEAVE: 'Congé',
  SICK: 'Maladie',
  OTHER: 'Autre',
};

const statusLabel: Record<string, { label: string; className: string }> = {
  SCHEDULED: { label: 'Planifié', className: 'bg-blue-100 text-blue-700' },
  BOARDING:  { label: 'Embarquement', className: 'bg-yellow-100 text-yellow-700' },
  DEPARTED:  { label: 'Parti', className: 'bg-green-100 text-green-700' },
  ARRIVED:   { label: 'Arrivé', className: 'bg-gray-100 text-gray-600' },
  CANCELLED: { label: 'Annulé', className: 'bg-red-100 text-red-600' },
};

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          className={onChange ? 'cursor-pointer' : 'cursor-default'}
        >
          <Star
            size={16}
            className={n <= value ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}
          />
        </button>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [tab, setTab] = useState<'schedule' | 'absences' | 'evaluations'>('schedule');
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));

  // Absence modal state
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [absenceForm, setAbsenceForm] = useState({
    startDate: '', endDate: '', type: 'LEAVE', reason: '',
  });

  // Evaluation modal state
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [evalForm, setEvalForm] = useState({
    rating: 3, punctuality: 3, safety: 3, service: 3, comment: '',
  });

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: driver, isLoading: loadingDriver } = useQuery<Driver>({
    queryKey: ['driver', id],
    queryFn: () => driversApi.get(id) as any,
    enabled: !!id,
  });

  const { data: schedule = [], isLoading: loadingSchedule } = useQuery<ScheduleTrip[]>({
    queryKey: ['driver-schedule', id, month],
    queryFn: () => driversApi.getSchedule(id, month) as any,
    enabled: !!id && tab === 'schedule',
  });

  const { data: absences = [], isLoading: loadingAbsences } = useQuery<Absence[]>({
    queryKey: ['driver-absences', id],
    queryFn: () => driversApi.getAbsences(id) as any,
    enabled: !!id && tab === 'absences',
  });

  const { data: evalData, isLoading: loadingEvals } = useQuery<EvaluationsResponse>({
    queryKey: ['driver-evaluations', id],
    queryFn: () => driversApi.getEvaluations(id) as any,
    enabled: !!id && tab === 'evaluations',
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const toggleAvailMutation = useMutation({
    mutationFn: (val: boolean) => driversApi.update(id, { isAvailable: val }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['driver', id] }),
    onError: () => toast.error('Erreur'),
  });

  const addAbsenceMutation = useMutation({
    mutationFn: (data: any) => driversApi.addAbsence(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver-absences', id] });
      toast.success('Absence enregistrée');
      setShowAbsenceModal(false);
      setAbsenceForm({ startDate: '', endDate: '', type: 'LEAVE', reason: '' });
    },
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  });

  const approveAbsenceMutation = useMutation({
    mutationFn: (absenceId: string) => driversApi.updateAbsence(id, absenceId, { approved: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver-absences', id] });
      toast.success('Absence approuvée');
    },
    onError: () => toast.error('Erreur'),
  });

  const deleteAbsenceMutation = useMutation({
    mutationFn: (absenceId: string) => driversApi.deleteAbsence(id, absenceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver-absences', id] });
      toast.success('Absence supprimée');
    },
    onError: () => toast.error('Erreur'),
  });

  const addEvalMutation = useMutation({
    mutationFn: (data: any) => driversApi.addEvaluation(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver-evaluations', id] });
      toast.success('Évaluation enregistrée');
      setShowEvalModal(false);
      setEvalForm({ rating: 3, punctuality: 3, safety: 3, service: 3, comment: '' });
    },
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  });

  const deleteEvalMutation = useMutation({
    mutationFn: (evalId: string) => driversApi.deleteEvaluation(id, evalId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver-evaluations', id] });
      toast.success('Évaluation supprimée');
    },
    onError: () => toast.error('Erreur'),
  });

  // ── Derived ────────────────────────────────────────────────────────────────

  const licenseExpired = driver ? dayjs(driver.licenseExpiry).isBefore(dayjs(), 'day') : false;
  const licenseWarn = driver && !licenseExpired
    ? dayjs(driver.licenseExpiry).diff(dayjs(), 'day') <= 30
    : false;

  function prevMonth() { setMonth(dayjs(month).subtract(1, 'month').format('YYYY-MM')); }
  function nextMonth() { setMonth(dayjs(month).add(1, 'month').format('YYYY-MM')); }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loadingDriver) {
    return (
      <div className="space-y-4 p-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="text-center py-20 text-gray-400">Chauffeur introuvable</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => router.push('/dashboard/drivers')}
          className="mt-1 text-gray-400 hover:text-gray-600 transition"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {driver.firstName} {driver.lastName}
          </h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
            <span className="flex items-center gap-1"><Phone size={13} />{driver.phone}</span>
            <span>·</span>
            <span className="font-mono">{driver.licenseNumber}</span>
            <span>·</span>
            <span
              className={
                licenseExpired ? 'text-red-600 font-medium' :
                licenseWarn ? 'text-amber-600 font-medium' : ''
              }
            >
              Permis exp. {dayjs(driver.licenseExpiry).format('DD/MM/YYYY')}
              {licenseExpired && <span className="ml-1 text-xs bg-red-100 text-red-700 px-1 rounded">Expiré</span>}
              {licenseWarn && <span className="ml-1 text-xs bg-amber-100 text-amber-700 px-1 rounded flex-inline items-center gap-0.5"><AlertTriangle size={10} className="inline" /> Bientôt</span>}
            </span>
          </div>
        </div>
        <button
          onClick={() => toggleAvailMutation.mutate(!driver.isAvailable)}
          disabled={toggleAvailMutation.isPending}
          className={`text-xs px-3 py-1.5 rounded-full font-medium transition disabled:opacity-50 ${
            driver.isAvailable
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {driver.isAvailable ? 'Disponible' : 'Indisponible'}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6 -mb-px">
          {([
            { key: 'schedule', label: 'Planning mensuel', icon: <Calendar size={14} /> },
            { key: 'absences', label: 'Absences', icon: <AlertTriangle size={14} /> },
            { key: 'evaluations', label: 'Évaluations', icon: <Star size={14} /> },
          ] as const).map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 pb-3 text-sm font-medium border-b-2 transition ${
                tab === key
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Tab: Planning ── */}
      {tab === 'schedule' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium text-gray-700 capitalize min-w-[120px] text-center">
              {dayjs(month).format('MMMM YYYY')}
            </span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {loadingSchedule ? (
              <div className="space-y-3 p-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : schedule.length === 0 ? (
              <div className="text-center py-12">
                <Calendar size={36} className="text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Aucun trajet ce mois-ci</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Trajet</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Véhicule</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {schedule.map((trip) => {
                    const sc = statusLabel[trip.status] ?? { label: trip.status, className: 'bg-gray-100 text-gray-600' };
                    return (
                      <tr key={trip.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-gray-700">
                          <p className="font-medium">{dayjs(trip.departureTime).format('ddd DD MMM')}</p>
                          <p className="text-xs text-gray-400">{dayjs(trip.departureTime).format('HH:mm')}</p>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {trip.route ? `${trip.route.origin} → ${trip.route.destination}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs font-mono">
                          {trip.vehicle ? `${trip.vehicle.plate} · ${trip.vehicle.brand} ${trip.vehicle.model}` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.className}`}>
                            {sc.label}
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
          <div className="flex justify-end">
            <button
              onClick={() => setShowAbsenceModal(true)}
              className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition"
            >
              <Plus size={15} /> Enregistrer une absence
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {loadingAbsences ? (
              <div className="space-y-3 p-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : absences.length === 0 ? (
              <div className="text-center py-12">
                <Calendar size={36} className="text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Aucune absence enregistrée</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Période</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Motif</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Statut</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {absences.map((absence) => (
                    <tr key={absence.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-gray-700">
                        {dayjs(absence.startDate).format('DD/MM/YYYY')} — {dayjs(absence.endDate).format('DD/MM/YYYY')}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-medium">
                          {absenceTypeLabel[absence.type] ?? absence.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{absence.reason ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          absence.approved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {absence.approved ? 'Approuvée' : 'En attente'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {!absence.approved && (
                            <button
                              onClick={() => approveAbsenceMutation.mutate(absence.id)}
                              disabled={approveAbsenceMutation.isPending}
                              title="Approuver"
                              className="text-green-600 hover:text-green-700 transition disabled:opacity-50"
                            >
                              <Check size={15} />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (confirm('Supprimer cette absence ?'))
                                deleteAbsenceMutation.mutate(absence.id);
                            }}
                            disabled={deleteAbsenceMutation.isPending}
                            title="Supprimer"
                            className="text-red-400 hover:text-red-600 transition disabled:opacity-50"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Évaluations ── */}
      {tab === 'evaluations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            {evalData && evalData.evaluations.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-3 flex items-center gap-3">
                  <div className="text-3xl font-bold text-gray-900">
                    {evalData.averageRating.toFixed(1)}
                  </div>
                  <div>
                    <StarRating value={Math.round(evalData.averageRating)} />
                    <p className="text-xs text-gray-400 mt-0.5">{evalData.evaluations.length} évaluation(s)</p>
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={() => setShowEvalModal(true)}
              className="ml-auto bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition"
            >
              <Plus size={15} /> Évaluer
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {loadingEvals ? (
              <div className="space-y-3 p-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : !evalData || evalData.evaluations.length === 0 ? (
              <div className="text-center py-12">
                <Star size={36} className="text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Aucune évaluation pour ce chauffeur</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {evalData.evaluations.map((ev) => (
                  <div key={ev.id} className="px-5 py-4 hover:bg-gray-50 transition">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <StarRating value={ev.rating} />
                          <span className="text-xs text-gray-400">
                            {dayjs(ev.createdAt).format('DD/MM/YYYY')}
                          </span>
                          {ev.trip && (
                            <span className="text-xs text-gray-500">
                              {ev.trip.route
                                ? `${ev.trip.route.origin} → ${ev.trip.route.destination}`
                                : dayjs(ev.trip.departureTime).format('DD/MM HH:mm')}
                            </span>
                          )}
                        </div>
                        {(ev.punctuality || ev.safety || ev.service) && (
                          <div className="flex gap-4 mt-1 text-xs text-gray-500">
                            {ev.punctuality && <span>Ponctualité: <strong>{ev.punctuality}/5</strong></span>}
                            {ev.safety && <span>Sécurité: <strong>{ev.safety}/5</strong></span>}
                            {ev.service && <span>Service: <strong>{ev.service}/5</strong></span>}
                          </div>
                        )}
                        {ev.comment && (
                          <p className="text-sm text-gray-600 mt-1">{ev.comment}</p>
                        )}
                        {ev.evaluatedBy && (
                          <p className="text-xs text-gray-400 mt-1">
                            Par {ev.evaluatedBy.firstName} {ev.evaluatedBy.lastName}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          if (confirm('Supprimer cette évaluation ?'))
                            deleteEvalMutation.mutate(ev.id);
                        }}
                        disabled={deleteEvalMutation.isPending}
                        className="text-red-300 hover:text-red-500 transition disabled:opacity-50"
                      >
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

      {/* ── Modal: Absence ── */}
      {showAbsenceModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAbsenceModal(false); }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">Enregistrer une absence</h2>
              <button onClick={() => setShowAbsenceModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!absenceForm.startDate || !absenceForm.endDate) {
                  toast.error('Dates requises');
                  return;
                }
                addAbsenceMutation.mutate(absenceForm);
              }}
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Début <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={absenceForm.startDate}
                    onChange={(e) => setAbsenceForm((p) => ({ ...p, startDate: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fin <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={absenceForm.endDate}
                    onChange={(e) => setAbsenceForm((p) => ({ ...p, endDate: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={absenceForm.type}
                  onChange={(e) => setAbsenceForm((p) => ({ ...p, type: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="LEAVE">Congé</option>
                  <option value="SICK">Maladie</option>
                  <option value="OTHER">Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motif</label>
                <input
                  type="text"
                  value={absenceForm.reason}
                  onChange={(e) => setAbsenceForm((p) => ({ ...p, reason: e.target.value }))}
                  placeholder="Motif (optionnel)"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setShowAbsenceModal(false)} className="px-4 py-2 text-sm text-gray-600">
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={addAbsenceMutation.isPending}
                  className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-60"
                >
                  {addAbsenceMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Évaluation ── */}
      {showEvalModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setShowEvalModal(false); }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">Évaluer le chauffeur</h2>
              <button onClick={() => setShowEvalModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                addEvalMutation.mutate(evalForm);
              }}
            >
              {([
                { key: 'rating', label: 'Note globale' },
                { key: 'punctuality', label: 'Ponctualité' },
                { key: 'safety', label: 'Sécurité' },
                { key: 'service', label: 'Service' },
              ] as const).map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">{label}</label>
                  <StarRating
                    value={evalForm[key]}
                    onChange={(v) => setEvalForm((p) => ({ ...p, [key]: v }))}
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Commentaire</label>
                <textarea
                  value={evalForm.comment}
                  onChange={(e) => setEvalForm((p) => ({ ...p, comment: e.target.value }))}
                  rows={3}
                  placeholder="Observations sur ce trajet..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setShowEvalModal(false)} className="px-4 py-2 text-sm text-gray-600">
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={addEvalMutation.isPending}
                  className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-60"
                >
                  {addEvalMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
