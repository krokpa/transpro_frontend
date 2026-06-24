'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import Image from 'next/image';
import { Loader2, Eye, EyeOff, ArrowRight, ShieldCheck, ArrowLeft, Phone, Mail, Bus } from 'lucide-react';
import { authApi, otpApi, twoFactorApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { BrandPanel } from '@/components/auth/BrandPanel';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { SocialButtons } from '@/components/auth/SocialButtons';

// ── Schemas ───────────────────────────────────────────────────────────────────

const emailSchema = z.object({
  email:    z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});
type EmailForm = z.infer<typeof emailSchema>;

const OTP_RESEND_DELAY = 60; // secondes

// ── Input styles ──────────────────────────────────────────────────────────────

const inputCls =
  'w-full bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3 text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400 ' +
  'transition-all duration-150 placeholder:text-slate-400';

// ── Page ──────────────────────────────────────────────────────────────────────

type LoginMode    = 'email' | 'phone';
type PhoneStep    = 'enter' | 'otp';
type TwoFactorState = { twoFactorToken: string };

export default function LoginPage() {
  const router   = useRouter();
  const { setAuth } = useAuthStore();

  // ── Email login state ──
  const [loading,      setLoading]      = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactor,    setTwoFactor]    = useState<TwoFactorState | null>(null);
  const [tfCode,       setTfCode]       = useState('');

  // ── Mode toggle ──
  const [mode, setMode] = useState<LoginMode>('email');

  // ── Phone login state ──
  const [phone,      setPhone]      = useState('');
  const [phoneStep,  setPhoneStep]  = useState<PhoneStep>('enter');
  const [otpCode,    setOtpCode]    = useState('');
  const [countdown,  setCountdown]  = useState(0);
  const [sendingOtp, setSendingOtp] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
  });

  // Cleanup countdown on unmount
  useEffect(() => () => { if (countdownRef.current) clearInterval(countdownRef.current); }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function startCountdown() {
    setCountdown(OTP_RESEND_DELAY);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(countdownRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
  }

  function finishLogin(res: any) {
    setAuth(res.user, res.accessToken, res.refreshToken);
    toast.success('Connexion réussie !');
    const role = res.user?.role;
    if (role === 'SUPER_ADMIN')        router.push('/dashboard/admin');
    else if (role === 'DEVELOPER')     router.push('/developer/console');
    else if (role === 'PASSENGER')     router.push('/passenger');
    else if (!res.user?.tenantId)      router.push('/register');
    else if (role === 'DRIVER')        router.push('/driver');
    else if (role === 'COMPANY_AGENT') router.push('/station');
    else                               router.push('/dashboard');
  }

  function resetPhone() {
    setPhoneStep('enter');
    setOtpCode('');
    setCountdown(0);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }

  // ── Email login ───────────────────────────────────────────────────────────────

  async function onEmailSubmit(data: EmailForm) {
    setLoading(true);
    try {
      const res = await authApi.login(data.email, data.password) as any;
      if (res.requires2fa) { setTwoFactor({ twoFactorToken: res.twoFactorToken }); return; }
      finishLogin(res);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Identifiants invalides');
    } finally {
      setLoading(false);
    }
  }

  async function onVerify2fa() {
    if (!twoFactor || tfCode.length < 6) return;
    setLoading(true);
    try {
      const res = await twoFactorApi.verify(twoFactor.twoFactorToken, tfCode) as any;
      finishLogin(res);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Code invalide ou expiré');
      setTfCode('');
    } finally {
      setLoading(false);
    }
  }

  // ── Phone login ───────────────────────────────────────────────────────────────

  async function sendOtp() {
    if (!phone || phone.length < 10) {
      toast.error('Entrez un numéro au format international (+225...)');
      return;
    }
    setSendingOtp(true);
    try {
      // Vérifier que le numéro est inscrit avant d'envoyer l'OTP (économise les SMS)
      const check = await otpApi.checkPhone(phone) as any;
      if (!check?.exists) {
        toast.error('Aucun compte avec ce numéro. Inscrivez-vous d\'abord.', { duration: 5000 });
        setSendingOtp(false);
        return;
      }
      await otpApi.send(phone);
      setPhoneStep('otp');
      setOtpCode('');
      startCountdown();
      toast.success('Code envoyé par SMS');
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || 'Erreur lors de l\'envoi';
      toast.error(msg);
    } finally {
      setSendingOtp(false);
    }
  }

  async function loginWithOtp() {
    if (otpCode.length !== 6) return;
    setLoading(true);
    try {
      const res = await authApi.loginByPhone(phone, otpCode) as any;
      finishLogin(res);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || 'Code incorrect ou expiré';
      toast.error(msg);
      setOtpCode('');
    } finally {
      setLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex">
      <BrandPanel />

      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-50 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-slate-50 rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <div className="lg:hidden flex items-center gap-3 mb-10 relative">
          <Image src="/transpro-logo.png" width={40} height={40} alt="TransPro CI" className="rounded-xl" />
          <span className="text-lg font-bold text-slate-900">transpro</span>
        </div>

        <div className="w-full max-w-[360px] relative">
          {/* ── 2FA challenge ── */}
          {twoFactor ? (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center shrink-0">
                  <ShieldCheck size={20} className="text-brand-500" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-900">Vérification 2FA</h1>
                  <p className="text-xs text-slate-500">Entrez le code de votre application d&apos;authentification</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Code à 6 chiffres</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  autoFocus
                  value={tfCode}
                  onChange={(e) => setTfCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  onKeyDown={(e) => e.key === 'Enter' && onVerify2fa()}
                  placeholder="123456"
                  className={`${inputCls} text-xl text-center tracking-[0.5em] font-mono placeholder:tracking-normal placeholder:text-base`}
                />
                <p className="text-xs text-slate-400 mt-2 text-center">
                  Vous pouvez aussi entrer un code de secours à 8 caractères
                </p>
              </div>

              <button onClick={onVerify2fa} disabled={loading || tfCode.length < 6}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl py-3
                           flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-500/25
                           disabled:opacity-60 disabled:cursor-not-allowed">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <><span>Vérifier</span><ArrowRight size={15} /></>}
              </button>

              <button type="button" onClick={() => { setTwoFactor(null); setTfCode(''); }}
                className="w-full flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
                <ArrowLeft size={14} /> Retour à la connexion
              </button>
            </div>

          ) : (
            <>
              {/* ── Header ── */}
              <div className="mb-7">
                <h1 className="text-[1.6rem] font-bold text-slate-900 leading-tight">Connexion</h1>
                <p className="text-slate-500 text-sm mt-1.5">Accédez à votre espace de gestion</p>
              </div>

              {/* ── Hint chauffeur ── */}
              <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
                <Bus size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  <span className="font-semibold">Chauffeur ?</span> Utilisez l&apos;onglet{' '}
                  <button type="button" onClick={() => setMode('phone')}
                    className="font-semibold underline underline-offset-2 hover:text-amber-900">
                    Téléphone
                  </button>{' '}
                  pour vous connecter avec votre numéro et un code SMS.
                </p>
              </div>

              {/* ── Mode toggle ── */}
              <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
                {([
                  { key: 'email', label: 'Email',     Icon: Mail },
                  { key: 'phone', label: 'Téléphone', Icon: Phone },
                ] as const).map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { setMode(key); resetPhone(); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                      mode === key
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>

              {/* ── Email login ── */}
              {mode === 'email' && (
                <form onSubmit={handleSubmit(onEmailSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                    <input
                      {...register('email')}
                      type="email"
                      placeholder="vous@compagnie.ci"
                      className={inputCls}
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-1.5">{errors.email.message}</p>}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm font-semibold text-slate-700">Mot de passe</label>
                      <Link href="/forgot-password" className="text-xs text-brand-500 hover:text-brand-600 font-semibold transition-colors">
                        Oublié ?
                      </Link>
                    </div>
                    <div className="relative">
                      <input
                        {...register('password')}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className={`${inputCls} pr-11`}
                      />
                      <button type="button" tabIndex={-1}
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {errors.password && <p className="text-red-500 text-xs mt-1.5">{errors.password.message}</p>}
                  </div>

                  <button type="submit" disabled={loading}
                    className="w-full mt-2 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white
                               font-semibold rounded-xl py-3 transition-all
                               flex items-center justify-center gap-2
                               shadow-lg shadow-brand-500/25 disabled:opacity-60 disabled:cursor-not-allowed">
                    {loading
                      ? <Loader2 size={16} className="animate-spin" />
                      : <><span>Se connecter</span><ArrowRight size={15} /></>}
                  </button>
                </form>
              )}

              {/* ── Phone login ── */}
              {mode === 'phone' && (
                <div className="space-y-5">
                  {/* Step 1 : saisir le numéro */}
                  {phoneStep === 'enter' && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                          Numéro de téléphone
                        </label>
                        <PhoneInput
                          value={phone}
                          onChange={setPhone}
                        />
                        <p className="text-xs text-slate-400 mt-1.5">
                          Un code à 6 chiffres vous sera envoyé par SMS
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={sendOtp}
                        disabled={sendingOtp || !phone || phone.length < 10}
                        className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl py-3
                                   flex items-center justify-center gap-2 transition-all
                                   shadow-lg shadow-brand-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {sendingOtp
                          ? <><Loader2 size={16} className="animate-spin" /> Envoi...</>
                          : <><Phone size={15} /> Envoyer le code SMS</>}
                      </button>
                    </>
                  )}

                  {/* Step 2 : saisir le code OTP */}
                  {phoneStep === 'otp' && (
                    <>
                      <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-400">Code envoyé à</p>
                          <p className="text-sm font-semibold text-slate-800 font-mono">{phone}</p>
                        </div>
                        <button
                          type="button"
                          onClick={resetPhone}
                          className="text-xs text-brand-500 hover:text-brand-600 font-semibold transition-colors"
                        >
                          Changer
                        </button>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Code à 6 chiffres
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          autoFocus
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          onKeyDown={(e) => e.key === 'Enter' && loginWithOtp()}
                          placeholder="• • • • • •"
                          className={`${inputCls} text-2xl text-center tracking-[0.8em] font-mono placeholder:tracking-normal placeholder:text-xl`}
                        />

                        {/* Resend */}
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-slate-400">
                            Valable 10 minutes
                          </p>
                          {countdown > 0 ? (
                            <p className="text-xs text-slate-400">
                              Renvoyer dans {countdown}s
                            </p>
                          ) : (
                            <button
                              type="button"
                              onClick={sendOtp}
                              disabled={sendingOtp}
                              className="text-xs text-brand-500 hover:text-brand-600 font-semibold transition-colors disabled:opacity-50"
                            >
                              {sendingOtp ? 'Envoi...' : 'Renvoyer le code'}
                            </button>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={loginWithOtp}
                        disabled={loading || otpCode.length !== 6}
                        className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl py-3
                                   flex items-center justify-center gap-2 transition-all
                                   shadow-lg shadow-brand-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {loading
                          ? <Loader2 size={16} className="animate-spin" />
                          : <><span>Se connecter</span><ArrowRight size={15} /></>}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* ── Social login ── */}
              {mode === 'email' && !twoFactor && (
                <div className="mt-6">
                  <div className="relative flex items-center gap-3 mb-4">
                    <div className="flex-1 h-px bg-slate-100" />
                    <span className="text-xs text-slate-400 font-medium shrink-0">ou continuer avec</span>
                    <div className="flex-1 h-px bg-slate-100" />
                  </div>
                  <SocialButtons />
                </div>
              )}

              {/* ── Footer links ── */}
              <div className="mt-8 pt-6 border-t border-slate-100 space-y-2.5 text-center">
                <p className="text-sm text-slate-500">
                  Passager ? Pas encore de compte ?{' '}
                  <a href="/register/passenger" className="text-brand-500 font-semibold hover:text-brand-600 transition-colors">
                    S&apos;inscrire
                  </a>
                </p>
                <p className="text-xs text-slate-400">
                  Vous êtes une compagnie ?{' '}
                  <a href="/register" className="text-slate-600 font-medium hover:text-slate-900 transition-colors">
                    Inscrire ma compagnie
                  </a>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
