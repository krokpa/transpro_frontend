'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Palette, Loader2, Check, Upload, X, ImageIcon } from 'lucide-react';
import { platformApi, apiError } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { applyBrandColor } from '@/lib/branding';
import { toast } from 'sonner';

const PRESETS = ['#F97316', '#3B82F6', '#8B5CF6', '#10B981', '#F43F5E', '#0EA5E9', '#6366F1', '#EAB308'];
const DEFAULT_LOGO = '/transpro-logo-transparent.png';
const MAX_IMG_BYTES = 500_000; // 500 Ko

type Form = {
  appName: string; tagline: string;
  primaryColor: string; secondaryColor: string; tertiaryColor: string;
  passengerColor: string; agentColor: string; ownerColor: string; driverColor: string;
  logoUrl: string; faviconUrl: string; ogImageUrl: string;
};
const EMPTY: Form = {
  appName: '', tagline: '',
  primaryColor: '#F97316', secondaryColor: '#0EA5E9', tertiaryColor: '#6366F1',
  passengerColor: '#0EA5E9', agentColor: '#10B981', ownerColor: '#6366F1', driverColor: '#F97316',
  logoUrl: '', faviconUrl: '', ogImageUrl: '',
};
const formFromData = (d: any): Form => ({
  appName: d.appName ?? '', tagline: d.tagline ?? '',
  primaryColor: d.primaryColor ?? '#F97316', secondaryColor: d.secondaryColor ?? '#0EA5E9', tertiaryColor: d.tertiaryColor ?? '#6366F1',
  passengerColor: d.passengerColor ?? '#0EA5E9', agentColor: d.agentColor ?? '#10B981', ownerColor: d.ownerColor ?? '#6366F1', driverColor: d.driverColor ?? '#F97316',
  logoUrl: d.logoUrl ?? '', faviconUrl: d.faviconUrl ?? '', ogImageUrl: d.ogImageUrl ?? '',
});

