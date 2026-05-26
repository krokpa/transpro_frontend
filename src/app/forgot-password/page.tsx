'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bus, ArrowLeft, Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { authApi } from '@/lib/api';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch {
      toast.error('Une erreur est survenue, réessayez.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-brand-500 text-white rounded-xl p-3 mb-3">
            <Bus size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">TransPro CI</h1>
          <p className="text-gray-500 text-sm mt-1">Réinitialisation du mot de passe</p>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} className="text-green-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Email envoyé !</h2>
            <p className="text-sm text-gray-500">
              Si <strong>{email}</strong> est associé à un compte, vous recevrez un lien de réinitialisation dans quelques minutes.
            </p>
            <p className="text-xs text-gray-400">Vérifiez aussi vos spams.</p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-brand-600 font-medium hover:underline mt-2"
            >
              <ArrowLeft size={14} /> Retour à la connexion
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-6">
              Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse email
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@compagnie.ci"
                    required
                    className="w-full border border-gray-300 rounded-lg pl-9 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-lg py-3 transition flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading && <Loader2 size={18} className="animate-spin" />}
                Envoyer le lien
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
              >
                <ArrowLeft size={14} /> Retour à la connexion
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
