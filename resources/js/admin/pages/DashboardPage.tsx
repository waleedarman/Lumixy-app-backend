import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchAdminDashboardLatestProviders,
  fetchAdminDashboardStats,
  fetchAdminNotificationSummary,
} from '../api/adminService';
import { peekStaleRequestCache } from '../api/requestCache';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { DashboardKpiGrid } from '../components/dashboard/DashboardKpiGrid';
import { DashboardSectionSkeleton } from '../components/dashboard/DashboardSectionSkeleton';
import { LatestProvidersSection } from '../components/dashboard/LatestProvidersSection';
import { ProviderStatusOverview } from '../components/dashboard/ProviderStatusOverview';
import { QuickActions } from '../components/dashboard/QuickActions';
import { useRefreshOnFocus } from '../hooks/useRefreshOnFocus';
import { useAdminSync } from '../hooks/useAdminSync';
import type { AdminDashboardStats, AdminNotificationSummary, ProviderProfile } from '../types';
import { readDashboardSnapshot, writeDashboardSnapshot } from '../utils/dashboardSnapshot';

type DashboardUiState = {
  summary: AdminNotificationSummary | null;
  stats: AdminDashboardStats | null;
  recentProviders: ProviderProfile[];
  summaryLoading: boolean;
  statsLoading: boolean;
  providersLoading: boolean;
  lastUpdated: Date | null;
};

function hydrateDashboardState(): DashboardUiState {
  const snapshot = readDashboardSnapshot();
  if (snapshot) {
    return {
      summary: snapshot.summary,
      stats: snapshot.stats,
      recentProviders: snapshot.recentProviders,
      summaryLoading: false,
      statsLoading: false,
      providersLoading: false,
      lastUpdated: new Date(snapshot.savedAt),
    };
  }

  const summary = peekStaleRequestCache<AdminNotificationSummary>('admin:notifications:summary');
  const stats = peekStaleRequestCache<AdminDashboardStats>('admin:dashboard:stats');
  const recentProviders = peekStaleRequestCache<ProviderProfile[]>('admin:dashboard:latest') ?? [];
  const hasAnyData = Boolean(summary || stats || recentProviders.length > 0);

  return {
    summary,
    stats,
    recentProviders,
    summaryLoading: !summary,
    statsLoading: !stats,
    providersLoading: recentProviders.length === 0 && !hasAnyData,
    lastUpdated: hasAnyData ? new Date() : null,
  };
}

export function DashboardPage() {
  const [initial] = useState(hydrateDashboardState);
  const [summary, setSummary] = useState(initial.summary);
  const [stats, setStats] = useState(initial.stats);
  const [recentProviders, setRecentProviders] = useState(initial.recentProviders);
  const [summaryLoading, setSummaryLoading] = useState(initial.summaryLoading);
  const [statsLoading, setStatsLoading] = useState(initial.statsLoading);
  const [providersLoading, setProvidersLoading] = useState(initial.providersLoading);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(initial.lastUpdated);
  const dashboardStateRef = useRef({
    summary: initial.summary,
    stats: initial.stats,
    recentProviders: initial.recentProviders,
  });

  dashboardStateRef.current = { summary, stats, recentProviders };

  const loadAll = useCallback(async (silent = false, force = false) => {
    const { summary: cachedSummary, stats: cachedStats, recentProviders: cachedProviders } =
      dashboardStateRef.current;
    const hasCachedUi = Boolean(cachedSummary || cachedStats || cachedProviders.length > 0);

    if (!silent && !hasCachedUi) {
      setSummaryLoading(true);
      setStatsLoading(true);
      setProvidersLoading(true);
    }

    setError(null);

    try {
      const [summaryData, statsData, latestProviders] = await Promise.all([
        fetchAdminNotificationSummary(force ? { force: true } : undefined),
        fetchAdminDashboardStats(force ? { force: true } : undefined),
        fetchAdminDashboardLatestProviders(force ? { force: true } : undefined),
      ]);

      setSummary(summaryData);
      setStats(statsData);
      setRecentProviders(latestProviders);
      setLastUpdated(new Date());
      writeDashboardSnapshot({
        summary: summaryData,
        stats: statsData,
        recentProviders: latestProviders,
      });
    } catch (loadError) {
      if (!hasCachedUi) {
        setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل نظرة عامة.');
      }
    } finally {
      setSummaryLoading(false);
      setStatsLoading(false);
      setProvidersLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadAll(true, true);
    } finally {
      setRefreshing(false);
    }
  }, [loadAll]);

  useEffect(() => {
    void loadAll(false, false);
  }, [loadAll]);

  useAdminSync(['dashboard', 'providers', 'notifications'], () => {
    void loadAll(true, false);
  });

  useRefreshOnFocus(() => {
    void loadAll(true, false);
  });

  const dashboardStats = useMemo(
    () => ({
      total: stats?.total ?? 0,
      active: stats?.active ?? 0,
      pending: summary?.pending_providers_count ?? stats?.pending ?? 0,
      expired: stats?.expired ?? 0,
      expiringSoon: summary?.expiring_soon_count ?? 0,
      expiredToday: summary?.expired_today_count ?? 0,
    }),
    [stats, summary],
  );

  const statusSegments = useMemo(
    () => [
      { key: 'active', label: 'نشط', value: stats?.active ?? 0 },
      { key: 'pending', label: 'قيد المراجعة', value: dashboardStats.pending },
      { key: 'deactivated', label: 'غير نشط', value: stats?.deactivated ?? 0 },
    ],
    [stats?.active, stats?.deactivated, dashboardStats.pending],
  );

  const showKpiSkeleton = summaryLoading && !summary;
  const showPanelSkeleton = statsLoading && !stats;
  const showTableSkeleton = providersLoading && recentProviders.length === 0;

  return (
    <div className="dash-page">
      <div className="dash-shell">
        <DashboardHeader
          lastUpdated={lastUpdated}
          refreshing={refreshing}
          onRefresh={() => void handleRefresh()}
        />

        {error ? <div className="alert alert-error">{error}</div> : null}

        {showKpiSkeleton ? (
          <DashboardSectionSkeleton variant="kpi" />
        ) : (
          <DashboardKpiGrid stats={dashboardStats} pendingHint={summary?.messages.new_provider} />
        )}

        <div className="dash-main-grid">
          {showPanelSkeleton ? (
            <DashboardSectionSkeleton variant="panel" />
          ) : (
            <ProviderStatusOverview segments={statusSegments} />
          )}
          <QuickActions compact inline />
        </div>

        {showTableSkeleton ? (
          <DashboardSectionSkeleton variant="table" />
        ) : (
          <LatestProvidersSection providers={recentProviders} />
        )}
      </div>
    </div>
  );
}
