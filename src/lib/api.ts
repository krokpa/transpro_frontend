import axios, { AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

/**
 * Extrait le message d'erreur lisible depuis une erreur axios API.
 * Le filtre NestJS retourne { error: string, details?: { message } }.
 */
export function apiError(err: any, fallback = 'Une erreur est survenue'): string {
  const data = err?.response?.data;
  if (!data) return fallback;
  // Format du HttpExceptionFilter : { error: string, details?: { message } }
  if (typeof data.error === 'string' && data.error.length > 0) return data.error;
  if (typeof data.details?.message === 'string') return data.details.message;
  if (typeof data.message === 'string') return data.message;
  return fallback;
}

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Injecter le token JWT sur chaque requête
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Gestion expiration token — refresh automatique
api.interceptors.response.use(
  (res) => res.data.data ?? res.data,
  async (error: AxiosError) => {
    const original = error.config as any;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          const { accessToken } = res.data.data;
          localStorage.setItem('access_token', accessToken);
          original.headers.Authorization = `Bearer ${accessToken}`;
          return api(original);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  },
);

// Helpers typés
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: any) => api.post('/auth/register', data),
  refresh: (refreshToken: string) =>
    axios.post(`${API_URL}/auth/refresh`, { refreshToken }).then((r) => r.data.data ?? r.data),
  me: () => api.get('/auth/me'),
  logout: (refreshToken?: string) => api.post('/auth/logout', { refreshToken }),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),
};

export const tripsApi = {
  create: (data: any) => api.post('/trips', data),
  list: (params?: any) => api.get('/trips', { params }),
  get: (id: string) => api.get(`/trips/${id}`),
  getSeats: (id: string) => api.get(`/trips/${id}/seats`),
  updateStatus: (id: string, data: any) => api.patch(`/trips/${id}/status`, data),
  toggleSeatBlock: (tripId: string, seatNumber: string) =>
    api.patch(`/trips/${tripId}/seats/${seatNumber}/toggle-block`),
  getSeatBooking: (tripId: string, seatNumber: string) =>
    api.get(`/trips/${tripId}/seats/${seatNumber}/booking`),
  search: (params: { origin: string; destination: string; date: string; passengers?: number; tripClass?: string; tenantSlug?: string; departureStationId?: string }) =>
    api.get('/trips/search', {
      params: {
        origin: params.origin,
        destination: params.destination,
        departureDate: params.date,
        passengers: params.passengers,
        tripClass: params.tripClass,
        tenantSlug: params.tenantSlug,
        departureStationId: params.departureStationId,
      },
    }),
};

export const bookingsApi = {
  create: (data: any) => api.post('/bookings', data),
  guichet: (data: any) => api.post('/bookings/guichet', data),
  myBookings: () => api.get('/bookings/my'),
  tenantBookings: (params?: any) => api.get('/bookings', { params }),
  get: (id: string) => api.get(`/bookings/${id}`),
  getMine: (id: string) => api.get(`/bookings/my/${id}`),
  rate: (id: string, data: { rating: number; comment?: string }) => api.post(`/bookings/my/${id}/rate`, data),
  cancel: (id: string) => api.delete(`/bookings/${id}`),
};

export const paymentsApi = {
  initiate: (bookingId: string) => api.post(`/payments/bookings/${bookingId}/pay`, {}),
  checkStatus: (paymentId: string) => api.patch(`/payments/${paymentId}/check-status`),
  checkStatusByBooking: (bookingId: string) => api.patch(`/payments/bookings/${bookingId}/check-status`),
  confirmFromRedirect: (bookingId: string) => api.post(`/payments/bookings/${bookingId}/confirm-from-redirect`),
  scanTicket: (qrData: string) => api.post('/payments/tickets/scan', { qrData }),
  myPayments: () => api.get('/payments/my'),
};

export const routesApi = {
  create: (data: any) => api.post('/routes', data),
  list: () => api.get('/routes'),
  get: (id: string) => api.get(`/routes/${id}`),
  update: (id: string, data: any) => api.patch(`/routes/${id}`, data),
  remove: (id: string) => api.delete(`/routes/${id}`),
};

export const vehiclesApi = {
  create: (data: any) => api.post('/vehicles', data),
  list: () => api.get('/vehicles'),
  get: (id: string) => api.get(`/vehicles/${id}`),
  update: (id: string, data: any) => api.patch(`/vehicles/${id}`, data),
  maintenanceAlerts: () => api.get('/vehicles/maintenance-alerts'),
  getFuelLogs: (id: string) => api.get(`/vehicles/${id}/fuel-logs`),
  addFuelLog: (id: string, data: any) => api.post(`/vehicles/${id}/fuel-logs`, data),
  deleteFuelLog: (id: string, logId: string) => api.delete(`/vehicles/${id}/fuel-logs/${logId}`),
  getMaintenanceLogs: (id: string) => api.get(`/vehicles/${id}/maintenance-logs`),
  addMaintenanceLog: (id: string, data: any) => api.post(`/vehicles/${id}/maintenance-logs`, data),
  deleteMaintenanceLog: (id: string, logId: string) => api.delete(`/vehicles/${id}/maintenance-logs/${logId}`),
};

