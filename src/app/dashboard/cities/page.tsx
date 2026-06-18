'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { citiesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { Plus, Search, MapPin, Pencil, Trash2, ToggleLeft, ToggleRight, X, Check } from 'lucide-react';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { useViewMode } from '@/hooks/useViewMode';
import { toast } from 'sonner';
import { confirm } from '@/lib/confirm';

interface City {
  id: string;
  name: string;
  region?: string | null;
  code?: string | null;
  isActive: boolean;
  createdAt: string;
}

const EMPTY_FORM = { name: '', region: '', code: '' };

export default function CitiesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editCity, setEditCity] = useState<City | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [viewMode, setViewMode] = useViewMode('cities');

  if (user?.role !== 'SUPER_ADMIN') {
    router.replace('/dashboard');
    return null;
  }

  const { data: raw = [], isLoading } = useQuery({
    queryKey: ['cities-admin', search],
    queryFn: () => citiesApi.list(search || undefined) as any,
    staleTime: 30_000,
  });

  const cities: City[] = Array.isArray(raw) ? raw : [];

  const createMut = useMutation({
    mutationFn: (data: typeof EMPTY_FORM) => citiesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cities-admin'] });
      qc.invalidateQueries({ queryKey: ['cities'] });
      closeModal();
      toast.success('Ville créée');
    },
    onError: () => toast.error('Erreur lors de la création'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => citiesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cities-admin'] });
      qc.invalidateQueries({ queryKey: ['cities'] });
      closeModal();
      toast.success('Ville mise à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => citiesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cities-admin'] });
      qc.invalidateQueries({ queryKey: ['cities'] });
      toast.success('Ville supprimée');
    },
    onError: () => toast.error('Impossible de supprimer cette ville (elle est peut-être utilisée)'),
  });

  function openCreate() {
    setEditCity(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(city: City) {
    setEditCity(city);
    setForm({ name: city.name, region: city.region ?? '', code: city.code ?? '' });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditCity(null);
    setForm(EMPTY_FORM);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editCity) {
      updateMut.mutate({ id: editCity.id, data: { name: form.name, region: form.region || undefined, code: form.code || undefined } });
    } else {
      createMut.mutate({ name: form.name, region: form.region || undefined, code: form.code || undefined });
    }
  }

  function toggleActive(city: City) {
    updateMut.mutate({ id: city.id, data: { isActive: !city.isActive } });
  }

  async function confirmRemove(city: City) {
    if (await confirm({
      title: `Supprimer "${city.name}" ?`,
      description: 'Cette action est irréversible.',
      variant: 'danger',
    })) {
      removeMut.mutate(city.id);
    }
  }

  const active = cities.filter((c) => c.isActive);
  const inactive = cities.filter((c) => !c.isActive);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des villes</h1>
          <p className="text-sm text-gray-500 mt-1">{active.length} ville{active.length > 1 ? 's' : ''} active{active.length > 1 ? 's' : ''} — {cities.length} au total</p>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle value={viewMode} onChange={setViewMode} />
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm"
          >
            <Plus size={16} /> Nouvelle ville
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une ville..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
      </div>

      {/* List / Grid */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">Chargement…</div>
      ) : cities.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <MapPin size={32} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500">Aucune ville trouvée</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-4 py-3 font-semibold text-gray-600">Ville</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Région</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Code</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-center">Statut</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {cities.map((city) => (
                <tr key={city.id} className={`hover:bg-gray-50 transition ${!city.isActive ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-brand-400 shrink-0" />
                      <span className="font-medium text-gray-900">{city.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{city.region ?? '—'}</td>
                  <td className="px-4 py-3">
                    {city.code ? (
                      <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{city.code}</span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActive(city)}
                      className="inline-flex items-center gap-1 text-xs font-medium transition"
                      title={city.isActive ? 'Désactiver' : 'Activer'}
                    >
                      {city.isActive ? (
                        <><ToggleRight size={20} className="text-green-500" /><span className="text-green-600">Active</span></>
                      ) : (
                        <><ToggleLeft size={20} className="text-gray-400" /><span className="text-gray-400">Inactive</span></>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(city)}
                        className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition"
                        title="Modifier"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => confirmRemove(city)}
                        disabled={removeMut.isPending}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {cities.map((city) => (
            <div key={city.id} className={`bg-white rounded-xl border border-gray-100 shadow-sm p-3.5 flex flex-col gap-2.5 ${!city.isActive ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-1.5">
                  <MapPin size={13} className="text-brand-400 shrink-0 mt-0.5" />
                  <p className="font-semibold text-gray-900 text-sm leading-tight">{city.name}</p>
                </div>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${city.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {city.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              {(city.region || city.code) && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {city.region && <span className="text-xs text-gray-400">{city.region}</span>}
                  {city.code && <span className="font-mono text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{city.code}</span>}
                </div>
              )}
              <div className="flex items-center justify-between pt-1.5 border-t border-gray-50">
                <button
                  onClick={() => toggleActive(city)}
                  className="text-[11px] text-gray-400 hover:text-brand-500 transition"
                  title={city.isActive ? 'Désactiver' : 'Activer'}
                >
                  {city.isActive ? 'Désactiver' : 'Activer'}
                </button>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => openEdit(city)} className="p-1 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded transition" title="Modifier">
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => confirmRemove(city)} disabled={removeMut.isPending} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition" title="Supprimer">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editCity ? 'Modifier la ville' : 'Nouvelle ville'}
              </h2>
              <button onClick={closeModal} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la ville *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Abidjan"
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Région</label>
                <input
                  value={form.region}
                  onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
                  placeholder="Ex: Lagunes"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code IATA / abréviation</label>
                <input
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="Ex: ABJ"
                  maxLength={5}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createMut.isPending || updateMut.isPending}
                  className="flex-1 bg-brand-500 hover:bg-brand-600 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition disabled:opacity-60"
                >
                  <Check size={15} />
                  {editCity ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
