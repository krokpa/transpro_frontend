'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, ArrowRight } from 'lucide-react';
import { authApi, apiError } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { AuthShell, AnimatedField } from '@/components/developer/AuthShell';
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
    <AuthShell>
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Connexion développeur</h1>
      <p className="text-sm text-gray-500 mt-1.5 mb-6">Accédez à vos clés, webhooks et statistiques.</p>

      <form onSubmit={submit} className="space-y-4">
        <AnimatedField label="Email" type="email" value={email} onChange={setEmail} placeholder="dev@exemple.com" autoFocus />
        <AnimatedField label="Mot de passe" type="password" value={password} onChange={setPassword} placeholder="••••••••" />

        <motion.button
          type="submit"
          disabled={loading}
          whileHover={{ scale: loading ? 1 : 1.015 }}
          whileTap={{ scale: 0.985 }}
          className="w-full px-4 py-3 text-sm font-semibold bg-brand-500 hover:bg-brand-600 text-white rounded-xl shadow-lg shadow-brand-500/25 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <>Se connecter <ArrowRight size={16} /></>}
        </motion.button>
      </form>

      <p className="text-sm text-gray-500 text-center mt-6">
        Pas encore de compte ? <Link href="/developer/register" className="text-brand-600 font-semibold hover:text-brand-700">S'inscrire</Link>
      </p>
    </AuthShell>
  );
}
