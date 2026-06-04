'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { connectSocket, joinCompanyRoom } from '@/lib/socket';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, user, accessToken } = useAuthStore();
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
        <main className="flex-1 overflow-y-auto p-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
