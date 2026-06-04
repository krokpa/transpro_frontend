'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vehiclesApi, driversApi } from '@/lib/api';
import { formatCFA } from '@transpro/shared';
import {
  Fuel, Wrench, AlertTriangle, Plus, Trash2, ChevronLeft,
  Loader2, CheckCircle2, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
dayjs.locale('fr');

const MAINTENANCE_TYPES: Record<string, string> = {
  OIL_CHANGE:     'Vidange huile',
  TIRE_ROTATION:  'Rotation pneus',
  BRAKE_SERVICE:  'Freins',
  FILTER_CHANGE:  'Filtre',
  MAJOR_SERVICE:  'Révision majeure',
  REPAIR:         'Réparation',
  INSPECTION:     'Inspection',
  OTHER:          'Autre',
};

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'fuel' | 'maintenance'>('maintenance');
  const [showFuelForm, setShowFuelForm]     = useState(false);
  const [showMaintForm, setShowMaintForm]   = useState(false);

  const { data: vehicle, isLoading: loadingVehicle } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => vehiclesApi.get(id) as any,
  });

  const { data: fuelLogs = [], isLoading: loadingFuel } = useQuery({
    queryKey: ['vehicle-fuel', id],
    queryFn: () => vehiclesApi.getFuelLogs(id) as any,
    enabled: tab === 'fuel',
  });

  const { data: maintLogs = [], isLoading: loadingMaint } = useQuery({
    queryKey: ['vehicle-maint', id],
    queryFn: () => vehiclesApi.getMaintenanceLogs(id) as any,
    enabled: tab === 'maintenance',
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => driversApi.list() as any,
  });

  const addFuelMut = useMutation({
    mutationFn: (data: any) => vehiclesApi.addFuelLog(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicle-fuel', id] }); qc.invalidateQueries({ queryKey: ['vehicle', id] }); setShowFuelForm(false); toast.success('Plein enregistré'); },
    onError: () => toast.error('Erreur lors de l\'enregistrement'),
  });

  const delFuelMut = useMutation({
    mutationFn: (logId: string) => vehiclesApi.deleteFuelLog(id, logId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicle-fuel', id] }); toast.success('Supprimé'); },
  });

  const addMaintMut = useMutation({
    mutationFn: (data: any) => vehiclesApi.addMaintenanceLog(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicle-maint', id] }); qc.invalidateQueries({ queryKey: ['vehicle', id] }); setShowMaintForm(false); toast.success('Maintenance enregistrée'); },
    onError: () => toast.error('Erreur lors de l\'enregistrement'),
  });

  const delMaintMut = useMutation({
    mutationFn: (logId: string) => vehiclesApi.deleteMaintenanceLog(id, logId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicle-maint', id] }); toast.success('Supprimé'); },
  });

  const v = vehicle as any;

  if (loadingVehicle) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={28} className="animate-spin text-brand-500" />
    </div>
  );

  if (!v) return <div className="text-center py-20 text-gray-400">Véhicule introuvable</div>;

  const nextSvc = v.nextServiceAt ? dayjs(v.nextServiceAt) : null;
  const daysToSvc = nextSvc ? nextSvc.diff(dayjs(), 'day') : null;
  const svcAlert = daysToSvc !== null && daysToSvc <= 30;

  const fuelTotal = (fuelLogs as any[]).reduce((s: number, l: any) => s + l.totalCost, 0);
  const maintTotal = (maintLogs as any[]).reduce((s: number, l: any) => s + (l.cost ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 transition">
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{v.plate} — {v.brand} {v.model}</h1>
          <p className="text-sm text-gray-500">{v.capacity} places · {v.year}</p>
        </div>
        {svcAlert && (
          <div className="ml-auto flex items-center gap-2 bg-red-50 text-red-600 px-3 py-1.5 rounded-xl text-sm font-medium">
            <AlertTriangle size={15} />
            Révision dans {daysToSvc} jour{daysToSvc !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Kilométrage', value: v.currentOdometer ? `${v.currentOdometer.toLocaleString('fr')} km` : '—', icon: '🚌' },
          { label: 'Dernière révision', value: v.lastServiceAt ? dayjs(v.lastServiceAt).format('DD MMM YYYY') : '—', icon: '🔧' },
          { label: 'Prochaine révision', value: nextSvc ? nextSvc.format('DD MMM YYYY') : '—', icon: '📅', alert: svcAlert },
          { label: 'Statut', value: v.status === 'ACTIVE' ? 'Actif' : v.status === 'MAINTENANCE' ? 'En maintenance' : 'Inactif', icon: '✅' },
        ].map((s) => (
          <div key={s.label} className={`bg-white rounded-2xl border p-4 ${s.alert ? 'border-red-200 bg-red-50' : 'border-gray-100'}`}>
            <p className="text-xs text-gray-400 mb-1">{s.label}</p>
            <p className={`font-bold text-base ${s.alert ? 'text-red-600' : 'text-gray-900'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100">
        <div className="flex border-b border-gray-100">
          {([
            { key: 'maintenance', label: 'Maintenance', icon: Wrench, total: maintTotal },
            { key: 'fuel',        label: 'Carburant',   icon: Fuel,   total: fuelTotal  },
          ] as any[]).map(({ key, label, icon: Icon, total }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition ${
                tab === key
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={15} />
              {label}
              {total > 0 && (
                <span className="text-xs text-gray-400">· {formatCFA(total)}</span>
              )}
            </button>
          ))}
          <div className="ml-auto flex items-center pr-4">
            <button
              onClick={() => tab === 'fuel' ? setShowFuelForm(true) : setShowMaintForm(true)}
              className="flex items-center gap-1.5 bg-brand-500 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-brand-600 transition"
            >
              <Plus size={14} />
              Ajouter
            </button>
          </div>
        </div>

        {/* Fuel log */}
        {tab === 'fuel' && (
          <div>
            {loadingFuel ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={22} className="animate-spin text-brand-500" />
              </div>
            ) : (fuelLogs as any[]).length === 0 ? (
              <div className="text-center py-14 text-gray-400">
                <Fuel size={36} className="mx-auto mb-3 opacity-30" />
                <p>Aucun plein enregistré</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-50">
                      {['Date', 'Litres', 'Prix/L', 'Total', 'Kilométrage', 'Station', 'Chauffeur', ''].map(h => (
                        <th key={h} className="text-left text-xs text-gray-400 font-medium px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(fuelLogs as any[]).map((l: any) => (
                      <tr key={l.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 font-medium text-gray-800">{dayjs(l.date).format('DD MMM YYYY')}</td>
                        <td className="px-4 py-3 text-gray-600">{l.liters.toFixed(1)} L</td>
                        <td className="px-4 py-3 text-gray-500">{l.pricePerLiter ? `${l.pricePerLiter} F` : '—'}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{formatCFA(l.totalCost)}</td>
                        <td className="px-4 py-3 text-gray-500">{l.odometer ? `${l.odometer.toLocaleString('fr')} km` : '—'}</td>
                        <td className="px-4 py-3 text-gray-500">{l.station ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-500">
                          {l.driver ? `${l.driver.firstName} ${l.driver.lastName}` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => delFuelMut.mutate(l.id)} className="text-gray-300 hover:text-red-400 transition">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Maintenance log */}
        {tab === 'maintenance' && (
          <div>
            {loadingMaint ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={22} className="animate-spin text-brand-500" />
              </div>
            ) : (maintLogs as any[]).length === 0 ? (
              <div className="text-center py-14 text-gray-400">
                <Wrench size={36} className="mx-auto mb-3 opacity-30" />
                <p>Aucune maintenance enregistrée</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-50">
                      {['Date', 'Type', 'Description', 'Coût', 'Km', 'Prochaine échéance', ''].map(h => (
                        <th key={h} className="text-left text-xs text-gray-400 font-medium px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(maintLogs as any[]).map((l: any) => {
                      const due = l.nextDueAt ? dayjs(l.nextDueAt) : null;
                      const overdue = due && due.isBefore(dayjs());
                      return (
                        <tr key={l.id} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3 font-medium text-gray-800">{dayjs(l.date).format('DD MMM YYYY')}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                              {MAINTENANCE_TYPES[l.type] ?? l.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{l.description}</td>
                          <td className="px-4 py-3 font-semibold text-gray-900">{l.cost ? formatCFA(l.cost) : '—'}</td>
                          <td className="px-4 py-3 text-gray-500">{l.odometer ? `${l.odometer.toLocaleString('fr')} km` : '—'}</td>
                          <td className="px-4 py-3">
                            {due ? (
                              <span className={`flex items-center gap-1 text-xs font-medium ${overdue ? 'text-red-600' : 'text-green-600'}`}>
                                {overdue ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                                {due.format('DD MMM YYYY')}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => delMaintMut.mutate(l.id)} className="text-gray-300 hover:text-red-400 transition">
                              <Trash2 size={14} />
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
        )}
      </div>

      {/* Add fuel modal */}
      {showFuelForm && (
        <FuelLogModal
          drivers={drivers as any[]}
          onSubmit={(data) => addFuelMut.mutate(data)}
          loading={addFuelMut.isPending}
          onClose={() => setShowFuelForm(false)}
        />
      )}

      {/* Add maintenance modal */}
      {showMaintForm && (
        <MaintenanceLogModal
          onSubmit={(data) => addMaintMut.mutate(data)}
          loading={addMaintMut.isPending}
          onClose={() => setShowMaintForm(false)}
        />
      )}
    </div>
  );
}

// ── Fuel log modal ─────────────────────────────────────────────────────────────

function FuelLogModal({ drivers, onSubmit, loading, onClose }: {
  drivers: any[]; onSubmit: (d: any) => void; loading: boolean; onClose: () => void;
}) {
  const [form, setForm] = useState({
    date: dayjs().format('YYYY-MM-DD'), liters: '', totalCost: '',
    pricePerLiter: '', odometer: '', station: '', driverId: '', notes: '',
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Enregistrer un plein</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><Plus size={18} className="rotate-45" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date" type="date" value={form.date} onChange={v => set('date', v)} />
            <Field label="Litres" type="number" placeholder="50" value={form.liters} onChange={v => set('liters', v)} />
            <Field label="Total (FCFA)" type="number" placeholder="35000" value={form.totalCost} onChange={v => set('totalCost', v)} />
            <Field label="Prix/litre" type="number" placeholder="700" value={form.pricePerLiter} onChange={v => set('pricePerLiter', v)} />
            <Field label="Kilométrage" type="number" placeholder="45000" value={form.odometer} onChange={v => set('odometer', v)} />
            <Field label="Station" placeholder="Total, Shell…" value={form.station} onChange={v => set('station', v)} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Chauffeur (optionnel)</label>
            <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
              value={form.driverId} onChange={e => set('driverId', e.target.value)}>
              <option value="">— Aucun —</option>
              {drivers.map((d: any) => (
                <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition">Annuler</button>
          <button
            disabled={!form.liters || !form.totalCost || loading}
            onClick={() => onSubmit({
              date: form.date, liters: parseFloat(form.liters), totalCost: parseInt(form.totalCost),
              pricePerLiter: form.pricePerLiter ? parseFloat(form.pricePerLiter) : undefined,
              odometer: form.odometer ? parseInt(form.odometer) : undefined,
              station: form.station || undefined, driverId: form.driverId || undefined,
            })}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 transition"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Maintenance log modal ──────────────────────────────────────────────────────

function MaintenanceLogModal({ onSubmit, loading, onClose }: {
  onSubmit: (d: any) => void; loading: boolean; onClose: () => void;
}) {
  const [form, setForm] = useState({
    date: dayjs().format('YYYY-MM-DD'), type: 'OIL_CHANGE', description: '',
    cost: '', odometer: '', nextDueAt: '', nextDueKm: '', garage: '', notes: '',
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Enregistrer une maintenance</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><Plus size={18} className="rotate-45" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date" type="date" value={form.date} onChange={v => set('date', v)} />
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Type</label>
              <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
                value={form.type} onChange={e => set('type', e.target.value)}>
                {Object.entries(MAINTENANCE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <Field label="Description" placeholder="Détail de l'opération…" value={form.description} onChange={v => set('description', v)} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Coût (FCFA)" type="number" placeholder="25000" value={form.cost} onChange={v => set('cost', v)} />
            <Field label="Kilométrage" type="number" placeholder="45000" value={form.odometer} onChange={v => set('odometer', v)} />
            <Field label="Prochaine révision" type="date" value={form.nextDueAt} onChange={v => set('nextDueAt', v)} />
            <Field label="Prochain km" type="number" placeholder="50000" value={form.nextDueKm} onChange={v => set('nextDueKm', v)} />
          </div>
          <Field label="Garage" placeholder="Nom du garage" value={form.garage} onChange={v => set('garage', v)} />
        </div>
        <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition">Annuler</button>
          <button
            disabled={!form.description || loading}
            onClick={() => onSubmit({
              date: form.date, type: form.type, description: form.description,
              cost: form.cost ? parseInt(form.cost) : undefined,
              odometer: form.odometer ? parseInt(form.odometer) : undefined,
              nextDueAt: form.nextDueAt || undefined,
              nextDueKm: form.nextDueKm ? parseInt(form.nextDueKm) : undefined,
              garage: form.garage || undefined,
            })}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 transition"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, type = 'text', placeholder = '', value, onChange }: {
  label: string; type?: string; placeholder?: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 mb-1 block">{label}</label>
      <input
        type={type}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}
