'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Bus, Route, Users, Ticket,
  Settings, LogOut, Truck, CalendarClock, TicketCheck, ConciergeBell, ScanLine, BarChart3, FileText, Building2,
  ShieldCheck, MapPin, CreditCard, UserCog, Package, Lock, Home, Luggage, Megaphone,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { authApi, tenantsApi } from '@/lib/api';
import { disconnectSocket } from '@/lib/socket';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';

const navGroups = [
  {
    label: 'Principal',
    items: [
      { label: 'Tableau de bord', icon: LayoutDashboard, href: '/dashboard',           plan: null },
      { label: 'Analytiques',    icon: BarChart3,       href: '/dashboard/analytics', plan: null },
    ],
  },
  {
    label: 'Opérations',
    items: [
      { label: 'Plannings',       icon: CalendarClock, href: '/dashboard/schedules',         plan: null },
      { label: 'Voyages',         icon: Bus,           href: '/dashboard/trips',             plan: null },
      { label: 'Réservations',    icon: Ticket,        href: '/dashboard/bookings',          plan: null },
      { label: 'Billetterie',     icon: ConciergeBell, href: '/dashboard/billetterie',       plan: null },
      { label: 'Colis',           icon: Package,       href: '/dashboard/parcels',           plan: ['PROFESSIONAL', 'ENTERPRISE'] },
      { label: 'Livraisons dom.', icon: Home,          href: '/dashboard/delivery-requests', plan: ['PROFESSIONAL', 'ENTERPRISE'] },
      { label: 'Bagages',         icon: Luggage,       href: '/dashboard/luggage',           plan: null },
      { label: 'Scanner billets', icon: ScanLine,      href: '/dashboard/scanner',           plan: null },
      { label: 'Itinéraires',     icon: Route,         href: '/dashboard/routes',            plan: null },
      { label: 'Modèles tickets', icon: TicketCheck,   href: '/dashboard/ticket-templates',  plan: null },
      { label: 'Rapports',        icon: FileText,      href: '/dashboard/reports',           plan: null },
    ],
  },
  {
    label: 'Ressources',
    items: [
      { label: 'Gares',      icon: Building2, href: '/dashboard/stations', plan: null },
      { label: 'Véhicules',  icon: Truck,     href: '/dashboard/vehicles', plan: null },
      { label: 'Chauffeurs', icon: Users,     href: '/dashboard/drivers',  plan: null },
      { label: 'Équipe',     icon: UserCog,   href: '/dashboard/team',     plan: null },
    ],
  },
  {
    label: 'Compte',
    items: [
      { label: 'Campagnes',  icon: Megaphone,  href: '/dashboard/campaigns',    plan: null },
      { label: 'Abonnement', icon: CreditCard, href: '/dashboard/subscription', plan: null },
      { label: 'Paramètres', icon: Settings,   href: '/dashboard/settings',     plan: null },
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
    <aside className="w-64 bg-[#0c1425] flex flex-col h-full shrink-0 border-r border-white/[0.04]">
      {/* ── Logo area ── */}
      <Link href="/dashboard" className="px-5 py-5 border-b border-white/[0.06] flex hover:bg-white/[0.03] transition-colors duration-150">
        <div className="flex items-center gap-3 min-w-0 w-full">
          {tenant?.logo ? (
            <img
              src={tenant.logo}
              alt={tenant.sigle ?? tenant.name ?? 'logo'}
              className="w-10 h-10 rounded-xl object-contain bg-white shrink-0"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          ) : tenant?.sigle ? (
            <div className="bg-brand-500 text-white rounded-xl px-2.5 py-1.5 text-sm font-bold shrink-0 shadow-lg shadow-brand-500/30 tracking-wider">
              {tenant.sigle}
            </div>
          ) : (
            <div className="bg-brand-500 text-white rounded-xl p-2 shadow-lg shadow-brand-500/30 shrink-0">
              <Bus size={20} />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-bold text-white text-sm tracking-wide truncate">
              {tenant?.sigle ?? tenant?.name ?? 'TransPro CI'}
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              {tenant?.name && tenant.sigle ? tenant.name : 'Gestion transport'}
            </p>
          </div>
        </div>
      </Link>

      {/* ── Nav ── */}
      <nav className="flex-1 px-3 py-5 overflow-y-auto space-y-5 scrollbar-dark">
        {/* Super-admin section */}
        {isSuperAdmin && (
          <div>
            <p className="px-3 mb-2 text-[10px] font-semibold text-amber-500/80 uppercase tracking-[0.1em]">
              Super Admin
            </p>
            <div className="space-y-0.5">
              {[
                { label: 'Tableau de bord', icon: LayoutDashboard, href: '/dashboard/admin' },
                { label: 'Compagnies',      icon: ShieldCheck,     href: '/dashboard/admin/tenants' },
                { label: 'Utilisateurs',    icon: Users,           href: '/dashboard/admin/users' },
                { label: 'Facturation',     icon: CreditCard,      href: '/dashboard/admin/billing' },
                { label: 'Villes',          icon: MapPin,          href: '/dashboard/cities' },
                { label: 'Paramètres',      icon: Settings,        href: '/dashboard/settings' },
              ].map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                      active
                        ? 'bg-amber-500/[0.12] text-amber-300 shadow-[inset_3px_0_0_#f59e0b]'
                        : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-200',
                    )}
                  >
                    <item.icon size={16} className={clsx(active ? 'text-amber-400' : 'text-slate-500')} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Company nav */}
        {!isSuperAdmin && navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-[0.1em]">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
                const badge = item.href === '/dashboard/subscription' ? getSubBadge(tenant) : null;
                const locked = item.plan !== null && !item.plan?.includes(tenant?.plan);

                if (locked) {
                  return (
                    <div
                      key={item.href}
                      title={`Disponible à partir du plan ${item.plan![0]}`}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium opacity-40 cursor-not-allowed select-none"
                    >
                      <item.icon size={16} className="text-slate-500" />
                      <span className="flex-1 text-slate-500">{item.label}</span>
                      <Lock size={11} className="text-slate-600" />
                    </div>
                  );
                }

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
                    <item.icon
                      size={16}
                      className={clsx(active ? 'text-brand-400' : 'text-slate-500')}
                    />
                    <span className="flex-1">{item.label}</span>
                    {badge && (
                      <span className={clsx('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', badge.className)}>
                        {badge.text}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── User footer ── */}
      <div className="px-3 py-4 border-t border-white/[0.06] space-y-0.5">
        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="w-8 h-8 bg-brand-500/20 text-brand-400 rounded-full ring-1 ring-brand-500/25 flex items-center justify-center text-xs font-bold shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/[0.06] rounded-lg transition-all duration-150"
        >
          <LogOut size={15} />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
