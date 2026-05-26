'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import {
  Building2, Users, Route, Bus, CreditCard, Search,
  CheckCircle2, XCircle, Clock, AlertCircle, ChevronDown,
} from 'lucide-react';
import { formatCFA } from '@transpro/shared';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { toast } from 'sonner';

dayjs.locale('fr');

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  TRIAL:     { label: 'Essai',     cls: 'bg-yellow-100 text-yellow-700', icon: Clock },
  ACTIVE:    { label: 'Actif',     cls: 'bg-green-100 text-green-700',   icon: CheckCircle2 },
  SUSPENDED: { label: 'Suspendu', cls: 'bg-red-100 text-red-600',       icon: XCircle },
  CANCELLED: { label: 'Annulé',   cls: 'bg-gray-100 text-gray-500',     icon: AlertCircle },
};

const PLAN_CONFIG: Record<string, { label: string; cls: string }> = {
  BASIC:        { label: 'Basique',       cls: 'bg-slate-100 text-slate-600' },
  PROFESSIONAL: { label: 'Professionnel', cls: 'bg-blue-100 text-blue-700' },
  ENTERPRISE:   { label: 'Entreprise',    cls: 'bg-purple-100 text-purple-700' },
};

export default function AdminTenantsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  if (user?.role !== 'SUPER_ADMIN') {
    router.replace('/dashboard');
    return null;
  }

  const { data: raw = [], isLoading } = useQuery({
    queryKey: ['admin-tenants'],
    queryFn: () => tenantsApi.list() as any,
  });

  const tenants: any[] = Array.isArray(raw) ? raw : [];

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => tenantsApi.updateById(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-tenants'] });
      setEditingId(null);
      toast.success('Compagnie mise à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const filtered = tenants.filter((t) =>
    !search || t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.slug?.toLowerCase().includes(search.toLowerCase()),
  );

  const stats = {
    total: tenants.length,
    active: tenants.filter((t) => t.status === 'ACTIVE').length,
    trial: tenants.filter((t) => t.status === 'TRIAL').length,
    suspended: tenants.filter((t) => t.status === 'SUSPENDED').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Administration — Compagnies</h1>
        <p className="text-sm text-gray-500 mt-1">Gestion des tenants, plans et statuts</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total',      value: stats.total,     color: 'text-gray-700',   bg: 'bg-gray-50' },
          { label: 'Actifs',     value: stats.active,    color: 'text-green-700',  bg: 'bg-green-50' },
          { label: 'Essai',      value: stats.trial,     color: 'text-yellow-700', bg: 'bg-yellow-50' },
          { label: 'Suspendus',  value: stats.suspended, color: 'text-red-600',    bg: 'bg-red-50' },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 border border-white`}>
            <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une compagnie..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">Aucune compagnie trouvée</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-600">Compagnie</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Plan</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Statut</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 text-center">Utilisateurs</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 text-center">Routes</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 text-center">Voyages</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Créé le</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((t) => {
                  const sc = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.ACTIVE;
                  const pc = PLAN_CONFIG[t.plan] ?? PLAN_CONFIG.BASIC;
                  const isEditing = editingId === t.id;
                  return (
                    <tr key={t.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {t.logo ? (
                            <img src={t.logo} alt="" className="w-8 h-8 rounded-lg object-contain bg-gray-100" />
                          ) : (
                            <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
                              <Building2 size={14} className="text-brand-500" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-gray-900">{t.name}</p>
                            <p className="text-xs text-gray-400">{t.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <PlanSelect
                            value={t.plan}
                            onChange={(plan) => updateMut.mutate({ id: t.id, data: { plan } })}
                          />
                        ) : (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${pc.cls}`}>
                            {pc.label}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <StatusSelect
                            value={t.status}
                            onChange={(status) => updateMut.mutate({ id: t.id, data: { status } })}
                          />
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.cls}`}>
                            <sc.icon size={11} /> {sc.label}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="flex items-center justify-center gap-1 text-gray-600">
                          <Users size={13} className="text-gray-400" /> {t._count?.users ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="flex items-center justify-center gap-1 text-gray-600">
                          <Route size={13} className="text-gray-400" /> {t._count?.routes ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="flex items-center justify-center gap-1 text-gray-600">
                          <Bus size={13} className="text-gray-400" /> {t._count?.trips ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {dayjs(t.createdAt).format('DD/MM/YYYY')}
                        {t.trialEndsAt && t.status === 'TRIAL' && (
                          <p className="text-yellow-600 font-medium">
                            Essai jusqu'au {dayjs(t.trialEndsAt).format('DD/MM')}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setEditingId(isEditing ? null : t.id)}
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition ${
                            isEditing
                              ? 'border-gray-300 text-gray-600 hover:bg-gray-50'
                              : 'border-brand-200 text-brand-600 hover:bg-brand-50'
                          }`}
                        >
                          {isEditing ? 'Fermer' : 'Modifier'}
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
    </div>
  );
}

function PlanSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-300"
    >
      <option value="BASIC">Basique</option>
      <option value="PROFESSIONAL">Professionnel</option>
      <option value="ENTERPRISE">Entreprise</option>
    </select>
  );
}

function StatusSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-300"
    >
      <option value="TRIAL">Essai</option>
      <option value="ACTIVE">Actif</option>
      <option value="SUSPENDED">Suspendu</option>
      <option value="CANCELLED">Annulé</option>
    </select>
  );
}
