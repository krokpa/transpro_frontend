'use client';

import { motion } from 'framer-motion';
import { KeyRound, FlaskConical, Webhook, CreditCard } from 'lucide-react';
import { useBranding } from '@/lib/branding';

const FEATURES = [
  { icon: FlaskConical, title: 'Sandbox immédiat', desc: 'Des clés de test dès l’inscription, sans validation.' },
  { icon: Webhook, title: 'Webhooks signés', desc: 'Événements en temps réel, signés HMAC.' },
  { icon: CreditCard, title: 'Paiements intégrés', desc: 'Réservations payées via Genius Pay.' },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' as const } },
};

export function AuthShell({ children }: { children: React.ReactNode }) {
  const { appName, logoUrl } = useBranding();

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* ── Panneau gauche brandé (caché en mobile) ── */}
      <div className="hidden lg:flex lg:w-[46%] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900" />
        {/* Formes animées */}
        <motion.div
          className="absolute -top-24 -left-16 w-96 h-96 rounded-full bg-white/10 blur-2xl"
          animate={{ y: [0, 24, 0], x: [0, 16, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-[-6rem] right-[-4rem] w-[28rem] h-[28rem] rounded-full bg-black/15 blur-3xl"
          animate={{ y: [0, -28, 0], x: [0, -18, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Grille subtile */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '40px 40px' }}
        />

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="relative z-10 flex flex-col justify-between p-12 text-white w-full"
        >
          <motion.div variants={item} className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={appName} className="w-10 h-10 rounded-xl object-contain bg-white p-1" />
            ) : (
              <div className="bg-white/15 backdrop-blur rounded-xl p-2.5"><KeyRound size={22} /></div>
            )}
            <span className="text-lg font-bold tracking-tight">{appName}</span>
          </motion.div>

          <div>
            <motion.h1 variants={item} className="text-4xl font-extrabold leading-tight tracking-tight">
              Construisez avec<br />l’API {appName}.
            </motion.h1>
            <motion.p variants={item} className="mt-4 text-white/70 text-[15px] max-w-sm">
              Intégrez la recherche de voyages, les réservations et le suivi de colis en quelques minutes.
            </motion.p>

            <motion.div variants={container} className="mt-10 space-y-4">
              {FEATURES.map((f) => (
                <motion.div key={f.title} variants={item} className="flex items-start gap-3">
                  <div className="bg-white/15 backdrop-blur rounded-lg p-2 shrink-0"><f.icon size={16} /></div>
                  <div>
                    <p className="text-sm font-semibold">{f.title}</p>
                    <p className="text-xs text-white/60">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          <motion.p variants={item} className="text-xs text-white/40">
            © {new Date().getFullYear()} {appName} — Espace développeur
          </motion.p>
        </motion.div>
      </div>

      {/* ── Formulaire (droite) ── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' as const }}
          className="w-full max-w-md"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}

// Champ de formulaire animé réutilisable.
export function AnimatedField({
  label, value, onChange, type = 'text', placeholder, autoFocus,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; autoFocus?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none transition-all duration-200 focus:bg-white focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
      />
    </div>
  );
}
