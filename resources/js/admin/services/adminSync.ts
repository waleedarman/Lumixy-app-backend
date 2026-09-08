export type AdminSyncTopic =
  | 'dashboard'
  | 'providers'
  | 'categories'
  | 'cities'
  | 'admins'
  | 'notifications'
  | 'promotions';

type SyncListener = () => void;

const listeners = new Map<AdminSyncTopic, Set<SyncListener>>();
const CHANNEL_NAME = 'lumixy-admin-sync';

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') {
    return null;
  }

  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event: MessageEvent<{ topics?: AdminSyncTopic[] }>) => {
      const topics = event.data?.topics;
      if (!topics?.length) return;
      notifyLocal(topics);
    };
  }

  return channel;
}

function notifyLocal(topics: AdminSyncTopic[]) {
  for (const topic of topics) {
    const topicListeners = listeners.get(topic);
    if (!topicListeners) continue;
    for (const listener of topicListeners) {
      listener();
    }
  }
}

export function subscribeAdminSync(topics: AdminSyncTopic | AdminSyncTopic[], listener: SyncListener) {
  const topicList = Array.isArray(topics) ? topics : [topics];
  const disposers: Array<() => void> = [];

  for (const topic of topicList) {
    const bucket = listeners.get(topic) ?? new Set<SyncListener>();
    bucket.add(listener);
    listeners.set(topic, bucket);
    disposers.push(() => {
      bucket.delete(listener);
      if (bucket.size === 0) {
        listeners.delete(topic);
      }
    });
  }

  getChannel();

  return () => {
    for (const dispose of disposers) {
      dispose();
    }
  };
}

export function emitAdminSync(topics: AdminSyncTopic | AdminSyncTopic[]) {
  const topicList = Array.isArray(topics) ? topics : [topics];
  notifyLocal(topicList);

  try {
    getChannel()?.postMessage({ topics: topicList });
  } catch {
    // Ignore broadcast failures.
  }
}
