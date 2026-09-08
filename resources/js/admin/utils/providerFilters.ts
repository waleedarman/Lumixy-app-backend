import type { ProviderFilter, ProviderProfile } from '../types';
import { matchesExpiringSoonFilter } from './subscription';

export type SubscriptionDrawerFilter =
  | 'all'
  | 'active'
  | 'expired'
  | 'expiringSoon'
  | 'not_subscribed';

export function matchesProviderFilter(provider: ProviderProfile, filter: ProviderFilter) {
  switch (filter) {
    case 'featured':
      return provider.isFeatured;
    case 'active':
      return provider.status === 'ACTIVE';
    case 'pending':
      return provider.status === 'PENDING';
    case 'deactivated':
      return provider.status === 'DEACTIVATED';
    case 'expired':
      return provider.isSubscriptionExpired;
    case 'expiringSoon':
      return matchesExpiringSoonFilter(provider);
    default:
      return true;
  }
}

export const PROVIDER_STATUS_TABS: Array<{ key: ProviderFilter; label: string }> = [
  { key: 'all', label: 'الكل' },
  { key: 'pending', label: 'قيد المراجعة' },
  { key: 'active', label: 'نشط' },
  { key: 'featured', label: 'مميز' },
  { key: 'expiringSoon', label: 'ينتهي قريباً' },
  { key: 'expired', label: 'منتهي' },
  { key: 'deactivated', label: 'معطل' },
];

export function matchesSubscriptionDrawerFilter(
  provider: ProviderProfile,
  filter: SubscriptionDrawerFilter,
): boolean {
  if (filter === 'all') return true;
  if (filter === 'expired') return provider.isSubscriptionExpired;
  if (filter === 'expiringSoon') {
    return matchesExpiringSoonFilter(provider);
  }
  if (filter === 'active') {
    return provider.isSubscriptionActive && !provider.isSubscriptionExpired;
  }
  if (filter === 'not_subscribed') {
    const key = provider.subscriptionStatus?.toLowerCase().trim();
    return !key || key === 'not_subscribed';
  }
  return true;
}

export function matchesProviderSearch(provider: ProviderProfile, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const phone = provider.phone.replace(/\s/g, '').toLowerCase();
  return (
    provider.fullName.toLowerCase().includes(normalized) ||
    phone.includes(normalized.replace(/\s/g, ''))
  );
}
