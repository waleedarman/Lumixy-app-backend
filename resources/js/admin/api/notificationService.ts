import { apiRequest } from './client';
import { cachedRequest, invalidateRequestCache } from './requestCache';
import { emitAdminSync } from '../services/adminSync';
import type { RemoteNotification } from '../types';

const NOTIFICATION_CACHE_TTL_MS = 60_000;
const NOTIFICATION_STALE_TTL_MS = 300_000;

function notificationCacheKey(scope: string) {
  return `admin:notifications:list:${scope}`;
}

export async function fetchRemoteNotifications(
  scope = 'default',
  options?: { force?: boolean },
): Promise<RemoteNotification[]> {
  const cacheKey = notificationCacheKey(scope);

  if (options?.force) {
    invalidateRequestCache(cacheKey);
  }

  return cachedRequest(
    cacheKey,
    async () => {
      const response = await apiRequest<{ notifications: RemoteNotification[] }>('/notifications', {
        auth: true,
      });
      return response.notifications;
    },
    NOTIFICATION_CACHE_TTL_MS,
    { staleTtlMs: NOTIFICATION_STALE_TTL_MS },
  );
}

export async function markRemoteNotificationRead(id: string) {
  return apiRequest<{ message: string }>(`/notifications/${id}/read`, {
    method: 'POST',
    auth: true,
  });
}

export async function clearRemoteNotifications() {
  invalidateRequestCache('admin:notifications:list');
  emitAdminSync(['notifications', 'dashboard']);
  return apiRequest<{ message: string }>('/notifications', {
    method: 'DELETE',
    auth: true,
    idempotent: true,
  });
}
