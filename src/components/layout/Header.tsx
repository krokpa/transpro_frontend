'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, ChevronRight, Settings, LogOut, Sun, Moon, Monitor } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useThemeStore, type ColorMode } from '@/store/theme.store';
import { usersApi, notificationsApi, authApi } from '@/lib/api';
import { getSocket, SocketEvent, disconnectSocket } from '@/lib/socket';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/ui/UserAvatar';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':                   'Tableau de bord',
  '/dashboard/schedules':         'Plannings',
  '/dashboard/trips':             'Voyages',
  '/dashboard/bookings':          'Réservations',
  '/dashboard/routes':            'Itinéraires',
  '/dashboard/vehicles':          'Véhicules',
  '/dashboard/drivers':           'Chauffeurs',
  '/dashboard/settings':          'Paramètres',
  '/dashboard/ticket-templates':  'Modèles de tickets',
  '/dashboard/billetterie':       'Billetterie',
  '/dashboard/scanner':           'Scanner de billets',
  '/dashboard/analytics':         'Analytiques',
  '/dashboard/reports':           'Rapports',
  '/dashboard/team':              'Équipe',
  '/dashboard/stations':          'Gares',
  '/dashboard/subscription':      'Abonnement',
  '/dashboard/delivery-requests': 'Livraisons à domicile',
  '/dashboard/luggage':           'Bagages passagers',
  '/dashboard/cities':            'Villes',
  '/dashboard/admin/tenants':     'Compagnies',
};

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth, refreshToken, setUser } = useAuthStore();
  const { colorMode, setColorMode } = useThemeStore();
  const [unreadCount, setUnreadCount] = useState(0);

  function cycleColorMode() {
    const next: ColorMode = colorMode === 'light' ? 'dark' : colorMode === 'dark' ? 'system' : 'light';
    setColorMode(next);
    if (user) {
      usersApi.updateProfile({ themeColorMode: next }).then(() => setUser({ ...user, themeColorMode: next } as any)).catch(() => {});
    }
  }

  const ColorModeIcon = colorMode === 'dark' ? Moon : colorMode === 'light' ? Sun : Monitor;

  const { data: notifications } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => notificationsApi.list(true) as any,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (notifications) {
      setUnreadCount(Array.isArray(notifications) ? notifications.length : 0);
    }
  }, [notifications]);

  useEffect(() => {
    const socket = getSocket();
    socket.on(SocketEvent.NOTIFICATION, () => setUnreadCount((p) => p + 1));
    return () => { socket.off(SocketEvent.NOTIFICATION); };
  }, []);

  async function handleLogout() {
    try { await authApi.logout(refreshToken ?? undefined); } catch {}
    disconnectSocket();
    clearAuth();
    toast.success('Déconnecté');
    router.push('/login');
  }

  const segments = pathname.split('/').filter(Boolean);

  // Derive current page title from longest matching prefix
  const currentTitle = (() => {
    let best = '';
    let bestLen = 0;
    for (const [key, val] of Object.entries(PAGE_TITLES)) {
      if ((pathname === key || pathname.startsWith(key + '/')) && key.length > bestLen) {
        best = val;
        bestLen = key.length;
      }
    }
    return best;
  })();

  return (
    <header className="bg-white border-b border-gray-100 px-6 h-16 flex items-center justify-between shrink-0 shadow-[0_1px_0_0_rgb(0,0,0,0.04)]">
      {/* Left — breadcrumb + page title */}
      <div className="flex flex-col justify-center gap-0.5">
        {/* Breadcrumb — secondary */}
        <nav className="flex items-center gap-1 min-w-0">
          {segments.map((seg, i) => {
            const href  = '/' + segments.slice(0, i + 1).join('/');
            const label = PAGE_TITLES[href] ?? seg;
            const isLast = i === segments.length - 1;
            return (
              <span key={href} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={11} className="text-gray-300 shrink-0" />}
                {isLast ? (
                  <span className="text-[13px] font-semibold text-gray-800 truncate">{label}</span>
                ) : (
                  <Link
                    href={href}
                    className="text-[12px] text-gray-400 hover:text-gray-600 transition-colors truncate"
                  >
                    {label}
                  </Link>
                )}
              </span>
            );
          })}
        </nav>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-1">
        {/* Color mode toggle */}
        <button
          onClick={cycleColorMode}
          title={colorMode === 'light' ? 'Mode clair' : colorMode === 'dark' ? 'Mode sombre' : 'Mode système'}
          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-all duration-150"
        >
          <ColorModeIcon size={17} />
        </button>

        {/* Notification bell */}
        <button className="relative p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-all duration-150 group">
          <Bell size={18} className="group-hover:scale-105 transition-transform duration-150" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[14px] h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none px-0.5">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User menu */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-all duration-150 outline-none group border border-transparent hover:border-gray-100">
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
              {/* User info header */}
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
                  href="/dashboard/settings"
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer outline-none transition-colors"
                >
                  <div className="w-6 h-6 bg-gray-100 rounded-md flex items-center justify-center shrink-0">
                    <Settings size={12} className="text-gray-500" />
                  </div>
                  Paramètres
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
  );
}
