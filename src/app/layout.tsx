import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Providers from './providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'TransPro CI',
    template: '%s · TransPro CI',
  },
  description: 'Gestion des compagnies de transport en Côte d\'Ivoire',
  icons: {
    icon: '/transpro-logo-transparent.png',
    apple: '/transpro-logo-transparent.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
