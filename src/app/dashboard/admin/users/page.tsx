'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { Search, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { useViewMode } from '@/hooks/useViewMode';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
dayjs.locale('fr');

const ROLE_OPTIONS = [
  { value: '', label: 'Tous les rôles' },
  { value: 'COMPANY_OWNER', label: 'Propriétaires' },
  { value: 'COMPANY_ADMIN', label: 'Admins' },
  { value: 'COMPANY_AGENT', label: 'Agents' },
  { value: 'PASSENGER', label: 'Passagers' },
];

const ROLE_LABELS: Record<string, { label: string; cls: string }> = {
  COMPANY_OWNER: { label: 'Propriétaire', cls: 'bg-purple-100 text-purple-700' },
  COMPANY_ADMIN: { label: 'Admin',        cls: 'bg-blue-100 text-blue-700' },
  COMPANY_AGENT: { label: 'Agent',        cls: 'bg-amber-100 text-amber-700' },
  PASSENGER:     { label: 'Passager',     cls: 'bg-gray-100 text-gray-600' },
};

export default function AdminUsersPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useViewMode('admin-users');

  if (user?.role !== 'SUPER_ADMIN') {
    router.replace('/dashboard');
    return null;
  }

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search, role],
    queryFn: () => adminApi.allUsers({ page, limit: 30, search: search || undefined, role: role || undefined }) as any,
    staleTime: 30_000,
  });

  const users: any[] = data?.data ?? [];
  const meta = data?.meta;

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
          <p className="text-sm text-gray-500 mt-1">Tous les utilisateurs de la plateforme</p>
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle value={viewMode} onChange={setViewMode} />
          {meta && (
            <div className="bg-gray-100 text-gray-700 text-sm font-semibold px-3 py-1.5 rounded-xl flex items-center gap-2">
              <Users size={14} />
              {meta.total.toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-3 flex-wrap">
        <form onSubmit={handleSearch} className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Nom, email, téléphone…"
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300 w-64"
          />
        </form>
        <select
          value={role}
          onChange={(e) => { setRole(e.target.value); setPage(1); }}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Table / Grid */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">Aucun utilisateur trouvé</div>
      ) : viewMode === 'list' ? (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-500 text-xs">Utilisateur</th>
                  <th className="px-4 py-3 font-semibold text-gray-500 text-xs">Rôle</th>
                  <th className="px-4 py-3 font-semibold text-gray-500 text-xs">Compagnie</th>
                  <th className="px-4 py-3 font-semibold text-gray-500 text-xs">Statut</th>
                  <th className="px-4 py-3 font-semibold text-gray-500 text-xs hidden md:table-cell">Inscrit le</th>
                  <th className="px-4 py-3 font-semibold text-gray-500 text-xs hidden lg:table-cell">Dernière cnx</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u) => {
                  const rc = ROLE_LABELS[u.role] ?? { label: u.role, cls: 'bg-gray-100 text-gray-600' };
                  return (
                    <tr key={u.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                        <p className="text-xs text-gray-400">{u.phone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${rc.cls}`}>{rc.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        {u.tenant ? (
                          <span className="text-xs text-gray-600">{u.tenant.name}</span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {u.isActive ? 'Actif' : 'Désactivé'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 hidden md:table-cell">
                        {dayjs(u.createdAt).format('DD/MM/YYYY')}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 hidden lg:table-cell">
                        {u.lastLoginAt ? dayjs(u.lastLoginAt).format('DD/MM/YY HH:mm') : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {meta && meta.totalPages > 1 && (
            <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Page {meta.page} / {meta.totalPages} · {meta.total} utilisateurs
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  disabled={page === meta.totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {users.map((u) => {
              const rc = ROLE_LABELS[u.role] ?? { label: u.role, cls: 'bg-gray-100 text-gray-600' };
              return (
                <div key={u.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{u.firstName} {u.lastName}</p>
                      <p className="text-xs text-gray-400 truncate">{u.email}</p>
                      {u.phone && <p className="text-xs text-gray-400 font-mono">{u.phone}</p>}
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${rc.cls}`}>{rc.label}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {u.isActive ? 'Actif' : 'Désactivé'}
                    </span>
                    {u.tenant && (
                      <span className="text-xs text-gray-500 truncate">{u.tenant.name}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 pt-1 border-t border-gray-50">
                    Inscrit le {dayjs(u.createdAt).format('DD/MM/YYYY')}
                    {u.lastLoginAt && <> · cnx {dayjs(u.lastLoginAt).format('DD/MM/YY')}</>}
                  </p>
                </div>
              );
            })}
          </div>
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-1 py-2">
              <p className="text-xs text-gray-500">Page {meta.page} / {meta.totalPages} · {meta.total} utilisateurs</p>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
                  <ChevronLeft size={14} />
                </button>
                <button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
