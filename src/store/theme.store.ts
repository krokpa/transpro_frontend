import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Accent = 'orange' | 'blue' | 'purple' | 'green' | 'rose' | 'teal';
export type SidebarStyle = 'navy' | 'slate' | 'charcoal';
export type ColorMode = 'light' | 'dark' | 'system';

interface ThemeState {
  accent: Accent;
  sidebar: SidebarStyle;
  colorMode: ColorMode;
  setAccent: (accent: Accent) => void;
  setSidebar: (sidebar: SidebarStyle) => void;
  setColorMode: (mode: ColorMode) => void;
  reset: () => void;
}

function applyTheme(accent: Accent, sidebar: SidebarStyle) {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  el.setAttribute('data-accent', accent);
  el.setAttribute('data-sidebar', sidebar);
}

export function applyColorMode(mode: ColorMode) {
  if (typeof document === 'undefined') return;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = mode === 'dark' || (mode === 'system' && prefersDark);
  document.documentElement.classList.toggle('dark', isDark);
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      accent: 'orange',
      sidebar: 'navy',
      colorMode: 'system',
      setAccent: (accent) => {
        set({ accent });
        applyTheme(accent, get().sidebar);
      },
      setSidebar: (sidebar) => {
        set({ sidebar });
        applyTheme(get().accent, sidebar);
      },
      setColorMode: (colorMode) => {
        set({ colorMode });
        applyColorMode(colorMode);
      },
      reset: () => {
        set({ accent: 'orange', sidebar: 'navy', colorMode: 'system' });
        applyTheme('orange', 'navy');
        applyColorMode('system');
      },
    }),
    { name: 'transpro-theme' },
  ),
);