export default function BrandingPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [form, setForm] = useState<Form>(EMPTY);

  if (user?.role !== 'SUPER_ADMIN') {
    router.replace('/dashboard');
    return null;
  }

  const { data } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: () => platformApi.getSettings() as any,
  });

  useEffect(() => {
    if (data) setForm(formFromData(data));
  }, [data]);

  // Aperçu live de la couleur.
  useEffect(() => { if (/^#[0-9a-fA-F]{6}$/.test(form.primaryColor)) applyBrandColor(form.primaryColor); }, [form.primaryColor]);

  const saveMut = useMutation({
    mutationFn: () => {
      const clean = (s: string) => (s.trim() ? s.trim() : null);
      return platformApi.updateSettings({
        appName: form.appName.trim() || undefined,
        tagline: form.tagline.trim() || undefined,
        primaryColor: form.primaryColor,
        secondaryColor: form.secondaryColor,
        tertiaryColor: form.tertiaryColor,
        passengerColor: form.passengerColor,
        agentColor: form.agentColor,
        ownerColor: form.ownerColor,
        driverColor: form.driverColor,
        logoUrl: clean(form.logoUrl),
        faviconUrl: clean(form.faviconUrl),
        ogImageUrl: clean(form.ogImageUrl),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-settings'] });
      try { localStorage.setItem('transpro-brand-color', form.primaryColor); } catch {}
      toast.success('Marque mise à jour');
    },
    onError: (e) => toast.error(apiError(e, 'Enregistrement impossible')),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-2">
        <Palette size={22} className="text-brand-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marque & apparence</h1>
          <p className="text-sm text-gray-500 mt-0.5">Nom, slogan, couleur, logo, favicon et image de partage de toute l'application.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
        <Field label="Nom de l'application" value={form.appName} onChange={(v) => setForm({ ...form, appName: v })} placeholder="TransPro CI" />
        <Field label="Slogan" value={form.tagline} onChange={(v) => setForm({ ...form, tagline: v })} placeholder="Voyagez en toute sérénité" />

        <ColorField label="Couleur principale" value={form.primaryColor}
          onChange={(v) => setForm({ ...form, primaryColor: v })}
          hint="Aperçu appliqué en direct à l'interface. Sert aussi de couleur de thème PWA." />
        <ColorField label="Couleur secondaire" value={form.secondaryColor}
          onChange={(v) => setForm({ ...form, secondaryColor: v })} />
        <ColorField label="Couleur tertiaire" value={form.tertiaryColor}
          onChange={(v) => setForm({ ...form, tertiaryColor: v })} />

        <div className="pt-2 border-t border-gray-100">
          <p className="text-sm font-semibold text-gray-800 mb-3">Couleurs par espace (mobile)</p>
          <div className="space-y-4">
            <ColorField label="Espace passager" value={form.passengerColor}
              onChange={(v) => setForm({ ...form, passengerColor: v })} />
            <ColorField label="Espace agent (guichet)" value={form.agentColor}
              onChange={(v) => setForm({ ...form, agentColor: v })} />
            <ColorField label="Espace propriétaire" value={form.ownerColor}
              onChange={(v) => setForm({ ...form, ownerColor: v })} />
            <ColorField label="Espace chauffeur" value={form.driverColor}
              onChange={(v) => setForm({ ...form, driverColor: v })} />
          </div>
        </div>

        <ImageField
          label="Logo"
          hint="Affiché dans l'app (login, en-têtes…). Sans logo, le logo par défaut est utilisé."
          value={form.logoUrl}
          fallback={DEFAULT_LOGO}
          onChange={(v) => setForm({ ...form, logoUrl: v })}
        />
        <ImageField
          label="Favicon"
          hint="Icône carrée (onglet du navigateur, écran d'accueil PWA). Idéalement 256×256. Sans favicon, le logo puis l'icône par défaut sont utilisés."
          value={form.faviconUrl}
          onChange={(v) => setForm({ ...form, faviconUrl: v })}
        />
        <ImageField
          label="Image de partage (Open Graph)"
          hint="Aperçu lors d'un partage sur les réseaux sociaux. Format conseillé 1200×630."
          value={form.ogImageUrl}
          wide
          onChange={(v) => setForm({ ...form, ogImageUrl: v })}
        />

        <div className="flex items-center gap-3 pt-2">
          <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}
            className="px-5 py-2.5 text-sm font-semibold bg-brand-500 hover:bg-brand-600 text-white rounded-xl transition disabled:opacity-50 inline-flex items-center gap-2">
            {saveMut.isPending && <Loader2 size={15} className="animate-spin" />} Enregistrer
          </button>
          {data && (
            <button onClick={() => {
              applyBrandColor(data.primaryColor);
              setForm(formFromData(data));
            }}
              className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition">
              Réinitialiser
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500 transition" />
    </div>
  );
}

// Sélecteur de couleur réutilisable : pastille native + hex + presets.
function ColorField({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-3 flex-wrap">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer" />
        <input value={value} onChange={(e) => onChange(e.target.value)}
          className="w-32 px-3 py-2 text-sm font-mono border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-200" />
        <div className="flex items-center gap-1.5">
          {PRESETS.map((c) => (
            <button key={c} type="button" onClick={() => onChange(c)}
              className="w-6 h-6 rounded-full border-2 border-white shadow ring-1 ring-gray-200 transition hover:scale-110"
              style={{ background: c }} title={c}>
              {value.toLowerCase() === c.toLowerCase() && <Check size={13} className="text-white mx-auto" />}
            </button>
          ))}
        </div>
      </div>
      {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}

// Champ image réutilisable : aperçu + URL + upload (data-URI) + retirer.
function ImageField({ label, hint, value, onChange, fallback, wide }: {
  label: string; hint: string; value: string; onChange: (v: string) => void; fallback?: string; wide?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const preview = value.trim() || fallback || '';
  const isCustom = !!value.trim();

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Fichier invalide — image uniquement'); return; }
    if (file.size > MAX_IMG_BYTES) { toast.error('Image trop volumineuse (max 500 Ko)'); return; }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-2.5">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-start gap-4">
        <div className={`${wide ? 'w-32 h-20' : 'w-20 h-20'} rounded-2xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0`}>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={`Aperçu ${label}`} className="w-full h-full object-contain p-1.5"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }} />
          ) : (
            <ImageIcon size={22} className="text-gray-300" />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://… (URL de l'image)"
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500 transition"
          />
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition">
              <Upload size={14} /> Téléverser un fichier
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
            {isCustom && (
              <button type="button" onClick={() => onChange('')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition">
                <X size={14} /> Retirer
              </button>
            )}
          </div>
          <p className="text-[11px] text-gray-400">{hint}</p>
        </div>
      </div>
    </div>
  );
}
