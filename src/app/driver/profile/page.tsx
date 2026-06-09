'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driverSpaceApi, usersApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import {
  Phone, ShieldCheck, AlertTriangle, Loader2,
  Plus, Check, X, KeyRound, Mail, Eye, EyeOff, Info,
} from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { toast } from 'sonner';

dayjs.locale('fr');

const ABSENCE_LABEL: Record<string, string> = { LEAVE: 'Congé', SICK: 'Maladie', OTHER: 'Autre' };
const ABSENCE_COLOR: Record<string, string> = {
  LEAVE: 'border-l-blue-400',
  SICK:  'border-l-red-400',
  OTHER: 'border-l-slate-300',
};

const inputCls = (err?: boolean) =>
  `w-full border ${err ? 'border-red-400' : 'border-slate-200'} rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500 transition bg-white`;

function isGuichetEmail(email: string) {
  return email.includes('@guichet.transpro.ci');
}

export default function DriverProfilePage() {
  const qc = useQueryClient();
  const { user, setUser } = useAuthStore();
  const [showAbsModal, setShowAbsModal] = useState(false);
  const [absForm, setAbsForm] = useState({ startDate: '', endDate: '', type: 'LEAVE', reason: '' });

  // ── État du formulaire identifiants ──────────────────────────────────────────
  const isGuichet = isGuichetEmail(user?.email ?? '');
  const [credOpen,  setCredOpen]  = useState(false);
  const [credForm,  setCredForm]  = useState({ email: '', password: '', confirm: '', currentPassword: '' });
  const [credErrors, setCredErrors] = useState<Record<string, string>>({});
  const [showPwd,   setShowPwd]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCurPwd,  setShowCurPwd]  = useState(false);
  const [credLoading, setCredLoading] = useState(false);

  const { data: meData, isLoading } = useQuery({
    queryKey: ['driver-me'],
    queryFn: () => driverSpaceApi.me() as any,
  });

  const { data: absences = [] } = useQuery<any[]>({
    queryKey: ['driver-absences'],
    queryFn: () => driverSpaceApi.absences() as any,
  });

  const toggleAvail = useMutation({
    mutationFn: (v: boolean) => driverSpaceApi.setAvailability(v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['driver-me'] }); toast.success('Disponibilité mise à jour'); },
    onError: () => toast.error('Erreur'),
  });

  const addAbsence = useMutation({
    mutationFn: (data: any) => driverSpaceApi.addAbsence(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver-absences'] });
      toast.success('Absence déclarée');
      setShowAbsModal(false);
      setAbsForm({ startDate: '', endDate: '', type: 'LEAVE', reason: '' });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });

  // ── Soumission identifiants ──────────────────────────────────────────────────
  async function handleSaveCredentials() {
    const e: Record<string, string> = {};
    if (!isGuichet && !credForm.currentPassword) e.currentPassword = 'Requis';
    if (credForm.email && !credForm.email.includes('@')) e.email = 'Email invalide';
    if (credForm.password && credForm.password.length < 8) e.password = 'Minimum 8 caractères';
    if (credForm.password && credForm.password !== credForm.confirm) e.confirm = 'Les mots de passe ne correspondent pas';
    if (!credForm.email && !credForm.password) e.email = 'Renseignez au moins l\'email ou le mot de passe';
    setCredErrors(e);
    if (Object.keys(e).length > 0) return;

    setCredLoading(true);
    try {
      if (isGuichet) {
        // Compte guichet : définir les identifiants sans mot de passe actuel
        const updated = await usersApi.setCredentials({
          email:    credForm.email.trim() || undefined,
          password: credForm.password || undefined,
        }) as any;
        if (updated?.email && setUser) setUser({ ...user!, email: updated.email });
        toast.success('Identifiants enregistrés — vous pouvez maintenant vous connecter par email.');
      } else {
        // Compte normal : changer le mot de passe avec l'actuel
        await usersApi.changePassword(credForm.currentPassword, credForm.password);
        toast.success('Mot de passe modifié avec succès.');
      }
      setCredForm({ email: '', password: '', confirm: '', currentPassword: '' });
      setCredOpen(false);
    } catch (err: any) {
      const raw = err?.response?.data;
      const msg = raw?.error ?? raw?.message ?? err?.message ?? 'Erreur inattendue';
      toast.error(Array.isArray(msg) ? msg.join(' | ') : msg);
    } finally {
      setCredLoading(false);
    }
  }

  const me    = (meData as any)?.driver;
  const stats = (meData as any)?.stats;

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={28} className="animate-spin text-brand-500" />
    </div>
  );

  if (!me) return null;

  const initials = `${me.firstName?.[0] ?? ''}${me.lastName?.[0] ?? ''}`.toUpperCase();
  const licenseExpiry = dayjs(me.licenseExpiry);
  const licenseExpired = stats?.isLicenseExpired;
  const daysToExpiry = stats?.licenseExpiresInDays;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">

      {/* ── Profile card ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-brand-500 to-orange-300" />
        <div className="px-6 pb-5">
          <div className="flex items-end gap-4 -mt-8 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-black text-brand-500">{initials}</span>
            </div>
            <div className="pb-1 flex-1">
              <h1 className="text-xl font-bold text-slate-900">{me.firstName} {me.lastName}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-semibold text-slate-500">Chauffeur</span>
                <span>·</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${me.isAvailable ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {me.isAvailable ? 'Disponible' : 'Indisponible'}
                </span>
              </div>
            </div>
            <button
              onClick={() => toggleAvail.mutate(!me.isAvailable)}
              disabled={toggleAvail.isPending}
              className="flex-shrink-0 px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
            >
              {me.isAvailable ? 'Se marquer indisponible' : 'Se marquer disponible'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center gap-3">
              <Phone size={14} className="text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400">Téléphone</p>
                <p className="text-sm font-semibold text-slate-800">{me.phone}</p>
              </div>
            </div>
            <div className={`rounded-xl px-4 py-3 flex items-center gap-3 ${licenseExpired ? 'bg-red-50' : daysToExpiry <= 60 ? 'bg-amber-50' : 'bg-slate-50'}`}>
              <ShieldCheck size={14} className={`flex-shrink-0 ${licenseExpired ? 'text-red-500' : daysToExpiry <= 60 ? 'text-amber-500' : 'text-slate-400'}`} />
              <div>
                <p className={`text-xs ${licenseExpired ? 'text-red-400' : daysToExpiry <= 60 ? 'text-amber-400' : 'text-slate-400'}`}>
                  Permis — exp. {licenseExpiry.format('DD/MM/YYYY')}
                </p>
                <p className={`text-sm font-mono font-semibold ${licenseExpired ? 'text-red-700' : 'text-slate-800'}`}>{me.licenseNumber}</p>
              </div>
            </div>
          </div>

          {licenseExpired && (
            <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm text-red-700">
              <AlertTriangle size={14} /> Votre permis est expiré. Contactez votre responsable.
            </div>
          )}
          {!licenseExpired && daysToExpiry <= 60 && (
            <div className="mt-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm text-amber-700">
              <AlertTriangle size={14} /> Votre permis expire dans <strong>{daysToExpiry} jours</strong>.
            </div>
          )}
        </div>
      </div>

      {/* ── Identifiants de connexion ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
          <div className="flex items-center gap-2.5">
            <KeyRound size={15} className="text-slate-400" />
            <h3 className="font-semibold text-slate-800">Identifiants de connexion</h3>
          </div>
          <button
            onClick={() => { setCredOpen((o) => !o); setCredErrors({}); }}
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition"
          >
            {credOpen ? 'Fermer' : isGuichet ? 'Définir' : 'Modifier'}
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          {/* Email actuel */}
          <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
            <Mail size={14} className="text-slate-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-slate-400">Email actuel</p>
              <p className="text-sm font-semibold text-slate-800 truncate">
                {isGuichet ? <span className="italic text-slate-400">Non défini (connexion par téléphone)</span> : user?.email}
              </p>
            </div>
          </div>

          {/* Bannière compte guichet */}
          {isGuichet && (
            <div className="flex items-start gap-2.5 bg-brand-50 border border-brand-100 rounded-xl px-4 py-3">
              <Info size={14} className="text-brand-500 mt-0.5 shrink-0" />
              <p className="text-xs text-brand-700 leading-relaxed">
                Vous êtes connecté via votre numéro de téléphone. Définissez un email et un mot de passe pour accéder à votre compte sur tous vos appareils.
              </p>
            </div>
          )}

          {/* Formulaire */}
          {credOpen && (
            <div className="space-y-3 pt-1">
              {isGuichet ? (
                <>
                  {/* Nouveau email */}
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1.5">
                      Adresse email <span className="text-slate-400">(optionnel si vous définissez uniquement un mot de passe)</span>
                    </label>
                    <input
                      type="email"
                      value={credForm.email}
                      onChange={(e) => setCredForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="vous@email.com"
                      className={inputCls(!!credErrors.email)}
                    />
                    {credErrors.email && <p className="text-red-500 text-xs mt-1">{credErrors.email}</p>}
                  </div>

                  {/* Nouveau mot de passe */}
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1.5">Mot de passe</label>
                    <div className="relative">
                      <input
                        type={showPwd ? 'text' : 'password'}
                        value={credForm.password}
                        onChange={(e) => setCredForm((f) => ({ ...f, password: e.target.value }))}
                        placeholder="Minimum 8 caractères"
                        className={inputCls(!!credErrors.password) + ' pr-10'}
                      />
                      <button type="button" onClick={() => setShowPwd((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {credErrors.password && <p className="text-red-500 text-xs mt-1">{credErrors.password}</p>}
                  </div>

                  {/* Confirmer */}
                  {credForm.password && (
                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-1.5">Confirmer le mot de passe</label>
                      <div className="relative">
                        <input
                          type={showConfirm ? 'text' : 'password'}
                          value={credForm.confirm}
                          onChange={(e) => setCredForm((f) => ({ ...f, confirm: e.target.value }))}
                          placeholder="••••••••"
                          className={inputCls(!!credErrors.confirm) + ' pr-10'}
                        />
                        <button type="button" onClick={() => setShowConfirm((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      {credErrors.confirm && <p className="text-red-500 text-xs mt-1">{credErrors.confirm}</p>}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Mot de passe actuel */}
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1.5">Mot de passe actuel</label>
                    <div className="relative">
                      <input
                        type={showCurPwd ? 'text' : 'password'}
                        value={credForm.currentPassword}
                        onChange={(e) => setCredForm((f) => ({ ...f, currentPassword: e.target.value }))}
                        placeholder="••••••••"
                        className={inputCls(!!credErrors.currentPassword) + ' pr-10'}
                      />
                      <button type="button" onClick={() => setShowCurPwd((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showCurPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {credErrors.currentPassword && <p className="text-red-500 text-xs mt-1">{credErrors.currentPassword}</p>}
                  </div>

                  {/* Nouveau mot de passe */}
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1.5">Nouveau mot de passe</label>
                    <div className="relative">
                      <input
                        type={showPwd ? 'text' : 'password'}
                        value={credForm.password}
                        onChange={(e) => setCredForm((f) => ({ ...f, password: e.target.value }))}
                        placeholder="Minimum 8 caractères"
                        className={inputCls(!!credErrors.password) + ' pr-10'}
                      />
                      <button type="button" onClick={() => setShowPwd((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {credErrors.password && <p className="text-red-500 text-xs mt-1">{credErrors.password}</p>}
                  </div>

                  {/* Confirmer */}
                  {credForm.password && (
                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-1.5">Confirmer</label>
                      <div className="relative">
                        <input
                          type={showConfirm ? 'text' : 'password'}
                          value={credForm.confirm}
                          onChange={(e) => setCredForm((f) => ({ ...f, confirm: e.target.value }))}
                          placeholder="••••••••"
                          className={inputCls(!!credErrors.confirm) + ' pr-10'}
                        />
                        <button type="button" onClick={() => setShowConfirm((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      {credErrors.confirm && <p className="text-red-500 text-xs mt-1">{credErrors.confirm}</p>}
                    </div>
                  )}
                </>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => { setCredOpen(false); setCredErrors({}); setCredForm({ email: '', password: '', confirm: '', currentPassword: '' }); }}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveCredentials}
                  disabled={credLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
                >
                  {credLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Enregistrer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Absences ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
          <h3 className="font-semibold text-slate-800">Mes absences</h3>
          <button onClick={() => setShowAbsModal(true)}
            className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition">
            <Plus size={12} /> Déclarer
          </button>
        </div>

        {(absences as any[]).length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">Aucune absence</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {(absences as any[]).map((a: any) => {
              const days = dayjs(a.endDate).diff(dayjs(a.startDate), 'day') + 1;
              return (
                <div key={a.id} className={`flex items-center gap-4 px-5 py-3.5 border-l-4 ${ABSENCE_COLOR[a.type] ?? 'border-l-slate-200'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-slate-700">{ABSENCE_LABEL[a.type] ?? a.type}</span>
                      <span className="text-xs text-slate-400">· {days} jour{days > 1 ? 's' : ''}</span>
                    </div>
                    <p className="text-sm text-slate-700">
                      {dayjs(a.startDate).format('DD MMM')} — {dayjs(a.endDate).format('DD MMM YYYY')}
                    </p>
                    {a.reason && <p className="text-xs text-slate-400 truncate mt-0.5">{a.reason}</p>}
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${a.approved ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                    {a.approved ? '✓ Approuvée' : '⏳ En attente'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal absence ── */}
      {showAbsModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Déclarer une absence</h3>
              <button onClick={() => setShowAbsModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1.5">Type d'absence</label>
                <select value={absForm.type} onChange={e => setAbsForm(f => ({...f, type: e.target.value}))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                  <option value="LEAVE">Congé</option>
                  <option value="SICK">Maladie</option>
                  <option value="OTHER">Autre</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(['startDate', 'endDate'] as const).map(k => (
                  <div key={k}>
                    <label className="text-xs font-medium text-slate-600 block mb-1.5">{k === 'startDate' ? 'Date début' : 'Date fin'}</label>
                    <input type="date" value={absForm[k]} onChange={e => setAbsForm(f => ({...f, [k]: e.target.value}))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1.5">Motif (optionnel)</label>
                <input type="text" value={absForm.reason} onChange={e => setAbsForm(f => ({...f, reason: e.target.value}))}
                  placeholder="Précisez le motif…"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 pb-5">
              <button onClick={() => setShowAbsModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition">Annuler</button>
              <button
                disabled={!absForm.startDate || !absForm.endDate || addAbsence.isPending}
                onClick={() => addAbsence.mutate(absForm)}
                className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50">
                {addAbsence.isPending && <Loader2 size={14} className="animate-spin" />}
                <Check size={14} /> Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