export const driversApi = {
  create: (data: any) => api.post('/drivers', data),
  list: () => api.get('/drivers'),
  get: (id: string) => api.get(`/drivers/${id}`),
  update: (id: string, data: any) => api.patch(`/drivers/${id}`, data),
  remove: (id: string) => api.delete(`/drivers/${id}`),
  getSchedule: (id: string, month: string) => api.get(`/drivers/${id}/schedule`, { params: { month } }),
  getAbsences: (id: string) => api.get(`/drivers/${id}/absences`),
  addAbsence: (id: string, data: any) => api.post(`/drivers/${id}/absences`, data),
  updateAbsence: (id: string, absenceId: string, data: any) => api.patch(`/drivers/${id}/absences/${absenceId}`, data),
  deleteAbsence: (id: string, absenceId: string) => api.delete(`/drivers/${id}/absences/${absenceId}`),
  getEvaluations: (id: string) => api.get(`/drivers/${id}/evaluations`),
  addEvaluation: (id: string, data: any) => api.post(`/drivers/${id}/evaluations`, data),
  deleteEvaluation: (id: string, evalId: string) => api.delete(`/drivers/${id}/evaluations/${evalId}`),
};

export const tenantsApi = {
  listPublic: () => api.get('/tenants/public'),
  getBySlug: (slug: string) => api.get(`/tenants/slug/${slug}`),
  create: (data: any) => api.post('/tenants', data),
  me: () => api.get('/tenants/me'),
  update: (data: any) => api.patch('/tenants/me', data),
  stats: () => api.get('/tenants/me/stats'),
  analytics: (period: string) => api.get('/tenants/me/analytics', { params: { period } }),
  subscriptions: () => api.get('/tenants/me/subscriptions'),
  usage: () => api.get('/tenants/me/usage'),
  // Super-admin
  list: () => api.get('/tenants'),
  getById: (id: string) => api.get(`/tenants/${id}`),
  updateById: (id: string, data: any) => api.patch(`/tenants/${id}`, data),
};

export const schedulesApi = {
  list: () => api.get('/schedules'),
  get: (id: string) => api.get(`/schedules/${id}`),
  create: (data: any) => api.post('/schedules', data),
  update: (id: string, data: any) => api.patch(`/schedules/${id}`, data),
  remove: (id: string) => api.delete(`/schedules/${id}`),
  generate: (id: string, daysAhead?: number) =>
    api.post(`/schedules/${id}/generate`, { daysAhead }),
  generateAll: (daysAhead?: number) =>
    api.post('/schedules/generate-all', { daysAhead }),
};

export const ticketTemplatesApi = {
  list: () => api.get('/ticket-templates'),
  get: (id: string) => api.get(`/ticket-templates/${id}`),
  getDefault: () => api.get('/ticket-templates/default'),
  create: (data: any) => api.post('/ticket-templates', data),
  update: (id: string, data: any) => api.patch(`/ticket-templates/${id}`, data),
  setDefault: (id: string) => api.patch(`/ticket-templates/${id}/set-default`),
  duplicate: (id: string) => api.post(`/ticket-templates/${id}/duplicate`),
  remove: (id: string) => api.delete(`/ticket-templates/${id}`),
};

export const stationsPublicApi = {
  getInfo: (id: string) => api.get(`/stations/${id}/info`),
};

