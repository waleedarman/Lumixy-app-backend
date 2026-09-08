import { apiRequest } from './client';
import { cachedRequest, invalidateRequestCache } from './requestCache';
import { emitAdminSync } from '../services/adminSync';
import { mapCategory, mapCityOption, mapCityOptionsResponse, mapProviderProfile } from './mappers';
import { clearDashboardSnapshot } from '../utils/dashboardSnapshot';
import type {
  AdminAccount,
  AdminDashboardStats,
  AdminNotificationSummary,
  AppCategory,
  AppCityOption,
  ProviderProfile,
} from '../types';

type PaginatedResponse<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  total?: number;
  per_page?: number;
};

export type AdminProvidersPage = {
  providers: ProviderProfile[];
  currentPage: number;
  lastPage: number;
  total: number;
  perPage: number;
};

const DASHBOARD_CACHE_TTL_MS = 60_000;
const DASHBOARD_STALE_TTL_MS = 300_000;
const ADMIN_CACHE_TTL_MS = 60_000;
const ADMIN_STALE_TTL_MS = 300_000;

export const CACHE_KEYS = {
  providers: 'admin:providers',
  providersPage: 'admin:providers:page',
  categories: 'admin:categories',
  cities: 'admin:cities',
  admins: 'admin:admins',
  notificationSummary: 'admin:notifications:summary',
  notificationList: 'admin:notifications:list',
  dashboardStats: 'admin:dashboard:stats',
  dashboardLatest: 'admin:dashboard:latest',
  providerDetail: 'admin:provider',
} as const;

function adminCachedRequest<T>(key: string, fetcher: () => Promise<T>, ttlMs = ADMIN_CACHE_TTL_MS) {
  return cachedRequest(key, fetcher, ttlMs, { staleTtlMs: ADMIN_STALE_TTL_MS });
}

function mapProviderItems(items: any[]): ProviderProfile[] {
  return items.map((item) => mapProviderProfile(item, item.user));
}

async function collectAllPages<T>(path: string) {
  const first = await apiRequest<PaginatedResponse<T>>(path, { auth: true });
  if (first.last_page <= 1) {
    return [...first.data];
  }

  const remaining = await Promise.all(
    Array.from({ length: first.last_page - 1 }, (_, index) =>
      apiRequest<PaginatedResponse<T>>(path, {
        auth: true,
        query: { page: index + 2 },
      }),
    ),
  );

  return [...first.data, ...remaining.flatMap((page) => page.data)];
}

