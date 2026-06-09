'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/lib/api';
import {
  LayoutDashboard, Bus, Calendar, Star, User, LogOut,
  ChevronDown, Loader2,
} from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';
import { disconnectSocket } from '@/lib/socket';
import { toast } from 'sonner';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { UserAvatar } from '@/components/ui/UserAvatar';

const NAV = [
  { label: 'Tableau de bord', icon: LayoutDashboard, href: '/driver' },
  { label: 'Mes voyages',     icon: Bus,             href: '/driver/trips' },
  { label: 'Mon planning',    icon: Calendar,        href: '/driver/schedule' },
  { label: 'Évaluations',     icon: Star,            href: '/driver/evaluations' },
  { label: 'Mon profil',      icon: User,            href: '/driver/profile' },
];

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, clearAuth, refreshToken } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) { router.replace('/login'); return; }
    if (user?.role !== 'DRIVER') { router.replace('/login'); return; }
  }, []);

  async function handleLogout() {
    try { await authApi.logout(refreshToken ?? undefined); } catch {}
    disconnectSocket();
    clearAuth();
    toast.success('Déconnecté');
    router.push('/login');
  }

  if (!mounted || !isAuthenticated() || user?.role !== 'DRIVER') {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <Loader2 size={32} className="text-brand-500 animate-spin" />
      </div>
    );
  }

  const pageTitle = NAV.find(n =>
    n.href === '/driver' ? pathname === '/driver' : pathname.startsWith(n.href),
  )?.label ?? 'Espace Chauffeur';

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className="w-60 bg-canvas flex flex-col h-full shrink-0 border-r border-white/[0.04]">

        {/* Brand */}
        <div className="px-4 py-4 border-b border-white/[0.05]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center shadow-md shadow-brand-500/25 shrink-0">
              <Bus size={16} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-white text-[13px]">Espace Chauffeur</p>
              <p className="text-[11px] text-slate-500">TransPro CI</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2.5 py-3 space-y-px overflow-y-auto">
          {NAV.map((item) => {
            const active = item.href === '/driver'
              ? pathname === '/driver'
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors duration-100',
                  active
                    ? 'bg-white/[0.07] text-white'
                    : 'text-slate-400/80 hover:text-slate-200 hover:bg-white/[0.04]',
                )}
              >
                <item.icon size={15} className={clsx(active ? 'text-brand-400' : 'text-slate-500')} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="px-2.5 py-3 border-t border-white/[0.05]">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
            <UserAvatar
              firstName={user?.firstName}
              lastName={user?.lastName}
              avatar={(user as any)?.avatar}
              size={28}
              className="ring-1 ring-white/10 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-slate-300 truncate">
                {user?.firstName} {user?.lastName}
              </p>
            </div>
            <button
              onClick={handleLogout}
              title="Déconnexion"
              className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/[0.08] rounded-md transition-colors duration-100"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        <header className="h-14 bg-white border-b border-gray-100 px-6 flex items-center justify-between shrink-0 shadow-[0_1px_0_0_rgb(0,0,0,0.04)]">
          <p className="text-sm font-semibold text-gray-800">{pageTitle}</p>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition outline-none border border-transparent hover:border-gray-100">
                <UserAvatar
                  firstName={user?.firstName}
                  lastName={user?.lastName}
                  avatar={(user as any)?.avatar}
                  size={30}
                  className="ring-1 ring-gray-200/80"
                />
                <div className="hidden sm:flex flex-col items-start leading-none">
                  <span className="text-xs font-semibold text-gray-800">{user?.firstName} {user?.lastName}</span>
                  <span className="text-[10px] text-gray-400 mt-0.5">Chauffeur</span>
                </div>
                <ChevronDown size={13} className="text-gray-400 hidden sm:block" />
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end" sideOffset={8}
                className="bg-white rounded-xl shadow-lg shadow-black/[0.08] border border-gray-100/80 p-1.5 min-w-[220px] z-50 animate-in fade-in-0 zoom-in-95 duration-100"
              >
                <div className="px-3 py-2.5 mb-1">
                  <div className="flex items-center gap-2.5">
                    <UserAvatar firstName={user?.firstName} lastName={user?.lastName} size={36} className="ring-1 ring-gray-200 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{user?.firstName} {user?.lastName}</p>
                      <span className="inline-flex items-center mt-1 text-[10px] font-semibold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded-full">Chauffeur</span>
                    </div>
                  </div>
                </div>
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
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
