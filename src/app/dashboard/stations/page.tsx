'use client';

import { useState, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { confirm } from '@/lib/confirm';
import { Building2, Plus, Pencil, Trash2, Users, MapPin, Phone, Loader2 } from 'lucide-react';
import { stationsApi, citiesApi } from '@/lib/api';
import { SearchableSelect, SelectOption } from '@/components/ui/SearchableSelect';
import Link from 'next/link';

const MapPicker = lazy(() => import('@/components/ui/MapPicker'));

type Station = {
  id: string;
  name: string;
  city?: { id: string; name: string } | null;
  address?: string;
  phone?: string;
  code?: string;
  latitude?: number | null;
  longitude?: number | null;
  isActive: boolean;
  _count?: { userStations: number };
};

type FormData = {
  name: string; cityId: string; address: string; phone: string; code: string;
  latitude: number | null; longitude: number | null;
};

const emptyForm: FormData = { name: '', cityId: '', address: '', phone: '', code: '', latitude: null, longitude: null };

export default function StationsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Station | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);

  const { data: stations = [], isLoading } = useQuery<Station[]>({
    queryKey: ['stations'],
    queryFn: async () => ((await stationsApi.list()) ?? []) as any,
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

  const createMut = useMutation({
    mutationFn: (data: any) => stationsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stations'] }); toast.success('Gare créée'); closeModal(); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => stationsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stations'] }); toast.success('Gare mise à jour'); closeModal(); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => stationsApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stations'] }); toast.success('Gare supprimée'); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });

  function openCreate() { setForm(emptyForm); setEditing(null); setModal('create'); }
  function openEdit(s: Station) {
    setForm({
      name: s.name, cityId: s.city?.id ?? '', address: s.address ?? '',
      phone: s.phone ?? '', code: s.code ?? '',
      latitude: s.latitude ?? null, longitude: s.longitude ?? null,
    });
    setEditing(s);
    setModal('edit');
  }
  function closeModal() { setModal(null); setEditing(null); setForm(emptyForm); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: any = {
      ...form,
      cityId: form.cityId || undefined,
      code: form.code || undefined,
      address: form.address || undefined,
      phone: form.phone || undefined,
      latitude: form.latitude ?? undefined,
      longitude: form.longitude ?? undefined,
    };
    if (modal === 'create') createMut.mutate(payload);
    else if (editing) updateMut.mutate({ id: editing.id, data: payload });
  }

  const pending = createMut.isPending || updateMut.isPending;
  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gares</h1>
          <p className="text-gray-500 text-sm mt-0.5">Gérez vos points de départ et d&apos;arrivée</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition"
        >
          <Plus size={16} /> Nouvelle gare
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : stations.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
          <Building2 size={40} className="text-gray-200" />
          <p>Aucune gare. Créez la première.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stations.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-brand-50 text-brand-500 rounded-lg p-2">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{s.name}</p>
                      {s.code && (
                        <span className="text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5 font-mono">{s.code}</span>
                      )}
                    </div>
                    {s.city && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin size={11} /> {s.city.name}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {s.isActive ? 'Active' : 'Inactive'}
                  </span>
                  {s.latitude != null && s.longitude != null && (
                    <span className="text-xs text-blue-500 flex items-center gap-0.5">
                      <MapPin size={10} /> GPS
                    </span>
                  )}
                </div>
              </div>

              {s.phone && (
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Phone size={11} /> {s.phone}
                </p>
              )}

              <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Users size={12} /> {s._count?.userStations ?? 0} agent{(s._count?.userStations ?? 0) !== 1 ? 's' : ''}
                </div>
                <div className="ml-auto flex items-center gap-1">
                  <Link
                    href={`/dashboard/stations/${s.id}`}
                    className="text-xs text-brand-500 hover:underline px-2 py-1 rounded hover:bg-brand-50 transition"
                  >
                    Gérer →
                  </Link>
                  <button
                    onClick={() => openEdit(s)}
                    className="p-1.5 text-gray-400 hover:text-brand-500 hover:bg-brand-50 rounded transition"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={async () => { if (await confirm({ title: `Supprimer "${s.name}" ?`, description: 'Cette action est irréversible.', variant: 'danger' })) deleteMut.mutate(s.id); }}
                    disabled={deleteMut.isPending}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition disabled:opacity-50"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 my-4">
            <h2 className="text-lg font-bold text-gray-900 mb-5">
              {modal === 'create' ? 'Nouvelle gare' : 'Modifier la gare'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nom *</label>
                <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Gare de Plateau" required className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Ville</label>
                  <SearchableSelect
                    options={cityOptions}
                    value={form.cityId}
                    onChange={(v) => setForm((p) => ({ ...p, cityId: v }))}
                    placeholder="Choisir..."
                    clearable
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Code <span className="text-gray-400">(optionnel)</span></label>
                  <input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase().slice(0, 10) }))}
                    placeholder="ABJ-PL" maxLength={10} className={inputCls + ' uppercase'} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Adresse <span className="text-gray-400">(optionnel)</span></label>
                <input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                  placeholder="Rue du Commerce, Plateau" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Téléphone <span className="text-gray-400">(optionnel)</span></label>
                <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+2250700000000" className={inputCls} />
              </div>

              {/* GPS Map Picker */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-gray-700">
                    Position GPS <span className="text-gray-400">(optionnel)</span>
                  </label>
                  {(form.latitude != null || form.longitude != null) && (
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, latitude: null, longitude: null }))}
                      className="text-xs text-red-400 hover:text-red-600 transition"
                    >
                      Effacer
                    </button>
                  )}
                </div>
                <Suspense fallback={<div className="h-64 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center text-sm text-gray-400">Chargement de la carte...</div>}>
                  <MapPicker
                    lat={form.latitude}
                    lng={form.longitude}
                    onChange={(lat, lng) => setForm((p) => ({ ...p, latitude: lat, longitude: lng }))}
                  />
                </Suspense>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal}
                  className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition">
                  Annuler
                </button>
                <button type="submit" disabled={pending}
                  className="flex-1 bg-brand-500 hover:bg-brand-600 text-white rounded-lg py-2.5 text-sm font-semibold transition disabled:opacity-70 flex items-center justify-center gap-2">
                  {pending && <Loader2 size={14} className="animate-spin" />}
                  {pending ? 'Enregistrement...' : modal === 'create' ? 'Créer' : 'Mettre à jour'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