function isValidUrl(value?: string) {
  if (!value) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function invalidateDashboardCaches() {
  invalidateRequestCache(CACHE_KEYS.dashboardStats);
  invalidateRequestCache(CACHE_KEYS.dashboardLatest);
  clearDashboardSnapshot();
  emitAdminSync(['dashboard', 'notifications']);
}

function invalidateProviderCaches() {
  invalidateRequestCache(CACHE_KEYS.providers);
  invalidateRequestCache(CACHE_KEYS.providersPage);
  invalidateRequestCache(CACHE_KEYS.providerDetail);
  invalidateRequestCache(CACHE_KEYS.notificationSummary);
  invalidateDashboardCaches();
  emitAdminSync('providers');
}

function invalidateCityCaches() {
  invalidateRequestCache(CACHE_KEYS.cities);
  emitAdminSync('cities');
}

function invalidateCategoryCaches() {
  invalidateRequestCache(CACHE_KEYS.categories);
  emitAdminSync('categories');
}

function invalidateAdminAccountsCache() {
  invalidateRequestCache(CACHE_KEYS.admins);
  emitAdminSync('admins');
}

export async function fetchAdminProviders(options?: { force?: boolean }): Promise<ProviderProfile[]> {
  if (options?.force) {
    invalidateProviderCaches();
  }

  return adminCachedRequest(CACHE_KEYS.providers, async () => {
    const providers = await collectAllPages<any>('/admin/providers');
    return mapProviderItems(providers);
  });
}

export async function fetchAdminProvidersPage(
  page = 1,
  options?: { force?: boolean; perPage?: number },
): Promise<AdminProvidersPage> {
  const perPage = options?.perPage ?? 10;
  const cacheKey = `${CACHE_KEYS.providersPage}:${page}:${perPage}`;

  if (options?.force) {
    invalidateRequestCache(cacheKey);
  }

  return adminCachedRequest(cacheKey, async () => {
    const response = await apiRequest<PaginatedResponse<any>>('/admin/providers', {
      auth: true,
      query: { page, per_page: perPage },
    });

    return {
      providers: mapProviderItems(response.data),
      currentPage: response.current_page,
      lastPage: response.last_page,
      total: response.total ?? response.data.length,
      perPage: response.per_page ?? response.data.length,
    };
  }, 15_000);
}

export function prefetchAdminProvidersPage(page: number, perPage = 10) {
  void fetchAdminProvidersPage(page, { perPage }).catch(() => undefined);
}

export async function fetchAdminProvider(id: string, options?: { force?: boolean }): Promise<ProviderProfile> {
  const cacheKey = `${CACHE_KEYS.providerDetail}:${id}`;

  if (options?.force) {
    invalidateRequestCache(cacheKey);
  }

  return adminCachedRequest(cacheKey, async () => {
    const response = await apiRequest<any>(`/admin/providers/${id}`, { auth: true });
    return mapProviderProfile(response.provider || response, response.provider?.user || response.user);
  });
}

export async function approveProvider(id: string) {
  const response = await apiRequest<any>(`/admin/providers/${id}/approve`, {
    method: 'POST',
    auth: true,
    idempotent: true,
  });
  invalidateProviderCaches();
  return mapProviderProfile(response.provider, response.provider?.user);
}

export async function suspendProvider(id: string, reason = '') {
  const response = await apiRequest<any>(`/admin/providers/${id}/suspend`, {
    method: 'POST',
    auth: true,
    idempotent: true,
    body: { reason },
  });
  invalidateProviderCaches();
  return mapProviderProfile(response.provider, response.provider?.user);
}

export async function deleteProvider(id: string) {
  const result = await apiRequest(`/admin/providers/${id}`, {
    method: 'DELETE',
    auth: true,
    idempotent: true,
  });
  invalidateProviderCaches();
  return result;
}

export async function updateProviderSubscription(id: string, isFeatured: boolean) {
  const response = await apiRequest<any>(`/admin/providers/${id}/subscription`, {
    method: 'PUT',
    auth: true,
    idempotent: true,
    body: { is_featured: isFeatured },
  });
  invalidateProviderCaches();
  return mapProviderProfile(response.provider, response.provider?.user);
}

export async function renewProviderSubscription(id: string) {
  const response = await apiRequest<any>(`/admin/providers/${id}/subscription/renew`, {
    method: 'POST',
    auth: true,
    idempotent: true,
  });
  invalidateProviderCaches();
  return mapProviderProfile(response.provider, response.provider?.user);
}

export async function fetchAdminCities(options?: { force?: boolean }): Promise<AppCityOption[]> {
  if (options?.force) {
    invalidateCityCaches();
  }

  return adminCachedRequest(CACHE_KEYS.cities, async () => {
    const cities = await apiRequest<unknown>('/admin/cities', { auth: true });
    return mapCityOptionsResponse(cities);
  });
}

export async function createCity(name: string, parentId?: string): Promise<AppCityOption> {
  const response = await apiRequest<any>('/admin/cities', {
    method: 'POST',
    auth: true,
    body: { name, parent_id: parentId || undefined },
  });
  invalidateCityCaches();
  return mapCityOption(response.city);
}

export async function deleteCity(id: string) {
  const result = await apiRequest(`/admin/cities/${id}`, {
    method: 'DELETE',
    auth: true,
    idempotent: true,
  });
  invalidateCityCaches();
  return result;
}

export type PcbsCitySyncResult = {
  parents_created: number;
  parents_updated: number;
  localities_created: number;
  localities_updated: number;
  total_governorates: number;
  total_localities: number;
  source: string;
};

export async function syncAdminCitiesFromPcbs(): Promise<{
  message: string;
  result: PcbsCitySyncResult;
}> {
  const response = await apiRequest<{ message: string; result: PcbsCitySyncResult }>(
    '/admin/cities/sync-pcbs',
    {
      method: 'POST',
      auth: true,
      idempotent: true,
    },
  );
  invalidateCityCaches();
  return response;
}

export async function fetchAdminCategories(options?: { force?: boolean }): Promise<AppCategory[]> {
  if (options?.force) {
    invalidateCategoryCaches();
  }

  return adminCachedRequest(CACHE_KEYS.categories, async () => {
    const categories = await apiRequest<any[]>('/admin/categories', { auth: true });
    return categories.map(mapCategory);
  });
}

export async function createCategory(name: string, icon?: string): Promise<AppCategory> {
  const body: Record<string, unknown> = { name };
  if (isValidUrl(icon)) body.icon = icon;

  const response = await apiRequest<any>('/admin/categories', {
    method: 'POST',
    auth: true,
    body,
  });
  invalidateCategoryCaches();
  return mapCategory(response.category);
}

export async function deleteCategory(id: string) {
  const result = await apiRequest(`/admin/categories/${id}`, {
    method: 'DELETE',
    auth: true,
    idempotent: true,
  });
  invalidateCategoryCaches();
  return result;
}

export async function createSubcategory(categoryId: string, name: string) {
  const response = await apiRequest<any>('/admin/subcategories', {
    method: 'POST',
    auth: true,
    body: { service_category_id: categoryId, name },
  });
  invalidateCategoryCaches();

  return {
    id: response.subcategory.id as string,
    name: response.subcategory.name as string,
    categoryId: response.subcategory.service_category_id as string,
  };
}

export async function deleteSubcategory(id: string) {
  const result = await apiRequest(`/admin/subcategories/${id}`, {
    method: 'DELETE',
    auth: true,
    idempotent: true,
  });
  invalidateCategoryCaches();
  return result;
}

export async function fetchAdminAccounts(options?: { force?: boolean }): Promise<AdminAccount[]> {
  if (options?.force) {
    invalidateAdminAccountsCache();
  }

  return adminCachedRequest(CACHE_KEYS.admins, async () => {
    const response = await apiRequest<{ admins: AdminAccount[] }>('/admin/admins', { auth: true });
    return response.admins;
  });
}

export async function createAdminAccount(payload: {
  full_name: string;
  email: string;
  password: string;
  password_confirmation: string;
  status?: 'active' | 'inactive';
}) {
  const response = await apiRequest<{ admin: AdminAccount; message: string }>('/admin/admins', {
    method: 'POST',
    auth: true,
    idempotent: true,
    body: payload,
  });
  invalidateAdminAccountsCache();
  return response.admin;
}

export async function updateAdminAccountStatus(id: string, status: 'active' | 'inactive') {
  const response = await apiRequest<{ admin: AdminAccount; message: string }>(`/admin/admins/${id}`, {
    method: 'PUT',
    auth: true,
    body: { status },
  });
  invalidateAdminAccountsCache();
  return response.admin;
}

export async function deleteAdminAccount(id: string) {
  const result = await apiRequest<{ message: string }>(`/admin/admins/${id}`, {
    method: 'DELETE',
    auth: true,
    idempotent: true,
  });
  invalidateAdminAccountsCache();
  return result;
}

export async function fetchAdminDashboardStats(options?: { force?: boolean }): Promise<AdminDashboardStats> {
  if (options?.force) {
    invalidateRequestCache(CACHE_KEYS.dashboardStats);
  }

  return cachedRequest(
    CACHE_KEYS.dashboardStats,
    () => apiRequest<AdminDashboardStats>('/admin/dashboard/stats', { auth: true }),
    DASHBOARD_CACHE_TTL_MS,
    { staleTtlMs: DASHBOARD_STALE_TTL_MS },
  );
}

export async function fetchAdminDashboardLatestProviders(options?: { force?: boolean }): Promise<ProviderProfile[]> {
  if (options?.force) {
    invalidateRequestCache(CACHE_KEYS.dashboardLatest);
  }

  return cachedRequest(
    CACHE_KEYS.dashboardLatest,
    async () => {
      const response = await apiRequest<PaginatedResponse<any>>('/admin/providers', {
        auth: true,
        query: { page: 1, per_page: 5 },
      });
      return mapProviderItems(response.data);
    },
    DASHBOARD_CACHE_TTL_MS,
    { staleTtlMs: DASHBOARD_STALE_TTL_MS },
  );
}

export async function fetchAdminNotificationSummary(options?: { force?: boolean }): Promise<AdminNotificationSummary> {
  if (options?.force) {
    invalidateRequestCache(CACHE_KEYS.notificationSummary);
  }

  return cachedRequest(
    CACHE_KEYS.notificationSummary,
    () => apiRequest<AdminNotificationSummary>('/admin/notifications/summary', { auth: true }),
    DASHBOARD_CACHE_TTL_MS,
    { staleTtlMs: DASHBOARD_STALE_TTL_MS },
  );
}

export async function sendAdminBroadcast(payload: {
  title?: string;
  message: string;
  target?: 'all' | 'providers' | 'admins';
}) {
  const result = await apiRequest<{ message: string; result: { sent: number; failed: number } }>(
    '/admin/notifications/broadcast',
    {
      method: 'POST',
      auth: true,
      idempotent: true,
      body: payload,
    },
  );
  invalidateRequestCache(CACHE_KEYS.notificationSummary);
  invalidateRequestCache('admin:notifications:list');
  emitAdminSync(['notifications', 'dashboard']);
  return result;
}

export async function fetchPublicProviders(query?: Record<string, string>) {
  const response = await apiRequest<PaginatedResponse<any>>('/providers', { query });
  return response.data.map((item) => mapProviderProfile(item, item.user));
}

export async function fetchPublicCategories() {
  const categories = await apiRequest<any[]>('/service-categories');
  return categories.map(mapCategory);
}

export async function fetchPublicCities() {
  const cities = await apiRequest<unknown>('/cities');
  return mapCityOptionsResponse(cities);
}
