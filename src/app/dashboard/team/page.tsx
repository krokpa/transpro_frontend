'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { confirm } from '@/lib/confirm';
import { Users, UserPlus, Trash2, ShieldCheck, User, Eye, EyeOff, Loader2, Mail, Phone, Clock } from 'lucide-react';
import { teamApi } from '@/lib/api';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { useAuthStore } from '@/store/auth.store';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { useViewMode } from '@/hooks/useViewMode';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
dayjs.locale('fr');

type Member = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

const ROLE_CONFIG: Record<string, { label: string; className: string }> = {
  COMPANY_OWNER:  { label: 'Propriétaire', className: 'bg-amber-100 text-amber-700' },
  COMPANY_ADMIN:  { label: 'Administrateur', className: 'bg-brand-100 text-brand-700' },
  COMPANY_AGENT:  { label: 'Agent',          className: 'bg-blue-100 text-blue-700' },
};

const ASSIGNABLE_ROLES = [
  { value: 'COMPANY_ADMIN', label: 'Administrateur' },
  { value: 'COMPANY_AGENT', label: 'Agent' },
];

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent placeholder:text-slate-400 transition';

export default function TeamPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const isOwner = user?.role === 'COMPANY_OWNER';

  const [showInvite, setShowInvite] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useViewMode('team');
  const [showPwd, setShowPwd] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    password: '', role: 'COMPANY_AGENT',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: members = [], isLoading } = useQuery<Member[]>({
    queryKey: ['team'],
    queryFn: async () => ((await teamApi.list()) ?? []) as Member[],
  });

  const inviteMut = useMutation({
    mutationFn: (data: any) => teamApi.invite(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team'] });
      toast.success('Membre invité avec succès');
      setShowInvite(false);
      resetForm();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur lors de l\'invitation'),
  });

  const roleMut = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => teamApi.updateRole(id, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team'] });
      toast.success('Rôle mis à jour');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => teamApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team'] });
      toast.success('Membre retiré de la compagnie');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });

  function resetForm() {
    setForm({ firstName: '', lastName: '', email: '', phone: '', password: '', role: 'COMPANY_AGENT' });
    setErrors({});
    setShowPwd(false);
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = 'Requis';
    if (!form.lastName.trim())  e.lastName  = 'Requis';
    if (!form.email.includes('@')) e.email = 'Email invalide';
    if (form.password.length < 8) e.password = 'Minimum 8 caractères';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleInvite(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    inviteMut.mutate({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone || undefined,
      password: form.password,
      role: form.role,
    });
  }

  const filtered = roleFilter === 'ALL'
    ? members
    : members.filter((m) => m.role === roleFilter);

  const counts = members.reduce((acc, m) => {
    acc[m.role] = (acc[m.role] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Équipe</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {members.length} membre{members.length !== 1 ? 's' : ''} dans votre compagnie
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle value={viewMode} onChange={setViewMode} />
          {(isOwner || user?.role === 'COMPANY_ADMIN') && (
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition shadow-sm shadow-brand-500/20"
            >
              <UserPlus size={16} /> Inviter un membre
            </button>
          )}
        </div>
      </div>

      {/* Role filter tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { key: 'ALL', label: `Tous (${members.length})` },
          { key: 'COMPANY_OWNER',  label: `Propriétaires (${counts.COMPANY_OWNER ?? 0})` },
          { key: 'COMPANY_ADMIN',  label: `Admins (${counts.COMPANY_ADMIN ?? 0})` },
          { key: 'COMPANY_AGENT',  label: `Agents (${counts.COMPANY_AGENT ?? 0})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setRoleFilter(key)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition whitespace-nowrap ${
              roleFilter === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Members — list view */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 size={24} className="animate-spin text-brand-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
              <Users size={36} className="text-gray-200" />
              <p className="text-sm">Aucun membre trouvé</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {filtered.map((m) => {
                const cfg = ROLE_CONFIG[m.role] ?? { label: m.role, className: 'bg-gray-100 text-gray-600' };
                const initials = `${m.firstName[0] ?? ''}${m.lastName[0] ?? ''}`.toUpperCase();
                const isSelf = m.id === (user as any)?.id;
                const isThisOwner = m.role === 'COMPANY_OWNER';

                return (
                  <li key={m.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition">
                    <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-sm font-bold shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900">
                          {m.firstName} {m.lastName}
                          {isSelf && <span className="text-xs text-gray-400 font-normal ml-1">(vous)</span>}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.className}`}>
                          {cfg.label}
                        </span>
                        {!m.isActive && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-500">Inactif</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{m.email}</p>
                      {m.phone && <p className="text-xs text-gray-400">{m.phone}</p>}
                    </div>
                    <div className="hidden md:block text-right shrink-0">
                      <p className="text-xs text-gray-400">Dernière connexion</p>
                      <p className="text-xs text-gray-600 font-medium">
                        {m.lastLoginAt ? dayjs(m.lastLoginAt).format('DD/MM/YYYY HH:mm') : '—'}
                      </p>
                    </div>
                    {isOwner && !isSelf && !isThisOwner && (
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={m.role}
                          onChange={(e) => roleMut.mutate({ id: m.id, role: e.target.value })}
                          disabled={roleMut.isPending}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white text-gray-700 disabled:opacity-50"
                        >
                          {ASSIGNABLE_ROLES.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                        <button
                          onClick={async () => {
                            if (await confirm({ title: `Retirer ${m.firstName} ${m.lastName} ?`, description: 'Cette personne n\'aura plus accès à la compagnie.', variant: 'danger', confirmLabel: 'Retirer' }))
                              removeMut.mutate(m.id);
                          }}
                          disabled={removeMut.isPending}
                          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                          title="Retirer de la compagnie"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Members — grid view */}
      {viewMode === 'grid' && (
        isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 bg-white rounded-xl border border-gray-100 text-gray-400 gap-2">
            <Users size={36} className="text-gray-200" />
            <p className="text-sm">Aucun membre trouvé</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((m) => {
              const cfg = ROLE_CONFIG[m.role] ?? { label: m.role, className: 'bg-gray-100 text-gray-600' };
              const initials = `${m.firstName[0] ?? ''}${m.lastName[0] ?? ''}`.toUpperCase();
              const isSelf = m.id === (user as any)?.id;
              const isThisOwner = m.role === 'COMPANY_OWNER';

              return (
                <div key={m.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
                  {/* Avatar + name */}
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="w-14 h-14 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-lg font-bold">
                      {initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 leading-tight">
                        {m.firstName} {m.lastName}
                        {isSelf && <span className="text-xs text-gray-400 font-normal block">vous</span>}
                      </p>
                      <div className="flex items-center justify-center gap-1.5 mt-1.5 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.className}`}>
                          {cfg.label}
                        </span>
                        {!m.isActive && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-500">Inactif</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contact info */}
                  <div className="space-y-1.5 text-xs text-gray-500 border-t border-gray-50 pt-3">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Mail size={11} className="text-gray-300 shrink-0" />
                      <span className="truncate">{m.email}</span>
                    </div>
                    {m.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone size={11} className="text-gray-300 shrink-0" />
                        <span>{m.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Clock size={11} className="text-gray-300 shrink-0" />
                      <span>{m.lastLoginAt ? dayjs(m.lastLoginAt).format('DD/MM/YYYY') : 'Jamais connecté'}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  {isOwner && !isSelf && !isThisOwner && (
                    <div className="flex items-center gap-2 border-t border-gray-50 pt-3">
                      <select
                        value={m.role}
                        onChange={(e) => roleMut.mutate({ id: m.id, role: e.target.value })}
                        disabled={roleMut.isPending}
                        className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white text-gray-700 disabled:opacity-50"
                      >
                        {ASSIGNABLE_ROLES.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={async () => {
                          if (await confirm({ title: `Retirer ${m.firstName} ${m.lastName} ?`, description: 'Cette personne n\'aura plus accès à la compagnie.', variant: 'danger', confirmLabel: 'Retirer' }))
                            removeMut.mutate(m.id);
                        }}
                        disabled={removeMut.isPending}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50 shrink-0"
                        title="Retirer de la compagnie"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
                <UserPlus size={18} className="text-brand-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Inviter un membre</h2>
                <p className="text-xs text-gray-400">Un compte sera créé avec ces identifiants</p>
              </div>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Prénom *</label>
                  <input
                    value={form.firstName}
                    onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                    placeholder="Kouassi"
                    className={`${inputCls} ${errors.firstName ? 'border-red-300 bg-red-50' : ''}`}
                  />
                  {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nom *</label>
                  <input
                    value={form.lastName}
                    onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                    placeholder="Yao"
                    className={`${inputCls} ${errors.lastName ? 'border-red-300 bg-red-50' : ''}`}
                  />
                  {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="agent@compagnie.ci"
                  className={`${inputCls} ${errors.email ? 'border-red-300 bg-red-50' : ''}`}
                />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Téléphone <span className="text-gray-400">(optionnel)</span></label>
                <PhoneInput
                  value={form.phone}
                  onChange={(v) => setForm((p) => ({ ...p, phone: v }))}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Mot de passe temporaire *</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    placeholder="Minimum 8 caractères"
                    className={`${inputCls} pr-10 ${errors.password ? 'border-red-300 bg-red-50' : ''}`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Rôle *</label>
                <div className="grid grid-cols-2 gap-2">
                  {ASSIGNABLE_ROLES.map((r) => (
                    <label
                      key={r.value}
                      className={`flex items-center gap-2.5 border rounded-xl px-3 py-2.5 cursor-pointer transition ${
                        form.role === r.value
                          ? 'border-brand-400 bg-brand-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={r.value}
                        checked={form.role === r.value}
                        onChange={() => setForm((p) => ({ ...p, role: r.value }))}
                        className="accent-brand-500"
                      />
                      <span className="flex items-center gap-1.5 text-sm text-gray-700">
                        {r.value === 'COMPANY_ADMIN' ? <ShieldCheck size={14} className="text-brand-500" /> : <User size={14} className="text-blue-500" />}
                        {r.label}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  {form.role === 'COMPANY_ADMIN'
                    ? 'Accès complet à la gestion (voyages, réservations, équipe)'
                    : 'Accès limité à la billetterie et la gestion de sa gare'}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowInvite(false); resetForm(); }}
                  className="flex-1 border border-gray-200 text-gray-700 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={inviteMut.isPending}
                  className="flex-1 bg-brand-500 hover:bg-brand-600 text-white rounded-xl py-2.5 text-sm font-semibold transition shadow-sm shadow-brand-500/20 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {inviteMut.isPending && <Loader2 size={14} className="animate-spin" />}
                  Créer le compte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
