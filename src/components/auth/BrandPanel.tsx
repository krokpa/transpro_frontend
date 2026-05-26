import { Bus, MapPin, Users, BarChart3, ShieldCheck } from 'lucide-react';

const features = [
  { icon: MapPin,       text: 'Suivi GPS des véhicules en temps réel' },
  { icon: Users,        text: 'Réservations & billets QR code' },
  { icon: BarChart3,    text: 'Rapports financiers et statistiques' },
  { icon: ShieldCheck,  text: 'Multi-gares, multi-compagnies' },
];

const stats = [
  { value: '12 k+', label: 'Voyages / mois' },
  { value: '98 %',  label: 'Satisfaction' },
  { value: '50 +',  label: 'Compagnies' },
];

export function BrandPanel() {
  return (
    <div className="hidden lg:flex lg:w-[52%] relative flex-col bg-canvas text-white p-12 overflow-hidden select-none">
      {/* dot-grid texture */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      {/* glow blobs */}
      <div className="absolute -top-48 -right-48 w-[420px] h-[420px] bg-brand-500 rounded-full opacity-[0.12] blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -left-24 w-72 h-72 bg-brand-600 rounded-full opacity-[0.07] blur-3xl pointer-events-none" />

      {/* Logo */}
      <div className="relative flex items-center gap-3 mb-14">
        <div className="bg-brand-500 p-2.5 rounded-xl shadow-lg shadow-brand-500/30">
          <Bus size={22} className="text-white" />
        </div>
        <span className="text-xl font-bold tracking-tight">TransPro CI</span>
      </div>

      {/* Headline */}
      <div className="relative flex-1">
        <h2 className="text-[2.4rem] font-extrabold leading-[1.2] mb-5 tracking-tight">
          Gérez votre réseau<br />
          de transport<br />
          <span className="text-brand-400">sans effort.</span>
        </h2>
        <p className="text-slate-400 text-base mb-10 leading-relaxed max-w-sm">
          La plateforme tout-en-un pour les compagnies de transport en Côte d'Ivoire.
        </p>

        {/* Feature list */}
        <ul className="space-y-3.5">
          {features.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon size={15} className="text-brand-400" />
              </div>
              <span className="text-sm text-slate-300">{text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Stats strip */}
      <div className="relative mt-12 pt-8 border-t border-white/10 flex items-center gap-0">
        {stats.map(({ value, label }, i) => (
          <div key={label} className="flex items-center gap-0">
            {i > 0 && <div className="w-px h-9 bg-white/10 mx-7" />}
            <div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
