'use client';

import { createContext, useContext, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { platformApi } from '@/lib/api';

export interface Branding {
  appName: string;
  tagline: string;
  logoUrl: string | null;
  primaryColor: string;
}

const DEFAULTS: Branding = {
  appName: 'TransPro CI',
  tagline: 'Voyagez en toute sérénité',
  logoUrl: null,
  primaryColor: '#F97316',
};

const BrandingContext = createContext<Branding>(DEFAULTS);

export const useBranding = () => useContext(BrandingContext);

// ── Génère une échelle brand-50..900 à partir d'une couleur primaire (500) ────
function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.trim().replace('#', '');
  if (m.length !== 6) return null;
  const n = parseInt(m, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const mix = (c: number, target: number, amt: number) => Math.round(c * (1 - amt) + target * amt);

// Quantité de blanc (clair) / noir (foncé) par nuance.
const SCALE: Record<number, { to: number; amt: number }> = {
  50: { to: 255, amt: 0.92 }, 100: { to: 255, amt: 0.84 }, 200: { to: 255, amt: 0.68 },
  300: { to: 255, amt: 0.46 }, 400: { to: 255, amt: 0.22 }, 500: { to: 255, amt: 0 },
  600: { to: 0, amt: 0.12 }, 700: { to: 0, amt: 0.28 }, 800: { to: 0, amt: 0.44 }, 900: { to: 0, amt: 0.6 },
};

export function applyBrandColor(hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) return;
  const root = document.documentElement;
  for (const [shade, { to, amt }] of Object.entries(SCALE)) {
    const [r, g, b] = rgb.map((c) => mix(c, to, amt));
    root.style.setProperty(`--brand-${shade}`, `${r} ${g} ${b}`);
  }
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { data } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: () => platformApi.getSettings() as any,
    staleTime: 5 * 60 * 1000,
  });

  const branding: Branding = {
    appName: data?.appName ?? DEFAULTS.appName,
    tagline: data?.tagline ?? DEFAULTS.tagline,
    logoUrl: data?.logoUrl ?? null,
    primaryColor: data?.primaryColor ?? DEFAULTS.primaryColor,
  };

  useEffect(() => {
    if (data?.primaryColor) {
      applyBrandColor(data.primaryColor);
      try { localStorage.setItem('transpro-brand-color', data.primaryColor); } catch {}
    }
  }, [data?.primaryColor]);

  return <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>;
}
