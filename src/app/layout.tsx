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
            __html: `(function(){try{var t=JSON.parse(localStorage.getItem('transpro-theme')||'{}');var s=t.state||{};if(s.accent)document.documentElement.setAttribute('data-accent',s.accent);if(s.sidebar)document.documentElement.setAttribute('data-sidebar',s.sidebar);var m=s.colorMode||'system';var dark=m==='dark'||(m==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(dark)document.documentElement.classList.add('dark');var bc=localStorage.getItem('transpro-brand-color');if(bc&&/^#[0-9a-fA-F]{6}$/.test(bc)){var n=parseInt(bc.slice(1),16),R=(n>>16)&255,G=(n>>8)&255,B=n&255,sc={50:[255,.92],100:[255,.84],200:[255,.68],300:[255,.46],400:[255,.22],500:[255,0],600:[0,.12],700:[0,.28],800:[0,.44],900:[0,.6]};for(var k in sc){var to=sc[k][0],a=sc[k][1];document.documentElement.style.setProperty('--brand-'+k,Math.round(R*(1-a)+to*a)+' '+Math.round(G*(1-a)+to*a)+' '+Math.round(B*(1-a)+to*a));}}}catch(e){}})()`,
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
