'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

const WalkthroughGuide = dynamic(
  () => import('@/components/walkthrough/WalkthroughGuide').then((m) => m.WalkthroughGuide),
  { ssr: false },
);
import { stationsApi, authApi } from '@/lib/api';
import {
  Building2, LayoutDashboard, Bus, Ticket, ScanLine, Banknote, LogOut,
  ArrowLeft, Loader2, TrendingUp, FileText, CalendarClock, ClipboardList,
  ChevronDown, LayoutGrid,
} from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';
import { disconnectSocket } from '@/lib/socket';
import { agentSteps } from '@/lib/walkthrough';
import { toast } from 'sonner';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { UserAvatar } from '@/components/ui/UserAvatar';

const ROLE_LABELS: Record<string, string> = {
  COMPANY_AGENT: 'Agent de gare',
  COMPANY_ADMIN: 'Administrateur',
  COMPANY_OWNER: 'Propriétaire',
};

const navItems = [
  { label: 'Tableau de bord', icon: LayoutDashboard, href: '',             walkthroughId: 'nav-dashboard' },
  { label: 'Voyages',         icon: Bus,             href: '/trips',       walkthroughId: 'nav-trips' },
  { label: 'Plannings',       icon: CalendarClock,   href: '/plannings',   walkthroughId: undefined },
  { label: 'Réservations',    icon: ClipboardList,   href: '/reservations',walkthroughId: undefined },
  { label: 'Guichet',         icon: Ticket,          href: '/guichet',     walkthroughId: 'nav-guichet' },
  { label: 'Scanner',         icon: ScanLine,        href: '/scanner',     walkthroughId: 'nav-scanner' },
  { label: 'Caisse',          icon: Banknote,        href: '/caisse',      walkthroughId: 'nav-caisse' },
  { label: 'Analytiques',     icon: TrendingUp,      href: '/analytics',   walkthroughId: undefined },
  { label: 'Rapports',        icon: FileText,        href: '/rapports',    walkthroughId: undefined },
];

