import { useCallback, useEffect, useState } from 'react';
import { fetchRemoteNotifications } from '../api/notificationService';
import { countUnreadAdminNotifications } from '../utils/notifications';
import { useAdminSync } from './useAdminSync';
import { useRefreshOnFocus } from './useRefreshOnFocus';

export function useNotificationBadge(adminId?: string | null) {
  const [unreadCount, setUnreadCount] = useState(0);
  const scope = adminId ?? 'default';

  const sync = useCallback(async () => {
    try {
      const notifications = await fetchRemoteNotifications(scope);
      setUnreadCount(countUnreadAdminNotifications(notifications, adminId));
    } catch {
      setUnreadCount(0);
    }
  }, [adminId, scope]);

  useEffect(() => {
    void sync();
  }, [sync]);

  useAdminSync('notifications', sync);
  useRefreshOnFocus(sync);

  return unreadCount;
}
