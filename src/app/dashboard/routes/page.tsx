'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { routesApi, citiesApi } from '@/lib/api';
import { formatCFA, formatDuration } from '@transpro/shared';
import { Plus, Route, Trash2, ToggleLeft, ToggleRight, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SearchableSelect, SelectOption } from '@/components/ui/SearchableSelect';

interface RouteItem {
  id: string;
  name: string;
  originCity?: { id: string; name: string } | null;
  destinationCity?: { id: string; name: string } | null;
  distanceKm: number;
  durationMinutes: number;
  basePrice: number;
  isActive: boolean;
}

interface RouteForm {
  name: string;
  originCityId: string;
  destinationCityId: string;
  distanceKm: string;
  durationMinutes: string;
  basePrice: string;
}

const defaultForm: RouteForm = {
  name: '',
  originCityId: '',
  destinationCityId: '',
  distanceKm: '',
  durationMinutes: '',
  basePrice: '',
};

export default function RoutesPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<RouteForm>(defaultForm);

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

  const createMutation = useMutation({
    mutationFn: (data: any) => routesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routes'] });
      toast.success('Itinéraire créé avec succès');
      setShowModal(false);
      setForm(defaultForm);
    },
    onError: () => toast.error("Erreur lors de la création de l'itinéraire"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      routesApi.update(id, { isActive }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['routes'] }); toast.success('Statut mis à jour'); },
    onError: () => toast.error('Erreur lors de la mise à jour du statut'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => routesApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['routes'] }); toast.success('Itinéraire supprimé'); },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

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
    createMutation.mutate({
      name: form.name,
      originCityId: form.originCityId,
      destinationCityId: form.destinationCityId,
      distanceKm: parseInt(form.distanceKm) || 0,
      durationMinutes: parseInt(form.durationMinutes) || 0,
      basePrice: parseInt(form.basePrice) || 0,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Itinéraires</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition"
        >
          <Plus size={16} /> Nouvel itinéraire
        </button>
      </div>

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
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Distance</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Durée</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Prix de base</th>
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
                    <td className="px-4 py-3 text-gray-600">{route.distanceKm} km</td>
                    <td className="px-4 py-3 text-gray-600">{formatDuration(route.durationMinutes)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{formatCFA(route.basePrice)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${route.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {route.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          title={route.isActive ? 'Désactiver' : 'Activer'}
                          onClick={() => toggleMutation.mutate({ id: route.id, isActive: !route.isActive })}
                          disabled={toggleMutation.isPending}
                          className="text-gray-500 hover:text-brand-500 transition disabled:opacity-50"
                        >
                          {route.isActive ? <ToggleRight size={20} className="text-green-500" /> : <ToggleLeft size={20} />}
                        </button>
                        <button
                          title="Supprimer"
                          onClick={() => { if (confirm('Supprimer cet itinéraire ?')) deleteMutation.mutate(route.id); }}
                          disabled={deleteMutation.isPending}
                          className="text-gray-400 hover:text-red-500 transition disabled:opacity-50"
                        >
                          <Trash2 size={16} />
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

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">Nouvel itinéraire</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Distance (km)</label>
                  <input
                    type="number"
                    value={form.distanceKm}
                    onChange={(e) => setForm((p) => ({ ...p, distanceKm: e.target.value }))}
                    placeholder="Ex: 360"
                    min="1"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Durée (minutes)</label>
                  <input
                    type="number"
                    value={form.durationMinutes}
                    onChange={(e) => setForm((p) => ({ ...p, durationMinutes: e.target.value }))}
                    placeholder="Ex: 300"
                    min="1"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prix de base (FCFA)</label>
                <input
                  type="number"
                  value={form.basePrice}
                  onChange={(e) => setForm((p) => ({ ...p, basePrice: e.target.value }))}
                  placeholder="Ex: 5000"
                  min="0"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setForm(defaultForm); }}
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
                  Créer l&apos;itinéraire
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
