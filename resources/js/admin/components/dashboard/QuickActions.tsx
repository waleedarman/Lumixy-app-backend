import { IconBell, IconGrid, IconMap, IconScanSearch } from '../icons/AdminIcons';
import { QuickActionItem } from './QuickActionItem';

const ACTIONS = [
  {
    to: '/providers?filter=pending',
    title: 'مراجعة المزودين',
    description: 'الاطلاع على الطلبات الجديدة واتخاذ قرار المراجعة.',
    icon: <IconScanSearch size={24} />,
    tone: 'blue' as const,
  },
  {
    to: '/notifications?tab=compose',
    title: 'إرسال إشعار',
    description: 'إرسال رسالة أو تنبيه جماعي للمزودين.',
    icon: <IconBell size={24} />,
    tone: 'purple' as const,
  },
  {
    to: '/categories',
    title: 'إدارة الفئات',
    description: 'تنظيم فئات الخدمات والخدمات الفرعية.',
    icon: <IconGrid size={24} />,
    tone: 'green' as const,
  },
  {
    to: '/cities',
    title: 'إدارة المواقع',
    description: 'تحديث المدن والمناطق المتاحة في المنصة.',
    icon: <IconMap size={24} />,
    tone: 'orange' as const,
  },
];

export function QuickActions({ compact = false, inline = false }: { compact?: boolean; inline?: boolean }) {
  const className = [
    'dash-quick-actions',
    compact ? 'dash-quick-actions--compact' : '',
    inline ? 'dash-quick-actions--inline' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={className} aria-labelledby="dash-quick-actions-title">
      <header className="dash-quick-actions__header">
        <h2 id="dash-quick-actions-title" className="dash-quick-actions__title">
          إجراءات سريعة
        </h2>
        <p className="dash-quick-actions__subtitle">
          اختصارات للعمليات الأكثر استخداماً
        </p>
      </header>

      <div className="dash-quick-actions__grid">
        {ACTIONS.map((action) => (
          <QuickActionItem key={action.to} {...action} />
        ))}
      </div>
    </section>
  );
}
