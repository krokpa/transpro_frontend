import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Needed for pnpm monorepo: trace files from the repo root where pnpm stores node_modules
  outputFileTracingRoot: path.join(__dirname, '../../'),
  transpilePackages: ['@transpro/shared', 'mapbox-gl'],

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;
