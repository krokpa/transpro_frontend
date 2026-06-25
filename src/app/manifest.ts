import type { MetadataRoute } from 'next';
import { getServerBranding } from '@/lib/server-branding';

// Manifest PWA dynamique : nom, couleur de thème et icônes pilotés par la marque.
// Next.js le sert à /manifest.webmanifest et injecte <link rel="manifest"> automatiquement.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const b = await getServerBranding();
  const icon = b.faviconUrl || b.logoUrl || '/favicon.png';
  return {
    name: b.appName,
    short_name: b.appName,
    description: b.tagline,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: b.primaryColor,
    icons: [
      { src: icon, sizes: '192x192', type: 'image/png' },
      { src: icon, sizes: '512x512', type: 'image/png' },
    ],
  };
}
