'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Bus, Route, Users, Ticket,
  Settings, LogOut, Truck, CalendarClock, TicketCheck, ConciergeBell, ScanLine, BarChart3, FileText, Building2,
  ShieldCheck, MapPin, CreditCard, UserCog, Package, Lock, Home, Luggage, Megaphone, Banknote, Receipt, Wallet, BookOpen,
  Loader2, KeyRound,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useNavStore } from '@/store/nav.store';
import { authApi, tenantsApi } from '@/lib/api';
import { disconnectSocket } from '@/lib/socket';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';

const navGroups = [
  {
    label: 'Principal',
    items: [
      { label: 'Tableau de bord', icon: LayoutDashboard, href: '/dashboard',           plan: null,                             walkthroughId: 'nav-dashboard' },
      { label: 'Analytiques',    icon: BarChart3,       href: '/dashboard/analytics', plan: null,                             walkthroughId: undefined },
    ],
  },
  {
    label: 'Opérations',
    items: [
      { label: 'Plannings',       icon: CalendarClock, href: '/dashboard/schedules',         plan: null,                             walkthroughId: undefined },
      { label: 'Voyages',         icon: Bus,           href: '/dashboard/trips',             plan: null,                             walkthroughId: 'nav-trips' },
      { label: 'Réservations',    icon: Ticket,        href: '/dashboard/bookings',          plan: null,                             walkthroughId: undefined },
      { label: 'Billetterie',     icon: ConciergeBell, href: '/dashboard/billetterie',       plan: null,                             walkthroughId: 'nav-billetterie' },
      { label: 'Colis',           icon: Package,       href: '/dashboard/parcels',           plan: ['PROFESSIONAL', 'ENTERPRISE'],   walkthroughId: undefined },
      { label: 'Livraisons dom.', icon: Home,          href: '/dashboard/delivery-requests', plan: ['PROFESSIONAL', 'ENTERPRISE'],   walkthroughId: undefined },
      { label: 'Bagages',         icon: Luggage,       href: '/dashboard/luggage',           plan: null,                             walkthroughId: undefined },
      { label: 'Scanner billets', icon: ScanLine,      href: '/dashboard/scanner',           plan: null,                             walkthroughId: undefined },
      { label: 'Itinéraires',     icon: Route,         href: '/dashboard/routes',            plan: null,                             walkthroughId: undefined },
      { label: 'Modèles tickets', icon: TicketCheck,   href: '/dashboard/ticket-templates',  plan: null,                             walkthroughId: undefined },
      { label: 'Rapports',        icon: FileText,      href: '/dashboard/reports',           plan: null,                             walkthroughId: undefined },
      { label: 'Dépenses',        icon: Receipt,       href: '/dashboard/expenses',          plan: null,                             walkthroughId: undefined },
      { label: 'Approv. caisse',  icon: Wallet,        href: '/dashboard/cash-provisions',   plan: null,                             walkthroughId: undefined },
    ],
  },
  {
    label: 'Ressources',
    items: [
      { label: 'Gares',      icon: Building2, href: '/dashboard/stations', plan: null, walkthroughId: undefined },
      { label: 'Véhicules',  icon: Truck,     href: '/dashboard/vehicles', plan: null, walkthroughId: 'nav-vehicles' },
      { label: 'Chauffeurs', icon: Users,     href: '/dashboard/drivers',  plan: null, walkthroughId: 'nav-drivers' },
      { label: 'Équipe',     icon: UserCog,   href: '/dashboard/team',     plan: null, walkthroughId: undefined },
    ],
  },
  {
    label: 'Compte',
    items: [
      { label: 'Campagnes',    icon: Megaphone,  href: '/dashboard/campaigns',    plan: null, walkthroughId: undefined },
      { label: 'Reversements', icon: Banknote,   href: '/dashboard/settlements',  plan: null, walkthroughId: undefined },
      { label: 'Relevés',      icon: BookOpen,   href: '/dashboard/statements',   plan: null, walkthroughId: undefined },
      { label: 'API & Webhooks', icon: KeyRound,  href: '/dashboard/developers',   plan: null, walkthroughId: undefined, role: 'COMPANY_OWNER' },
      { label: 'Abonnement',   icon: CreditCard, href: '/dashboard/subscription', plan: null, walkthroughId: undefined },
      { label: 'Paramètres',   icon: Settings,   href: '/dashboard/settings',     plan: null, walkthroughId: 'nav-settings' },
    ],
  },
];

