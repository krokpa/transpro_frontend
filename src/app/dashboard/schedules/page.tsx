'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schedulesApi, routesApi, vehiclesApi, driversApi, stationsApi } from '@/lib/api';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Plus, Play, RefreshCw, Trash2, Pencil, CalendarClock, Zap, Star, Clock, MapPin, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const DAYS_FULL = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const AMENITIES_OPTIONS = [
  { key: 'AC', label: 'Climatisation' },
  { key: 'WIFI', label: 'Wi-Fi' },
  { key: 'USB', label: 'Prises USB' },
  { key: 'SNACKS', label: 'Collations' },
  { key: 'BLANKET', label: 'Couvertures' },
  { key: 'TOILET', label: 'Toilettes' },
  { key: 'PRIORITY_BOARDING', label: 'Embarquement prioritaire' },
  { key: 'RECLINING_SEATS', label: 'Sièges inclinables' },
];

const CLASS_CONFIG = {
  STANDARD: { label: 'Standard', color: 'bg-slate-100 text-slate-700', icon: Clock },
  VIP: { label: 'VIP', color: 'bg-amber-100 text-amber-700', icon: Star },
  EXPRESS: { label: 'Express', color: 'bg-blue-100 text-blue-700', icon: Zap },
};

const EMPTY_FORM = {
  routeId: '', vehicleId: '', driverId: '',
  departureStationId: '', arrivalStationId: '',
  label: '', departureTime: '08:00',
  daysOfWeek: [1, 2, 3, 4, 5] as number[],
  tripClass: 'STANDARD' as 'STANDARD' | 'VIP' | 'EXPRESS',
  price: '', amenities: [] as string[], generateDaysAhead: 7,
};

