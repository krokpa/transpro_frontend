import axios, { AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

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
  search: (params: { origin: string; destination: string; date: string; passengers?: number; tripClass?: string }) =>
    api.get('/trips/search', {
      params: {
        origin: params.origin,
        destination: params.destination,
        departureDate: params.date,
        passengers: params.passengers,
        tripClass: params.tripClass,
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
  cancel: (id: string) => api.delete(`/bookings/${id}`),
};

export const paymentsApi = {
  initiate: (bookingId: string) => api.post(`/payments/bookings/${bookingId}/pay`, {}),
  checkStatus: (paymentId: string) => api.patch(`/payments/${paymentId}/check-status`),
  checkStatusByBooking: (bookingId: string) => api.patch(`/payments/bookings/${bookingId}/check-status`),
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
};

export const driversApi = {
  create: (data: any) => api.post('/drivers', data),
  list: () => api.get('/drivers'),
  update: (id: string, data: any) => api.patch(`/drivers/${id}`, data),
};

export const tenantsApi = {
  create: (data: any) => api.post('/tenants', data),
  me: () => api.get('/tenants/me'),
  update: (data: any) => api.patch('/tenants/me', data),
  stats: () => api.get('/tenants/me/stats'),
  analytics: (period: string) => api.get('/tenants/me/analytics', { params: { period } }),
  subscriptions: () => api.get('/tenants/me/subscriptions'),
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

export const notificationsApi = {
  list: (onlyUnread?: boolean) => api.get('/notifications/my', { params: { onlyUnread } }),
  count: () => api.get('/notifications/my/count'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

export const usersApi = {
  updateProfile: (data: { firstName?: string; lastName?: string; phone?: string; preferredLang?: string }) =>
    api.patch('/users/profile', data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/users/change-password', { currentPassword, newPassword }),
};

export const teamApi = {
  list: () => api.get('/users/team'),
  invite: (data: { firstName: string; lastName: string; email: string; phone?: string; password: string; role: string }) =>
    api.post('/users/invite', data),
  updateRole: (id: string, role: string) => api.patch(`/users/${id}/role`, { role }),
  remove: (id: string) => api.delete(`/users/${id}/from-tenant`),
};

export const citiesApi = {
  list: (search?: string) => api.get('/cities', { params: search ? { search } : {} }),
  create: (data: { name: string; region?: string; code?: string }) => api.post('/cities', data),
  update: (id: string, data: { name?: string; region?: string; code?: string; isActive?: boolean }) =>
    api.patch(`/cities/${id}`, data),
  remove: (id: string) => api.delete(`/cities/${id}`),
};

export const stationsApi = {
  list: () => api.get('/stations'),
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