export default function StationLayout({ children }: { children: React.ReactNode }) {
  const { stationId } = useParams<{ stationId: string }>();
  const router        = useRouter();
  const pathname      = usePathname();
  const { user, clearAuth, refreshToken } = useAuthStore();
  const [station,  setStation]  = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [denied,   setDenied]   = useState(false);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }

    const role          = user.role as string;
    const isOwnerOrAdmin = role === 'COMPANY_OWNER' || role === 'COMPANY_ADMIN';
    const isAgent        = role === 'COMPANY_AGENT';

    if (!isOwnerOrAdmin && !isAgent) { router.push('/login'); return; }

    stationsApi.get(stationId)
      .then((s: any) => {
        if (isAgent) {
          const stations: any[] = (user as any).userStations ?? [];
          const hasAccess = stations.some(
            (us: any) => us.stationId === stationId || us.station?.id === stationId,
          );
          if (!hasAccess) { setDenied(true); setLoading(false); return; }
        }
        setStation(s);
        setLoading(false);
      })
      .catch(() => { setDenied(true); setLoading(false); });
  }, [stationId, user, router]);

  async function handleLogout() {
    try { await authApi.logout(refreshToken ?? undefined); } catch {}
    disconnectSocket();
    clearAuth();
    toast.success('Déconnecté');
    router.push('/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <Loader2 size={32} className="text-brand-500 animate-spin" />
      </div>
    );
  }

  if (denied) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center gap-4 text-white">
        <div className="w-16 h-16 bg-white/[0.04] rounded-2xl flex items-center justify-center">
          <Building2 size={32} className="text-slate-600" />
        </div>
        <p className="text-lg font-semibold">Accès refusé</p>
        <p className="text-slate-400 text-sm">Vous n'êtes pas affecté à cette gare.</p>
        <button
          onClick={() => router.push('/station')}
          className="mt-2 text-brand-400 hover:text-brand-300 text-sm transition-colors"
        >
          ← Choisir une autre gare
        </button>
      </div>
    );
  }

  const base      = `/station/${stationId}`;
  const role      = user?.role as string;
  const pageTitle = navItems.find((item) => {
    const href = base + item.href;
    return item.href === '' ? pathname === base : pathname.startsWith(href);
  })?.label ?? 'Gare';

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-60 bg-canvas flex flex-col h-full shrink-0 border-r border-white/[0.04]">
        {/* Station header */}
        <div className="px-4 py-4 border-b border-white/[0.05]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-brand-500/20 text-brand-400 rounded-xl p-2 shrink-0">
              <Building2 size={16} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-white text-[13px] truncate">{station?.name}</p>
              <p className="text-[11px] text-slate-500 truncate">{station?.city?.name ?? ''}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2.5 py-3 space-y-px overflow-y-auto scrollbar-dark">
          {navItems.map((item) => {
            const href   = base + item.href;
            const active = item.href === '' ? pathname === base : pathname.startsWith(href);
            return (
              <Link
                key={item.href}
                href={href}
                {...(item.walkthroughId ? { 'data-walkthrough': item.walkthroughId } : {})}
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

        {/* Footer */}
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

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── Top header ── */}
        <header className="h-14 bg-white border-b border-gray-100 px-6 flex items-center justify-between shrink-0 shadow-[0_1px_0_0_rgb(0,0,0,0.04)]">
          <p className="text-sm font-semibold text-gray-800">{pageTitle}</p>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-all duration-150 outline-none border border-transparent hover:border-gray-100">
                <UserAvatar
                  firstName={user?.firstName}
                  lastName={user?.lastName}
                  avatar={(user as any)?.avatar}
                  size={30}
                  className="ring-1 ring-gray-200/80"
                />
                <div className="hidden sm:flex flex-col items-start leading-none">
                  <span className="text-xs font-semibold text-gray-800">
                    {user?.firstName} {user?.lastName}
                  </span>
                  <span className="text-[10px] text-gray-400 mt-0.5">
                    {ROLE_LABELS[role] ?? role}
                  </span>
                </div>
                <ChevronDown size={13} className="text-gray-400 hidden sm:block" />
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={8}
                className="bg-white rounded-xl shadow-lg shadow-black/[0.08] border border-gray-100/80 p-1.5 min-w-[230px] z-50 animate-in fade-in-0 zoom-in-95 duration-100"
              >
                <div className="px-3 py-2.5 mb-1">
                  <div className="flex items-center gap-2.5">
                    <UserAvatar
                      firstName={user?.firstName}
                      lastName={user?.lastName}
                      avatar={(user as any)?.avatar}
                      size={38}
                      className="ring-1 ring-gray-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">
                        {user?.email}
                      </p>
                      <span className="inline-flex items-center mt-1 text-[10px] font-semibold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded-full">
                        {ROLE_LABELS[role] ?? role}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="my-1 h-px bg-gray-100" />

                {(role === 'COMPANY_OWNER' || role === 'COMPANY_ADMIN') && (
                  <DropdownMenu.Item asChild>
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer outline-none transition-colors"
                    >
                      <div className="w-6 h-6 bg-gray-100 rounded-md flex items-center justify-center shrink-0">
                        <LayoutGrid size={12} className="text-gray-500" />
                      </div>
                      Dashboard compagnie
                    </Link>
                  </DropdownMenu.Item>
                )}
                {role === 'COMPANY_AGENT' && (
                  <DropdownMenu.Item asChild>
                    <Link
                      href="/station"
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer outline-none transition-colors"
                    >
                      <div className="w-6 h-6 bg-gray-100 rounded-md flex items-center justify-center shrink-0">
                        <ArrowLeft size={12} className="text-gray-500" />
                      </div>
                      Changer de gare
                    </Link>
                  </DropdownMenu.Item>
                )}

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

        {/* ── Page content ── */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      {user?.role === 'COMPANY_AGENT' && (
        <WalkthroughGuide role="COMPANY_AGENT" steps={agentSteps} />
      )}
    </div>
  );
}
