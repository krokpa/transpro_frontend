'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bus, Search, Ticket, LogOut, Bell, UserRound, Home, CreditCard, Building2, Star,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useAuthStore } from '@/store/auth.store';
import { authApi, notificationsApi } from '@/lib/api';
import { connectSocket, disconnectSocket, SocketEvent } from '@/lib/socket';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/ui/UserAvatar';
import clsx from 'clsx';

const NAV = [
  { label: 'Accueil',          href: '/passenger',                icon: Home },
  { label: 'Rechercher',       href: '/passenger/search',         icon: Search },
  { label: 'Compagnies',       href: '/passenger/companies',      icon: Building2 },
  { label: 'Mes favoris',      href: '/passenger/favorites',      icon: Star },
  { label: 'Mes réservations', href: '/passenger/bookings',       icon: Ticket },
  { label: 'Transactions',     href: '/passenger/transactions',   icon: CreditCard },
  { label: 'Notifications',    href: '/passenger/notifications',  icon: Bell },
  { label: 'Mon profil',       href: '/passenger/profile',        icon: UserRound },
];

const PAGE_TITLES: Record<string, string> = {
  '/passenger':                 'Accueil',
  '/passenger/search':          'Rechercher un voyage',
  '/passenger/companies':       'Compagnies',
  '/passenger/favorites':       'Mes favoris',
  '/passenger/bookings':        'Mes réservations',
  '/passenger/transactions':    'Mes transactions',
  '/passenger/notifications':   'Notifications',
  '/passenger/profile':         'Mon profil',
};

export default function PassengerLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, accessToken, clearAuth, refreshToken } = useAuthStore();
  const qc = useQueryClient();
  const [mounted, setMounted] = useState(false);

  const { data: countData } = useQuery({
    queryKey: ['notifications-count'],
    queryFn:  () => notificationsApi.count() as any,
    enabled:  mounted && isAuthenticated(),
    refetchInterval: 60_000,
  });
  const unreadCount: number = countData?.count ?? 0;

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) { router.replace('/login'); return; }
    if (user?.role !== 'PASSENGER') { router.replace('/dashboard'); return; }

    const socket = connectSocket(accessToken ?? undefined);
    socket.on(SocketEvent.NOTIFICATION, (data: any) => {
      toast.info(data.title || 'Nouvelle notification', { description: data.message, duration: 6000 });
      qc.invalidateQueries({ queryKey: ['notifications-count'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    });
    socket.on(SocketEvent.BOOKING_CANCELLED,    () => qc.invalidateQueries({ queryKey: ['my-bookings'] }));
    socket.on(SocketEvent.TRIP_STATUS_CHANGED,  () => qc.invalidateQueries({ queryKey: ['my-bookings'] }));
    return () => {
      socket.off(SocketEvent.NOTIFICATION);
      socket.off(SocketEvent.BOOKING_CANCELLED);
      socket.off(SocketEvent.TRIP_STATUS_CHANGED);
      disconnectSocket();
    };
  }, []);

  async function handleLogout() {
    try { await authApi.logout(refreshToken ?? undefined); } catch {}
    disconnectSocket();
    clearAuth();
    toast.success('Déconnecté');
    router.push('/login');
  }

  if (!mounted || !isAuthenticated() || user?.role !== 'PASSENGER') return null;

  const currentTitle = (() => {
    let best = '';
    let bestLen = 0;
    for (const [key, val] of Object.entries(PAGE_TITLES)) {
      if ((pathname === key || pathname.startsWith(key + '/')) && key.length > bestLen) {
        best = val; bestLen = key.length;
      }
    }
    return best;
  })();

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-64 bg-[#0c1425] flex flex-col h-full shrink-0 border-r border-white/[0.04]">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-white/[0.06]">
          <Link href="/passenger" className="flex items-center gap-3 min-w-0">
            <div className="bg-brand-500 text-white rounded-xl p-2 shadow-lg shadow-brand-500/30 shrink-0">
              <Bus size={18} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white text-sm tracking-wide truncate">TransPro CI</p>
              <p className="text-[11px] text-slate-500">Espace passager</p>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto scrollbar-dark">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== '/passenger' && pathname.startsWith(item.href + '/'));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-brand-500/[0.12] text-brand-300 shadow-[inset_3px_0_0_#f97316]'
                    : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-200',
                )}
              >
                <item.icon size={16} className={clsx(active ? 'text-brand-400' : 'text-slate-500')} />
                <span className="flex-1">{item.label}</span>
                {item.href === '/passenger/notifications' && unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="px-3 py-4 border-t border-white/[0.06] space-y-0.5">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <UserAvatar
              firstName={user?.firstName}
              lastName={user?.lastName}
              avatar={(user as any)?.avatar}
              size={32}
              className="shrink-0 ring-1 ring-brand-500/25"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/[0.06] rounded-lg transition-all duration-150"
          >
            <LogOut size={15} /> Déconnexion
          </button>
        </div>
      </aside>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-6 h-16 flex items-center justify-between shrink-0 shadow-[0_1px_0_0_rgb(0,0,0,0.04)]">
          <span className="text-[13px] font-semibold text-gray-800">{currentTitle}</span>

          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <Link
              href="/passenger/notifications"
              className="relative p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all duration-150"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[14px] h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            {/* Quick search CTA */}
            <Link
              href="/passenger/search"
              className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all duration-150 shadow-sm shadow-brand-500/20"
            >
              <Search size={14} /> Rechercher un voyage
            </Link>

            {/* User menu */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-all duration-150 outline-none border border-transparent hover:border-gray-100">
                  <UserAvatar
                    firstName={user?.firstName}
                    lastName={user?.lastName}
                    avatar={(user as any)?.avatar}
                    size={28}
                  />
                  <span className="text-sm font-medium text-gray-700 hidden sm:block">
                    {user?.firstName}
                  </span>
                </button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={8}
                  className="bg-white rounded-xl shadow-lg shadow-black/[0.08] border border-gray-100/80 p-1.5 min-w-[220px] z-50 animate-in fade-in-0 zoom-in-95 duration-100"
                >
                  <div className="px-3 py-2.5 mb-1">
                    <div className="flex items-center gap-2.5">
                      <UserAvatar
                        firstName={user?.firstName}
                        lastName={user?.lastName}
                        avatar={(user as any)?.avatar}
                        size={36}
                        className="shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {user?.firstName} {user?.lastName}
                        </p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">{user?.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="my-1 h-px bg-gray-100" />

                  <DropdownMenu.Item asChild>
                    <Link
                      href="/passenger/profile"
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer outline-none transition-colors"
                    >
                      <div className="w-6 h-6 bg-gray-100 rounded-md flex items-center justify-center shrink-0">
                        <UserRound size={12} className="text-gray-500" />
                      </div>
                      Mon profil
                    </Link>
                  </DropdownMenu.Item>

                  <div className="my-1 h-px bg-gray-100" />

                  <DropdownMenu.Item
                    onSelect={handleLogout}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg cursor-pointer outline-none transition-colors"
                  >
                    <div className="w-6 h-6 bg-red-50 rounded-md flex items-center justify-center shrink-0">
                      <LogOut size={12} className="text-red-500" />
                    </div>
                    Déconnexion
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
