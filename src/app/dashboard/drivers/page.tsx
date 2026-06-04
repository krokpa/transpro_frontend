'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driversApi } from '@/lib/api';
import { UserCheck, UserX, Plus, X, Loader2, AlertTriangle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { PhoneInput } from '@/components/ui/PhoneInput';

interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry: string;
  isAvailable: boolean;
}

interface DriverForm {
  firstName: string;
  lastName: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry: string;
}

const defaultForm: DriverForm = {
  firstName: '',
  lastName: '',
  phone: '',
  licenseNumber: '',
  licenseExpiry: '',
};

function isExpiringWithin30Days(dateStr: string): boolean {
  const expiry = dayjs(dateStr);
  const now = dayjs();
  const diffDays = expiry.diff(now, 'day');
  return diffDays >= 0 && diffDays <= 30;
}

function isExpired(dateStr: string): boolean {
  return dayjs(dateStr).isBefore(dayjs(), 'day');
}

export default function DriversPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<DriverForm>(defaultForm);

  const { data: drivers = [], isLoading } = useQuery<Driver[]>({
    queryKey: ['drivers'],
    queryFn: () => driversApi.list() as any,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => driversApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Chauffeur ajouté avec succès');
      setShowModal(false);
      setForm(defaultForm);
    },
    onError: () => {
      toast.error('Erreur lors de l\'ajout du chauffeur');
    },
  });

  const toggleAvailabilityMutation = useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      driversApi.update(id, { isAvailable }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Disponibilité mise à jour');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.phone || !form.licenseNumber || !form.licenseExpiry) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    createMutation.mutate({
      firstName: form.firstName,
      lastName: form.lastName,
      phone: form.phone,
      licenseNumber: form.licenseNumber,
      licenseExpiry: form.licenseExpiry,
    });
  }

  function handleField(key: keyof DriverForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const licenseAlertCount = (drivers as Driver[]).filter(
    (d) => isExpiringWithin30Days(d.licenseExpiry) || isExpired(d.licenseExpiry)
  ).length;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chauffeurs</h1>
          {licenseAlertCount > 0 && (
            <p className="text-sm text-amber-600 flex items-center gap-1 mt-0.5">
              <AlertTriangle size={14} />
              {licenseAlertCount} permis expire(nt) bientôt ou est/sont expiré(s)
            </p>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition"
        >
          <Plus size={16} />
          Ajouter un chauffeur
        </button>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (drivers as Driver[]).length === 0 ? (
          <div className="text-center py-16">
            <UserCheck size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Aucun chauffeur enregistré</p>
            <p className="text-gray-400 text-sm mt-1">
              Ajoutez votre premier chauffeur pour commencer
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Chauffeur</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Téléphone</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">N° Permis</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Expiration permis</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Disponibilité</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Détail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(drivers as Driver[]).map((driver) => {
                  const expired = isExpired(driver.licenseExpiry);
                  const expiringSoon = !expired && isExpiringWithin30Days(driver.licenseExpiry);
                  return (
                    <tr key={driver.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">
                          {driver.firstName} {driver.lastName}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                        {driver.phone}
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                        {driver.licenseNumber}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm ${
                              expired
                                ? 'text-red-600 font-semibold'
                                : expiringSoon
                                ? 'text-amber-600 font-semibold'
                                : 'text-gray-600'
                            }`}
                          >
                            {dayjs(driver.licenseExpiry).format('DD/MM/YYYY')}
                          </span>
                          {expired && (
                            <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">
                              Expiré
                            </span>
                          )}
                          {expiringSoon && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                              <AlertTriangle size={10} />
                              Bientôt
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            driver.isAvailable
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {driver.isAvailable ? 'Disponible' : 'Indisponible'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          title={driver.isAvailable ? 'Marquer indisponible' : 'Marquer disponible'}
                          onClick={() =>
                            toggleAvailabilityMutation.mutate({
                              id: driver.id,
                              isAvailable: !driver.isAvailable,
                            })
                          }
                          disabled={toggleAvailabilityMutation.isPending}
                          className="text-gray-400 hover:text-brand-500 transition disabled:opacity-50 flex items-center gap-1.5 text-xs"
                        >
                          {toggleAvailabilityMutation.isPending && toggleAvailabilityMutation.variables?.id === driver.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : driver.isAvailable ? (
                            <>
                              <UserX size={15} />
                              Désactiver
                            </>
                          ) : (
                            <>
                              <UserCheck size={15} />
                              Activer
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => router.push(`/dashboard/drivers/${driver.id}`)}
                          className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium transition"
                          title="Planning, absences & évaluations"
                        >
                          <ExternalLink size={13} /> Voir
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

      {/* Modal création */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">Ajouter un chauffeur</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Prénom / Nom */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prénom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => handleField('firstName', e.target.value)}
                    placeholder="Ex: Kouassi"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => handleField('lastName', e.target.value)}
                    placeholder="Ex: Koffi"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    required
                  />
                </div>
              </div>

              {/* Téléphone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone <span className="text-red-500">*</span>
                </label>
                <PhoneInput
                  value={form.phone}
                  onChange={(val) => handleField('phone', val)}
                  required
                />
              </div>

              {/* Numéro de permis */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numéro de permis <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.licenseNumber}
                  onChange={(e) => handleField('licenseNumber', e.target.value)}
                  placeholder="Ex: CI-2021-12345"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  required
                />
              </div>

              {/* Date d'expiration du permis */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date d'expiration du permis <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.licenseExpiry}
                  onChange={(e) => handleField('licenseExpiry', e.target.value)}
                  min={dayjs().format('YYYY-MM-DD')}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  required
                />
              </div>

              {/* Actions */}
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
                  Ajouter le chauffeur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
