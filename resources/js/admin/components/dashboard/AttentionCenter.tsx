import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  IconArrowLeft,
  IconCalendarClock,
  IconCalendarX,
  IconClipboardCheck,
} from '../icons/AdminIcons';

type AttentionItem = {
  key: string;
  label: string;
  description: string;
  count: number;
  to: string;
  tone: 'orange' | 'warning' | 'danger';
  icon: ReactNode;
};

type AttentionCenterProps = {
  pendingCount: number;
  expiringSoonCount: number;
  expiredTodayCount: number;
  pendingMessage?: string;
  expiringMessage?: string;
  expiredMessage?: string;
};

export function AttentionCenter({
  pendingCount,
  expiringSoonCount,
  expiredTodayCount,
  pendingMessage,
  expiringMessage,
  expiredMessage,
}: AttentionCenterProps) {
  const items: AttentionItem[] = [
    {
      key: 'pending',
      label: 'مزودون بانتظار المراجعة',
      description: pendingMessage || 'طلبات جديدة تحتاج موافقة الإدارة.',
      count: pendingCount,
      to: '/providers?filter=pending',
      tone: 'orange',
      icon: <IconClipboardCheck size={16} />,
    },
    {
      key: 'expiring',
      label: 'اشتراكات تنتهي قريباً',
      description: expiringMessage || 'اشتراكات على وشك الانتهاء خلال أيام قليلة.',
      count: expiringSoonCount,
      to: '/providers?filter=expiringSoon',
      tone: 'warning',
      icon: <IconCalendarClock size={16} />,
    },
    {
      key: 'expired-today',
      label: 'اشتراكات منتهية اليوم',
      description: expiredMessage || 'حسابات انتهى اشتراكها اليوم وتحتاج إجراء.',
      count: expiredTodayCount,
      to: '/providers?filter=expired',
      tone: 'danger',
      icon: <IconCalendarX size={16} />,
    },
  ];

  return (
    <article className="dash-panel dash-panel--attention">
      <header className="dash-panel__header dash-panel__header--compact">
        <h2 className="dash-panel__title">تحتاج إلى متابعتك</h2>
      </header>

      <ul className="dash-attention-list">
        {items.map((item) => (
          <li key={item.key}>
            <Link to={item.to} className={`dash-attention-item dash-attention-item--${item.tone}`}>
              <span className={`dash-attention-item__icon dash-attention-item__icon--${item.tone}`} aria-hidden>
                {item.icon}
              </span>
              <span className="dash-attention-item__body">
                <span className="dash-attention-item__top">
                  <strong>{item.label}</strong>
                  <span className="dash-attention-item__count">{item.count.toLocaleString('ar')}</span>
                </span>
                <span className="dash-attention-item__desc">{item.description}</span>
              </span>
              <IconArrowLeft size={14} className="dash-attention-item__chevron" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}
