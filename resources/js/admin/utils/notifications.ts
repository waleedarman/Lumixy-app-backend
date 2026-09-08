import type { RemoteNotification } from '../types';

export function getAdminNotificationDedupKey(item: RemoteNotification) {
  return `${item.user_id}:${item.type}:${item.message.trim().toLowerCase()}`;
}

export function filterAdminNotifications(
  notifications: RemoteNotification[],
  adminId?: string | null,
) {
  const scoped = notifications.filter(
    (item) =>
      item.user_id === 'all' ||
      item.user_id === 'admin' ||
      (adminId && item.user_id === adminId),
  );

  return scoped.filter(
    (item, index, list) =>
      index ===
      list.findIndex(
        (candidate) => getAdminNotificationDedupKey(candidate) === getAdminNotificationDedupKey(item),
      ),
  );
}

export function countUnreadAdminNotifications(
  notifications: RemoteNotification[],
  adminId?: string | null,
) {
  return filterAdminNotifications(notifications, adminId).filter((item) => !item.read).length;
}
