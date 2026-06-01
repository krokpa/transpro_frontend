import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Produit un dossier .next/standalone autonome — idéal pour Docker
  // Contient uniquement les fichiers nécessaires à l'exécution (pas node_modules entier)
  output: 'standalone',

  transpilePackages: ['@transpro/shared', 'mapbox-gl'],

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;
