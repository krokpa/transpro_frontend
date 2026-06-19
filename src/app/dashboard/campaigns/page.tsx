'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignsApi } from '@/lib/api';
import { toast } from 'sonner';
import {
  Bell, Sun, PartyPopper, UserCheck,
  Clock, MessageSquare, ToggleLeft, ToggleRight, Loader2, Save, Megaphone,
} from 'lucide-react';
import clsx from 'clsx';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CampaignConfig {
  [key: string]: unknown;
  morningReminderEnabled: boolean;
  morningReminderHour: number;
  morningReminderMinute: number;
  morningReminderTitle: string;
  morningReminderBody: string;
  weekendOfferEnabled: boolean;
  weekendOfferHour: number;
  weekendOfferMinute: number;
  weekendOfferTitle: string;
  weekendOfferBody: string;
  reEngagementEnabled: boolean;
  reEngagementAfterDays: number;
  reEngagementTitle: string;
  reEngagementBody: string;
}

const DEFAULT: CampaignConfig = {
  morningReminderEnabled: false,
  morningReminderHour: 7,
  morningReminderMinute: 30,
  morningReminderTitle: 'Bonjour !',
  morningReminderBody: 'Planifiez votre prochain voyage avec TransPro.',
  weekendOfferEnabled: false,
  weekendOfferHour: 18,
  weekendOfferMinute: 0,
  weekendOfferTitle: 'Bon week-end !',
  weekendOfferBody: 'Voyagez en famille ce week-end. Réservez vos places maintenant.',
  reEngagementEnabled: false,
  reEngagementAfterDays: 7,
  reEngagementTitle: 'On vous attend !',
  reEngagementBody: 'Ça fait un moment ! Où voyagez-vous cette semaine ?',
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<CampaignConfig>(DEFAULT);

  const { data, isLoading } = useQuery({
    queryKey: ['campaign-config'],
    queryFn: () => campaignsApi.getConfig(),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (data) setForm({ ...DEFAULT, ...(data as any)?.data ?? data });
  }, [data]);

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () => campaignsApi.updateConfig(form),
    onSuccess: () => {
      toast.success('Campagnes enregistrées');
      qc.invalidateQueries({ queryKey: ['campaign-config'] });
    },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  });

  const set = <K extends keyof CampaignConfig>(key: K, value: CampaignConfig[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const fmt = (h: number, m: number) =>
    `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

  const enabledCount = [form.morningReminderEnabled, form.weekendOfferEnabled, form.reEngagementEnabled].filter(Boolean).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-50 rounded-xl">
            <Megaphone size={20} className="text-brand-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Campagnes de notifications</h1>
            <p className="text-sm text-gray-500">
              Notifications marketing push envoyées aux passagers via l'application mobile.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {enabledCount > 0 && (
            <span className="text-xs font-medium bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
              {enabledCount} campagne{enabledCount > 1 ? 's' : ''} active{enabledCount > 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={() => save()}
            disabled={saving}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
              'bg-brand-500 hover:bg-brand-600 text-white shadow-sm',
              saving && 'opacity-60 cursor-not-allowed',
            )}
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Enregistrer
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-center gap-2.5 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <Bell size={14} className="text-blue-500 shrink-0" />
        <p className="text-sm text-blue-700">
          Chaque passager peut désactiver individuellement ces notifications depuis l'application mobile.
          Les campagnes désactivées ici ne seront jamais envoyées.
        </p>
      </div>

      {/* Campaign cards */}
      <div className="space-y-4">

        {/* Morning reminder */}
        <CampaignCard
          icon={<Sun size={18} />}
          title="Rappel matinal"
          description="Envoyé chaque matin à l'heure configurée à tous vos passagers actifs."
          accentColor="amber"
          enabled={form.morningReminderEnabled}
          onToggle={(v) => set('morningReminderEnabled', v)}
          preview={
            <NotifPreview
              title={form.morningReminderTitle}
              body={form.morningReminderBody}
              time={fmt(form.morningReminderHour, form.morningReminderMinute)}
            />
          }
        >
          <TimeField
            label="Heure d'envoi"
            hour={form.morningReminderHour}
            minute={form.morningReminderMinute}
            onChangeHour={(v) => set('morningReminderHour', v)}
            onChangeMinute={(v) => set('morningReminderMinute', v)}
          />
          <TextField
            label="Titre"
            value={form.morningReminderTitle}
            maxLength={80}
            onChange={(v) => set('morningReminderTitle', v)}
          />
          <TextField
            label="Message"
            value={form.morningReminderBody}
            maxLength={200}
            multiline
            onChange={(v) => set('morningReminderBody', v)}
          />
        </CampaignCard>

        {/* Weekend offer */}
        <CampaignCard
          icon={<PartyPopper size={18} />}
          title="Offre du week-end"
          description="Envoyé chaque vendredi à l'heure configurée pour promouvoir les voyages en famille."
          accentColor="purple"
          enabled={form.weekendOfferEnabled}
          onToggle={(v) => set('weekendOfferEnabled', v)}
          preview={
            <NotifPreview
              title={form.weekendOfferTitle}
              body={form.weekendOfferBody}
              time={`Vendredi ${fmt(form.weekendOfferHour, form.weekendOfferMinute)}`}
            />
          }
        >
          <TimeField
            label="Heure (vendredi)"
            hour={form.weekendOfferHour}
            minute={form.weekendOfferMinute}
            onChangeHour={(v) => set('weekendOfferHour', v)}
            onChangeMinute={(v) => set('weekendOfferMinute', v)}
          />
          <TextField
            label="Titre"
            value={form.weekendOfferTitle}
            maxLength={80}
            onChange={(v) => set('weekendOfferTitle', v)}
          />
          <TextField
            label="Message"
            value={form.weekendOfferBody}
            maxLength={200}
            multiline
            onChange={(v) => set('weekendOfferBody', v)}
          />
        </CampaignCard>

        {/* Re-engagement */}
        <CampaignCard
          icon={<UserCheck size={18} />}
          title="Ré-engagement"
          description="Déclenché automatiquement si un passager n'a pas utilisé l'appli depuis N jours."
          accentColor="sky"
          enabled={form.reEngagementEnabled}
          onToggle={(v) => set('reEngagementEnabled', v)}
          preview={
            <NotifPreview
              title={form.reEngagementTitle}
              body={form.reEngagementBody}
              time={`Après ${form.reEngagementAfterDays} jours d'inactivité`}
            />
          }
        >
          <SliderField
            label="Délai d'inactivité"
            value={form.reEngagementAfterDays}
            min={3}
            max={30}
            unit="jours"
            onChange={(v) => set('reEngagementAfterDays', v)}
          />
          <TextField
            label="Titre"
            value={form.reEngagementTitle}
            maxLength={80}
            onChange={(v) => set('reEngagementTitle', v)}
          />
          <TextField
            label="Message"
            value={form.reEngagementBody}
            maxLength={200}
            multiline
            onChange={(v) => set('reEngagementBody', v)}
          />
        </CampaignCard>

      </div>
    </div>
  );
}

