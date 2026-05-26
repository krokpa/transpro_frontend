'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { stationsApi, authApi } from '@/lib/api';
import {
  Building2, LayoutDashboard, Bus, Ticket, ScanLine, Banknote, LogOut,
  ArrowLeft, Loader2, TrendingUp, FileText, CalendarClock, ClipboardList,
} from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';
import { disconnectSocket } from '@/lib/socket';
import { toast } from 'sonner';

const navItems = [
  { label: 'Tableau de bord', icon: LayoutDashboard, href: '' },
  { label: 'Voyages',         icon: Bus,             href: '/trips' },
  { label: 'Plannings',       icon: CalendarClock,   href: '/plannings' },
  { label: 'Réservations',    icon: ClipboardList,   href: '/reservations' },
  { label: 'Guichet',         icon: Ticket,          href: '/guichet' },
  { label: 'Scanner',         icon: ScanLine,        href: '/scanner' },
  { label: 'Caisse',          icon: Banknote,        href: '/caisse' },
  { label: 'Analytiques',     icon: TrendingUp,      href: '/analytics' },
  { label: 'Rapports',        icon: FileText,        href: '/rapports' },
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
      <div className="min-h-screen bg-[#0c1425] flex items-center justify-center">
        <Loader2 size={32} className="text-brand-500 animate-spin" />
      </div>
    );
  }

  if (denied) {
    return (
      <div className="min-h-screen bg-[#0c1425] flex flex-col items-center justify-center gap-4 text-white">
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

  const base     = `/station/${stationId}`;
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-60 bg-[#0c1425] flex flex-col h-full shrink-0 border-r border-white/[0.04]">
        {/* Station header */}
        <div className="px-4 py-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-brand-500/20 text-brand-400 rounded-xl p-2 shrink-0 ring-1 ring-brand-500/20">
              <Building2 size={16} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white text-sm truncate">{station?.name}</p>
              <p className="text-[11px] text-slate-500 truncate">{station?.city?.name ?? ''}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-dark">
          {navItems.map((item) => {
            const href   = base + item.href;
            const active = item.href === '' ? pathname === base : pathname.startsWith(href);
            return (
              <Link
                key={item.href}
                href={href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-brand-500/[0.12] text-brand-300 shadow-[inset_3px_0_0_#f97316]'
                    : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-200',
                )}
              >
                <item.icon size={15} className={clsx(active ? 'text-brand-400' : 'text-slate-500')} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-white/[0.06] space-y-0.5">
          {((user?.role as string) === 'COMPANY_OWNER' || (user?.role as string) === 'COMPANY_ADMIN') && (
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] rounded-lg transition-all duration-150"
            >
              <ArrowLeft size={13} /> Dashboard compagnie
            </Link>
          )}
          {(user?.role as string) === 'COMPANY_AGENT' && (
            <Link
              href="/station"
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] rounded-lg transition-all duration-150"
            >
              <ArrowLeft size={13} /> Changer de gare
            </Link>
          )}
          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="w-7 h-7 bg-brand-500/20 text-brand-400 rounded-full ring-1 ring-brand-500/25 flex items-center justify-center text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate">{user?.firstName} {user?.lastName}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/[0.06] rounded-lg transition-all duration-150"
          >
            <LogOut size={13} /> Déconnexion
          </button>
        </div>
      </aside>

      {/* ── Content ── */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
