'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';
import dynamic from 'next/dynamic';
import { useEffect, useRef } from 'react';
import AppLoader from '@/components/ui/AppLoader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ThemePanel } from '@/components/ui/ThemePanel';
import { useThemeStore, applyColorMode, type ColorMode } from '@/store/theme.store';
import { useAuthStore } from '@/store/auth.store';

function ThemeInit() {
  const { accent, sidebar, colorMode, setAccent, setSidebar, setColorMode } = useThemeStore();
  const { user } = useAuthStore();
  const syncedForId = useRef<string | null>(null);

  /* Quand un utilisateur se connecte, écraser les préférences locales avec celles du compte */
  useEffect(() => {
    if (!user) { syncedForId.current = null; return; }
    if (syncedForId.current === user.id) return;
    syncedForId.current = user.id;
    if (user.themeAccent) setAccent(user.themeAccent as any);
    if (user.themeSidebar) setSidebar(user.themeSidebar as any);
    if ((user as any).themeColorMode) setColorMode((user as any).themeColorMode as ColorMode);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Maintenir le DOM en sync avec le store */
  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accent);
    document.documentElement.setAttribute('data-sidebar', sidebar);
  }, [accent, sidebar]);

  /* Appliquer la couleur de mode + écouter les changements système */
  useEffect(() => {
    applyColorMode(colorMode);
    if (colorMode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyColorMode('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [colorMode]);

  return null;
}

const ReactQueryDevtools = dynamic(
  () => import('@tanstack/react-query-devtools').then((m) => m.ReactQueryDevtools),
  { ssr: false },
);

const Toaster = dynamic(
  () => import('sonner').then((m) => m.Toaster),
  { ssr: false },
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <QueryClientProvider client={queryClient}>
        <AppLoader>
          {children}
        </AppLoader>
        <Toaster position="top-right" richColors />
        <ConfirmDialog />
        <ThemeInit />
        <ThemePanel />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}
