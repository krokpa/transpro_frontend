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
  (res) => {
    // TransformInterceptor NestJS wraps responses as { success, data, timestamp }.
    // Use 'data' key presence (not ??) so null data values are preserved correctly.
    const d = res.data;
    return d !== null && typeof d === 'object' && 'data' in d ? d.data : d;
  },
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
  loginByPhone: (phone: string, code: string) =>
    api.post('/auth/login-phone', { phone, code }),
  register: (data: any) => api.post('/auth/register', data),
  refresh: (refreshToken: string) =>
    axios.post(`${API_URL}/auth/refresh`, { refreshToken }).then((r) => r.data.data ?? r.data),
  me: () => api.get('/auth/me'),
  logout: (refreshToken?: string) => api.post('/auth/logout', { refreshToken }),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),
  socialLogin: (provider: 'google' | 'facebook', idToken: string) =>
    api.post('/auth/social', { provider, idToken }),
};

export const otpApi = {
  send:        (phone: string)                => api.post('/otp/send',          { phone }),
  verify:      (phone: string, code: string)  => api.post('/otp/verify',        { phone, code }),
  checkPhone:  (phone: string)                => api.post('/auth/check-phone',  { phone }),
  checkEmail:  (email: string)               => api.post('/auth/check-email',  { email }),
};

export const twoFactorApi = {
  verify: (twoFactorToken: string, code: string) =>
    api.post('/auth/2fa/verify', { twoFactorToken, code }),
  setup: () => api.post('/auth/2fa/setup'),
  enable: (code: string) => api.post('/auth/2fa/enable', { code }),
  disable: (code: string) => api.post('/auth/2fa/disable', { code }),
};

export const tripsApi = {
  create: (data: any) => api.post('/trips', data),
  list: (params?: any) => api.get('/trips', { params }),
  get: (id: string) => api.get(`/trips/${id}`),
  getSeats:        (id: string) => api.get(`/trips/${id}/seats`),
  getLastLocation: (id: string) => api.get(`/trips/${id}/location`),
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
  updateStatus: (id: string, status: string) => api.patch(`/bookings/${id}/status`, { status }),
  generateTickets: (id: string) => api.post(`/bookings/${id}/tickets/generate`),
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
  getStats: (id: string) => api.get(`/drivers/${id}/stats`),
  invite: (id: string) => api.post(`/drivers/${id}/invite`),
  getEvaluations: (id: string) => api.get(`/drivers/${id}/evaluations`),
  addEvaluation: (id: string, data: any) => api.post(`/drivers/${id}/evaluations`, data),
  deleteEvaluation: (id: string, evalId: string) => api.delete(`/drivers/${id}/evaluations/${evalId}`),
};

export const driverSpaceApi = {
  me:               ()                          => api.get('/driver-space/me'),
  setAvailability:  (isAvailable: boolean)      => api.patch('/driver-space/availability', { isAvailable }),
  todayTrips:       ()                          => api.get('/driver-space/trips/today'),
  upcomingTrips:    ()                          => api.get('/driver-space/trips/upcoming'),
  schedule:         (month: string)             => api.get('/driver-space/schedule', { params: { month } }),
  updateTripStatus: (tripId: string, status: string) => api.patch(`/driver-space/trips/${tripId}/status`, { status }),
  evaluations:      ()                          => api.get('/driver-space/evaluations'),
  absences:         ()                          => api.get('/driver-space/absences'),
  addAbsence:       (data: any)                 => api.post('/driver-space/absences', data),
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
  updateDocumentBranding: (data: { logoPosition: 'none'|'header'|'watermark'|'both'; watermarkOpacity?: number; footerText?: string }) =>
    api.patch('/tenants/me/document-branding', data),
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
  getConfig: () => api.get('/notifications/campaigns/config'),
  updateConfig: (data: Record<string, unknown>) => api.put('/notifications/campaigns/config', data),
  getPublicConfig: (tenantId: string) =>
    api.get(`/notifications/campaigns/config/tenant/${tenantId}`),
};

