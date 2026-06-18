'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { routesApi, citiesApi } from '@/lib/api';
import { formatCFA, formatDuration } from '@transpro/shared';
import {
  Plus, Route, Trash2, ToggleLeft, ToggleRight, X,
  Loader2, Pencil, MapPin, ChevronRight, GripVertical,
} from 'lucide-react';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { useViewMode } from '@/hooks/useViewMode';
import { toast } from 'sonner';
import { confirm } from '@/lib/confirm';
import { SearchableSelect, SelectOption } from '@/components/ui/SearchableSelect';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RouteStop {
  id?: string;
  order: number;
  city?: { id: string; name: string } | null;
  durationFromOriginMinutes: number;
  priceFromOrigin: number;
}

interface RouteItem {
  id: string;
  name: string;
  originCity?: { id: string; name: string } | null;
  destinationCity?: { id: string; name: string } | null;
  distanceKm: number;
  durationMinutes: number;
  basePrice: number;
  isActive: boolean;
  stops: RouteStop[];
  _count?: { trips: number };
}

interface StopFormItem {
  cityId: string;
  durationFromOriginMinutes: string;
  priceFromOrigin: string;
}

interface RouteFormData {
  name: string;
  originCityId: string;
  destinationCityId: string;
  distanceKm: string;
  durationMinutes: string;
  basePrice: string;
  stops: StopFormItem[];
}

const emptyStop = (): StopFormItem => ({
  cityId: '',
  durationFromOriginMinutes: '',
  priceFromOrigin: '',
});

const defaultForm: RouteFormData = {
  name: '',
  originCityId: '',
  destinationCityId: '',
  distanceKm: '',
  durationMinutes: '',
  basePrice: '',
  stops: [],
};

