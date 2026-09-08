import { Button } from '../ui/Button';
import type { ProviderProfile } from '../../types';
import {
  formatDisplayDate,
  getProviderSubscriptionTone,
  getSubscriptionPlanLabel,
  getSubscriptionStatusLabel,
  getSubscriptionSummaryMessage,
  hasActiveSubscription,
} from '../../utils/providerPresentation';
import { isSubscriptionExpiringSoon } from '../../utils/subscription';

type SubscriptionPanelProps = {
  provider: ProviderProfile;
  busy: boolean;
  onRenew?: () => void;
};

type SubscriptionStat = {
  key: string;
  label: string;
  value: string;
  tone?: 'warning' | 'danger' | 'success';
};

function getSubscriptionType(provider: ProviderProfile): string | null {
  if (!provider.isSubscriptionActive) return null;
  return provider.isFeatured ? 'مميز' : 'عادي';
}

function getRenewalStatus(provider: ProviderProfile): SubscriptionStat | null {
  if (provider.needsSubscriptionRenewal || provider.isSubscriptionExpired) {
    return { key: 'renewal', label: 'حالة التجديد', value: 'يحتاج تجديد', tone: 'danger' };
  }

  if (provider.isSubscriptionActive) {
    return { key: 'renewal', label: 'حالة التجديد', value: 'ساري', tone: 'success' };
  }

  return null;
}

function buildStats(provider: ProviderProfile): SubscriptionStat[] {
  const stats: SubscriptionStat[] = [];

  const type = getSubscriptionType(provider);
  if (type) stats.push({ key: 'type', label: 'نوع الاشتراك', value: type });

  const startDate = formatDisplayDate(provider.subscriptionStartedAt);
  if (startDate) stats.push({ key: 'start', label: 'تاريخ البداية', value: startDate });

  const endDate = formatDisplayDate(provider.subscriptionEndsAt);
  if (endDate) stats.push({ key: 'end', label: 'تاريخ الانتهاء', value: endDate });

  if (typeof provider.subscriptionDaysRemaining === 'number') {
    stats.push({
      key: 'remaining',
      label: 'الأيام المتبقية',
      value: `${provider.subscriptionDaysRemaining} يوم`,
      tone: isSubscriptionExpiringSoon(provider) ? 'warning' : undefined,
    });
  }

  const renewal = getRenewalStatus(provider);
  if (renewal) stats.push(renewal);

  return stats;
}

export function SubscriptionPanel({ provider, busy, onRenew }: SubscriptionPanelProps) {
  const tone = getProviderSubscriptionTone(provider);
  const statusLabel = getSubscriptionStatusLabel(provider.subscriptionStatus);
  const planLabel = getSubscriptionPlanLabel(provider);
  const message = getSubscriptionSummaryMessage(provider);
  const showRenew =
    Boolean(onRenew) && (provider.isSubscriptionExpired || provider.needsSubscriptionRenewal);
  const stats = buildStats(provider);

  if (!hasActiveSubscription(provider)) {
    return (
      <div className="subscription-panel subscription-panel--empty">
        <h3 className="subscription-panel__title">لا يوجد اشتراك فعّال</h3>
        <p className="subscription-panel__desc">{message}</p>
        {showRenew ? (
          <Button variant="primary" size="sm" loading={busy} onClick={onRenew}>
            تجديد الاشتراك
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="subscription-panel">
      <div className="subscription-panel__top">
        <div>
          <span className={`subscription-panel__status is-${tone}`}>{statusLabel}</span>
          {planLabel ? <h3 className="subscription-panel__title">{planLabel}</h3> : null}
          <p className="subscription-panel__desc">{message}</p>
        </div>
        {showRenew ? (
          <Button variant="secondary" size="sm" loading={busy} onClick={onRenew}>
            تجديد الاشتراك
          </Button>
        ) : null}
      </div>

      {stats.length > 0 ? (
        <dl className="subscription-panel__metrics">
          {stats.map((stat) => (
            <div
              key={stat.key}
              className={`ui-metric subscription-panel__metric${stat.tone ? ` is-${stat.tone}` : ''}`}
            >
              <dt className="ui-metric__label">{stat.label}</dt>
              <dd className="ui-metric__value">{stat.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
