import { matchesExpiringSoonFilter, SUBSCRIPTION_EXPIRING_SOON_DAYS } from '../utils/subscription';
import { useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { fetchAdminNotificationSummary, fetchAdminProviders } from '../api/adminService';
import { ManagementPageHeader } from '../components/management/ManagementPageHeader';
import { LoadingState } from '../components/LoadingState';
import { MetricCard } from '../components/ui/MetricCard';
import { useRefreshOnFocus } from '../hooks/useRefreshOnFocus';
import { useStaleResource } from '../hooks/useStaleResource';
import type { AdminNotificationSummary, ProviderProfile } from '../types';

export function SubscriptionsPage() {
  const {
    data: providers,
    loading: providersLoading,
    refresh: refreshProviders,
  } = useStaleResource('admin:providers', fetchAdminProviders, {
    snapshotKey: 'subscriptions-providers',
    initialData: [] as ProviderProfile[],
    syncTopics: ['providers', 'dashboard'],
  });

  const {
    data: summary,
    loading: summaryLoading,
    error,
    refresh: refreshSummary,
  } = useStaleResource<AdminNotificationSummary | null>(
    'admin:notifications:summary',
    fetchAdminNotificationSummary,
    {
      snapshotKey: 'subscriptions-summary',
      initialData: null,
      syncTopics: ['notifications', 'dashboard'],
    },
  );

  const loading = providersLoading && providers.length === 0 && summaryLoading && summary == null;

  const loadData = useCallback(
    async (silent = false) => {
      await Promise.all([
        refreshProviders({ silent, force: false }),
        refreshSummary({ silent, force: false }),
      ]);
    },
    [refreshProviders, refreshSummary],
  );

  useRefreshOnFocus(() => void loadData(true));

  const stats = useMemo(() => {
    const now = new Date();

    return providers.reduce(
      (acc, provider) => {
        const startedAt = provider.subscriptionStartedAt
          ? new Date(provider.subscriptionStartedAt)
          : null;
        const endsAt = provider.subscriptionEndsAt ? new Date(provider.subscriptionEndsAt) : null;

        if (provider.isSubscriptionActive) acc.active += 1;
        if (provider.isSubscriptionExpired) acc.expired += 1;

        if (
          endsAt &&
          !Number.isNaN(endsAt.getTime()) &&
          endsAt.getMonth() === now.getMonth() &&
          endsAt.getFullYear() === now.getFullYear()
        ) {
          acc.endingThisMonth += 1;
        }

        if (startedAt && !Number.isNaN(startedAt.getTime())) {
          const startedMonthIndex = startedAt.getFullYear() * 12 + startedAt.getMonth();
          const currentMonthIndex = now.getFullYear() * 12 + now.getMonth();
          if (startedMonthIndex === currentMonthIndex) acc.startedThisMonth += 1;
          if (startedAt.getFullYear() === now.getFullYear()) acc.startedThisYear += 1;
        }

        if (endsAt && !Number.isNaN(endsAt.getTime()) && endsAt >= now) {
          acc.validNow += 1;
        }

        return acc;
      },
      {
        active: 0,
        expired: 0,
        endingThisMonth: 0,
        startedThisMonth: 0,
        startedThisYear: 0,
        validNow: 0,
      },
    );
  }, [providers]);

  const expiringProviders = useMemo(
    () =>
      providers
        .filter((provider) => matchesExpiringSoonFilter(provider))
        .slice(0, 8),
    [providers],
  );

  if (loading) return <LoadingState skeleton label="جاري تحميل الإحصائيات..." />;

  return (
    <div className="mgmt-page">
      <ManagementPageHeader
        title="الإحصائيات"
        subtitle="مساحة تحليلات تشغيلية مبنية على البيانات الحالية للمزودين والاشتراكات."
      />

      {error ? <div className="alert alert-error">{error}</div> : null}

      <section className="mgmt-section">
        <div>
          <h2 className="mgmt-section__title">تنبيهات تشغيلية</h2>
          <p className="mgmt-section__subtitle">مؤشرات تحتاج متابعة فورية</p>
        </div>
        <div className="mgmt-stats-grid">
          <MetricCard
            label="مزود جديد"
            value={summary?.pending_providers_count ?? 0}
            tone="accent"
            hint={summary?.messages.new_provider}
            to="/providers?filter=pending"
          />
          <MetricCard
            label="منتهي اليوم"
            value={summary?.expired_today_count ?? 0}
            tone="danger"
            hint={summary?.messages.expired_today}
            to="/providers?filter=expired"
          />
          <MetricCard
            label="ينتهي قريباً"
            value={summary?.expiring_soon_count ?? 0}
            tone="warning"
            hint={summary?.messages.expiring_soon}
            to="/providers?filter=expiringSoon"
          />
        </div>
      </section>

      <section className="mgmt-section">
        <div>
          <h2 className="mgmt-section__title">إحصائيات الاشتراكات</h2>
          <p className="mgmt-section__subtitle">نظرة شاملة على حالة الاشتراكات</p>
        </div>
        <div className="mgmt-stats-grid">
          <MetricCard label="اشتراكات نشطة" value={stats.active} tone="success" />
          <MetricCard label="اشتراكات منتهية" value={stats.expired} tone="danger" />
          <MetricCard label="تنتهي هذا الشهر" value={stats.endingThisMonth} />
          <MetricCard label="بدأت هذا الشهر" value={stats.startedThisMonth} />
          <MetricCard label="بدأت هذا العام" value={stats.startedThisYear} />
          <MetricCard label="صالحة الآن" value={stats.validNow} />
        </div>
      </section>

      <section className="mgmt-panel">
        <div className="mgmt-panel__header">
          <div>
            <h3>اشتراكات تنتهي خلال {SUBSCRIPTION_EXPIRING_SOON_DAYS} أيام</h3>
            <p>قائمة مختصرة للمتابعة السريعة</p>
          </div>
          <Link to="/providers?filter=expiringSoon" className="btn btn-ghost btn-sm">
            عرض الكل
          </Link>
        </div>

        <div className="mgmt-panel__body" style={{ padding: 0 }}>
          {expiringProviders.length === 0 ? (
            <p className="mgmt-table__sub" style={{ padding: '16px 18px' }}>
              لا توجد اشتراكات تنتهي خلال {SUBSCRIPTION_EXPIRING_SOON_DAYS} أيام.
            </p>
          ) : (
            <div className="mgmt-preview-list">
              {expiringProviders.map((provider) => (
                <Link
                  key={provider.id}
                  to={`/providers/${provider.id}`}
                  className="mgmt-preview-list__item"
                >
                  <div>
                    <strong>{provider.fullName}</strong>
                    <span>{provider.city || '—'}</span>
                  </div>
                  <span className="mgmt-preview-list__meta is-warning">
                    {provider.subscriptionDaysRemaining} يوم متبقٍ
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