function routeToForm(route: RouteItem): RouteFormData {
  return {
    name: route.name,
    originCityId: route.originCity?.id ?? '',
    destinationCityId: route.destinationCity?.id ?? '',
    distanceKm: String(route.distanceKm),
    durationMinutes: String(route.durationMinutes),
    basePrice: String(route.basePrice),
    stops: (route.stops ?? []).map((s) => ({
      cityId: s.city?.id ?? '',
      durationFromOriginMinutes: String(s.durationFromOriginMinutes),
      priceFromOrigin: String(s.priceFromOrigin),
    })),
  };
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RoutesPage() {
  const qc = useQueryClient();
  const [panelRoute, setPanelRoute] = useState<RouteItem | null | 'new'>(null);
  const [form, setForm] = useState<RouteFormData>(defaultForm);
  const [viewMode, setViewMode] = useViewMode('routes');

  const { data: routes = [], isLoading } = useQuery<RouteItem[]>({
    queryKey: ['routes'],
    queryFn: async () => ((await routesApi.list()) ?? []) as any,
  });

  const { data: cities = [] } = useQuery<any[]>({
    queryKey: ['cities'],
    queryFn: async () => ((await citiesApi.list()) ?? []) as any[],
  });

  const cityOptions: SelectOption[] = (cities as any[]).map((c) => ({
    value: c.id,
    label: c.name,
    sub: c.region ?? undefined,
  }));

  const openCreate = () => {
    setForm(defaultForm);
    setPanelRoute('new');
  };

  const openEdit = (route: RouteItem) => {
    setForm(routeToForm(route));
    setPanelRoute(route);
  };

  const closePanel = () => setPanelRoute(null);

  const createMutation = useMutation({
    mutationFn: (data: any) => routesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routes'] });
      toast.success('Itinéraire créé');
      closePanel();
    },
    onError: () => toast.error("Erreur lors de la création"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => routesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routes'] });
      toast.success('Itinéraire mis à jour');
      closePanel();
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      routesApi.update(id, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routes'] });
      toast.success('Statut mis à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour du statut'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => routesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routes'] });
      toast.success('Itinéraire supprimé');
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  function buildPayload(f: RouteFormData) {
    const totalDuration = parseInt(f.durationMinutes) || 0;
    const basePrice = parseInt(f.basePrice) || 0;

    // Validate stops
    const stopsPayload = f.stops
      .filter((s) => s.cityId)
      .map((s, i) => ({
        cityId: s.cityId,
        order: i + 1,
        durationFromOriginMinutes: Math.min(parseInt(s.durationFromOriginMinutes) || 0, totalDuration - 1),
        priceFromOrigin: Math.min(parseInt(s.priceFromOrigin) || 0, basePrice),
      }));

    return {
      name: f.name,
      originCityId: f.originCityId || undefined,
      destinationCityId: f.destinationCityId || undefined,
      distanceKm: parseInt(f.distanceKm) || 0,
      durationMinutes: totalDuration,
      basePrice,
      stops: stopsPayload,
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.originCityId || !form.destinationCityId) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    if (form.originCityId === form.destinationCityId) {
      toast.error("L'origine et la destination doivent être différentes");
      return;
    }
    const payload = buildPayload(form);
    if (panelRoute === 'new') {
      createMutation.mutate(payload);
    } else if (panelRoute) {
      updateMutation.mutate({ id: panelRoute.id, data: payload });
    }
  }

  const setStops = useCallback((stops: StopFormItem[]) => {
    setForm((f) => ({ ...f, stops }));
  }, []);

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isEdit = panelRoute !== null && panelRoute !== 'new';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Itinéraires</h1>
        <div className="flex items-center gap-3">
          <ViewToggle value={viewMode} onChange={setViewMode} />
          <button
            onClick={openCreate}
            className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition"
          >
            <Plus size={16} /> Nouvel itinéraire
          </button>
        </div>
      </div>

      {/* Table / Grid */}
      {viewMode === 'list' ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (routes as RouteItem[]).length === 0 ? (
            <div className="text-center py-16">
              <Route size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Aucun itinéraire configuré</p>
              <p className="text-gray-400 text-sm mt-1">Créez votre premier itinéraire pour commencer</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Nom</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Trajet</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Arrêts</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Distance</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Durée</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Prix de base</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Voyages</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Statut</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(routes as RouteItem[]).map((route) => (
                    <tr key={route.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-medium text-gray-900">{route.name}</td>
                      <td className="px-4 py-3 text-gray-700">
                        <span className="font-medium">{route.originCity?.name ?? '—'}</span>
                        <span className="text-gray-400 mx-2">→</span>
                        <span className="font-medium">{route.destinationCity?.name ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {(route.stops?.length ?? 0) > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                            <MapPin size={10} />
                            {route.stops.length} arrêt{route.stops.length > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Direct</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{route.distanceKm} km</td>
                      <td className="px-4 py-3 text-gray-600">{formatDuration(route.durationMinutes)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{formatCFA(route.basePrice)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{route._count?.trips ?? 0}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${route.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {route.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            title="Modifier"
                            onClick={() => openEdit(route)}
                            className="text-gray-400 hover:text-brand-500 transition"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            title={route.isActive ? 'Désactiver' : 'Activer'}
                            onClick={() => toggleMutation.mutate({ id: route.id, isActive: !route.isActive })}
                            disabled={toggleMutation.isPending}
                            className="text-gray-500 hover:text-brand-500 transition disabled:opacity-50"
                          >
                            {toggleMutation.isPending && toggleMutation.variables?.id === route.id
                              ? <Loader2 size={16} className="animate-spin text-gray-400" />
                              : route.isActive
                                ? <ToggleRight size={20} className="text-green-500" />
                                : <ToggleLeft size={20} />
                            }
                          </button>
                          <button
                            title="Supprimer"
                            onClick={async () => { if (await confirm({ title: 'Supprimer cet itinéraire ?', description: 'Cette action est irréversible.', variant: 'danger' })) deleteMutation.mutate(route.id); }}
                            disabled={deleteMutation.isPending}
                            className="text-gray-400 hover:text-red-500 transition disabled:opacity-50"
                          >
                            {deleteMutation.isPending && deleteMutation.variables === route.id
                              ? <Loader2 size={14} className="animate-spin" />
                              : <Trash2 size={16} />
                            }
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Grid view */
        isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (routes as RouteItem[]).length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
            <Route size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Aucun itinéraire configuré</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(routes as RouteItem[]).map((route) => (
              <div key={route.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">{route.name}</p>
                    <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                      <span className="font-medium">{route.originCity?.name ?? '—'}</span>
                      <ChevronRight size={13} className="text-gray-300" />
                      <span className="font-medium">{route.destinationCity?.name ?? '—'}</span>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${route.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {route.isActive ? 'Actif' : 'Inactif'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                  <span>{route.distanceKm} km · {formatDuration(route.durationMinutes)}</span>
                  <span className="font-semibold text-gray-800 text-right">{formatCFA(route.basePrice)}</span>
                </div>
                {(route.stops?.length ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-medium w-fit">
                    <MapPin size={10} />
                    {route.stops.length} arrêt{route.stops.length > 1 ? 's' : ''}
                  </span>
                )}
                <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                  <span className="text-xs text-gray-400">{route._count?.trips ?? 0} voyage{(route._count?.trips ?? 0) !== 1 ? 's' : ''}</span>
                  <div className="ml-auto flex items-center gap-1">
                    <button
                      title="Modifier"
                      onClick={() => openEdit(route)}
                      className="p-1.5 text-gray-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      title={route.isActive ? 'Désactiver' : 'Activer'}
                      onClick={() => toggleMutation.mutate({ id: route.id, isActive: !route.isActive })}
                      disabled={toggleMutation.isPending}
                      className="p-1.5 text-gray-500 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition disabled:opacity-50"
                    >
                      {toggleMutation.isPending && toggleMutation.variables?.id === route.id
                        ? <Loader2 size={14} className="animate-spin text-gray-400" />
                        : route.isActive
                          ? <ToggleRight size={16} className="text-green-500" />
                          : <ToggleLeft size={16} />
                      }
                    </button>
                    <button
                      title="Supprimer"
                      onClick={async () => { if (await confirm({ title: 'Supprimer cet itinéraire ?', description: 'Cette action est irréversible.', variant: 'danger' })) deleteMutation.mutate(route.id); }}
                      disabled={deleteMutation.isPending}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                    >
                      {deleteMutation.isPending && deleteMutation.variables === route.id
                        ? <Loader2 size={14} className="animate-spin" />
                        : <Trash2 size={14} />
                      }
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Slide-over panel */}
      {panelRoute !== null && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={closePanel}
          />
          {/* Panel */}
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white shadow-2xl flex flex-col">
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {isEdit ? 'Modifier l\'itinéraire' : 'Nouvel itinéraire'}
                </h2>
                {isEdit && (
                  <p className="text-sm text-gray-400 mt-0.5">{(panelRoute as RouteItem).name}</p>
                )}
              </div>
              <button onClick={closePanel} className="text-gray-400 hover:text-gray-600 transition">
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="px-6 py-5 space-y-6">

                {/* ── Section 1: Informations de base ── */}
                <section>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                    Informations générales
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nom de l&apos;itinéraire <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                        placeholder="Ex: Abidjan - Bouaké Express"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Ville d&apos;origine <span className="text-red-500">*</span>
                        </label>
                        <SearchableSelect
                          options={cityOptions}
                          value={form.originCityId}
                          onChange={(v) => setForm((p) => ({ ...p, originCityId: v }))}
                          placeholder="Choisir..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Ville de destination <span className="text-red-500">*</span>
                        </label>
                        <SearchableSelect
                          options={cityOptions}
                          value={form.destinationCityId}
                          onChange={(v) => setForm((p) => ({ ...p, destinationCityId: v }))}
                          placeholder="Choisir..."
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Distance <span className="text-gray-400">(km)</span>
                        </label>
                        <input
                          type="number"
                          value={form.distanceKm}
                          onChange={(e) => setForm((p) => ({ ...p, distanceKm: e.target.value }))}
                          placeholder="360"
                          min="1"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Durée <span className="text-gray-400">(min)</span>
                        </label>
                        <input
                          type="number"
                          value={form.durationMinutes}
                          onChange={(e) => setForm((p) => ({ ...p, durationMinutes: e.target.value }))}
                          placeholder="300"
                          min="1"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Prix de base <span className="text-gray-400">(FCFA)</span>
                        </label>
                        <input
                          type="number"
                          value={form.basePrice}
                          onChange={(e) => setForm((p) => ({ ...p, basePrice: e.target.value }))}
                          placeholder="5000"
                          min="0"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <hr className="border-gray-100" />

                {/* ── Section 2: Arrêts intermédiaires ── */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                        Arrêts intermédiaires
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Optionnel — villes desservies entre l&apos;origine et la destination
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStops([...form.stops, emptyStop()])}
                      className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition"
                    >
                      <Plus size={13} /> Ajouter un arrêt
                    </button>
                  </div>

                  {/* Route preview */}
                  <RoutePreview
                    originName={cityOptions.find((c) => c.value === form.originCityId)?.label}
                    destinationName={cityOptions.find((c) => c.value === form.destinationCityId)?.label}
                    stops={form.stops}
                    cityOptions={cityOptions}
                  />

                  {form.stops.length === 0 ? (
                    <div className="text-center py-6 border-2 border-dashed border-gray-100 rounded-xl">
                      <MapPin size={24} className="text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">Aucun arrêt — trajet direct</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Column headers */}
                      <div className="grid grid-cols-[1fr_120px_120px_32px] gap-2 px-1">
                        <span className="text-xs font-medium text-gray-400">Ville d&apos;arrêt</span>
                        <span className="text-xs font-medium text-gray-400">Durée depuis départ</span>
                        <span className="text-xs font-medium text-gray-400">Prix depuis départ</span>
                        <span />
                      </div>

                      {form.stops.map((stop, idx) => (
                        <StopRow
                          key={idx}
                          stop={stop}
                          index={idx}
                          cityOptions={cityOptions}
                          totalDuration={parseInt(form.durationMinutes) || 0}
                          basePrice={parseInt(form.basePrice) || 0}
                          onChange={(updated) => {
                            const next = [...form.stops];
                            next[idx] = updated;
                            setStops(next);
                          }}
                          onRemove={() => setStops(form.stops.filter((_, i) => i !== idx))}
                        />
                      ))}
                    </div>
                  )}
                </section>
              </div>

              {/* Panel footer */}
              <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closePanel}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition disabled:opacity-60"
                >
                  {isPending && <Loader2 size={14} className="animate-spin" />}
                  {isEdit ? 'Enregistrer les modifications' : 'Créer l\'itinéraire'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

// ── RoutePreview ──────────────────────────────────────────────────────────────

function RoutePreview({
  originName,
  destinationName,
  stops,
  cityOptions,
}: {
  originName?: string;
  destinationName?: string;
  stops: StopFormItem[];
  cityOptions: SelectOption[];
}) {
  const filledStops = stops.filter((s) => s.cityId);
  if (!originName && !destinationName && filledStops.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap mb-4 px-1 py-2 bg-gray-50 rounded-lg">
      <span className="text-xs font-semibold text-gray-700 truncate max-w-[120px]">
        {originName ?? '—'}
      </span>
      {filledStops.map((s, i) => {
        const city = cityOptions.find((c) => c.value === s.cityId);
        return (
          <span key={i} className="flex items-center gap-1.5 text-xs text-gray-500">
            <ChevronRight size={12} className="text-gray-300 flex-shrink-0" />
            <span className="font-medium text-blue-600 truncate max-w-[100px]">{city?.label ?? '?'}</span>
          </span>
        );
      })}
      {destinationName && (
        <span className="flex items-center gap-1.5 text-xs">
          <ChevronRight size={12} className="text-gray-300 flex-shrink-0" />
          <span className="font-semibold text-gray-700 truncate max-w-[120px]">{destinationName}</span>
        </span>
      )}
    </div>
  );
}

// ── StopRow ───────────────────────────────────────────────────────────────────

function StopRow({
  stop,
  index,
  cityOptions,
  totalDuration,
  basePrice,
  onChange,
  onRemove,
}: {
  stop: StopFormItem;
  index: number;
  cityOptions: SelectOption[];
  totalDuration: number;
  basePrice: number;
  onChange: (s: StopFormItem) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_120px_120px_32px] gap-2 items-center bg-white border border-gray-100 rounded-xl px-3 py-2.5 group hover:border-gray-200 transition">
      <div className="flex items-center gap-2">
        <GripVertical size={14} className="text-gray-300 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <SearchableSelect
            options={cityOptions}
            value={stop.cityId}
            onChange={(v) => onChange({ ...stop, cityId: v })}
            placeholder={`Arrêt ${index + 1}...`}
          />
        </div>
      </div>

      <div className="relative">
        <input
          type="number"
          value={stop.durationFromOriginMinutes}
          onChange={(e) => onChange({ ...stop, durationFromOriginMinutes: e.target.value })}
          placeholder="Ex: 90"
          min="1"
          max={totalDuration - 1 || undefined}
          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 pr-8"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">min</span>
      </div>

      <div className="relative">
        <input
          type="number"
          value={stop.priceFromOrigin}
          onChange={(e) => onChange({ ...stop, priceFromOrigin: e.target.value })}
          placeholder="Ex: 2500"
          min="0"
          max={basePrice || undefined}
          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 pr-8"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">FCFA</span>
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="text-gray-300 hover:text-red-400 transition flex items-center justify-center"
        title="Supprimer cet arrêt"
      >
        <X size={14} />
      </button>
    </div>
  );
}
