'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, ArrowRight, ArrowLeft, Check, Eye, EyeOff,
  Building2, User, Phone, ClipboardList,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { authApi, tenantsApi, citiesApi, otpApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { SearchableSelect, SelectOption } from '@/components/ui/SearchableSelect';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { BrandPanel } from '@/components/auth/BrandPanel';
import { OtpStep } from '@/components/auth/OtpStep';

function toSlug(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

type Step1 = { firstName: string; lastName: string; email: string; password: string; confirmPassword: string };
type Step3 = { name: string; sigle: string; phone: string; email: string; address: string; cityId: string };

const inputBase =
  'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent ' +
  'transition placeholder:text-slate-400';
const inputErr = 'border-red-300 bg-red-50 focus:ring-red-400';

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      {children}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-red-500 text-xs mt-1.5"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

const STEPS = [
  { n: 1, label: 'Mon compte',    icon: User },
  { n: 2, label: 'Téléphone',     icon: Phone },
  { n: 3, label: 'Ma compagnie',  icon: Building2 },
  { n: 4, label: 'Confirmation',  icon: ClipboardList },
] as const;

type StepNum = 1 | 2 | 3 | 4;

const slideVariants = {
  enter:  (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
};

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [step, setStep] = useState<StepNum>(1);
  const [direction, setDirection] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Step 1: compte
  const [s1, setS1] = useState<Step1>({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' });
  const [e1, setE1] = useState<Partial<Step1>>({});

  // Step 2: phone + OTP
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [phoneVerificationToken, setPhoneVerificationToken] = useState('');
  const [otpStarted, setOtpStarted] = useState(false);

  // Step 3: compagnie
  const [s3, setS3] = useState<Step3>({ name: '', sigle: '', phone: '', email: '', address: '', cityId: '' });
  const [e3, setE3] = useState<Partial<Step3>>({});

  const sessionKey = 'register_company_draft';
  const savedRef = useRef(false);

  // Persist dans sessionStorage à chaque changement
  function persist() {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(sessionKey, JSON.stringify({ s1, phone, s3 }));
  }

  const { data: cities = [] } = useQuery<any[]>({
    queryKey: ['cities'],
    queryFn: async () => ((await citiesApi.list()) ?? []) as any[],
    staleTime: 5 * 60 * 1000,
  });
  const cityOptions: SelectOption[] = (cities as any[]).map((c) => ({ value: c.id, label: c.name, sub: c.region ?? undefined }));

  function go(n: StepNum) {
    setDirection(n > step ? 1 : -1);
    setStep(n);
    persist();
  }

  // ── Validations ──────────────────────────────────────────────────────────────

  async function validateStep1() {
    const e: Partial<Step1> = {};
    if (!s1.firstName.trim())               e.firstName = 'Requis';
    if (!s1.lastName.trim())                e.lastName = 'Requis';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s1.email)) {
      e.email = 'Email invalide';
    }
    if (s1.password.length < 8)             e.password = 'Minimum 8 caractères';
    if (s1.password !== s1.confirmPassword)  e.confirmPassword = 'Mots de passe différents';
    setE1(e);
    if (Object.keys(e).length > 0) return false;
    try {
      const res = await otpApi.checkEmail(s1.email) as any;
      if (res?.exists) {
        setE1((prev) => ({ ...prev, email: 'Cet email est déjà utilisé' }));
        return false;
      }
    } catch {
      // En cas d'erreur réseau on laisse passer, l'API register rejettera
    }
    return true;
  }

  function validatePhone() {
    const clean = phone.trim();
    if (!clean) { setPhoneError('Numéro requis'); return false; }
    if (!/^\+\d{10,15}$/.test(clean)) { setPhoneError('Format : +2250712345678'); return false; }
    setPhoneError('');
    return true;
  }

  function validateStep3() {
    const e: Partial<Step3> = {};
    if (!s3.name.trim())         e.name = 'Requis';
    if (s3.phone.length < 8)     e.phone = 'Numéro invalide';
    if (!s3.email.includes('@')) e.email = 'Email invalide';
    if (!s3.address.trim())      e.address = 'Requis';
    setE3(e);
    return Object.keys(e).length === 0;
  }

  // ── Navigation étapes ────────────────────────────────────────────────────────

  async function nextStep1() {
    if (!await validateStep1()) return;
    go(2);
  }

  async function nextStep2() {
    if (!otpStarted) {
      if (!validatePhone()) return;
      try {
        const res = await otpApi.checkPhone(phone) as any;
        if (res?.exists) {
          setPhoneError('Ce numéro est déjà associé à un compte');
          return;
        }
      } catch {
        // En cas d'erreur réseau on laisse passer
      }
      setOtpStarted(true);
      return;
    }
    // OTP déjà vérifié → passer à l'étape 3
    if (!phoneVerificationToken) {
      toast.error('Vérifiez votre numéro de téléphone d\'abord.');
      return;
    }
    go(3);
  }

  function nextStep3() {
    if (!validateStep3()) return;
    go(4);
  }

  // ── Soumission finale ────────────────────────────────────────────────────────

  async function handleSubmit() {
    setLoading(true);
    try {
      const regRes = await authApi.register({
        firstName: s1.firstName,
        lastName: s1.lastName,
        email: s1.email,
        phone,
        password: s1.password,
        phoneVerificationToken,
      }) as any;

      localStorage.setItem('access_token', regRes.accessToken);
      localStorage.setItem('refresh_token', regRes.refreshToken);

      await tenantsApi.create({
        name: s3.name,
        ...(s3.sigle.trim() ? { sigle: s3.sigle.trim().toUpperCase() } : {}),
        slug: toSlug(s3.name) + '-' + Date.now().toString(36),
        phone: s3.phone,
        email: s3.email,
        address: s3.address,
        ...(s3.cityId ? { cityId: s3.cityId } : {}),
      });

      const refreshRes = await authApi.refresh(regRes.refreshToken) as any;
      localStorage.setItem('access_token', refreshRes.accessToken);
      localStorage.setItem('refresh_token', refreshRes.refreshToken);
      const meRes = await (await import('@/lib/api')).authApi.me() as any;
      setAuth(meRes, refreshRes.accessToken, refreshRes.refreshToken);

      sessionStorage.removeItem(sessionKey);
      toast.success('Compagnie créée ! Bienvenue sur TransPro CI.');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Erreur inattendue');
    } finally {
      setLoading(false);
    }
  }

  // ── Rendu ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex">
      <BrandPanel />

      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white overflow-y-auto">

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-8">
          <Image src="/transpro-logo.png" width={40} height={40} alt="TransPro CI" className="rounded-xl" />
          <span className="text-lg font-bold text-slate-900">transpro</span>
        </div>

        <div className="w-full max-w-[420px]">

          <div className="mb-7">
            <h1 className="text-2xl font-bold text-slate-900">Créer votre compagnie</h1>
            <p className="text-slate-500 text-sm mt-1">Inscription en {STEPS.length} étapes rapides</p>
          </div>

          {/* Stepper */}
          <div className="flex items-center mb-8 gap-0">
            {STEPS.map(({ n, label, icon: Icon }, i) => {
              const done = step > n;
              const active = step === n;
              return (
                <div key={n} className="flex items-center flex-1 last:flex-none">
                  <button
                    type="button"
                    onClick={() => done ? go(n as StepNum) : undefined}
                    className={`flex items-center gap-2 ${done ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <motion.div
                      animate={{
                        scale: active ? 1.1 : 1,
                        backgroundColor: done || active ? '#f05a1a' : '#f1f5f9',
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm"
                    >
                      {done
                        ? <Check size={14} className="text-white" />
                        : <Icon size={14} className={active ? 'text-white' : 'text-slate-400'} />
                      }
                    </motion.div>
                    <span className={`text-xs font-medium whitespace-nowrap hidden sm:block ${active || done ? 'text-slate-800' : 'text-slate-400'}`}>
                      {label}
                    </span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <motion.div
                      className="flex-1 h-0.5 mx-2"
                      animate={{ backgroundColor: step > n ? '#f05a1a' : '#e2e8f0' }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Contenu étapes animé */}
          <div className="overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              >

                {/* ── Étape 1 : Compte ─────────────────────────────────── */}
                {step === 1 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Prénom *" error={e1.firstName}>
                        <input value={s1.firstName} onChange={(e) => setS1((p) => ({ ...p, firstName: e.target.value }))}
                          placeholder="Kouassi" className={`${inputBase} ${e1.firstName ? inputErr : ''}`} />
                      </Field>
                      <Field label="Nom *" error={e1.lastName}>
                        <input value={s1.lastName} onChange={(e) => setS1((p) => ({ ...p, lastName: e.target.value }))}
                          placeholder="Yves" className={`${inputBase} ${e1.lastName ? inputErr : ''}`} />
                      </Field>
                    </div>

                    <Field label="Email *" error={e1.email}>
                      <input type="email" value={s1.email} onChange={(e) => setS1((p) => ({ ...p, email: e.target.value }))}
                        placeholder="vous@compagnie.ci" className={`${inputBase} ${e1.email ? inputErr : ''}`} />
                    </Field>

                    <Field label="Mot de passe *" error={e1.password}>
                      <div className="relative">
                        <input type={showPwd ? 'text' : 'password'} value={s1.password}
                          onChange={(e) => setS1((p) => ({ ...p, password: e.target.value }))}
                          placeholder="Minimum 8 caractères"
                          className={`${inputBase} pr-11 ${e1.password ? inputErr : ''}`} />
                        <button type="button" tabIndex={-1} onClick={() => setShowPwd((v) => !v)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </Field>

                    <Field label="Confirmer le mot de passe *" error={e1.confirmPassword}>
                      <div className="relative">
                        <input type={showConfirm ? 'text' : 'password'} value={s1.confirmPassword}
                          onChange={(e) => setS1((p) => ({ ...p, confirmPassword: e.target.value }))}
                          placeholder="••••••••"
                          className={`${inputBase} pr-11 ${e1.confirmPassword ? inputErr : ''}`} />
                        <button type="button" tabIndex={-1} onClick={() => setShowConfirm((v) => !v)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </Field>

                    <button type="button" onClick={nextStep1}
                      className="w-full mt-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl py-3 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20">
                      Suivant <ArrowRight size={16} />
                    </button>
                  </div>
                )}

                {/* ── Étape 2 : Téléphone + OTP ────────────────────────── */}
                {step === 2 && (
                  <div className="space-y-5">
                    {!otpStarted ? (
                      <>
                        <Field label="Numéro de téléphone *" error={phoneError}>
                          <PhoneInput
                            value={phone}
                            onChange={(v) => { setPhone(v); setPhoneError(''); }}
                            className={phoneError ? 'border-red-400' : ''}
                          />
                        </Field>
                        <div className="flex gap-3">
                          <button type="button" onClick={() => go(1)}
                            className="flex items-center gap-1.5 px-4 py-3 border border-slate-200 bg-slate-50 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-100 transition">
                            <ArrowLeft size={15} /> Retour
                          </button>
                          <button type="button" onClick={nextStep2}
                            className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl py-3 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20">
                            Recevoir le code <ArrowRight size={16} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <OtpStep
                          phone={phone}
                          onVerified={(token) => {
                            setPhoneVerificationToken(token);
                            setTimeout(() => go(3), 1200);
                          }}
                        />
                      </>
                    )}
                  </div>
                )}

                {/* ── Étape 3 : Compagnie ──────────────────────────────── */}
                {step === 3 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building2 size={16} className="text-brand-600" />
                      </div>
                      <p className="text-xs text-slate-500">Renseignez les informations de votre compagnie de transport.</p>
                    </div>

                    <Field label="Nom de la compagnie *" error={e3.name}>
                      <input value={s3.name} onChange={(e) => setS3((p) => ({ ...p, name: e.target.value }))}
                        placeholder="Transport Express CI" className={`${inputBase} ${e3.name ? inputErr : ''}`} />
                    </Field>

                    <Field label="Sigle (optionnel)">
                      <input value={s3.sigle}
                        onChange={(e) => setS3((p) => ({ ...p, sigle: e.target.value.toUpperCase().slice(0, 10) }))}
                        placeholder="ex. STC, CTB" maxLength={10}
                        className={`${inputBase} uppercase placeholder:normal-case`} />
                      <p className="text-xs text-slate-400 mt-1">Abréviation affichée dans la barre latérale</p>
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Téléphone compagnie *" error={e3.phone}>
                        <PhoneInput
                          value={s3.phone}
                          onChange={(v) => setS3((p) => ({ ...p, phone: v }))}
                          className={e3.phone ? 'border-red-400' : ''}
                        />
                      </Field>
                      <Field label="Email compagnie *" error={e3.email}>
                        <input type="email" value={s3.email} onChange={(e) => setS3((p) => ({ ...p, email: e.target.value }))}
                          placeholder="contact@cie.ci" className={`${inputBase} ${e3.email ? inputErr : ''}`} />
                      </Field>
                    </div>

                    <Field label="Adresse *" error={e3.address}>
                      <input value={s3.address} onChange={(e) => setS3((p) => ({ ...p, address: e.target.value }))}
                        placeholder="Rue du Commerce, Plateau" className={`${inputBase} ${e3.address ? inputErr : ''}`} />
                    </Field>

                    <Field label="Ville (optionnel)">
                      <SearchableSelect options={cityOptions} value={s3.cityId}
                        onChange={(v) => setS3((p) => ({ ...p, cityId: v }))}
                        placeholder="Choisir une ville..." clearable />
                    </Field>

                    <div className="flex gap-3 pt-1">
                      <button type="button" onClick={() => go(2)}
                        className="flex items-center gap-1.5 px-4 py-3 border border-slate-200 bg-slate-50 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-100 transition">
                        <ArrowLeft size={15} /> Retour
                      </button>
                      <button type="button" onClick={nextStep3}
                        className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl py-3 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20">
                        Vérifier <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Étape 4 : Confirmation ───────────────────────────── */}
                {step === 4 && (
                  <div className="space-y-5">
                    <div className="bg-slate-50 rounded-2xl border border-slate-200 divide-y divide-slate-200 overflow-hidden">
                      {/* Compte */}
                      <div className="px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Mon compte</p>
                          <button onClick={() => go(1)} className="text-xs text-brand-500 hover:underline font-medium">Modifier</button>
                        </div>
                        <p className="text-sm font-medium text-slate-900">{s1.firstName} {s1.lastName}</p>
                        <p className="text-sm text-slate-500">{s1.email}</p>
                        <p className="text-sm text-slate-500">{phone} <span className="text-green-600 text-xs font-medium ml-1">✓ vérifié</span></p>
                      </div>
                      {/* Compagnie */}
                      <div className="px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ma compagnie</p>
                          <button onClick={() => go(3)} className="text-xs text-brand-500 hover:underline font-medium">Modifier</button>
                        </div>
                        <p className="text-sm font-medium text-slate-900">{s3.name} {s3.sigle && <span className="text-slate-400 font-normal">({s3.sigle})</span>}</p>
                        <p className="text-sm text-slate-500">{s3.address}</p>
                        <p className="text-sm text-slate-500">{s3.phone} · {s3.email}</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button type="button" onClick={() => go(3)}
                        className="flex items-center gap-1.5 px-4 py-3 border border-slate-200 bg-slate-50 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-100 transition">
                        <ArrowLeft size={15} /> Retour
                      </button>
                      <button type="button" onClick={handleSubmit} disabled={loading}
                        className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl py-3 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 disabled:opacity-60 disabled:cursor-not-allowed">
                        {loading ? <><Loader2 size={16} className="animate-spin" /> Création…</> : 'Créer ma compagnie'}
                      </button>
                    </div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="mt-7 pt-6 border-t border-slate-100 space-y-2 text-center">
            <p className="text-sm text-slate-500">
              Déjà un compte ?{' '}
              <a href="/login" className="text-brand-500 font-semibold hover:underline">Se connecter</a>
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
