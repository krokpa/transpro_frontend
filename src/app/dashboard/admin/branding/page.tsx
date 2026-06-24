'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Palette, Loader2, Check } from 'lucide-react';
import { platformApi, apiError } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { applyBrandColor } from '@/lib/branding';
import { toast } from 'sonner';

const PRESETS = ['#F97316', '#3B82F6', '#8B5CF6', '#10B981', '#F43F5E', '#0EA5E9', '#6366F1', '#EAB308'];

export default function BrandingPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [form, setForm] = useState({ appName: '', tagline: '', primaryColor: '#F97316', logoUrl: '' });

  if (user?.role !== 'SUPER_ADMIN') {
    router.replace('/dashboard');
    return null;
  }

  const { data } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: () => platformApi.getSettings() as any,
  });

  useEffect(() => {
    if (data) setForm({ appName: data.appName ?? '', tagline: data.tagline ?? '', primaryColor: data.primaryColor ?? '#F97316', logoUrl: data.logoUrl ?? '' });
  }, [data]);

  // Aperçu live de la couleur.
  useEffect(() => { if (/^#[0-9a-fA-F]{6}$/.test(form.primaryColor)) applyBrandColor(form.primaryColor); }, [form.primaryColor]);

  const saveMut = useMutation({
    mutationFn: () => platformApi.updateSettings({
      appName: form.appName.trim() || undefined,
      tagline: form.tagline.trim() || undefined,
      primaryColor: form.primaryColor,
      logoUrl: form.logoUrl.trim() || undefined,
    }),
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
          <p className="text-sm text-gray-500 mt-0.5">Nom, slogan, couleur et logo affichés dans toute l'application.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
        <Field label="Nom de l'application" value={form.appName} onChange={(v) => setForm({ ...form, appName: v })} placeholder="TransPro CI" />
        <Field label="Slogan" value={form.tagline} onChange={(v) => setForm({ ...form, tagline: v })} placeholder="Voyagez en toute sérénité" />

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Couleur principale</label>
          <div className="flex items-center gap-3">
            <input type="color" value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
              className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer" />
            <input value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
              className="w-32 px-3 py-2 text-sm font-mono border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-200" />
            <div className="flex items-center gap-1.5">
              {PRESETS.map((c) => (
                <button key={c} type="button" onClick={() => setForm({ ...form, primaryColor: c })}
                  className="w-6 h-6 rounded-full border-2 border-white shadow ring-1 ring-gray-200 transition hover:scale-110"
                  style={{ background: c }} title={c}>
                  {form.primaryColor.toLowerCase() === c.toLowerCase() && <Check size={13} className="text-white mx-auto" />}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-gray-400">Aperçu appliqué en direct à l'interface.</p>
        </div>

        <Field label="URL du logo (optionnel)" value={form.logoUrl} onChange={(v) => setForm({ ...form, logoUrl: v })} placeholder="https://… ou data:image/…" />

        <div className="flex items-center gap-3 pt-2">
          <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}
            className="px-5 py-2.5 text-sm font-semibold bg-brand-500 hover:bg-brand-600 text-white rounded-xl transition disabled:opacity-50 inline-flex items-center gap-2">
            {saveMut.isPending && <Loader2 size={15} className="animate-spin" />} Enregistrer
          </button>
          {data && (
            <button onClick={() => { applyBrandColor(data.primaryColor); setForm({ appName: data.appName, tagline: data.tagline, primaryColor: data.primaryColor, logoUrl: data.logoUrl ?? '' }); }}
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
