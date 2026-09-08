import { useCallback, useEffect, useRef, useState } from 'react';
import { peekStaleRequestCache } from '../api/requestCache';
import { useAdminSync } from './useAdminSync';
import type { AdminSyncTopic } from '../services/adminSync';
import { readPageSnapshot, writePageSnapshot } from '../utils/pageSnapshot';

type FetchOptions = { force?: boolean };

type UseStaleResourceOptions<T> = {
  initialData: T;
  snapshotKey?: string;
  enabled?: boolean;
  syncTopics?: AdminSyncTopic | AdminSyncTopic[];
};

export function readWarmCache<T>(cacheKey: string, snapshotKey?: string): T | null {
  if (snapshotKey) {
    const snapshot = readPageSnapshot<T>(snapshotKey);
    if (snapshot != null) return snapshot;
  }

  return peekStaleRequestCache<T>(cacheKey);
}

export function useStaleResource<T>(
  cacheKey: string,
  fetcher: (options?: FetchOptions) => Promise<T>,
  options: UseStaleResourceOptions<T>,
) {
  const { initialData, snapshotKey, enabled = true, syncTopics } = options;
  const warmRef = useRef<T | null>(readWarmCache<T>(cacheKey, snapshotKey));
  const hasWarmCache = warmRef.current != null;

  const [data, setData] = useState<T>(() => warmRef.current ?? initialData);
  const [loading, setLoading] = useState(() => enabled && !hasWarmCache);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (refreshOptions?: { silent?: boolean; force?: boolean }) => {
      if (!enabled) return;

      const silent = refreshOptions?.silent ?? false;
      const force = refreshOptions?.force ?? false;
      const hasUiData = warmRef.current != null;

      if (!silent && !hasUiData) {
        setLoading(true);
      }

      setError(null);

      try {
        const next = await fetcher(force ? { force: true } : undefined);
        warmRef.current = next;
        setData(next);
        if (snapshotKey) {
          writePageSnapshot(snapshotKey, next);
        }
      } catch (refreshError) {
        if (!hasUiData && !warmRef.current) {
          setError(refreshError instanceof Error ? refreshError.message : 'تعذر تحميل البيانات.');
        }
      } finally {
        setLoading(false);
      }
    },
    [cacheKey, enabled, fetcher, initialData, snapshotKey],
  );

  useEffect(() => {
    if (!enabled) return;
    void refresh({ silent: hasWarmCache, force: false });
  }, [enabled, refresh, hasWarmCache]);

  useAdminSync(syncTopics, () => {
    void refresh({ silent: true, force: true });
  });

  return {
    data,
    setData,
    loading,
    error,
    setError,
    refresh,
    hasWarmCache,
  };
}
