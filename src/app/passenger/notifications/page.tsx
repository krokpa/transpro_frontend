'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { notificationsApi } from '@/lib/api';
import {
  Bell, Loader2, CheckCheck, ArrowRight,
  Info, CheckCircle, XCircle, AlertTriangle, Clock,
} from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import relativeTime from 'dayjs/plugin/relativeTime';
import { toast } from 'sonner';

dayjs.locale('fr');
dayjs.extend(relativeTime);

const TYPE_STYLE: Record<string, { icon: any; cls: string }> = {
  BOOKING_CONFIRMED: { icon: CheckCircle,   cls: 'text-green-500 bg-green-50' },
  BOOKING_CANCELLED: { icon: XCircle,       cls: 'text-red-500 bg-red-50' },
  TRIP_DELAYED:      { icon: Clock,         cls: 'text-yellow-500 bg-yellow-50' },
  TRIP_CANCELLED:    { icon: AlertTriangle, cls: 'text-red-500 bg-red-50' },
  PAYMENT_SUCCESS:   { icon: CheckCircle,   cls: 'text-green-500 bg-green-50' },
  PAYMENT_FAILED:    { icon: XCircle,       cls: 'text-red-500 bg-red-50' },
  TICKET_READY:      { icon: CheckCircle,   cls: 'text-brand-500 bg-brand-50' },
  BOARDING_REMINDER: { icon: Bell,          cls: 'text-blue-500 bg-blue-50' },
};

export default function NotificationsPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data: raw, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list() as any,
  });
  const notifications: any[] = Array.isArray(raw) ? raw : [];
  const unread = notifications.filter((n) => !n.isRead).length;

  const markReadMut = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id) as any,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-count'] });
    },
  });

  const markAllMut = useMutation({
    mutationFn: () => notificationsApi.markAllRead() as any,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-count'] });
      toast.success('Toutes les notifications marquées comme lues');
    },
  });

  function handleClick(n: any) {
    if (!n.isRead) markReadMut.mutate(n.id);
    const bookingId = n.data?.bookingId;
    if (bookingId) router.push(`/passenger/bookings/${bookingId}`);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {unread > 0 ? `${unread} non lue${unread > 1 ? 's' : ''}` : 'Tout est à jour'}
          </p>
        </div>
        {unread > 0 && (
          <button
            onClick={() => markAllMut.mutate()}
            disabled={markAllMut.isPending}
            className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium transition disabled:opacity-50 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg"
          >
            <CheckCheck size={15} /> Tout marquer lu
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-brand-500" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Bell size={24} className="text-gray-300" />
          </div>
          <p className="font-semibold text-gray-700">Aucune notification</p>
          <p className="text-sm text-gray-400 mt-1">Vous serez notifié ici de vos réservations et voyages</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const style = TYPE_STYLE[n.type] ?? { icon: Info, cls: 'text-gray-500 bg-gray-50' };
            const Icon = style.icon;
            const hasLink = !!n.data?.bookingId;
            return (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className={`bg-white rounded-xl border p-4 flex items-start gap-4 transition ${
                  !n.isRead ? 'border-brand-200 bg-brand-50/20' : 'border-gray-100'
                } ${hasLink ? 'cursor-pointer hover:shadow-sm hover:border-brand-300' : ''}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${style.cls}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold ${n.isRead ? 'text-gray-700' : 'text-gray-900'}`}>
                      {n.title}
                    </p>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5 leading-snug">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1.5">{dayjs(n.createdAt).fromNow()}</p>
                </div>
                {hasLink && <ArrowRight size={15} className="text-gray-300 shrink-0 mt-1" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
