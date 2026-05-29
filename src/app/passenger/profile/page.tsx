'use client';

import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { usersApi, authApi } from '@/lib/api';
import { toast } from 'sonner';
import { Camera, Loader2, Save, Lock, UserRound, Mail, Phone, Shield } from 'lucide-react';
import { UserAvatar } from '@/components/ui/UserAvatar';

type Tab = 'profile' | 'password';

export default function ProfilePage() {
  const { user, setAuth, accessToken, refreshToken } = useAuthStore();
  const [tab, setTab] = useState<Tab>('profile');

  const [form, setForm] = useState({
    firstName: user?.firstName ?? '',
    lastName:  user?.lastName  ?? '',
    phone:     user?.phone     ?? '',
  });

  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [pwdErrors, setPwdErrors] = useState<{ next?: string; confirm?: string }>({});
  const fileRef = useRef<HTMLInputElement>(null);

  function setF(k: keyof typeof form, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  const profileMut = useMutation({
    mutationFn: () => usersApi.updateProfile(form) as any,
    onSuccess: async () => {
      try {
        const me = await authApi.me() as any;
        setAuth(me, accessToken!, refreshToken!);
      } catch {}
      toast.success('Profil mis à jour');
    },
    onError: (err: any) => {
      const raw = err?.response?.data;
      const msg = raw?.error ?? raw?.message ?? err?.message ?? 'Erreur';
      toast.error(Array.isArray(msg) ? msg.join(' | ') : msg);
    },
  });

  const avatarMut = useMutation({
    mutationFn: (avatar: string) => usersApi.updateAvatar(avatar) as any,
    onSuccess: async () => {
      try { const me = await authApi.me() as any; setAuth(me, accessToken!, refreshToken!); } catch {}
      toast.success('Photo de profil mise à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour de la photo'),
  });

  function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const SIZE = 256;
        canvas.width = SIZE; canvas.height = SIZE;
        const ctx = canvas.getContext('2d')!;
        const side = Math.min(img.width, img.height);
        const ox = (img.width - side) / 2;
        const oy = (img.height - side) / 2;
        ctx.drawImage(img, ox, oy, side, side, 0, 0, SIZE, SIZE);
        avatarMut.mutate(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  const pwdMut = useMutation({
    mutationFn: () => usersApi.changePassword(pwd.current, pwd.next) as any,
    onSuccess: () => {
      toast.success('Mot de passe modifié');
      setPwd({ current: '', next: '', confirm: '' });
    },
    onError: (err: any) => {
      const raw = err?.response?.data;
      const msg = raw?.error ?? raw?.message ?? err?.message ?? 'Erreur';
      toast.error(Array.isArray(msg) ? msg.join(' | ') : msg);
    },
  });

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: typeof pwdErrors = {};
    if (pwd.next.length < 8) errs.next = 'Minimum 8 caractères';
    if (pwd.next !== pwd.confirm) errs.confirm = 'Mots de passe différents';
    setPwdErrors(errs);
    if (Object.keys(errs).length === 0) pwdMut.mutate();
  }

  const inp = (err?: string) =>
    `w-full border ${err ? 'border-red-400 focus:ring-red-500/30' : 'border-gray-200 focus:ring-brand-500/30 focus:border-brand-400'} rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition bg-white`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Mon profil</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gérez vos informations personnelles et votre sécurité</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — identity card */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
            <div className="relative w-20 h-20 mx-auto group cursor-pointer" onClick={() => fileRef.current?.click()}>
              <UserAvatar
                firstName={user?.firstName}
                lastName={user?.lastName}
                avatar={(user as any)?.avatar}
                size={80}
                className="!rounded-2xl shadow-lg shadow-brand-500/25"
              />
              <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {avatarMut.isPending
                  ? <Loader2 size={20} className="text-white animate-spin" />
                  : <Camera size={20} className="text-white" />}
              </div>
            </div>
            <p className="font-bold text-gray-900 text-lg mt-4">{user?.firstName} {user?.lastName}</p>
            <p className="text-sm text-gray-500 mt-0.5">{user?.email}</p>
            <span className="inline-flex items-center gap-1.5 mt-3 text-xs px-3 py-1 bg-brand-50 text-brand-600 rounded-full font-medium">
              <Shield size={11} /> Passager
            </span>
          </div>

          {/* Account details */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Compte</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
                  <Mail size={14} className="text-gray-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-400">Email</p>
                  <p className="text-sm font-medium text-gray-700 truncate">{user?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
                  <Phone size={14} className="text-gray-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-400">Téléphone</p>
                  <p className="text-sm font-medium text-gray-700">{user?.phone || '—'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column — edit forms */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setTab('profile')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
                tab === 'profile' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <UserRound size={14} /> Mes informations
            </button>
            <button
              onClick={() => setTab('password')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
                tab === 'password' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Lock size={14} /> Sécurité
            </button>
          </div>

          {/* Profile tab */}
          {tab === 'profile' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
              <div>
                <p className="font-semibold text-gray-800">Informations personnelles</p>
                <p className="text-sm text-gray-400 mt-0.5">Ces informations apparaissent sur vos tickets</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Prénom</label>
                  <input value={form.firstName} onChange={(e) => setF('firstName', e.target.value)} className={inp()} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nom</label>
                  <input value={form.lastName} onChange={(e) => setF('lastName', e.target.value)} className={inp()} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Téléphone</label>
                <input
                  value={form.phone}
                  onChange={(e) => setF('phone', e.target.value)}
                  placeholder="+225 07 00 00 00 00"
                  className={inp()}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Adresse email</label>
                <input
                  value={user?.email ?? ''}
                  disabled
                  className="w-full border border-gray-100 rounded-lg px-4 py-2.5 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">L'adresse email ne peut pas être modifiée</p>
              </div>
              <div className="pt-1">
                <button
                  onClick={() => profileMut.mutate()}
                  disabled={profileMut.isPending}
                  className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition disabled:opacity-60 shadow-sm shadow-brand-500/20"
                >
                  {profileMut.isPending
                    ? <><Loader2 size={15} className="animate-spin" /> Enregistrement...</>
                    : <><Save size={15} /> Enregistrer les modifications</>}
                </button>
              </div>
            </div>
          )}

          {/* Password tab */}
          {tab === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
              <div>
                <p className="font-semibold text-gray-800">Changer le mot de passe</p>
                <p className="text-sm text-gray-400 mt-0.5">Utilisez un mot de passe fort d'au moins 8 caractères</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mot de passe actuel</label>
                <input
                  type="password"
                  value={pwd.current}
                  onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))}
                  placeholder="••••••••"
                  className={inp()}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nouveau mot de passe</label>
                <input
                  type="password"
                  value={pwd.next}
                  onChange={(e) => { setPwd((p) => ({ ...p, next: e.target.value })); setPwdErrors((e2) => ({ ...e2, next: undefined })); }}
                  placeholder="Minimum 8 caractères"
                  className={inp(pwdErrors.next)}
                />
                {pwdErrors.next && <p className="text-red-500 text-xs mt-1">{pwdErrors.next}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Confirmer le nouveau mot de passe</label>
                <input
                  type="password"
                  value={pwd.confirm}
                  onChange={(e) => { setPwd((p) => ({ ...p, confirm: e.target.value })); setPwdErrors((e2) => ({ ...e2, confirm: undefined })); }}
                  placeholder="••••••••"
                  className={inp(pwdErrors.confirm)}
                />
                {pwdErrors.confirm && <p className="text-red-500 text-xs mt-1">{pwdErrors.confirm}</p>}
              </div>
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={pwdMut.isPending || !pwd.current}
                  className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition disabled:opacity-60 shadow-sm shadow-brand-500/20"
                >
                  {pwdMut.isPending
                    ? <><Loader2 size={15} className="animate-spin" /> Modification...</>
                    : <><Lock size={15} /> Changer le mot de passe</>}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