export const notificationsApi = {
  list: (onlyUnread?: boolean) => api.get('/notifications/my', { params: { onlyUnread } }),
  count: () => api.get('/notifications/my/count'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

export const campaignsApi = {
  getConfig: () => api.get('/notifications/campaigns/config').then((r) => r.data?.data ?? r.data),
  updateConfig: (data: Record<string, unknown>) =>
    api.put('/notifications/campaigns/config', data).then((r) => r.data?.data ?? r.data),
  getPublicConfig: (tenantId: string) =>
    api.get(`/notifications/campaigns/config/tenant/${tenantId}`).then((r) => r.data?.data ?? r.data),
};

export const usersApi = {
  updateProfile: (data: { firstName?: string; lastName?: string; phone?: string; preferredLang?: string }) =>
    api.patch('/users/profile', data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/users/change-password', { currentPassword, newPassword }),
  updateAvatar: (avatar: string) =>
    api.patch('/users/avatar', { avatar }),
  lookupByPhone: (phone: string) =>
    api.get('/users/lookup', { params: { phone } }),
};

export const teamApi = {
  list: () => api.get('/users/team'),
  invite: (data: { firstName: string; lastName: string; email: string; phone?: string; password: string; role: string }) =>
    api.post('/users/invite', data),
  updateRole: (id: string, role: string) => api.patch(`/users/${id}/role`, { role }),
  remove: (id: string) => api.delete(`/users/${id}/from-tenant`),
};

// ─── Super Admin ────────────────────────────────────────────────────────────

export const billingApi = {
  subscribe: (plan: string) => api.post('/billing/subscribe', { plan }),
  confirmFromRedirect: (subscriptionId: string) =>
    api.patch(`/billing/subscriptions/${subscriptionId}/confirm`),
  runCheck: () => api.post('/billing/run-check'),
};

export const adminApi = {
  platformStats: () => api.get('/tenants/admin/platform-stats'),
  allUsers: (params?: { page?: number; limit?: number; search?: string; role?: string }) =>
    api.get('/tenants/admin/users', { params }),
  tenantFullDetail: (id: string) => api.get(`/tenants/${id}/full-detail`),
  runBillingCheck: () => api.post('/billing/run-check'),
};

export const citiesApi = {
  list: (search?: string) => api.get('/cities', { params: search ? { search } : {} }),
  create: (data: { name: string; region?: string; code?: string }) => api.post('/cities', data),
  update: (id: string, data: { name?: string; region?: string; code?: string; isActive?: boolean }) =>
    api.patch(`/cities/${id}`, data),
  remove: (id: string) => api.delete(`/cities/${id}`),
};

export const parcelsApi = {
  list: (params?: { tripId?: string; status?: string; date?: string }) =>
    api.get('/parcels', { params }),
  create: (data: any) => api.post('/parcels', data),
  get: (id: string) => api.get(`/parcels/${id}`),
  updateStatus: (id: string, data: { status: string; notes?: string }) =>
    api.patch(`/parcels/${id}/status`, data),
  byTrip: (tripId: string) => api.get(`/parcels/trip/${tripId}`),
  track: (code: string) => api.get(`/parcels/track/${code}`),
  estimateFee: (tripId: string, weightKg: number) =>
    api.get('/parcels/estimate-fee', { params: { tripId, weightKg } }),

  // Delivery requests
  getDeliveryRequest: (parcelId: string) =>
    api.get(`/parcels/${parcelId}/delivery-request`),
  createDeliveryRequest: (parcelId: string, data: any) =>
    api.post(`/parcels/${parcelId}/delivery-request`, data),
  cancelDeliveryRequest: (parcelId: string) =>
    api.delete(`/parcels/${parcelId}/delivery-request`),
  listDeliveryRequests: (params?: { status?: string }) =>
    api.get('/parcels/delivery-requests', { params }),
  updateDeliveryRequest: (reqId: string, data: any) =>
    api.patch(`/parcels/delivery-requests/${reqId}`, data),
  // Public (by tracking code)
  trackDeliveryRequest: (code: string) =>
    api.get(`/parcels/track/${code}/delivery-request`),
  createDeliveryRequestByCode: (code: string, data: any) =>
    api.post(`/parcels/track/${code}/delivery-request`, data),
};

export const luggageApi = {
  declare: (data: {
    bookingId: string;
    bagCount: number;
    totalWeightKg?: number;
    freeWeightKg?: number;
    excessPaid?: boolean;
    excessPaymentMethod?: string;
    bagLabels?: string[];
    bagWeights?: number[];
  }) => api.post('/luggage/declare', data),
  getByBooking:     (bookingId: string) => api.get(`/luggage/booking/${bookingId}`),
  getMyLuggage:     (bookingId: string) => api.get(`/luggage/my/${bookingId}`),
  getByTrip:        (tripId: string)    => api.get(`/luggage/trip/${tripId}`),
  list:             (params?: { tripId?: string; status?: string }) => api.get('/luggage', { params }),
  scanBag:          (qrCode: string, tripId?: string) => api.post('/luggage/scan', { qrCode, tripId }),
  reportMissing:    (bagId: string, note?: string)   => api.patch(`/luggage/bags/${bagId}/missing`, { note }),
  reportMissingPublic: (qrCode: string, note?: string) => api.post('/luggage/bags/report-missing', { qrCode, note }),
};

export const stationsApi = {
  list: () => api.get('/stations'),
  byCity: (city: string) => api.get('/stations/by-city', { params: { city } }),
  get: (id: string) => api.get(`/stations/${id}`),
  create: (data: any) => api.post('/stations', data),
  update: (id: string, data: any) => api.patch(`/stations/${id}`, data),
  remove: (id: string) => api.delete(`/stations/${id}`),
  getMembers: (id: string) => api.get(`/stations/${id}/members`),
  assignMember: (id: string, data: { userId: string; isPrimary?: boolean }) =>
    api.post(`/stations/${id}/members`, data),
  removeMember: (id: string, userId: string) => api.delete(`/stations/${id}/members/${userId}`),
  getDashboard: (id: string) => api.get(`/stations/${id}/dashboard`),
  getTodayTrips: (id: string, date?: string) => api.get(`/stations/${id}/trips`, { params: date ? { date } : {} }),
  getBookings: (id: string, params?: any) => api.get(`/stations/${id}/bookings`, { params }),
  getCaisse: (id: string, date?: string) => api.get(`/stations/${id}/caisse`, { params: date ? { date } : {} }),
  getAnalytics: (id: string, days?: number) => api.get(`/stations/${id}/analytics`, { params: days ? { days } : {} }),
};
