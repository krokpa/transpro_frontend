import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@transpro/shared', 'mapbox-gl'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;
