'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useNavStore } from '@/store/nav.store';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { connectSocket, joinCompanyRoom } from '@/lib/socket';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ownerSteps } from '@/lib/walkthrough';

// SSR désactivé car react-joyride accède à window/document
const WalkthroughGuide = dynamic(
  () => import('@/components/walkthrough/WalkthroughGuide').then((m) => m.WalkthroughGuide),
  { ssr: false },
);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, user, accessToken } = useAuthStore();
  const isNavigating = useNavStore((s) => s.pendingHref !== null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }

    if (user?.role === 'PASSENGER') {
      router.replace('/passenger');
      return;
    }

    if (user?.role === 'DRIVER') {
      router.replace('/driver');
      return;
    }

    if (user?.role === 'COMPANY_AGENT') {
      router.replace('/station');
      return;
    }

    // Connexion Socket.io au démarrage du dashboard
    const socket = connectSocket(accessToken ?? undefined);

    socket.on('connect', () => {
      if (user?.tenantId) joinCompanyRoom(user.tenantId);
    });

    return () => {
      socket.off('connect');
    };
  }, []);

  if (!mounted || !isAuthenticated() || user?.role === 'PASSENGER' || user?.role === 'COMPANY_AGENT') return null;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className={`flex-1 overflow-y-auto p-6 transition-all duration-200 ${isNavigating ? 'opacity-40 blur-sm pointer-events-none' : ''}`}>
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
      {/* Walkthrough première connexion — owner/admin uniquement */}
      {(user?.role === 'COMPANY_OWNER' || user?.role === 'COMPANY_ADMIN') && (
        <WalkthroughGuide role={user.role} steps={ownerSteps} />
      )}
    </div>
  );
}
