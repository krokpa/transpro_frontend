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
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={inter.className}>
        {/* Script synchrone anti-flash : applique le thème avant le premier rendu */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=JSON.parse(localStorage.getItem('transpro-theme')||'{}');var s=t.state||{};if(s.accent)document.documentElement.setAttribute('data-accent',s.accent);if(s.sidebar)document.documentElement.setAttribute('data-sidebar',s.sidebar);}catch(e){}})()`,
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
