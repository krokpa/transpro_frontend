'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, ArrowRight, ArrowLeft, Check, Eye, EyeOff, Building2, Bus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { authApi, tenantsApi, citiesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { SearchableSelect, SelectOption } from '@/components/ui/SearchableSelect';
import { BrandPanel } from '@/components/auth/BrandPanel';

function toSlug(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

type Step1 = { firstName: string; lastName: string; email: string; phone: string; password: string; confirmPassword: string };
type Step2 = { name: string; sigle: string; phone: string; email: string; address: string; cityId: string };

const inputBase =
  'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent ' +
  'transition placeholder:text-slate-400';
const inputError = 'border-red-300 bg-red-50 focus:ring-red-400';

function Field({
  label, error, children,
}: {
  label: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [step,    setStep]    = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [showPwd,    setShowPwd]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [s1, setS1] = useState<Step1>({ firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [s2, setS2] = useState<Step2>({ name: '', sigle: '', phone: '', email: '', address: '', cityId: '' });
  const [e1, setE1] = useState<Partial<Step1>>({});
  const [e2, setE2] = useState<Partial<Step2>>({});

  const { data: cities = [] } = useQuery<any[]>({
    queryKey: ['cities'],
    queryFn: async () => ((await citiesApi.list()) ?? []) as any[],
    staleTime: 5 * 60 * 1000,
  });
  const cityOptions: SelectOption[] = (cities as any[]).map((c) => ({ value: c.id, label: c.name, sub: c.region ?? undefined }));

  function validateStep1() {
    const e: Partial<Step1> = {};
    if (!s1.firstName.trim())                 e.firstName = 'Requis';
    if (!s1.lastName.trim())                  e.lastName  = 'Requis';
    if (!s1.email.includes('@'))              e.email     = 'Email invalide';
    if (s1.phone.length < 8)                  e.phone     = 'Numéro invalide';
    if (s1.password.length < 8)               e.password  = 'Minimum 8 caractères';
    if (s1.password !== s1.confirmPassword)   e.confirmPassword = 'Mots de passe différents';
    setE1(e);
    return Object.keys(e).length === 0;
  }

  function validateStep2() {
    const e: Partial<Step2> = {};
    if (!s2.name.trim())         e.name    = 'Requis';
    if (s2.phone.length < 8)     e.phone   = 'Numéro invalide';
    if (!s2.email.includes('@')) e.email   = 'Email invalide';
    if (!s2.address.trim())      e.address = 'Requis';
    setE2(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validateStep2()) return;
    setLoading(true);
    try {
      const regRes = await authApi.register({
        firstName: s1.firstName, lastName: s1.lastName,
        email: s1.email, phone: s1.phone, password: s1.password,
      }) as any;
      localStorage.setItem('access_token',  regRes.accessToken);
      localStorage.setItem('refresh_token', regRes.refreshToken);
      await tenantsApi.create({
        name: s2.name,
        ...(s2.sigle.trim() ? { sigle: s2.sigle.trim().toUpperCase() } : {}),
        slug:  toSlug(s2.name) + '-' + Date.now().toString(36),
        phone: s2.phone, email: s2.email, address: s2.address,
        ...(s2.cityId ? { cityId: s2.cityId } : {}),
      });
      const refreshRes = await authApi.refresh(regRes.refreshToken) as any;
      localStorage.setItem('access_token',  refreshRes.accessToken);
      localStorage.setItem('refresh_token', refreshRes.refreshToken);
      const meRes = await (await import('@/lib/api')).authApi.me() as any;
      setAuth(meRes, refreshRes.accessToken, refreshRes.refreshToken);
      toast.success('Compagnie créée ! Bienvenue sur TransPro CI.');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Erreur inattendue');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      <BrandPanel />

      {/* Form panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white overflow-y-auto">

        {/* Mobile-only logo */}
        <div className="lg:hidden flex items-center gap-2.5 mb-8">
          <div className="bg-brand-500 text-white p-2 rounded-xl shadow shadow-brand-500/30">
            <Bus size={20} />
          </div>
          <span className="text-lg font-bold text-slate-900">TransPro CI</span>
        </div>

        <div className="w-full max-w-[400px]">

          {/* Heading */}
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-slate-900">Créer votre compagnie</h1>
            <p className="text-slate-500 text-sm mt-1">Inscription en 2 étapes rapides</p>
          </div>

          {/* Stepper */}
          <div className="flex items-center mb-8">
            {([{ n: 1, label: 'Mon compte' }, { n: 2, label: 'Ma compagnie' }] as const).map(({ n, label }, i) => (
              <div key={n} className="flex items-center flex-1 last:flex-none">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    step > n
                      ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
                      : step === n
                      ? 'bg-brand-500 text-white ring-4 ring-brand-100 shadow-md shadow-brand-500/30'
                      : 'bg-slate-100 text-slate-400'
                  }`}>
                    {step > n ? <Check size={14} /> : n}
                  </div>
                  <span className={`text-xs font-medium whitespace-nowrap ${step >= n ? 'text-slate-800' : 'text-slate-400'}`}>
                    {label}
                  </span>
                </div>
                {i === 0 && (
                  <div className={`flex-1 h-px mx-4 transition-all duration-300 ${step > 1 ? 'bg-brand-500' : 'bg-slate-200'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Compte */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Prénom *" error={e1.firstName}>
                  <input
                    value={s1.firstName}
                    onChange={ev => setS1(p => ({ ...p, firstName: ev.target.value }))}
                    placeholder="Kouassi"
                    className={`${inputBase} ${e1.firstName ? inputError : ''}`}
                  />
                </Field>
                <Field label="Nom *" error={e1.lastName}>
                  <input
                    value={s1.lastName}
                    onChange={ev => setS1(p => ({ ...p, lastName: ev.target.value }))}
                    placeholder="Yves"
                    className={`${inputBase} ${e1.lastName ? inputError : ''}`}
                  />
                </Field>
              </div>

              <Field label="Email *" error={e1.email}>
                <input
                  type="email"
                  value={s1.email}
                  onChange={ev => setS1(p => ({ ...p, email: ev.target.value }))}
                  placeholder="vous@compagnie.ci"
                  className={`${inputBase} ${e1.email ? inputError : ''}`}
                />
              </Field>

              <Field label="Téléphone *" error={e1.phone}>
                <input
                  value={s1.phone}
                  onChange={ev => setS1(p => ({ ...p, phone: ev.target.value }))}
                  placeholder="+2250712345678"
                  className={`${inputBase} ${e1.phone ? inputError : ''}`}
                />
              </Field>

              <Field label="Mot de passe *" error={e1.password}>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={s1.password}
                    onChange={ev => setS1(p => ({ ...p, password: ev.target.value }))}
                    placeholder="Minimum 8 caractères"
                    className={`${inputBase} pr-11 ${e1.password ? inputError : ''}`}
                  />
                  <button type="button" tabIndex={-1} onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>

              <Field label="Confirmer le mot de passe *" error={e1.confirmPassword}>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={s1.confirmPassword}
                    onChange={ev => setS1(p => ({ ...p, confirmPassword: ev.target.value }))}
                    placeholder="••••••••"
                    className={`${inputBase} pr-11 ${e1.confirmPassword ? inputError : ''}`}
                  />
                  <button type="button" tabIndex={-1} onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>

              <button
                type="button"
                onClick={() => validateStep1() && setStep(2)}
                className="w-full mt-2 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white
                           font-semibold rounded-xl py-3 transition-all
                           flex items-center justify-center gap-2
                           shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30"
              >
                Suivant <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* Step 2: Compagnie */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200 mb-2">
                <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 size={16} className="text-brand-600" />
                </div>
                <p className="text-xs text-slate-500">
                  Renseignez les informations de votre compagnie de transport.
                </p>
              </div>

              <Field label="Nom de la compagnie *" error={e2.name}>
                <input
                  value={s2.name}
                  onChange={ev => setS2(p => ({ ...p, name: ev.target.value }))}
                  placeholder="Transport Express CI"
                  className={`${inputBase} ${e2.name ? inputError : ''}`}
                />
              </Field>

              <Field label="Sigle (optionnel)">
                <input
                  value={s2.sigle}
                  onChange={ev => setS2(p => ({ ...p, sigle: ev.target.value.toUpperCase().slice(0, 10) }))}
                  placeholder="ex. STC, CTB, STA"
                  maxLength={10}
                  className={`${inputBase} uppercase placeholder:normal-case`}
                />
                <p className="text-xs text-slate-400 mt-1">Abréviation affichée dans la barre latérale</p>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Téléphone *" error={e2.phone}>
                  <input
                    value={s2.phone}
                    onChange={ev => setS2(p => ({ ...p, phone: ev.target.value }))}
                    placeholder="+225 07 00 00 00"
                    className={`${inputBase} ${e2.phone ? inputError : ''}`}
                  />
                </Field>
                <Field label="Email *" error={e2.email}>
                  <input
                    type="email"
                    value={s2.email}
                    onChange={ev => setS2(p => ({ ...p, email: ev.target.value }))}
                    placeholder="contact@cie.ci"
                    className={`${inputBase} ${e2.email ? inputError : ''}`}
                  />
                </Field>
              </div>

              <Field label="Adresse *" error={e2.address}>
                <input
                  value={s2.address}
                  onChange={ev => setS2(p => ({ ...p, address: ev.target.value }))}
                  placeholder="Rue du Commerce, Plateau"
                  className={`${inputBase} ${e2.address ? inputError : ''}`}
                />
              </Field>

              <Field label="Ville (optionnel)">
                <SearchableSelect
                  options={cityOptions}
                  value={s2.cityId}
                  onChange={v => setS2(p => ({ ...p, cityId: v }))}
                  placeholder="Choisir une ville..."
                  clearable
                />
              </Field>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1.5 px-4 py-3 border border-slate-200 bg-slate-50
                             text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-100 transition"
                >
                  <ArrowLeft size={15} /> Retour
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white
                             font-semibold rounded-xl py-3 transition-all
                             flex items-center justify-center gap-2
                             shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30
                             disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading
                    ? <><Loader2 size={16} className="animate-spin" /> Création...</>
                    : 'Créer ma compagnie'}
                </button>
              </div>
            </form>
          )}

          {/* Footer */}
          <div className="mt-7 pt-6 border-t border-slate-100 space-y-2 text-center">
            <p className="text-sm text-slate-500">
              Déjà un compte ?{' '}
              <a href="/login" className="text-brand-500 font-semibold hover:underline">
                Se connecter
              </a>
            </p>
            <p className="text-xs text-slate-400">
              Vous êtes un passager ?{' '}
              <a href="/register/passenger" className="text-slate-600 font-medium hover:text-slate-900 hover:underline transition-colors">
                Créer un compte passager
              </a>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
