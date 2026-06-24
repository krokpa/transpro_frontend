'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KeyRound, Loader2 } from 'lucide-react';
import { authApi, apiError } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';

export default function DeveloperLoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res: any = await authApi.login(email.trim(), password);
      if (res?.requires2fa) {
        toast.error('Ce compte requiert une double authentification — utilisez la connexion standard.');
        return;
      }
      setAuth(res.user, res.accessToken, res.refreshToken);
      if (res.user?.role === 'DEVELOPER') {
        router.push('/developer/console');
      } else {
        toast.success('Connecté');
        router.push('/');
      }
    } catch (err) {
      toast.error(apiError(err, 'Identifiants invalides'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 justify-center mb-6">
          <div className="bg-brand-500 text-white rounded-xl p-2 shadow-sm"><KeyRound size={20} /></div>
          <span className="text-lg font-bold text-gray-900">TransPro — Espace Développeur</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-7 shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">Connexion développeur</h1>
          <p className="text-sm text-gray-500 mt-1 mb-5">Accédez à vos clés, webhooks et statistiques.</p>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="dev@exemple.com"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500 transition" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Mot de passe</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500 transition" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full px-4 py-2.5 text-sm font-semibold bg-brand-500 hover:bg-brand-600 text-white rounded-xl transition disabled:opacity-50 inline-flex items-center justify-center gap-2">
              {loading && <Loader2 size={15} className="animate-spin" />} Se connecter
            </button>
          </form>

          <p className="text-sm text-gray-500 text-center mt-5">
            Pas encore de compte ? <Link href="/developer/register" className="text-brand-600 font-semibold hover:text-brand-700">S'inscrire</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
