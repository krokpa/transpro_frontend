'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KeyRound, Loader2 } from 'lucide-react';
import { developerApi, apiError } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';

export default function DeveloperRegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ name: '', email: '', password: '', companyName: '' });
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || form.password.length < 8) {
      toast.error('Renseignez nom, email et un mot de passe de 8 caractères min.');
      return;
    }
    setLoading(true);
    try {
      const res: any = await developerApi.register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        companyName: form.companyName.trim() || undefined,
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 justify-center mb-6">
          <div className="bg-brand-500 text-white rounded-xl p-2 shadow-sm"><KeyRound size={20} /></div>
          <span className="text-lg font-bold text-gray-900">TransPro — Espace Développeur</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-7 shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">Créer un compte développeur</h1>
          <p className="text-sm text-gray-500 mt-1 mb-5">
            Accès immédiat au sandbox (clés de test). Passez en production après validation.
          </p>

          <form onSubmit={submit} className="space-y-4">
            <Field label="Nom" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Awa Koné" />
            <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="dev@exemple.com" />
            <Field label="Mot de passe" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} placeholder="8 caractères min." />
            <Field label="Société (optionnel)" value={form.companyName} onChange={(v) => setForm({ ...form, companyName: v })} placeholder="Ma Startup SARL" />

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2.5 text-sm font-semibold bg-brand-500 hover:bg-brand-600 text-white rounded-xl transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={15} className="animate-spin" />} Créer mon compte
            </button>
          </form>

          <p className="text-sm text-gray-500 text-center mt-5">
            Déjà un compte ? <Link href="/developer/login" className="text-brand-600 font-semibold hover:text-brand-700">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500 transition"
      />
    </div>
  );
}
