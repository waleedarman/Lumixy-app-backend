import { formatDate, statusLabel } from '../api/mappers';
import type { ProviderProfile, ProviderStatus } from '../types';
import { isSubscriptionExpiringSoon } from './subscription';

export const subscriptionStatusLabels: Record<string, string> = {
  not_subscribed: 'غير مشترك',
  active: 'اشتراك فعّال',
  expired: 'منتهي',
  cancelled: 'ملغي',
  pending: 'قيد الانتظار',
  scheduled: 'مجدول',
};

export type SubscriptionTone = 'success' | 'warning' | 'danger' | 'neutral';

export function getSubscriptionStatusLabel(status?: string | null): string {
  if (!status?.trim()) return 'غير مشترك';
  const key = status.toLowerCase().trim();
  return subscriptionStatusLabels[key] ?? 'غير محدد';
}

export function getReviewStatusLabel(status: ProviderStatus): string {
  return statusLabel(status);
}

export function getProviderSubscriptionTone(provider: ProviderProfile): SubscriptionTone {
  if (provider.isSubscriptionExpired) return 'danger';
  if (isSubscriptionExpiringSoon(provider)) return 'warning';
  return getSubscriptionStatusTone(provider.subscriptionStatus);
}

export function getSubscriptionStatusTone(status?: string | null): SubscriptionTone {
  const key = status?.toLowerCase().trim();
  if (key === 'active') return 'success';
  if (key === 'expired' || key === 'cancelled') return 'danger';
  if (key === 'pending' || key === 'scheduled') return 'warning';
  return 'neutral';
}

export function getSubscriptionPlanLabel(provider: ProviderProfile): string | null {
  const key = provider.subscriptionStatus?.toLowerCase().trim();
  if (!key || key === 'not_subscribed') return null;
  if (provider.isFeatured && provider.isSubscriptionActive) return 'الخطة المميزة';
  if (provider.isSubscriptionActive) return 'الخطة الأساسية';
  if (provider.isSubscriptionExpired) return 'اشتراك منتهٍ';
  return null;
}

export function getSubscriptionSummaryMessage(provider: ProviderProfile): string {
  const key = provider.subscriptionStatus?.toLowerCase().trim();

  if (!key || key === 'not_subscribed') {
    return 'لا يوجد اشتراك نشط لهذا المزود حالياً.';
  }

  if (key === 'expired' || provider.isSubscriptionExpired) {
    return 'انتهت صلاحية الاشتراك. يمكنك تجديده لاستمرار ظهور المزود في المنصة.';
  }

  if (key === 'scheduled') {
    return 'الاشتراك مجدول وسيبدأ في التاريخ المحدد.';
  }

  if (key === 'active' && typeof provider.subscriptionDaysRemaining === 'number') {
    if (isSubscriptionExpiringSoon(provider)) {
      return `متبقي ${provider.subscriptionDaysRemaining} يوم على انتهاء الاشتراك. جدّد اشتراكك.`;
    }
    return 'الاشتراك ساري لمدة شهر واحد ويعمل بشكل طبيعي.';
  }

  return 'راجع تفاصيل الاشتراك أدناه.';
}

export function formatDisplayDate(value?: string | null): string | null {
  if (!value?.trim()) return null;
  const formatted = formatDate(value);
  return formatted === '—' ? null : formatted;
}

export function hasActiveSubscription(provider: ProviderProfile): boolean {
  const key = provider.subscriptionStatus?.toLowerCase().trim();
  return Boolean(key && key !== 'not_subscribed');
}

export function buildPhoneHref(phone: string): string {
  const normalized = phone.replace(/\s/g, '');
  return normalized ? `tel:${normalized}` : '';
}

export function buildEmailHref(email: string): string {
  const normalized = email.trim();
  return normalized ? `mailto:${normalized}` : '';
}

export function buildWhatsAppHref(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : '';
}

export function buildInstagramHref(username: string): string {
  const handle = username.replace(/^@/, '').trim();
  return handle ? `https://instagram.com/${handle}` : '';
}

export function normalizeExternalUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