export const usersApi = {
  updateProfile: (data: { firstName?: string; lastName?: string; phone?: string; preferredLang?: string; themeAccent?: string; themeSidebar?: string; themeColorMode?: string }) =>
    api.patch('/users/profile', data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/users/change-password', { currentPassword, newPassword }),
  updateAvatar: (avatar: string) =>
    api.patch('/users/avatar', { avatar }),
  lookupByPhone: (phone: string) =>
    api.get('/users/lookup', { params: { phone } }),
  /** Pour les comptes créés par téléphone : définir un vrai email et/ou un mot de passe. */
  setCredentials: (data: { email?: string; password?: string }) =>
    api.patch('/users/set-credentials', data),
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

export const settlementsApi = {
  // Super admin
  list: (params?: { tenantId?: string; status?: string }) =>
    api.get('/settlements', { params }),
  get: (id: string) => api.get(`/settlements/${id}`),
  markProcessing: (id: string, data: { bankName?: string; bankAccount?: string }) =>
    api.patch(`/settlements/${id}/processing`, data),
  markPaid: (id: string, data: { transferRef: string }) =>
    api.patch(`/settlements/${id}/paid`, data),
  markFailed: (id: string, data: { notes?: string }) =>
    api.patch(`/settlements/${id}/failed`, data),
  trigger: (data: { tenantId: string; year: number; month: number }) =>
    api.post('/settlements/trigger', data),
  // Compagnie
  mySummary: () => api.get('/settlements/my/summary'),
  submitBankDetails: (id: string, data: { bankName: string; bankAccount: string; notes?: string }) =>
    api.patch(`/settlements/${id}/bank`, data),
  exportStatement: (params: { from: string; to: string; format: 'pdf' | 'xlsx'; tenantId?: string }) =>
    api.get('/settlements/export/statement', { params, responseType: 'blob' }),
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

  // Passenger-facing
  myParcels:          () => api.get('/parcels/my'),
  myReceivedParcels:  () => api.get('/parcels/my/received'),
  myParcel:           (id: string) => api.get(`/parcels/my/${id}`),
  myDeliveryRequest: (parcelId: string) =>
    api.get(`/parcels/${parcelId}/delivery-request`),
  createMyDeliveryRequest: (parcelId: string, data: { address: string; recipientPhone?: string; notes?: string }) =>
    api.post(`/parcels/${parcelId}/delivery-request`, data),
  cancelMyDeliveryRequest: (parcelId: string) =>
    api.delete(`/parcels/${parcelId}/delivery-request`),
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

export const smsPackagesApi = {
  listActive: () => api.get('/sms-packages'),
  balance: () => api.get('/sms-packages/balance'),
  logs: (page = 1, limit = 20) => api.get('/sms-packages/logs', { params: { page, limit } }),
  purchase: (packageId: string, customSender?: string) =>
    api.post('/sms-packages/purchase', { packageId, ...(customSender ? { customSender } : {}) }),
  confirmRedirect: (purchaseId: string) => api.get(`/sms-packages/purchase/${purchaseId}/confirm`),
};

export const adminSmsApi = {
  overview:   (days?: number)  => api.get('/admin/sms/overview', { params: days ? { days } : {} }),
  logs:       (params?: { page?: number; limit?: number; tenantId?: string; provider?: string; status?: string; search?: string; dateFrom?: string; dateTo?: string }) =>
    api.get('/admin/sms/logs', { params }),
  credits:    ()               => api.get('/admin/sms/credits'),
  grant:      (tenantId: string, smsCount: number, customSender?: string, note?: string) =>
    api.post(`/admin/sms/credits/${tenantId}/grant`, { smsCount, customSender, note }),
  providers:  ()               => api.get('/admin/sms/providers'),
  test:       (to: string, message: string) => api.post('/admin/sms/test', { to, message }),
  listPackages:   ()           => api.get('/admin/sms/packages'),
  createPackage:  (data: any)  => api.post('/admin/sms/packages', data),
  updatePackage:  (id: string, data: any) => api.patch(`/admin/sms/packages/${id}`, data),
};

export const expensesApi = {
  create: (data: any) => api.post('/expenses', data),
  list: (params?: { stationId?: string; status?: string; category?: string; from?: string; to?: string }) =>
    api.get('/expenses', { params }),
  get: (id: string) => api.get(`/expenses/${id}`),
  approve: (id: string) => api.patch(`/expenses/${id}/approve`, {}),
  reject: (id: string, reason: string) => api.patch(`/expenses/${id}/reject`, { reason }),
  stationSummary: (stationId: string, month?: string) =>
    api.get(`/expenses/station/${stationId}/summary`, { params: month ? { month } : {} }),
  exportStationStatement: (stationId: string, params: { from: string; to: string; format: 'pdf' | 'xlsx' }) =>
    api.get(`/expenses/station/${stationId}/export`, { params, responseType: 'blob' }),
};

export const cashPeriodsApi = {
  getCurrent: (stationId: string) =>
    api.get(`/station-cash-periods/${stationId}/current`),
  getPeriod: (stationId: string, year: number, month: number) =>
    api.get(`/station-cash-periods/${stationId}/${year}/${month}`),
  getHistory: (stationId: string, limit = 12) =>
    api.get(`/station-cash-periods/${stationId}/history`, { params: { limit } }),
  setOpeningBalance: (stationId: string, year: number, month: number, data: { openingBalance: number; notes?: string }) =>
    api.patch(`/station-cash-periods/${stationId}/${year}/${month}/opening`, data),
  closePeriod: (stationId: string, year: number, month: number, data: { declaredBalance: number; notes?: string }) =>
    api.post(`/station-cash-periods/${stationId}/${year}/${month}/close`, data),
  validatePeriod: (stationId: string, year: number, month: number) =>
    api.post(`/station-cash-periods/${stationId}/${year}/${month}/validate`, {}),
  reopenPeriod: (stationId: string, year: number, month: number) =>
    api.post(`/station-cash-periods/${stationId}/${year}/${month}/reopen`, {}),
  recalculate: (stationId: string, year: number, month: number) =>
    api.post(`/station-cash-periods/${stationId}/${year}/${month}/recalculate`, {}),
};

export const cashProvisionsApi = {
  create: (data: any) => api.post('/cash-provisions', data),
  list: (params?: { stationId?: string; status?: string }) =>
    api.get('/cash-provisions', { params }),
  get: (id: string) => api.get(`/cash-provisions/${id}`),
  approve: (id: string) => api.patch(`/cash-provisions/${id}/approve`, {}),
  send: (id: string, notes?: string) => api.patch(`/cash-provisions/${id}/send`, { notes }),
  receive: (id: string) => api.patch(`/cash-provisions/${id}/receive`, {}),
  reject: (id: string, reason: string) => api.patch(`/cash-provisions/${id}/reject`, { reason }),
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

// ─── API Partenaires (consumers, clés, usage, webhooks) ──────────────────────
export const apiConsumersApi = {
  list:   ()           => api.get('/api-consumers'),
  get:    (id: string) => api.get(`/api-consumers/${id}`),
  create: (data: { name: string; email: string; companyName?: string; plan?: string; webhookUrl?: string; allowedIps?: string[]; notes?: string }) =>
    api.post('/api-consumers', data),
  update: (id: string, data: { name?: string; plan?: string; status?: string; webhookUrl?: string; allowedIps?: string[]; notes?: string }) =>
    api.patch(`/api-consumers/${id}`, data),
  usage:   (id: string) => api.get(`/api-consumers/${id}/usage`),
  webhooks:(id: string) => api.get(`/api-consumers/${id}/webhooks`),
  resendWebhook: (id: string, deliveryId: string) => api.post(`/api-consumers/${id}/webhooks/${deliveryId}/resend`),
  requestProduction: (id: string) => api.post(`/api-consumers/${id}/request-production`),
  reviewProduction:  (id: string, approve: boolean, reason?: string) =>
    api.post(`/api-consumers/${id}/review-production`, { approve, reason }),
  subscribePlan: (id: string, plan: string) => api.post(`/api-consumers/${id}/billing/subscribe`, { plan }),
  confirmPlan:   (id: string, paymentId: string) => api.post(`/api-consumers/${id}/billing/confirm/${paymentId}`),
  createKey: (id: string, data: { name: string; environment?: 'LIVE' | 'TEST'; scopes?: string[]; expiresAt?: string }) =>
    api.post(`/api-consumers/${id}/keys`, data),
  rotateKey: (id: string, keyId: string) => api.post(`/api-consumers/${id}/keys/${keyId}/rotate`),
  revokeKey: (id: string, keyId: string) => api.delete(`/api-consumers/${id}/keys/${keyId}`),
  regenerateWebhookSecret: (id: string) => api.post(`/api-consumers/${id}/regenerate-webhook-secret`),
};
