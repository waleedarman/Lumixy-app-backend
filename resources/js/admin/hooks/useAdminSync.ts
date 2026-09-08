import { useEffect } from 'react';
import { subscribeAdminSync, type AdminSyncTopic } from '../services/adminSync';

export function useAdminSync(
  topics: AdminSyncTopic | AdminSyncTopic[] | undefined,
  callback: () => void | Promise<void>,
) {
  useEffect(() => {
    if (!topics) return;
    const topicList = Array.isArray(topics) ? topics : [topics];
    if (topicList.length === 0) return;

    const handler = () => {
      void callback();
    };

    return subscribeAdminSync(topicList, handler);
  }, [topics, callback]);
}
