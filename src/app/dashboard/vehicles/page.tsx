'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vehiclesApi } from '@/lib/api';
import { VehicleStatus } from '@transpro/shared';
import { Plus, Car, X, Loader2, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';
import { SeatLayoutEditor } from '@/components/vehicles/SeatLayoutEditor';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SeatDef {
  number: string;
  row: number;
  column: number;
  isAisle: boolean;
  class: string;
}

interface SeatLayout {
  rows: number;
  columns: number;
  seats: SeatDef[];
}

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  capacity: number;
  status: VehicleStatus;
  seatLayout: SeatLayout;
}

interface VehicleForm {
  plate: string;
  brand: string;
  model: string;
  year: string;
  capacity: string;
}

const defaultForm: VehicleForm = { plate: '', brand: '', model: '', year: '', capacity: '' };

const statusConfig: Record<VehicleStatus, { label: string; className: string }> = {
  ACTIVE:      { label: 'Actif',       className: 'bg-green-100 text-green-700' },
  MAINTENANCE: { label: 'Maintenance', className: 'bg-yellow-100 text-yellow-700' },
  INACTIVE:    { label: 'Inactif',     className: 'bg-gray-100 text-gray-600' },
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function VehiclesPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<VehicleForm>(defaultForm);
  const [editingLayoutVehicle, setEditingLayoutVehicle] = useState<Vehicle | null>(null);

  const { data: vehicles = [], isLoading } = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: () => vehiclesApi.list() as any,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => vehiclesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Véhicule ajouté avec succès');
      setShowModal(false);
      setForm(defaultForm);
    },
    onError: () => toast.error("Erreur lors de l'ajout du véhicule"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: VehicleStatus }) =>
      vehiclesApi.update(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Statut mis à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour du statut'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.plate || !form.brand || !form.model || !form.year || !form.capacity) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    createMutation.mutate({
      plate: form.plate.toUpperCase(),
      brand: form.brand,
      model: form.model,
      year: parseInt(form.year),
      capacity: parseInt(form.capacity),
    });
  }

  function layoutSummary(v: Vehicle) {
    const layout = v.seatLayout as SeatLayout | null;
    if (!layout?.seats?.length) return `${v.capacity} places`;
    const vip = layout.seats.filter((s) => s.class === 'VIP').length;
    const express = layout.seats.filter((s) => s.class === 'EXPRESS').length;
    const standard = layout.seats.length - vip - express;
    const parts: string[] = [];
    if (standard > 0) parts.push(`${standard} Std`);
    if (vip > 0) parts.push(`${vip} VIP`);
    if (express > 0) parts.push(`${express} Exp`);
    return parts.join(' · ');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Véhicules</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition"
        >
          <Plus size={16} /> Ajouter un véhicule
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : vehicles.length === 0 ? (
          <div className="text-center py-16">
            <Car size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Aucun véhicule enregistré</p>
            <p className="text-gray-400 text-sm mt-1">Ajoutez votre premier véhicule pour commencer</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Plaque</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Véhicule</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Année</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Sièges</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Statut</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Plan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {vehicles.map((vehicle) => {
                  const sc = statusConfig[vehicle.status];
                  return (
                    <tr key={vehicle.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <span className="font-mono font-semibold text-gray-900 bg-gray-100 px-2 py-0.5 rounded text-xs">
                          {vehicle.plate}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {vehicle.brand} {vehicle.model}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{vehicle.year}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{layoutSummary(vehicle)}</td>
                      <td className="px-4 py-3">
                        <select
                          value={vehicle.status}
                          onChange={(e) =>
                            updateStatusMutation.mutate({ id: vehicle.id, status: e.target.value as VehicleStatus })
                          }
                          disabled={updateStatusMutation.isPending}
                          className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 ${sc.className}`}
                        >
                          {Object.entries(statusConfig).map(([value, { label }]) => (
                            <option key={value} value={value} className="bg-white text-gray-800">
                              {label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setEditingLayoutVehicle(vehicle)}
                          className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium transition"
                          title="Modifier le plan des sièges"
                        >
                          <LayoutGrid size={14} /> Modifier
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Seat layout editor */}
      {editingLayoutVehicle && (
        <SeatLayoutEditor
          vehicleId={editingLayoutVehicle.id}
          vehicleInfo={{
            plate: editingLayoutVehicle.plate,
            brand: editingLayoutVehicle.brand,
            model: editingLayoutVehicle.model,
          }}
          initialLayout={
            editingLayoutVehicle.seatLayout ?? { rows: Math.ceil(editingLayoutVehicle.capacity / 4), columns: 4, seats: [] }
          }
          onClose={() => setEditingLayoutVehicle(null)}
          onSaved={() => setEditingLayoutVehicle(null)}
        />
      )}

      {/* Create modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">Ajouter un véhicule</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plaque d'immatriculation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.plate}
                  onChange={(e) => setForm((p) => ({ ...p, plate: e.target.value }))}
                  placeholder="Ex: AB-1234-CI"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 uppercase"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marque <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.brand}
                    onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))}
                    placeholder="Mercedes"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modèle <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.model}
                    onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))}
                    placeholder="Sprinter"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Année <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={form.year}
                    onChange={(e) => setForm((p) => ({ ...p, year: e.target.value }))}
                    placeholder="2022"
                    min="2000"
                    max={new Date().getFullYear() + 1}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacité <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={form.capacity}
                    onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))}
                    placeholder="40"
                    min="1"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    required
                  />
                </div>
              </div>

              <p className="text-xs text-gray-400">
                Le plan des sièges sera généré automatiquement. Vous pourrez le personnaliser ensuite depuis le tableau.
              </p>

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
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
