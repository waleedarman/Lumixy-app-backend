import type { ProviderProfile } from '../types';

export const SUBSCRIPTION_EXPIRING_SOON_DAYS = 3;

type SubscriptionDaysProvider = Pick<
  ProviderProfile,
  'subscriptionDaysRemaining' | 'isSubscriptionExpired' | 'subscriptionStatus'
>;

export function isSubscriptionExpired(
  provider: Pick<ProviderProfile, 'isSubscriptionExpired' | 'subscriptionStatus'>,
): boolean {
  if (provider.isSubscriptionExpired) return true;
  return provider.subscriptionStatus?.toLowerCase().trim() === 'expired';
}

export function isSubscriptionExpiringSoon(provider: SubscriptionDaysProvider): boolean {
  return (
    !isSubscriptionExpired(provider) &&
    typeof provider.subscriptionDaysRemaining === 'number' &&
    provider.subscriptionDaysRemaining > 0 &&
    provider.subscriptionDaysRemaining <= SUBSCRIPTION_EXPIRING_SOON_DAYS
  );
}

export function matchesExpiringSoonFilter(provider: SubscriptionDaysProvider): boolean {
  return isSubscriptionExpiringSoon(provider);
}

export function getSubscriptionUrgencyRank(
  provider: Pick<ProviderProfile, 'isSubscriptionExpired' | 'subscriptionDaysRemaining' | 'subscriptionStatus'>,
): number {
  if (isSubscriptionExpired(provider)) return 0;
  if (isSubscriptionExpiringSoon(provider)) return 1;
  return 2;
}

export function compareSubscriptionUrgency(
  a: Pick<ProviderProfile, 'isSubscriptionExpired' | 'subscriptionDaysRemaining' | 'subscriptionEndsAt' | 'subscriptionStatus'>,
  b: Pick<ProviderProfile, 'isSubscriptionExpired' | 'subscriptionDaysRemaining' | 'subscriptionEndsAt' | 'subscriptionStatus'>,
): number {
  const rankDiff = getSubscriptionUrgencyRank(a) - getSubscriptionUrgencyRank(b);
  if (rankDiff !== 0) return rankDiff;

  if (isSubscriptionExpired(a) && isSubscriptionExpired(b)) {
    const aEnd = a.subscriptionEndsAt ? new Date(a.subscriptionEndsAt).getTime() : 0;
    const bEnd = b.subscriptionEndsAt ? new Date(b.subscriptionEndsAt).getTime() : 0;
    return aEnd - bEnd;
  }

  if (isSubscriptionExpiringSoon(a) && isSubscriptionExpiringSoon(b)) {
    return (a.subscriptionDaysRemaining ?? 999) - (b.subscriptionDaysRemaining ?? 999);
  }

  return 0;
}
