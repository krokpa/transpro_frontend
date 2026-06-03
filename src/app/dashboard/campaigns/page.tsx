'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignsApi } from '@/lib/api';
import { toast } from 'sonner';
import {
  Bell, Sun, PartyPopper, UserCheck,
  Clock, MessageSquare, ToggleLeft, ToggleRight, Loader2, Save,
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
    if (data) setForm({ ...DEFAULT, ...data });
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-8 px-4">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bell size={22} className="text-brand-500" />
            Campagnes de notifications
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Configurez les notifications marketing envoyées à vos passagers via l'application mobile.
            Chaque passager peut les désactiver individuellement.
          </p>
        </div>
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

      {/* ── Morning reminder ── */}
      <CampaignCard
        icon={<Sun size={18} />}
        title="Rappel matinal"
        description="Envoyé chaque matin à l'heure configurée."
        accentColor="amber"
        enabled={form.morningReminderEnabled}
        onToggle={(v) => set('morningReminderEnabled', v)}
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
        <NotifPreview title={form.morningReminderTitle} body={form.morningReminderBody} time={fmt(form.morningReminderHour, form.morningReminderMinute)} />
      </CampaignCard>

      {/* ── Weekend offer ── */}
      <CampaignCard
        icon={<PartyPopper size={18} />}
        title="Offre du week-end"
        description="Envoyé chaque vendredi à l'heure configurée."
        accentColor="purple"
        enabled={form.weekendOfferEnabled}
        onToggle={(v) => set('weekendOfferEnabled', v)}
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
        <NotifPreview title={form.weekendOfferTitle} body={form.weekendOfferBody} time={`Vendredi ${fmt(form.weekendOfferHour, form.weekendOfferMinute)}`} />
      </CampaignCard>

      {/* ── Re-engagement ── */}
      <CampaignCard
        icon={<UserCheck size={18} />}
        title="Ré-engagement"
        description="Déclenché automatiquement si un passager n'a pas utilisé l'appli depuis N jours."
        accentColor="sky"
        enabled={form.reEngagementEnabled}
        onToggle={(v) => set('reEngagementEnabled', v)}
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
        <NotifPreview title={form.reEngagementTitle} body={form.reEngagementBody} time={`Après ${form.reEngagementAfterDays} jours d'inactivité`} />
      </CampaignCard>

    </div>
  );
}

// ── Components ────────────────────────────────────────────────────────────────

const accentMap: Record<string, { bg: string; border: string; text: string; icon: string; track: string }> = {
  amber:  { bg: 'bg-amber-50 dark:bg-amber-900/10',   border: 'border-amber-200 dark:border-amber-800',   text: 'text-amber-700 dark:text-amber-400',  icon: 'text-amber-500',  track: 'bg-amber-500'  },
  purple: { bg: 'bg-purple-50 dark:bg-purple-900/10', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-400', icon: 'text-purple-500', track: 'bg-purple-500' },
  sky:    { bg: 'bg-sky-50 dark:bg-sky-900/10',       border: 'border-sky-200 dark:border-sky-800',       text: 'text-sky-700 dark:text-sky-400',       icon: 'text-sky-500',    track: 'bg-sky-500'    },
};

function CampaignCard({
  icon, title, description, accentColor, enabled, onToggle, children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accentColor: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children: React.ReactNode;
}) {
  const c = accentMap[accentColor];
  return (
    <div className={clsx('rounded-2xl border bg-white dark:bg-slate-900', enabled ? c.border : 'border-slate-200 dark:border-slate-800')}>
      <div className="flex items-start gap-4 p-5">
        <div className={clsx('mt-0.5 p-2.5 rounded-xl', enabled ? c.bg : 'bg-slate-100 dark:bg-slate-800')}>
          <span className={clsx(enabled ? c.icon : 'text-slate-400')}>{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 dark:text-white">{title}</p>
          <p className="text-sm text-slate-500 mt-0.5">{description}</p>
        </div>
        <button
          onClick={() => onToggle(!enabled)}
          className={clsx('shrink-0 transition-colors', enabled ? c.text : 'text-slate-400')}
          title={enabled ? 'Désactiver' : 'Activer'}
        >
          {enabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
        </button>
      </div>

      {enabled && (
        <div className="px-5 pb-5 space-y-4 border-t border-slate-100 dark:border-slate-800 pt-4">
          {children}
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
    <div className="flex items-center gap-3">
      <Clock size={15} className="text-slate-400 shrink-0" />
      <label className="text-sm text-slate-600 dark:text-slate-400 w-40 shrink-0">{label}</label>
      <div className="flex items-center gap-2">
        <select
          value={hour}
          onChange={(e) => onChangeHour(Number(e.target.value))}
          className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono"
        >
          {Array.from({ length: 24 }, (_, i) => (
            <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
          ))}
        </select>
        <span className="font-bold text-slate-400">:</span>
        <select
          value={minute}
          onChange={(e) => onChangeMinute(Number(e.target.value))}
          className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono"
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
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
          <MessageSquare size={13} className="text-slate-400" />
          {label}
        </label>
        <span className="text-xs text-slate-400">{value.length}/{maxLength}</span>
      </div>
      <Tag
        value={value}
        maxLength={maxLength}
        rows={multiline ? 2 : undefined}
        onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value)}
        className={clsx(
          'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700',
          'bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white',
          'focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400',
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
        <label className="text-sm text-slate-600 dark:text-slate-400">{label}</label>
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
      <div className="flex justify-between text-xs text-slate-400">
        <span>{min} {unit}</span>
        <span>{max} {unit}</span>
      </div>
    </div>
  );
}

function NotifPreview({ title, body, time }: { title: string; body: string; time: string }) {
  return (
    <div className="mt-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
        Aperçu notification
      </p>
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center shrink-0">
          <Bell size={14} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
              TransPro CI
            </p>
            <p className="text-[10px] text-slate-400 shrink-0">{time}</p>
          </div>
          <p className="text-xs font-medium text-slate-800 dark:text-slate-200 mt-0.5 truncate">
            {title || '—'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
            {body || '—'}
          </p>
        </div>
      </div>
    </div>
  );
}
