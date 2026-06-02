'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import Image from 'next/image';
import { Loader2, Eye, EyeOff, ArrowRight, ShieldCheck, ArrowLeft } from 'lucide-react';
import { authApi, twoFactorApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { BrandPanel } from '@/components/auth/BrandPanel';

const schema = z.object({
  email:    z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});
type FormData = z.infer<typeof schema>;

type TwoFactorState = { twoFactorToken: string };

export default function LoginPage() {
  const router   = useRouter();
  const { setAuth } = useAuthStore();
  const [loading,      setLoading]      = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactor,    setTwoFactor]    = useState<TwoFactorState | null>(null);
  const [tfCode,       setTfCode]       = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const res = await authApi.login(data.email, data.password) as any;
      if (res.requires2fa) {
        setTwoFactor({ twoFactorToken: res.twoFactorToken });
        return;
      }
      finishLogin(res);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Identifiants invalides');
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
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Code invalide ou expiré');
      setTfCode('');
    } finally {
      setLoading(false);
    }
  }

  function finishLogin(res: any) {
    setAuth(res.user, res.accessToken, res.refreshToken);
    toast.success('Connexion réussie !');
    if (res.user?.role === 'PASSENGER')          router.push('/passenger');
    else if (!res.user?.tenantId)                router.push('/register');
    else if (res.user?.role === 'COMPANY_AGENT') router.push('/station');
    else                                         router.push('/dashboard');
  }

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
          {!twoFactor ? (
            <>
              <div className="mb-8">
                <h1 className="text-[1.6rem] font-bold text-slate-900 leading-tight">Connexion</h1>
                <p className="text-slate-500 text-sm mt-1.5">Accédez à votre espace de gestion</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="vous@compagnie.ci"
                    className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3 text-sm
                               focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400
                               transition-all duration-150 placeholder:text-slate-400"
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
                      className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3 pr-11 text-sm
                                 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400
                                 transition-all duration-150 placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-xs mt-1.5">{errors.password.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white
                             font-semibold rounded-xl py-3 transition-all duration-150
                             flex items-center justify-center gap-2
                             shadow-lg shadow-brand-500/25 hover:shadow-brand-500/35
                             disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <><span>Se connecter</span><ArrowRight size={15} /></>}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-slate-100 space-y-2.5 text-center">
                <p className="text-sm text-slate-500">
                  Passager ? Pas encore de compte ?{' '}
                  <a href="/register/passenger" className="text-brand-500 font-semibold hover:text-brand-600 transition-colors">S'inscrire</a>
                </p>
                <p className="text-xs text-slate-400">
                  Vous êtes une compagnie ?{' '}
                  <a href="/register" className="text-slate-600 font-medium hover:text-slate-900 transition-colors">Inscrire ma compagnie</a>
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center shrink-0">
                  <ShieldCheck size={20} className="text-brand-500" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-900">Vérification 2FA</h1>
                  <p className="text-xs text-slate-500">Entrez le code de votre application d'authentification</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Code à 6 chiffres
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  autoFocus
                  value={tfCode}
                  onChange={e => setTfCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  onKeyDown={e => e.key === 'Enter' && onVerify2fa()}
                  placeholder="123456"
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3 text-xl
                             text-center tracking-[0.5em] font-mono
                             focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400
                             transition-all duration-150 placeholder:text-slate-300 placeholder:tracking-normal placeholder:text-base"
                />
                <p className="text-xs text-slate-400 mt-2 text-center">
                  Vous pouvez aussi entrer un code de secours à 8 caractères
                </p>
              </div>

              <button
                onClick={onVerify2fa}
                disabled={loading || tfCode.length < 6}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl py-3
                           flex items-center justify-center gap-2 transition-all duration-150
                           shadow-lg shadow-brand-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <><span>Vérifier</span><ArrowRight size={15} /></>}
              </button>

              <button
                type="button"
                onClick={() => { setTwoFactor(null); setTfCode(''); }}
                className="w-full flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                <ArrowLeft size={14} /> Retour à la connexion
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
