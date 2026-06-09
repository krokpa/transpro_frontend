import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Accent = 'orange' | 'blue' | 'purple' | 'green' | 'rose' | 'teal';
export type SidebarStyle = 'navy' | 'slate' | 'charcoal';

interface ThemeState {
  accent: Accent;
  sidebar: SidebarStyle;
  setAccent: (accent: Accent) => void;
  setSidebar: (sidebar: SidebarStyle) => void;
  reset: () => void;
}

function applyTheme(accent: Accent, sidebar: SidebarStyle) {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  el.setAttribute('data-accent', accent);
  el.setAttribute('data-sidebar', sidebar);
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      accent: 'orange',
      sidebar: 'navy',
      setAccent: (accent) => {
        set({ accent });
        applyTheme(accent, get().sidebar);
      },
      setSidebar: (sidebar) => {
        set({ sidebar });
        applyTheme(get().accent, sidebar);
      },
      reset: () => {
        set({ accent: 'orange', sidebar: 'navy' });
        applyTheme('orange', 'navy');
      },
    }),
    { name: 'transpro-theme' },
  ),
);
