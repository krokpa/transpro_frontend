'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Bus, UserRound } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

type Form = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

const EMPTY: Form = { firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '' };

export default function PassengerRegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Partial<Form>>({});
  const [loading, setLoading] = useState(false);

  function set(field: keyof Form, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: undefined }));
  }

  function validate() {
    const e: Partial<Form> = {};
    if (!form.firstName.trim()) e.firstName = 'Requis';
    if (!form.lastName.trim()) e.lastName = 'Requis';
    if (!form.email.includes('@')) e.email = 'Email invalide';
    if (form.phone.length < 8) e.phone = 'Numéro invalide';
    if (form.password.length < 8) e.password = 'Minimum 8 caractères';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Mots de passe différents';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await authApi.register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        password: form.password,
      }) as any;

      setAuth(res.user, res.accessToken, res.refreshToken);
      toast.success('Compte créé ! Bienvenue sur TransPro CI.');
      router.push('/passenger');
    } catch (err: any) {
      const raw = err?.response?.data;
      const msg = raw?.error ?? raw?.message ?? err?.message ?? 'Erreur inattendue';
      toast.error(Array.isArray(msg) ? msg.join(' | ') : msg);
    } finally {
      setLoading(false);
    }
  }

  const inp = (err?: string) =>
    `w-full border ${err ? 'border-red-400' : 'border-gray-300'} rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Header */}
        <div className="flex flex-col items-center mb-7">
          <div className="bg-brand-500 text-white rounded-xl p-3 mb-3">
            <Bus size={28} />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Créer un compte passager</h1>
          <p className="text-gray-500 text-sm mt-1">Réservez vos voyages en toute simplicité</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Prénom *</label>
              <input
                value={form.firstName}
                onChange={(e) => set('firstName', e.target.value)}
                placeholder="Kouassi"
                className={inp(errors.firstName)}
              />
              {errors.firstName && <p className="text-red-500 text-xs mt-0.5">{errors.firstName}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nom *</label>
              <input
                value={form.lastName}
                onChange={(e) => set('lastName', e.target.value)}
                placeholder="Yves"
                className={inp(errors.lastName)}
              />
              {errors.lastName && <p className="text-red-500 text-xs mt-0.5">{errors.lastName}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="vous@email.com"
              className={inp(errors.email)}
            />
            {errors.email && <p className="text-red-500 text-xs mt-0.5">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Téléphone *</label>
            <input
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="+2250712345678"
              className={inp(errors.phone)}
            />
            {errors.phone && <p className="text-red-500 text-xs mt-0.5">{errors.phone}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Mot de passe *</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              placeholder="Minimum 8 caractères"
              className={inp(errors.password)}
            />
            {errors.password && <p className="text-red-500 text-xs mt-0.5">{errors.password}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Confirmer le mot de passe *</label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => set('confirmPassword', e.target.value)}
              placeholder="••••••••"
              className={inp(errors.confirmPassword)}
            />
            {errors.confirmPassword && <p className="text-red-500 text-xs mt-0.5">{errors.confirmPassword}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-lg py-3 transition flex items-center justify-center gap-2 disabled:opacity-70 mt-2"
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> Création...</> : <><UserRound size={16} /> Créer mon compte</>}
          </button>
        </form>

        <div className="mt-5 space-y-2 text-center">
          <p className="text-sm text-gray-500">
            Déjà un compte ?{' '}
            <a href="/login" className="text-brand-500 font-medium hover:underline">Se connecter</a>
          </p>
          <p className="text-xs text-gray-400">
            Vous êtes une compagnie ?{' '}
            <a href="/register" className="text-gray-500 font-medium hover:underline">Inscrire ma compagnie</a>
          </p>
        </div>
      </div>
    </div>
  );
}
