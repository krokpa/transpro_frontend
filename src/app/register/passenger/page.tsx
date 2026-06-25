'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowRight, ArrowLeft, Check, Eye, EyeOff, UserRound, Phone, ClipboardList } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useBranding } from '@/lib/branding';
import { OtpStep } from '@/components/auth/OtpStep';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { SocialButtons } from '@/components/auth/SocialButtons';

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

type Step1 = { firstName: string; lastName: string; email: string; password: string; confirmPassword: string };

const STEPS = [
  { n: 1, label: 'Mon identité', icon: UserRound },
  { n: 2, label: 'Téléphone',   icon: Phone },
  { n: 3, label: 'Confirmation', icon: ClipboardList },
] as const;
type StepNum = 1 | 2 | 3;

const slideVariants = {
  enter:  (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
};

export default function PassengerRegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const { appName, logoUrl } = useBranding();
  const [step, setStep] = useState<StepNum>(1);
  const [direction, setDirection] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [s1, setS1] = useState<Step1>({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' });
  const [e1, setE1] = useState<Partial<Step1>>({});

  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [phoneVerificationToken, setPhoneVerificationToken] = useState('');
  const [otpStarted, setOtpStarted] = useState(false);

  function go(n: StepNum) {
    setDirection(n > step ? 1 : -1);
    setStep(n);
  }

  function validateStep1() {
    const e: Partial<Step1> = {};
    if (!s1.firstName.trim())               e.firstName = 'Requis';
    if (!s1.lastName.trim())                e.lastName = 'Requis';
    if (!s1.email.includes('@'))            e.email = 'Email invalide';
    if (s1.password.length < 8)             e.password = 'Minimum 8 caractères';
    if (s1.password !== s1.confirmPassword) e.confirmPassword = 'Mots de passe différents';
    setE1(e);
    return Object.keys(e).length === 0;
  }

  function validatePhone() {
    if (!phone.trim()) { setPhoneError('Numéro requis'); return false; }
    if (!/^\+\d{10,15}$/.test(phone.trim())) { setPhoneError('Format : +2250712345678'); return false; }
    setPhoneError('');
    return true;
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      const res = await authApi.register({
        firstName: s1.firstName,
        lastName: s1.lastName,
        email: s1.email,
        phone,
        password: s1.password,
        phoneVerificationToken,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50/60 via-white to-slate-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' as const }}
        className="bg-white rounded-3xl shadow-xl shadow-slate-300/40 ring-1 ring-slate-100 w-full max-w-md overflow-hidden"
      >

        {/* Header neutre */}
        <div className="px-8 pt-8 pb-6 border-b border-slate-100">
          <div className="flex flex-col items-center mb-6">
            {logoUrl ? (
              <img src={logoUrl} width={52} height={52} alt={appName}
                className="w-13 h-13 mb-3 object-contain" />
            ) : (
              <div className="w-13 h-13 mb-3 rounded-2xl bg-brand-500 flex items-center justify-center text-white font-bold text-lg">
                {appName.charAt(0)}
              </div>
            )}
            <h1 className="text-xl font-bold text-slate-900">Créer un compte passager</h1>
            <p className="text-slate-500 text-sm mt-0.5">Réservez vos voyages en toute simplicité</p>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-0">
            {STEPS.map(({ n, label, icon: Icon }, i) => {
              const done = step > n;
              const active = step === n;
              return (
                <div key={n} className="flex items-center flex-1 last:flex-none">
                  <motion.div
                    animate={{ scale: active ? 1.1 : 1 }}
                    className="flex items-center gap-1.5"
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                      done || active ? 'bg-brand-500' : 'bg-slate-100'
                    }`}>
                      {done
                        ? <Check size={13} className="text-white" />
                        : <Icon size={13} className={active ? 'text-white' : 'text-slate-400'} />
                      }
                    </div>
                    <span className={`text-xs font-medium whitespace-nowrap hidden sm:block ${active || done ? 'text-slate-900' : 'text-slate-400'}`}>
                      {label}
                    </span>
                  </motion.div>
                  {i < STEPS.length - 1 && (
                    <motion.div
                      className="flex-1 h-0.5 mx-2 rounded-full"
                      animate={{ backgroundColor: step > n ? 'rgb(var(--brand-500))' : 'rgb(226 232 240)' }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Corps animé */}
        <div className="p-8 overflow-hidden">
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

              {/* ── Étape 1 : Identité ──────────────────────────────── */}
              {step === 1 && (
                <div className="space-y-4">

                  {/* Social signup */}
                  <SocialButtons />
                  <div className="relative flex items-center gap-3">
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-xs text-slate-400 font-medium shrink-0">ou créer un compte</span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>

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
                      placeholder="vous@email.com" className={`${inputBase} ${e1.email ? inputErr : ''}`} />
                  </Field>

                  <Field label="Mot de passe *" error={e1.password}>
                    <div className="relative">
                      <input type={showPwd ? 'text' : 'password'} value={s1.password}
                        onChange={(e) => setS1((p) => ({ ...p, password: e.target.value }))}
                        placeholder="Minimum 8 caractères" className={`${inputBase} pr-11 ${e1.password ? inputErr : ''}`} />
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
                        placeholder="••••••••" className={`${inputBase} pr-11 ${e1.confirmPassword ? inputErr : ''}`} />
                      <button type="button" tabIndex={-1} onClick={() => setShowConfirm((v) => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </Field>

                  <button type="button" onClick={() => { if (validateStep1()) go(2); }}
                    className="w-full mt-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl py-3 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20">
                    Suivant <ArrowRight size={16} />
                  </button>
                </div>
              )}

              {/* ── Étape 2 : Téléphone + OTP ───────────────────────── */}
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
                        <button type="button" onClick={() => { if (validatePhone()) setOtpStarted(true); }}
                          className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl py-3 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20">
                          Recevoir le code <ArrowRight size={16} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <OtpStep phone={phone} onVerified={(token) => setPhoneVerificationToken(token)} />
                      {phoneVerificationToken && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex gap-3 pt-2"
                        >
                          <button type="button" onClick={() => { setOtpStarted(false); setPhoneVerificationToken(''); }}
                            className="flex items-center gap-1.5 px-4 py-3 border border-slate-200 bg-slate-50 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-100 transition">
                            <ArrowLeft size={15} /> Changer
                          </button>
                          <button type="button" onClick={() => go(3)}
                            className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl py-3 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20">
                            Continuer <ArrowRight size={16} />
                          </button>
                        </motion.div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ── Étape 3 : Confirmation ──────────────────────────── */}
              {step === 3 && (
                <div className="space-y-5">
                  <div className="bg-slate-50 rounded-2xl border border-slate-200 divide-y divide-slate-200 overflow-hidden">
                    <div className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Identité</p>
                        <button onClick={() => go(1)} className="text-xs text-brand-500 hover:underline font-medium">Modifier</button>
                      </div>
                      <p className="text-sm font-medium text-slate-900">{s1.firstName} {s1.lastName}</p>
                      <p className="text-sm text-slate-500">{s1.email}</p>
                    </div>
                    <div className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Téléphone</p>
                        <button onClick={() => { setOtpStarted(false); setPhoneVerificationToken(''); go(2); }}
                          className="text-xs text-brand-500 hover:underline font-medium">Modifier</button>
                      </div>
                      <p className="text-sm font-medium text-slate-900">
                        {phone} <span className="text-green-600 text-xs ml-1">✓ vérifié</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button type="button" onClick={() => go(2)}
                      className="flex items-center gap-1.5 px-4 py-3 border border-slate-200 bg-slate-50 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-100 transition">
                      <ArrowLeft size={15} /> Retour
                    </button>
                    <button type="button" onClick={handleSubmit} disabled={loading}
                      className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl py-3 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 disabled:opacity-60">
                      {loading
                        ? <><Loader2 size={16} className="animate-spin" /> Création…</>
                        : <><UserRound size={16} /> Créer mon compte</>
                      }
                    </button>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-8 pb-7 space-y-2 text-center border-t border-slate-100 pt-5">
          <p className="text-sm text-slate-500">
            Déjà un compte ?{' '}
            <a href="/login" className="text-brand-500 font-medium hover:underline">Se connecter</a>
          </p>
          <p className="text-xs text-slate-400">
            Vous êtes une compagnie ?{' '}
            <a href="/register" className="text-slate-600 font-medium hover:text-slate-900 hover:underline">Inscrire ma compagnie</a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