function getSubBadge(tenant: any): { text: string; className: string } | null {
  if (!tenant) return null;
  const { status, trialEndsAt, subscriptionEndsAt } = tenant;
  if (status === 'SUSPENDED') return { text: 'Suspendu', className: 'bg-red-500/20 text-red-400' };
  if (status === 'CANCELLED') return { text: 'Annulé',   className: 'bg-gray-500/20 text-gray-400' };
  if (status === 'TRIAL') {
    const endsAt = trialEndsAt ? new Date(trialEndsAt) : null;
    if (!endsAt) return { text: 'Essai', className: 'bg-blue-500/20 text-blue-400' };
    const daysLeft = Math.ceil((endsAt.getTime() - Date.now()) / 86400000);
    if (daysLeft <= 0) return { text: 'Expiré',           className: 'bg-red-500/20 text-red-400' };
    if (daysLeft <= 7) return { text: `Essai · J-${daysLeft}`, className: 'bg-orange-500/20 text-orange-400' };
    return { text: 'Essai', className: 'bg-blue-500/20 text-blue-400' };
  }
  if (status === 'ACTIVE' && subscriptionEndsAt) {
    const daysLeft = Math.ceil((new Date(subscriptionEndsAt).getTime() - Date.now()) / 86400000);
    if (daysLeft > 0 && daysLeft <= 7) return { text: `J-${daysLeft}`, className: 'bg-orange-500/20 text-orange-400' };
  }
  return null;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth, refreshToken } = useAuthStore();

  const { pendingHref, setPendingHref } = useNavStore();
  useEffect(() => { setPendingHref(null); }, [pathname]);

  const isSuperAdmin   = user?.role === 'SUPER_ADMIN';
  const canFetchTenant = user?.role === 'COMPANY_OWNER' || user?.role === 'COMPANY_ADMIN';

  const { data: tenantRaw } = useQuery({
    queryKey: ['tenant-me'],
    queryFn: () => tenantsApi.me() as any,
    enabled: canFetchTenant,
    staleTime: 5 * 60 * 1000,
  });
  const tenant = tenantRaw as any;

  async function handleLogout() {
    try { await authApi.logout(refreshToken ?? undefined); } catch {}
    disconnectSocket();
    clearAuth();
    toast.success('Déconnecté');
    router.push('/login');
  }

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <aside className="w-64 bg-canvas flex flex-col h-full shrink-0 border-r border-white/[0.04]">
      {/* ── Logo area ── */}
      <Link href="/dashboard" className="px-4 py-4 border-b border-white/[0.05] flex hover:bg-white/[0.02] transition-colors duration-150">
        <div className="flex items-center gap-3 min-w-0 w-full">
          {tenant?.logo ? (
            <img
              src={tenant.logo}
              alt={tenant.sigle ?? tenant.name ?? 'logo'}
              className="w-9 h-9 rounded-xl object-contain bg-white shrink-0"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          ) : tenant?.sigle ? (
            <div className="bg-brand-500 text-white rounded-xl px-2.5 py-1.5 text-sm font-bold shrink-0 shadow-md shadow-brand-500/25 tracking-wider">
              {tenant.sigle}
            </div>
          ) : (
            <div className="bg-brand-500 text-white rounded-xl p-2 shadow-md shadow-brand-500/25 shrink-0">
              <Bus size={18} />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-white text-[13px] truncate">
              {tenant?.sigle ?? tenant?.name ?? 'TransPro CI'}
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              {tenant?.name && tenant.sigle ? tenant.name : 'Gestion transport'}
            </p>
          </div>
        </div>
      </Link>

      {/* ── Nav ── */}
      <nav className="flex-1 px-2.5 py-3 overflow-y-auto scrollbar-dark">
        {/* Super-admin section */}
        {isSuperAdmin && (
          <div>
            <p className="px-3 mb-1.5 text-[11px] font-medium text-amber-600/80">
              Super Admin
            </p>
            <div className="space-y-px">
              {[
                { label: 'Tableau de bord', icon: LayoutDashboard, href: '/dashboard/admin' },
                { label: 'Compagnies',      icon: ShieldCheck,     href: '/dashboard/admin/tenants' },
                { label: 'Utilisateurs',    icon: Users,           href: '/dashboard/admin/users' },
                { label: 'Facturation',     icon: CreditCard,      href: '/dashboard/admin/billing' },
                { label: 'Reversements',    icon: Banknote,        href: '/dashboard/admin/settlements' },
                { label: 'Villes',          icon: MapPin,          href: '/dashboard/cities' },
                { label: 'Paramètres',      icon: Settings,        href: '/dashboard/settings' },
              ].map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                const loading = pendingHref === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => { if (pathname !== item.href) setPendingHref(item.href); }}
                    className={clsx(
                      'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors duration-100',
                      active
                        ? 'bg-amber-500/[0.14] text-amber-200'
                        : 'text-slate-400/80 hover:text-slate-200 hover:bg-white/[0.04]',
                    )}
                  >
                    <item.icon size={15} className={clsx(active ? 'text-amber-400' : 'text-slate-500')} />
                    <span className="flex-1">{item.label}</span>
                    {loading && <Loader2 size={12} className="animate-spin text-amber-400 shrink-0" />}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Company nav */}
        {!isSuperAdmin && navGroups.map((group, gi) => (
          <div key={group.label} className={gi > 0 ? 'mt-3 pt-3 border-t border-white/[0.05]' : ''}>
            <p className="px-3 mb-1.5 text-[11px] font-medium text-slate-600">
              {group.label}
            </p>
            <div className="space-y-px">
              {group.items
                .filter((item) => !(item as any).role || (item as any).role === user?.role)
                .map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
                const badge = item.href === '/dashboard/subscription' ? getSubBadge(tenant) : null;
                const locked = item.plan !== null && !item.plan?.includes(tenant?.plan);
                const loading = pendingHref === item.href;

                if (locked) {
                  return (
                    <div
                      key={item.href}
                      title={`Disponible à partir du plan ${item.plan![0]}`}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium opacity-35 cursor-not-allowed select-none"
                    >
                      <item.icon size={15} className="text-slate-500" />
                      <span className="flex-1 text-slate-400">{item.label}</span>
                      <Lock size={11} className="text-slate-600" />
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => { if (pathname !== item.href) setPendingHref(item.href); }}
                    {...(item.walkthroughId ? { 'data-walkthrough': item.walkthroughId } : {})}
                    className={clsx(
                      'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors duration-100',
                      active
                        ? 'bg-white/[0.07] text-white'
                        : 'text-slate-400/80 hover:text-slate-200 hover:bg-white/[0.04]',
                    )}
                  >
                    <item.icon
                      size={15}
                      className={clsx(active ? 'text-brand-400' : 'text-slate-500')}
                    />
                    <span className="flex-1">{item.label}</span>
                    {loading
                      ? <Loader2 size={12} className="animate-spin text-brand-400 shrink-0" />
                      : badge && (
                        <span className={clsx('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', badge.className)}>
                          {badge.text}
                        </span>
                      )
                    }
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── User footer ── */}
      <div className="px-2.5 py-3 border-t border-white/[0.05]">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
          <div className="w-7 h-7 bg-brand-500/20 text-brand-400 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0">
            {initials}
          </div>
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
  );
}
