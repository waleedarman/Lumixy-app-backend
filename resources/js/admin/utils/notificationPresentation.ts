import type { ReactElement } from 'react';
import {
  IconAlertCircle,
  IconCheckCircle,
  IconClock,
  IconMegaphone,
  IconUserPlus,
} from '../components/icons/AdminIcons';
import type { RemoteNotification } from '../types';

export type NotificationKind =
  | 'new_provider'
  | 'expiring_soon'
  | 'expired'
  | 'activation'
  | 'renewal'
  | 'broadcast'
  | 'general';

export type NotificationPresentation = {
  kind: NotificationKind;
  label: string;
  tone: 'accent' | 'warning' | 'danger' | 'success' | 'info' | 'neutral';
  icon: (props: { size?: number; className?: string }) => ReactElement;
};

const PRESENTATIONS: Record<NotificationKind, Omit<NotificationPresentation, 'kind'>> = {
  new_provider: {
    label: 'تسجيل جديد',
    tone: 'accent',
    icon: IconUserPlus,
  },
  expiring_soon: {
    label: 'ينتهي قريباً',
    tone: 'warning',
    icon: IconClock,
  },
  expired: {
    label: 'اشتراك منتهٍ',
    tone: 'danger',
    icon: IconAlertCircle,
  },
  activation: {
    label: 'تفعيل حساب',
    tone: 'success',
    icon: IconCheckCircle,
  },
  renewal: {
    label: 'تجديد اشتراك',
    tone: 'info',
    icon: IconClock,
  },
  broadcast: {
    label: 'إشعار جماعي',
    tone: 'info',
    icon: IconMegaphone,
  },
  general: {
    label: 'تنبيه عام',
    tone: 'neutral',
    icon: IconAlertCircle,
  },
};

export function resolveNotificationKind(notification: RemoteNotification): NotificationKind {
  const title = (notification.title || '').trim();
  const message = notification.message.trim();
  const combined = `${title} ${message}`.toLowerCase();

  if (notification.type === 'activation') {
    return 'activation';
  }

  if (notification.type === 'renewal') {
    if (combined.includes('بقي') || combined.includes('3 أيام') || combined.includes('ينتهي')) {
      return 'expiring_soon';
    }

    if (combined.includes('انتهى') || combined.includes('انتهاء')) {
      return 'expired';
    }

    return 'renewal';
  }

  if (
    combined.includes('مزود جديد') ||
    combined.includes('بانتظار المراجعة') ||
    (title.includes('إشعار إداري') && combined.includes('مزود'))
  ) {
    return 'new_provider';
  }

  if (
    combined.includes('بقي') &&
    (combined.includes('3 أيام') || combined.includes('يوم'))
  ) {
    return 'expiring_soon';
  }

  if (combined.includes('انتهى اشتراك') || title.includes('انتهاء الاشتراك')) {
    return 'expired';
  }

  if (
    title.includes('رسالة من الإدارة') ||
    notification.user_id === 'all' ||
    (notification.type === 'general' &&
      title &&
      title !== 'إشعار إداري' &&
      title !== 'تنبيه الاشتراك' &&
      title !== 'انتهاء الاشتراك' &&
      !combined.includes('مزود جديد'))
  ) {
    return 'broadcast';
  }

  return 'general';
}

export function getNotificationPresentation(notification: RemoteNotification): NotificationPresentation {
  const kind = resolveNotificationKind(notification);

  return {
    kind,
    ...PRESENTATIONS[kind],
  };
}

export type NotificationDateGroup = 'today' | 'yesterday' | 'week' | 'earlier';

export function getNotificationDateGroup(value: string): NotificationDateGroup {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'earlier';
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((startOfToday.getTime() - startOfDate.getTime()) / 86_400_000);

  if (diffDays <= 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays <= 7) return 'week';
  return 'earlier';
}

export const DATE_GROUP_LABELS: Record<NotificationDateGroup, string> = {
  today: 'اليوم',
  yesterday: 'أمس',
  week: 'هذا الأسبوع',
  earlier: 'سابقاً',
};

export function groupNotificationsByDate(notifications: RemoteNotification[]) {
  const groups: Record<NotificationDateGroup, RemoteNotification[]> = {
    today: [],
    yesterday: [],
    week: [],
    earlier: [],
  };

  for (const item of notifications) {
    groups[getNotificationDateGroup(item.created_at)].push(item);
  }

  return (['today', 'yesterday', 'week', 'earlier'] as const)
    .filter((key) => groups[key].length > 0)
    .map((key) => ({
      key,
      label: DATE_GROUP_LABELS[key],
      items: groups[key],
    }));
}

export function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('ar-EG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatNotificationListTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((startOfToday.getTime() - startOfDate.getTime()) / 86_400_000);

  const timeStr = new Intl.DateTimeFormat('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);

  if (diffDays <= 0) return timeStr;
  if (diffDays === 1) return `أمس · ${timeStr}`;

  const sameYear = date.getFullYear() === now.getFullYear();

  if (diffDays < 7) {
    const weekday = new Intl.DateTimeFormat('ar-EG', { weekday: 'long' }).format(date);
    return `${weekday} · ${timeStr}`;
  }

  const dateStr = new Intl.DateTimeFormat('ar-EG', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(date);

  return `${dateStr} · ${timeStr}`;
}

export function formatRelativeNotificationTime(value: string) {
  return formatNotificationListTime(value);
}
