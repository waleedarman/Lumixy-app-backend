import { formatDisplayDate } from '../../utils/providerPresentation';
import { isSubscriptionExpiringSoon } from '../../utils/subscription';
import type { ProviderProfile } from '../../types';

type SubscriptionInfoGridProps = {
  provider: ProviderProfile;
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

export function SubscriptionInfoGrid({ provider }: SubscriptionInfoGridProps) {
  const stats: SubscriptionStat[] = [];

  const type = getSubscriptionType(provider);
  if (type) {
    stats.push({ key: 'type', label: 'نوع الاشتراك', value: type });
  }

  const startDate = formatDisplayDate(provider.subscriptionStartedAt);
  if (startDate) {
    stats.push({ key: 'start', label: 'تاريخ البداية', value: startDate });
  }

  const endDate = formatDisplayDate(provider.subscriptionEndsAt);
  if (endDate) {
    stats.push({ key: 'end', label: 'تاريخ الانتهاء', value: endDate });
  }

  if (typeof provider.subscriptionDaysRemaining === 'number') {
    stats.push({
      key: 'remaining',
      label: 'الأيام المتبقية',
      value: `${provider.subscriptionDaysRemaining} يوم`,
      tone: isSubscriptionExpiringSoon(provider) ? 'warning' : undefined,
    });
  }

  const renewal = getRenewalStatus(provider);
  if (renewal) {
    stats.push(renewal);
  }

  if (stats.length === 0) return null;

  return (
    <dl className="subscription-stats">
      {stats.map((stat) => (
        <div
          key={stat.key}
          className={`subscription-stats__item${stat.tone ? ` is-${stat.tone}` : ''}`}
        >
          <dt className="subscription-stats__label">{stat.label}</dt>
          <dd className="subscription-stats__value">{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}