export default function SchedulesPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['schedules'],
    queryFn: () => schedulesApi.list() as any,
  });

  const { data: routes = [] } = useQuery({
    queryKey: ['routes'],
    queryFn: () => routesApi.list() as any,
    enabled: showModal,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehiclesApi.list() as any,
    enabled: showModal,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => driversApi.list() as any,
    enabled: showModal,
  });

  const { data: stations = [] } = useQuery({
    queryKey: ['stations'],
    queryFn: () => stationsApi.list() as any,
    enabled: showModal,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => schedulesApi.create(data) as any,
    onSuccess: () => {
      toast.success('Planning créé');
      qc.invalidateQueries({ queryKey: ['schedules'] });
      closeModal();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => schedulesApi.update(id, data) as any,
    onSuccess: () => {
      toast.success('Planning mis à jour');
      qc.invalidateQueries({ queryKey: ['schedules'] });
      closeModal();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: any) => schedulesApi.update(id, { isActive }) as any,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => schedulesApi.remove(id) as any,
    onSuccess: () => {
      toast.success('Planning supprimé');
      qc.invalidateQueries({ queryKey: ['schedules'] });
    },
  });

  const generateAllMutation = useMutation({
    mutationFn: () => schedulesApi.generateAll(7) as any,
    onSuccess: (res: any) => {
      toast.success(`${res.created} voyage(s) générés, ${res.skipped} ignorés`);
      qc.invalidateQueries({ queryKey: ['trips'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });

  function closeModal() {
    setShowModal(false);
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setErrors({});
  }

  function openEdit(schedule: any) {
    setEditId(schedule.id);
    setForm({
      routeId:            schedule.routeId,
      vehicleId:          schedule.vehicleId          ?? '',
      driverId:           schedule.driverId            ?? '',
      departureStationId: schedule.departureStationId ?? '',
      arrivalStationId:   schedule.arrivalStationId   ?? '',
      label:              schedule.label,
      departureTime:      schedule.departureTime,
      daysOfWeek:         schedule.daysOfWeek,
      tripClass:          schedule.tripClass,
      price:              String(schedule.price),
      amenities:          schedule.amenities,
      generateDaysAhead:  schedule.generateDaysAhead,
    });
    setShowModal(true);
  }

  function toggleDay(day: number) {
    setForm((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day].sort(),
    }));
  }

  function toggleAmenity(key: string) {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(key)
        ? prev.amenities.filter((a) => a !== key)
        : [...prev.amenities, key],
    }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.routeId) e.routeId = 'Itinéraire requis';
    if (!form.label.trim()) e.label = 'Libellé requis';
    if (!form.departureTime) e.departureTime = 'Heure requise';
    if (form.daysOfWeek.length === 0) e.daysOfWeek = 'Sélectionnez au moins un jour';
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0)
      e.price = 'Prix valide requis';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const payload = {
      routeId:            form.routeId,
      vehicleId:          form.vehicleId          || undefined,
      driverId:           form.driverId            || undefined,
      departureStationId: form.departureStationId || undefined,
      arrivalStationId:   form.arrivalStationId   || undefined,
      label:              form.label,
      departureTime:      form.departureTime,
      daysOfWeek:         form.daysOfWeek,
      tripClass:          form.tripClass,
      price:              Number(form.price),
      amenities:          form.amenities,
      generateDaysAhead:  form.generateDaysAhead,
    };
    if (editId) {
      updateMutation.mutate({ id: editId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  async function handleGenerate(id: string) {
    setGeneratingId(id);
    try {
      const res = await schedulesApi.generate(id, 7) as any;
      toast.success(`${res.created} voyage(s) générés, ${res.skipped} ignorés`);
      qc.invalidateQueries({ queryKey: ['trips'] });
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Erreur de génération');
    } finally {
      setGeneratingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plannings de départ</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Configurez des départs récurrents par ligne et type de service
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => generateAllMutation.mutate()}
            disabled={generateAllMutation.isPending}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg transition disabled:opacity-50"
          >
            <RefreshCw size={15} className={generateAllMutation.isPending ? 'animate-spin' : ''} />
            Générer tout (7j)
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition"
          >
            <Plus size={15} />
            Nouveau planning
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (schedules as any[]).length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <CalendarClock size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="font-medium text-gray-700">Aucun planning configuré</p>
          <p className="text-sm text-gray-400 mt-1">
            Créez un planning pour générer automatiquement vos voyages
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {(schedules as any[]).map((s: any) => {
            const cls = CLASS_CONFIG[s.tripClass as keyof typeof CLASS_CONFIG] ?? CLASS_CONFIG.STANDARD;
            const Icon = cls.icon;
            return (
              <div
                key={s.id}
                className={`bg-white rounded-xl border p-4 transition ${
                  s.isActive ? 'border-gray-100' : 'border-gray-100 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg ${cls.color}`}>
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">{s.label}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls.color}`}>
                          {cls.label}
                        </span>
                        {!s.isActive && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            Inactif
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-xs text-gray-500">
                          {s.route?.originCity?.name} → {s.route?.destinationCity?.name}
                        </span>
                        <span className="text-xs font-medium text-brand-600">
                          {s.departureTime}
                        </span>
                        <span className="text-xs text-gray-500">
                          {s.price.toLocaleString('fr-FR')} FCFA
                        </span>
                        <span className="text-xs text-gray-400">
                          {s._count?.trips ?? 0} voyage(s) générés
                        </span>
                      </div>
                      {(s.departureStation || s.arrivalStation) && (
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {s.departureStation && (
                            <span className="text-[11px] text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <MapPin size={9} /> Départ : {s.departureStation.name}
                            </span>
                          )}
                          {s.arrivalStation && (
                            <span className="text-[11px] text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <MapPin size={9} /> Arrivée : {s.arrivalStation.name}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex gap-1 mt-2">
                        {DAYS.map((d, i) => (
                          <span
                            key={i}
                            className={`text-[10px] w-6 h-6 flex items-center justify-center rounded-full font-medium ${
                              s.daysOfWeek.includes(i)
                                ? 'bg-brand-500 text-white'
                                : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            {d[0]}
                          </span>
                        ))}
                      </div>
                      {s.amenities?.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {s.amenities.map((a: string) => (
                            <span key={a} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                              {AMENITIES_OPTIONS.find((o) => o.key === a)?.label ?? a}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleGenerate(s.id)}
                      disabled={generatingId === s.id || !s.isActive}
                      title="Générer les voyages (7 jours)"
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition disabled:opacity-40"
                    >
                      <Play size={15} className={generatingId === s.id ? 'animate-pulse' : ''} />
                    </button>
                    <button
                      onClick={() =>
                        toggleMutation.mutate({ id: s.id, isActive: !s.isActive })
                      }
                      disabled={toggleMutation.isPending}
                      title={s.isActive ? 'Désactiver' : 'Activer'}
                      className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg transition text-xs font-medium disabled:opacity-50"
                    >
                      {toggleMutation.isPending && toggleMutation.variables?.id === s.id
                        ? <Loader2 size={14} className="animate-spin" />
                        : s.isActive ? '⏸' : '▶'
                      }
                    </button>
                    <button
                      onClick={() => openEdit(s)}
                      className="p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-700 rounded-lg transition"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Supprimer ce planning ?')) deleteMutation.mutate(s.id);
                      }}
                      disabled={deleteMutation.isPending}
                      className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition disabled:opacity-50"
                    >
                      {deleteMutation.isPending && deleteMutation.variables === s.id
                        ? <Loader2 size={14} className="animate-spin" />
                        : <Trash2 size={15} />
                      }
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {editId ? 'Modifier le planning' : 'Nouveau planning de départ'}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Définissez les horaires et le type de service pour cette ligne
              </p>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Route + label */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Itinéraire <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    value={form.routeId}
                    onChange={(v) => setForm((p) => ({ ...p, routeId: v }))}
                    placeholder="Sélectionner un itinéraire..."
                    options={(routes as any[]).map((r: any) => ({
                      value: r.id,
                      label: `${r.originCity?.name ?? '?'} → ${r.destinationCity?.name ?? '?'}`,
                    }))}
                  />
                  {errors.routeId && <p className="text-red-500 text-xs mt-1">{errors.routeId}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Libellé <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.label}
                    onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
                    placeholder="ex: Abidjan → Bouaké 08h Standard"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  {errors.label && <p className="text-red-500 text-xs mt-1">{errors.label}</p>}
                </div>
              </div>

              {/* Heure + Type de service */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Heure de départ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={form.departureTime}
                    onChange={(e) => setForm((p) => ({ ...p, departureTime: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  {errors.departureTime && <p className="text-red-500 text-xs mt-1">{errors.departureTime}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type de service <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.tripClass}
                    onChange={(e) => setForm((p) => ({ ...p, tripClass: e.target.value as any }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="STANDARD">Standard</option>
                    <option value="VIP">VIP</option>
                    <option value="EXPRESS">Express</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prix (FCFA) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                    placeholder="ex: 3500"
                    min={0}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
                </div>
              </div>

              {/* Jours de la semaine */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jours de circulation <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS_FULL.map((d, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDay(i)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                        form.daysOfWeek.includes(i)
                          ? 'bg-brand-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                {errors.daysOfWeek && <p className="text-red-500 text-xs mt-1">{errors.daysOfWeek}</p>}
              </div>

              {/* Commodités */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Commodités</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {AMENITIES_OPTIONS.map((a) => (
                    <button
                      key={a.key}
                      type="button"
                      onClick={() => toggleAmenity(a.key)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition ${
                        form.amenities.includes(a.key)
                          ? 'border-brand-400 bg-brand-50 text-brand-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-sm border flex items-center justify-center ${
                        form.amenities.includes(a.key) ? 'bg-brand-500 border-brand-500' : 'border-gray-300'
                      }`}>
                        {form.amenities.includes(a.key) && (
                          <span className="text-white text-[8px]">✓</span>
                        )}
                      </span>
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Véhicule + Chauffeur */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Véhicule par défaut
                    <span className="text-gray-400 font-normal ml-1">(requis pour la génération)</span>
                  </label>
                  <SearchableSelect
                    value={form.vehicleId}
                    onChange={(v) => setForm((p) => ({ ...p, vehicleId: v }))}
                    placeholder="Aucun"
                    clearable
                    options={(vehicles as any[])
                      .filter((v: any) => v.status === 'ACTIVE')
                      .map((v: any) => ({
                        value: v.id,
                        label: `${v.brand} ${v.model}`,
                        sub: v.plate,
                      }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chauffeur par défaut</label>
                  <SearchableSelect
                    value={form.driverId}
                    onChange={(v) => setForm((p) => ({ ...p, driverId: v }))}
                    placeholder="Aucun"
                    clearable
                    options={(drivers as any[]).map((d: any) => ({
                      value: d.id,
                      label: `${d.firstName} ${d.lastName}`,
                    }))}
                  />
                </div>
              </div>

              {/* Gares de départ / arrivée */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <MapPin size={13} className="text-brand-500" /> Gare de départ
                    <span className="text-gray-400 font-normal">(propagée aux voyages)</span>
                  </label>
                  <SearchableSelect
                    value={form.departureStationId}
                    onChange={(v) => setForm((p) => ({ ...p, departureStationId: v }))}
                    placeholder="Aucune (gare non définie)"
                    clearable
                    options={(stations as any[]).map((s: any) => ({
                      value: s.id,
                      label: s.name,
                      sub: s.city?.name,
                    }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <MapPin size={13} className="text-gray-400" /> Gare d&apos;arrivée
                    <span className="text-gray-400 font-normal">(propagée aux voyages)</span>
                  </label>
                  <SearchableSelect
                    value={form.arrivalStationId}
                    onChange={(v) => setForm((p) => ({ ...p, arrivalStationId: v }))}
                    placeholder="Aucune (gare non définie)"
                    clearable
                    options={(stations as any[]).map((s: any) => ({
                      value: s.id,
                      label: s.name,
                      sub: s.city?.name,
                    }))}
                  />
                </div>
              </div>

              {/* Jours à l'avance */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700 shrink-0">
                  Générer jusqu'à
                </label>
                <input
                  type="number"
                  value={form.generateDaysAhead}
                  onChange={(e) => setForm((p) => ({ ...p, generateDaysAhead: Number(e.target.value) }))}
                  min={1}
                  max={30}
                  className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <span className="text-sm text-gray-500">jours à l'avance</span>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-5 py-2 text-sm bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition disabled:opacity-50 flex items-center gap-2"
              >
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 size={14} className="animate-spin" />}
                {createMutation.isPending || updateMutation.isPending
                  ? 'Enregistrement...'
                  : editId ? 'Enregistrer' : 'Créer le planning'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
