'use client';

import { useState, useEffect } from 'react';
import { SlidersHorizontal, X, Check } from 'lucide-react';
import { useThemeStore, type Accent, type SidebarStyle } from '@/store/theme.store';
import { useAuthStore } from '@/store/auth.store';
import { usersApi } from '@/lib/api';
import clsx from 'clsx';

const ACCENTS: { key: Accent; label: string; color: string }[] = [
  { key: 'orange', label: 'Orange', color: '#f97316' },
  { key: 'blue',   label: 'Bleu',   color: '#3b82f6' },
  { key: 'purple', label: 'Violet', color: '#8b5cf6' },
  { key: 'green',  label: 'Vert',   color: '#10b981' },
  { key: 'rose',   label: 'Rose',   color: '#f43f5e' },
  { key: 'teal',   label: 'Cyan',   color: '#0ea5e9' },
];

const SIDEBARS: { key: SidebarStyle; label: string; color: string }[] = [
  { key: 'navy',     label: 'Marine',  color: '#0c1425' },
  { key: 'slate',    label: 'Ardoise', color: '#0f172a' },
  { key: 'charcoal', label: 'Charbon', color: '#18181b' },
];

async function persistTheme(patch: { themeAccent?: string; themeSidebar?: string }, setUser: (u: any) => void, user: any) {
  if (!user) return;
  try {
    await usersApi.updateProfile(patch);
    setUser({ ...user, ...patch });
  } catch {}
}

export function ThemePanel() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { accent, sidebar, setAccent, setSidebar, reset } = useThemeStore();
  const { user, setUser } = useAuthStore();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  if (!mounted) return null;

  function handleAccent(a: Accent) {
    setAccent(a);
    persistTheme({ themeAccent: a }, setUser, user);
  }

  function handleSidebar(s: SidebarStyle) {
    setSidebar(s);
    persistTheme({ themeSidebar: s }, setUser, user);
  }

  function handleReset() {
    reset();
    persistTheme({ themeAccent: 'orange', themeSidebar: 'navy' }, setUser, user);
  }

  return (
    <>
      {/* ── Onglet flottant ── */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Personnalisation du thème"
        className="fixed right-0 top-1/2 -translate-y-1/2 z-[60] bg-brand-500 hover:bg-brand-600 text-white py-3 px-[7px] rounded-l-xl shadow-lg transition-colors duration-150"
      >
        <SlidersHorizontal size={14} />
      </button>

      {/* ── Fond ── */}
      {open && (
        <div
          className="fixed inset-0 z-[65] bg-black/25"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Panneau ── */}
      <div
        className={clsx(
          'fixed right-0 top-0 h-full w-[272px] bg-white z-[70] border-l border-gray-100/80 flex flex-col',
          'shadow-[-4px_0_24px_rgba(0,0,0,0.10)] transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between px-5 py-[15px] border-b border-gray-100">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={14} className="text-brand-500" />
            <p className="font-semibold text-gray-900 text-[13px]">Personnalisation</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Corps */}
        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-8">

          {/* Couleur d'accent */}
          <section>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-4">
              Couleur d'accent
            </p>
            <div className="grid grid-cols-6 gap-2 mb-2">
              {ACCENTS.map((a) => (
                <button
                  key={a.key}
                  onClick={() => handleAccent(a.key)}
                  title={a.label}
                  className="flex items-center justify-center"
                >
                  <span
                    className={clsx(
                      'w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150',
                      accent === a.key ? 'scale-110' : 'hover:scale-105',
                    )}
                    style={{
                      backgroundColor: a.color,
                      boxShadow: accent === a.key
                        ? `0 0 0 2px white, 0 0 0 4px ${a.color}`
                        : undefined,
                    }}
                  >
                    {accent === a.key && <Check size={13} className="text-white" strokeWidth={2.5} />}
                  </span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-6 gap-2">
              {ACCENTS.map((a) => (
                <p key={a.key} className="text-center text-[9px] text-gray-400 leading-tight">{a.label}</p>
              ))}
            </div>
          </section>

          {/* Style de barre latérale */}
          <section>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-4">
              Barre latérale
            </p>
            <div className="grid grid-cols-3 gap-2.5 mb-2">
              {SIDEBARS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => handleSidebar(s.key)}
                  title={s.label}
                  className={clsx(
                    'rounded-xl overflow-hidden border-2 h-[80px] transition-all duration-150',
                    sidebar === s.key
                      ? 'border-brand-500 shadow-sm'
                      : 'border-gray-100 hover:border-gray-200',
                  )}
                  style={{ backgroundColor: s.color }}
                >
                  <div className="p-2.5 flex flex-col gap-[5px] h-full">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-sm bg-white/20" />
                      <div className="flex-1 h-[3px] rounded-full bg-white/15" />
                    </div>
                    <div className="w-full h-[3px] rounded-full bg-white/10" />
                    <div className="w-3/4 h-[3px] rounded-full bg-white/10" />
                    <div className="w-full h-[3px] rounded-full bg-white/10" />
                    <div className="w-3/4 h-[3px] rounded-full bg-white/10" />
                    {sidebar === s.key && (
                      <div className="flex-1 flex items-end justify-end">
                        <Check size={10} className="text-brand-400" strokeWidth={2.5} />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {SIDEBARS.map((s) => (
                <p key={s.key} className="text-center text-[10px] text-gray-400">{s.label}</p>
              ))}
            </div>
          </section>
        </div>

        {/* Pied */}
        <div className="px-5 py-4 border-t border-gray-100">
          <button
            onClick={handleReset}
            className="w-full text-[12px] text-gray-400 hover:text-gray-600 transition-colors py-1"
          >
            Réinitialiser
          </button>
        </div>
      </div>
    </>
  );
}