// ── Components ────────────────────────────────────────────────────────────────

const accentMap: Record<string, { bg: string; border: string; text: string; icon: string; activeBorder: string }> = {
  amber:  { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  icon: 'text-amber-500',  activeBorder: 'border-amber-300'  },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: 'text-purple-500', activeBorder: 'border-purple-300' },
  sky:    { bg: 'bg-sky-50',    border: 'border-sky-200',    text: 'text-sky-700',    icon: 'text-sky-500',    activeBorder: 'border-sky-300'    },
};

function CampaignCard({
  icon, title, description, accentColor, enabled, onToggle, children, preview,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accentColor: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children: React.ReactNode;
  preview?: React.ReactNode;
}) {
  const c = accentMap[accentColor];
  return (
    <div className={clsx(
      'rounded-xl border bg-white shadow-sm overflow-hidden transition-all',
      enabled ? c.activeBorder : 'border-gray-100',
    )}>
      {/* Card header */}
      <div className="flex items-start gap-4 px-6 py-5">
        <div className={clsx('mt-0.5 p-2.5 rounded-xl shrink-0', enabled ? c.bg : 'bg-gray-100')}>
          <span className={clsx(enabled ? c.icon : 'text-gray-400')}>{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900">{title}</p>
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        </div>
        <button
          onClick={() => onToggle(!enabled)}
          className={clsx('shrink-0 transition-colors mt-0.5', enabled ? c.text : 'text-gray-300 hover:text-gray-400')}
          title={enabled ? 'Désactiver' : 'Activer'}
        >
          {enabled ? <ToggleRight size={34} /> : <ToggleLeft size={34} />}
        </button>
      </div>

      {/* Expanded body — 2-col: form | preview */}
      {enabled && (
        <div className="border-t border-gray-100">
          <div className="grid grid-cols-2 gap-0 divide-x divide-gray-100">
            {/* Left: form fields */}
            <div className="px-6 py-5 space-y-4">
              {children}
            </div>
            {/* Right: preview */}
            <div className="px-6 py-5 bg-gray-50/50 flex flex-col justify-center">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">
                Aperçu en temps réel
              </p>
              {preview}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TimeField({
  label, hour, minute, onChangeHour, onChangeMinute,
}: {
  label: string;
  hour: number;
  minute: number;
  onChangeHour: (v: number) => void;
  onChangeMinute: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
        <Clock size={13} className="text-gray-400" />
        {label}
      </label>
      <div className="flex items-center gap-2">
        <select
          value={hour}
          onChange={(e) => onChangeHour(Number(e.target.value))}
          className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {Array.from({ length: 24 }, (_, i) => (
            <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
          ))}
        </select>
        <span className="font-bold text-gray-400">:</span>
        <select
          value={minute}
          onChange={(e) => onChangeMinute(Number(e.target.value))}
          className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {[0, 15, 30, 45].map((m) => (
            <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function TextField({
  label, value, maxLength, multiline, onChange,
}: {
  label: string;
  value: string;
  maxLength: number;
  multiline?: boolean;
  onChange: (v: string) => void;
}) {
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
          <MessageSquare size={13} className="text-gray-400" />
          {label}
        </label>
        <span className="text-xs text-gray-400">{value.length}/{maxLength}</span>
      </div>
      <Tag
        value={value}
        maxLength={maxLength}
        rows={multiline ? 3 : undefined}
        onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value)}
        className={clsx(
          'w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900',
          'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
          multiline && 'resize-none',
        )}
      />
    </div>
  );
}

function SliderField({
  label, value, min, max, unit, onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-sm font-semibold text-brand-500">{value} {unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brand-500"
      />
      <div className="flex justify-between text-xs text-gray-400">
        <span>{min} {unit}</span>
        <span>{max} {unit}</span>
      </div>
    </div>
  );
}

function NotifPreview({ title, body, time }: { title: string; body: string; time: string }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-200 shadow-md p-4 max-w-sm">
      {/* iOS-style notification */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center shrink-0 shadow-sm">
          <Bell size={16} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-xs font-semibold text-gray-900 truncate">TransPro CI</p>
            <p className="text-[10px] text-gray-400 shrink-0">{time}</p>
          </div>
          <p className="text-sm font-medium text-gray-800 mt-0.5 leading-snug">
            {title || <span className="text-gray-300 italic">Titre…</span>}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
            {body || <span className="text-gray-300 italic">Message…</span>}
          </p>
        </div>
      </div>
    </div>
  );
}
