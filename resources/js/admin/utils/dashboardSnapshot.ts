import type { AdminDashboardStats, AdminNotificationSummary, ProviderProfile } from '../types';

export type DashboardSnapshot = {
  savedAt: number;
  summary: AdminNotificationSummary;
  stats: AdminDashboardStats;
  recentProviders: ProviderProfile[];
};

const STORAGE_KEY = 'lumixy:admin:dashboard:v1';
const SNAPSHOT_TTL_MS = 5 * 60_000;

export function readDashboardSnapshot(): DashboardSnapshot | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const snapshot = JSON.parse(raw) as DashboardSnapshot;
    if (!snapshot?.savedAt || Date.now() - snapshot.savedAt > SNAPSHOT_TTL_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return snapshot;
  } catch {
    return null;
  }
}

export function writeDashboardSnapshot(snapshot: Omit<DashboardSnapshot, 'savedAt'>) {
  try {
    const payload: DashboardSnapshot = {
      ...snapshot,
      savedAt: Date.now(),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore quota or privacy errors.
  }
}

export function clearDashboardSnapshot() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore.
  }
}
