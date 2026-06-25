import 'server-only';

// Marque résolue côté SERVEUR (métadonnées, 1er paint). Côté client → useBranding().
const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1').replace(/\/$/, '');

export interface ServerBranding {
  appName: string;
  tagline: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  ogImageUrl: string | null;
  primaryColor: string;
}

// Valeurs par défaut white-label, surchargeables par env (avant config admin).
const FALLBACK: ServerBranding = {
  appName:      process.env.NEXT_PUBLIC_APP_NAME    || 'TransPro CI',
  tagline:      process.env.NEXT_PUBLIC_APP_TAGLINE || 'Voyagez en toute sérénité',
  logoUrl:      process.env.NEXT_PUBLIC_APP_LOGO    || null,
  faviconUrl:   process.env.NEXT_PUBLIC_APP_FAVICON || null,
  ogImageUrl:   process.env.NEXT_PUBLIC_APP_OG      || null,
  primaryColor: process.env.NEXT_PUBLIC_BRAND_COLOR || '#F97316',
};

export async function getServerBranding(): Promise<ServerBranding> {
  try {
    const res = await fetch(`${API}/platform-settings`, { next: { revalidate: 60 } });
    if (!res.ok) return FALLBACK;
    const json = await res.json();
    const d = json?.data ?? json;
    return {
      appName:      d?.appName      || FALLBACK.appName,
      tagline:      d?.tagline      || FALLBACK.tagline,
      logoUrl:      d?.logoUrl      || FALLBACK.logoUrl,
      faviconUrl:   d?.faviconUrl   || FALLBACK.faviconUrl,
      ogImageUrl:   d?.ogImageUrl   || FALLBACK.ogImageUrl,
      primaryColor: d?.primaryColor || FALLBACK.primaryColor,
    };
  } catch {
    return FALLBACK;
  }
}

// Échelle identique à applyBrandColor (branding.tsx) : blanc pour le clair, noir pour le foncé.
const SCALE: Record<number, [number, number]> = {
  50: [255, 0.92], 100: [255, 0.84], 200: [255, 0.68], 300: [255, 0.46], 400: [255, 0.22],
  500: [255, 0], 600: [0, 0.12], 700: [0, 0.28], 800: [0, 0.44], 900: [0, 0.6],
};

/** Génère `:root{--brand-50: r g b; …}` depuis une couleur hex, pour un 1er paint correct. */
export function brandVarsCss(hex: string): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return '';
  const n = parseInt(m[1], 16);
  const R = (n >> 16) & 255, G = (n >> 8) & 255, B = n & 255;
  const mix = (c: number, to: number, a: number) => Math.round(c * (1 - a) + to * a);
  const lines = Object.entries(SCALE)
    .map(([k, [to, a]]) => `--brand-${k}:${mix(R, to, a)} ${mix(G, to, a)} ${mix(B, to, a)};`)
    .join('');
  return `:root{${lines}}`;
}
