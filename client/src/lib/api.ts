/**
 * Typed API client for the Crown & Clipper C# backend.
 * - Base URL from VITE_API_URL (see .env.development / .env.production)
 * - Tenant: resolved from ?tenant= (persisted) or localStorage, sent as
 *   X-Tenant-Slug on every request
 * - Auth: JWT stored in localStorage, sent as Authorization: Bearer
 */
const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ??
  'http://localhost:5000';

const TENANT_KEY = 'cc_tenant';
const TOKEN_KEY = 'cc_token';

// ---------------------------------------------------------------------------
// Tenant + token storage
// ---------------------------------------------------------------------------
export function currentTenantSlug(): string | null {
  if (typeof window === 'undefined') return null;
  const param = new URLSearchParams(window.location.search).get('tenant');
  if (param) {
    window.localStorage.setItem(TENANT_KEY, param);
    return param;
  }
  return window.localStorage.getItem(TENANT_KEY);
}

export function setTenantSlug(slug: string | null): void {
  if (slug) window.localStorage.setItem(TENANT_KEY, slug);
  else window.localStorage.removeItem(TENANT_KEY);
}

export function getAuthToken(): string | null {
  return typeof window === 'undefined' ? null : window.localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string | null): void {
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

// ---------------------------------------------------------------------------
// Types (mirror the C# DTOs)
// ---------------------------------------------------------------------------
export interface Service {
  id: number;
  slug: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  category: string;
  isPopular: boolean;
  /** Ids of staff qualified to perform this service. */
  barberIds: number[];
}

export interface Barber {
  id: number;
  slug: string;
  name: string;
  title: string;
  bio: string;
  specialties: string[];
  photoUrl: string;
  yearsExperience: number;
}

export interface Slot {
  time: string; // "HH:mm" shop-local time
  available: boolean;
}

export interface Availability {
  date: string; // yyyy-MM-dd
  closed: boolean;
  past: boolean;
  message: string | null;
  slots: Slot[];
}

export interface ShopHoursEntry {
  day: string;
  open: string | null;
  close: string | null;
  closed?: boolean;
}

export interface ShopInfo {
  slug: string;
  name: string;
  tagline: string;
  addressLine: string;
  city: string;
  postcode: string;
  fullAddress: string;
  phone: string;
  email: string;
  timezone: string;
  offerCode: string;
  estYear: number;
  hours: ShopHoursEntry[];
}

export interface TenantSummary {
  slug: string;
  name: string;
  tagline: string;
  isDefault: boolean;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'Customer' | 'Stylist' | 'Admin';
  barberId: number | null;
  barberName: string | null;
  barberSlug: string | null;
  active: boolean;
  tenantSlug: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface BookingResponse {
  id: number;
  reference: string;
  status: string;
  date: string;
  startTime: string;
  endTime: string;
  service: {
    id: number;
    slug: string;
    name: string;
    price: number;
    durationMinutes: number;
  };
  barber: {
    id: number;
    slug: string;
    name: string;
    title: string;
    photoUrl: string;
  };
  customer: { name: string; email: string; phone: string };
  shop: {
    slug: string;
    name: string;
    tagline: string;
    addressLine: string;
    city: string;
    postcode: string;
    fullAddress: string;
    phone: string;
    email: string;
    timezone: string;
    offerCode: string;
    estYear: number;
  };
  notes: string | null;
}

export interface CreateBookingPayload {
  serviceId: number;
  barberId: number | null;
  date: string;
  time: string;
  name: string;
  email: string;
  phone: string;
  notes?: string;
}

export interface ContactPayload {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}

export interface StaffAppointment {
  reference: string;
  date: string;
  startTime: string;
  endTime: string;
  service: string;
  customerName: string;
  status: string;
}

export interface AdminStats {
  today: number;
  next7Days: number;
  revenueNext7Days: number;
  totalConfirmed: number;
  newsletterSignups: number;
  contactMessages: number;
  registeredCustomers: number;
}

export interface AdminMessage {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  received: string;
}

export interface InboxNotification {
  id: number;
  kind: string;
  subject: string;
  body: string;
  bookingId: number | null;
  createdAtUtc: string;
  readAtUtc: string | null;
}

export interface OutboxNotification {
  id: number;
  kind: string;
  channel: string;
  status: string;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  attempts: number;
  bookingId: number | null;
  createdAtUtc: string;
  sentAtUtc: string | null;
  readAtUtc: string | null;
}

export interface AdminSignup {
  id: number;
  email: string;
  source: string | null;
  received: string;
}

// ---------------------------------------------------------------------------
// Fetch wrapper with friendly error messages
// ---------------------------------------------------------------------------
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  const tenant = currentTenantSlug();
  if (tenant) headers['X-Tenant-Slug'] = tenant;

  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(
      0,
      "Sorry - we can't reach our booking server right now. Please try again in a moment, or call the shop.",
    );
  }

  let data: { message?: string } | null = null;
  try {
    data = (await res.json()) as { message?: string };
  } catch {
    /* non-JSON response */
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new ApiError(
      res.status,
      "Sorry - we can't reach our booking server right now. Please try again in a moment, or call the shop.",
    );
  }

  if (!res.ok) {
    throw new ApiError(res.status, data?.message ?? `Something went wrong (${res.status}). Please try again.`);
  }

  return data as T;
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong. Please try again.';
}

