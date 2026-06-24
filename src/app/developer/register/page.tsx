'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, ArrowRight } from 'lucide-react';
import { developerApi, apiError } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { AuthShell, AnimatedField } from '@/components/developer/AuthShell';
import { toast } from 'sonner';

export default function DeveloperRegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ name: '', email: '', password: '', companyName: '' });
  const [accept, setAccept] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || form.password.length < 8) {
      toast.error('Renseignez nom, email et un mot de passe de 8 caractères min.');
      return;
    }
    if (!accept) {
      toast.error('Vous devez accepter les conditions d’utilisation.');
      return;
    }
    setLoading(true);
    try {
      const res: any = await developerApi.register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        companyName: form.companyName.trim() || undefined,
        acceptTerms: accept,
      });
      setAuth(res.user, res.accessToken, res.refreshToken);
      toast.success('Compte créé — vérifiez votre email pour débloquer la production.');
      router.push('/developer/console');
    } catch (err) {
      toast.error(apiError(err, 'Inscription impossible'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Créer un compte développeur</h1>
      <p className="text-sm text-gray-500 mt-1.5 mb-6">
        Accès immédiat au sandbox. Passez en production après vérification de votre email.
      </p>

      <form onSubmit={submit} className="space-y-4">
        <AnimatedField label="Nom" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Awa Koné" autoFocus />
        <AnimatedField label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="dev@exemple.com" />
        <AnimatedField label="Mot de passe" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} placeholder="8 caractères min." />
        <AnimatedField label="Société (optionnel)" value={form.companyName} onChange={(v) => setForm({ ...form, companyName: v })} placeholder={`Ma Startup`} />

        <label className="flex items-start gap-2.5 text-xs text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={accept}
            onChange={(e) => setAccept(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-400 shrink-0"
          />
          <span>
            J'accepte les{' '}
            <Link href="/legal/api-terms" target="_blank" className="text-brand-600 font-medium hover:text-brand-700 underline">conditions d'utilisation de l'API</Link>{' '}
            et la{' '}
            <Link href="/legal/privacy" target="_blank" className="text-brand-600 font-medium hover:text-brand-700 underline">politique de confidentialité</Link>.
          </span>
        </label>

        <motion.button
          type="submit"
          disabled={loading || !accept}
          whileHover={{ scale: loading ? 1 : 1.015 }}
          whileTap={{ scale: 0.985 }}
          className="w-full px-4 py-3 text-sm font-semibold bg-brand-500 hover:bg-brand-600 text-white rounded-xl shadow-lg shadow-brand-500/25 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <>Créer mon compte <ArrowRight size={16} /></>}
        </motion.button>
      </form>

      <p className="text-sm text-gray-500 text-center mt-6">
        Déjà un compte ? <Link href="/developer/login" className="text-brand-600 font-semibold hover:text-brand-700">Se connecter</Link>
      </p>
    </AuthShell>
  );
}
