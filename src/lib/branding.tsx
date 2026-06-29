'use client';

import { createContext, useContext, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { platformApi } from '@/lib/api';

export interface Branding {
  appName: string;
  tagline: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  tertiaryColor: string;
}

// Défauts white-label : surchargeables par env (avant toute config admin).
const DEFAULTS: Branding = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'TransPro CI',
  tagline: process.env.NEXT_PUBLIC_APP_TAGLINE || 'Voyagez en toute sérénité',
  logoUrl: process.env.NEXT_PUBLIC_APP_LOGO || '/transpro-logo-transparent.png',
  primaryColor: process.env.NEXT_PUBLIC_BRAND_COLOR || '#F97316',
  secondaryColor: process.env.NEXT_PUBLIC_BRAND_SECONDARY || '#0EA5E9',
  tertiaryColor: process.env.NEXT_PUBLIC_BRAND_TERTIARY || '#6366F1',
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

// Génère l'échelle CSS `--{prefix}-50..900` à partir d'une couleur (500).
function applyScale(prefix: string, hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) return;
  const root = document.documentElement;
  for (const [shade, { to, amt }] of Object.entries(SCALE)) {
    const [r, g, b] = rgb.map((c) => mix(c, to, amt));
    root.style.setProperty(`--${prefix}-${shade}`, `${r} ${g} ${b}`);
  }
}

export function applyBrandColor(hex: string) {
  applyScale('brand', hex);
}

/// Applique les 3 couleurs de marque (échelles `--brand-*`, `--secondary-*`, `--tertiary-*`).
export function applyBrandColors(primary: string, secondary?: string, tertiary?: string) {
  applyScale('brand', primary);
  if (secondary) applyScale('secondary', secondary);
  if (tertiary) applyScale('tertiary', tertiary);
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
    logoUrl: data?.logoUrl || DEFAULTS.logoUrl,
    primaryColor: data?.primaryColor ?? DEFAULTS.primaryColor,
    secondaryColor: data?.secondaryColor ?? DEFAULTS.secondaryColor,
    tertiaryColor: data?.tertiaryColor ?? DEFAULTS.tertiaryColor,
  };

  useEffect(() => {
    if (data?.primaryColor) {
      applyBrandColors(data.primaryColor, data?.secondaryColor, data?.tertiaryColor);
      try { localStorage.setItem('transpro-brand-color', data.primaryColor); } catch {}
    }
  }, [data?.primaryColor, data?.secondaryColor, data?.tertiaryColor]);

  return <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>;
}