// ---------------------------------------------------------------------------
// API surface
// ---------------------------------------------------------------------------
export const api = {
  // Public catalogue
  getServices: () => request<Service[]>('/api/services'),
  getBarbers: () => request<Barber[]>('/api/barbers'),
  getShopInfo: () => request<ShopInfo>('/api/shop'),
  getTenants: () => request<TenantSummary[]>('/api/tenants'),

  getAvailability: (date: string, barberId: number | null, serviceId: number | null) => {
    const params = new URLSearchParams({ date });
    if (barberId != null) params.set('barberId', String(barberId));
    if (serviceId != null) params.set('serviceId', String(serviceId));
    return request<Availability>(`/api/availability?${params.toString()}`);
  },

  createBooking: (payload: CreateBookingPayload) =>
    request<BookingResponse>('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  lookupBooking: (reference: string, email: string) =>
    request<BookingResponse>('/api/bookings/lookup', {
      method: 'POST',
      body: JSON.stringify({ reference, email }),
    }),

  subscribeNewsletter: (email: string, source: string) =>
    request<{ ok: boolean; message: string }>('/api/newsletter', {
      method: 'POST',
      body: JSON.stringify({ email, source }),
    }),

  sendContactMessage: (payload: ContactPayload) =>
    request<{ ok: boolean; message: string }>('/api/contact', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Auth
  register: (name: string, email: string, password: string) =>
    request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  login: (email: string, password: string) =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<AuthUser>('/api/auth/me'),

  // Customer area
  myBookings: () => request<BookingResponse[]>('/api/me/bookings'),
  cancelMyBooking: (reference: string) =>
    request<{ ok: boolean; message: string }>(`/api/me/bookings/${reference}/cancel`, {
      method: 'POST',
    }),

  // Notifications (in-app inbox)
  myNotifications: () => request<InboxNotification[]>('/api/me/notifications'),
  unreadCount: () => request<{ count: number }>('/api/me/notifications/unread-count'),
  markAllRead: () => request<{ ok: boolean; updated: number }>('/api/me/notifications/read', { method: 'POST' }),

  // Stylist area
  staffSchedule: (date: string, days: number) =>
    request<StaffAppointment[]>(`/api/staff/schedule?date=${date}&days=${days}`),

  // Admin area
  adminStats: () => request<AdminStats>('/api/admin/stats'),
  adminBookings: (params: { date?: string; barberId?: number; status?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.date) q.set('date', params.date);
    if (params.barberId != null) q.set('barberId', String(params.barberId));
    if (params.status) q.set('status', params.status);
    const qs = q.toString();
    return request<BookingResponse[]>(`/api/admin/bookings${qs ? `?${qs}` : ''}`);
  },
  adminCancelBooking: (id: number) =>
    request<{ ok: boolean; message: string }>(`/api/admin/bookings/${id}/cancel`, {
      method: 'POST',
    }),
  adminMessages: () => request<AdminMessage[]>('/api/admin/messages'),
  adminSignups: () => request<AdminSignup[]>('/api/admin/signups'),
  adminUsers: () => request<AuthUser[]>('/api/admin/users'),
  adminCreateUser: (payload: {
    name: string;
    email: string;
    password: string;
    role: string;
    barberSlug?: string;
  }) =>
    request<AuthUser>('/api/admin/users', { method: 'POST', body: JSON.stringify(payload) }),
  adminNotifications: (status?: string) =>
    request<{ provider: string; items: OutboxNotification[] }>(
      `/api/admin/notifications${status ? `?status=${status}` : ''}`),
  adminResendNotification: (id: number) =>
    request<{ ok: boolean; sent: number }>(`/api/admin/notifications/${id}/resend`, { method: 'POST' }),
  runReminders: () =>
    request<{ created: number; sent: number; provider: string }>('/api/admin/notifications/run', { method: 'POST' }),
  adminSetActive: (id: number, active: boolean) =>
    request<AuthUser>(`/api/admin/users/${id}/active`, {
      method: 'POST',
      body: JSON.stringify({ active }),
    }),
};
