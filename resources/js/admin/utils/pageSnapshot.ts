const STORAGE_PREFIX = 'lumixy:admin:page:';
const DEFAULT_SNAPSHOT_TTL_MS = 5 * 60_000;

type SnapshotPayload<T> = {
  savedAt: number;
  data: T;
};

export function readPageSnapshot<T>(key: string, ttlMs = DEFAULT_SNAPSHOT_TTL_MS): T | null {
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!raw) return null;

    const payload = JSON.parse(raw) as SnapshotPayload<T>;
    if (!payload?.savedAt || Date.now() - payload.savedAt > ttlMs) {
      sessionStorage.removeItem(`${STORAGE_PREFIX}${key}`);
      return null;
    }

    return payload.data;
  } catch {
    return null;
  }
}

export function writePageSnapshot<T>(key: string, data: T) {
  try {
    const payload: SnapshotPayload<T> = {
      savedAt: Date.now(),
      data,
    };
    sessionStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(payload));
  } catch {
    // Ignore quota or privacy errors.
  }
}

export function clearPageSnapshot(key: string) {
  try {
    sessionStorage.removeItem(`${STORAGE_PREFIX}${key}`);
  } catch {
    // Ignore.
  }
}
